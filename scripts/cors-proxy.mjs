/**
 * cors-proxy.mjs — CORS reverse proxy for OpenClaw Gateway
 * Optimized for SSE streaming (no buffering)
 *
 * Key fixes for stable SSE through ngrok:
 *   - X-Accel-Buffering: no  → tells ngrok/nginx NOT to buffer
 *   - Cache-Control: no-cache → prevents intermediate caching
 *   - res.flushHeaders()      → push headers immediately
 *   - Manual chunk forwarding → no pipe() buffering
 *
 * Usage:
 *   node scripts/cors-proxy.mjs
 *   ngrok http 18790
 *
 * Ref: https://github.com/http-party/node-http-proxy/issues/921
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const GATEWAY = 'http://127.0.0.1:18789';
const PORT = parseInt(process.env.PORT || '18790', 10);
const UPLOAD_DIR = '/tmp/dashboard-uploads';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
  'Access-Control-Max-Age': '86400',
};

// SSE-specific headers to prevent buffering at every layer
const SSE_HEADERS = {
  'X-Accel-Buffering': 'no',       // ngrok / nginx
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
};

const server = http.createServer((req, res) => {
  // ── Preflight ──
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ── File upload endpoint (save to local temp dir for agent) ──
  if (req.method === 'POST' && req.url === '/upload') {
    let bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(bodyChunks).toString());
        const filename = (body.filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = Date.now();
        const safeName = `${timestamp}_${filename}`;
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const filePath = path.join(UPLOAD_DIR, safeName);

        // Decode data URL → binary
        const base64 = body.dataUrl.split(',')[1] || body.dataUrl;
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

        res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath, filename: safeName }));
      } catch (err) {
        res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── Health endpoint (lightweight connect test) ──
  if (req.method === 'GET' && req.url === '/health') {
    // Quick reachability check to Gateway
    http.get(GATEWAY + '/health', (gwRes) => {
      res.writeHead(gwRes.statusCode, { ...CORS, 'Content-Type': 'application/json' });
      gwRes.pipe(res);
    }).on('error', () => {
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, proxy: true }));
    });
    return;
  }

  // ── Forward to Gateway ──
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders.host;

  // Detect if client wants streaming
  let bodyChunks = [];

  req.on('data', (chunk) => bodyChunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(bodyChunks);
    let isStreamRequest = false;
    try {
      const parsed = JSON.parse(body.toString());
      isStreamRequest = parsed.stream === true;
    } catch { /* not JSON, that's ok */ }

    const proxyReq = http.request(GATEWAY + req.url, {
      method: req.method,
      headers: { ...fwdHeaders, 'Content-Length': body.length },
    }, (proxyRes) => {
      const headers = { ...proxyRes.headers, ...CORS };

      if (isStreamRequest) {
        // SSE mode: add anti-buffering headers, flush immediately
        Object.assign(headers, SSE_HEADERS);
        res.writeHead(proxyRes.statusCode, headers);
        res.flushHeaders();

        // Forward each chunk immediately — no pipe() buffering
        proxyRes.on('data', (chunk) => {
          res.write(chunk);
        });
        proxyRes.on('end', () => {
          res.end();
        });
      } else {
        // Non-streaming: simple pipe
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', () => {
      res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway unreachable' }));
    });

    proxyReq.end(body);
  });
});

// Increase keep-alive for stable long connections
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CORS proxy: 127.0.0.1:${PORT} → ${GATEWAY} (SSE-optimized)`);
  console.log('Next: ngrok http ' + PORT);
});
