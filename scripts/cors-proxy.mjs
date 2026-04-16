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

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:18789';
const PORT = parseInt(process.env.PORT || '18790', 10);
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.resolve(import.meta.dirname, '../workspace');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');
const UPLOAD_DIR = path.join(OUTPUT_DIR, 'uploads');

// Allowed file extensions for download (whitelist)
const ALLOWED_EXTENSIONS = new Set([
  '.pptx', '.xlsx', '.docx', '.pdf', '.csv', '.txt', '.md', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip',
]);

// Filename whitelist: alphanumeric, dots, hyphens, underscores
const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

// Allowed origins for CORS (restrict to known Dashboard sources)
const ALLOWED_ORIGINS = new Set([
  'https://ai2.smarter.tw',
  'https://hdsmarter.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function getCorsHeaders(req) {
  const origin = req.headers.origin || '';
  // Allow if origin matches whitelist, or if no origin (same-origin / server-to-server)
  const allowedOrigin = !origin || ALLOWED_ORIGINS.has(origin)
    ? (origin || '*')
    : '';

  // Also allow ngrok dynamic URLs for development
  const isNgrok = origin && origin.endsWith('.ngrok-free.app');

  return {
    'Access-Control-Allow-Origin': allowedOrigin || (isNgrok ? origin : ''),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
    'Access-Control-Max-Age': '86400',
  };
}

// SSE-specific headers to prevent buffering at every layer
const SSE_HEADERS = {
  'X-Accel-Buffering': 'no',       // ngrok / nginx
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
};

const server = http.createServer((req, res) => {
  // ── Preflight ──
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
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

        res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath, filename: safeName }));
      } catch (err) {
        res.writeHead(400, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── File download endpoint — serve files from workspace/output/ ──
  if (req.method === 'GET' && req.url.startsWith('/files/')) {
    const filename = decodeURIComponent(req.url.slice(7).split('?')[0]);

    // Security: filename whitelist (no slashes, dots-only, etc.)
    if (!filename || !SAFE_FILENAME_RE.test(filename)) {
      res.writeHead(400, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid filename' }));
      return;
    }

    // Security: extension whitelist
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.writeHead(403, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File type not allowed' }));
      return;
    }

    // Security: path traversal prevention
    const filePath = path.resolve(OUTPUT_DIR, filename);
    if (!filePath.startsWith(path.resolve(OUTPUT_DIR))) {
      res.writeHead(403, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Path traversal blocked' }));
      return;
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    // Serve file with proper headers
    const stat = fs.statSync(filePath);
    const mimeTypes = {
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      ...getCorsHeaders(req),
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // ── HEAD /files/:filename — check file existence (for ai-service detection) ──
  if (req.method === 'HEAD' && req.url.startsWith('/files/')) {
    const filename = decodeURIComponent(req.url.slice(7).split('?')[0]);
    if (!filename || !SAFE_FILENAME_RE.test(filename)) {
      res.writeHead(400, getCorsHeaders(req));
      res.end();
      return;
    }
    const filePath = path.resolve(OUTPUT_DIR, filename);
    if (!filePath.startsWith(path.resolve(OUTPUT_DIR)) || !fs.existsSync(filePath)) {
      res.writeHead(404, getCorsHeaders(req));
      res.end();
      return;
    }
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      ...getCorsHeaders(req),
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end();
    return;
  }

  // ── Health endpoint (lightweight connect test) ──
  if (req.method === 'GET' && req.url === '/health') {
    // Quick reachability check to Gateway
    http.get(GATEWAY + '/health', (gwRes) => {
      res.writeHead(gwRes.statusCode, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      gwRes.pipe(res);
    }).on('error', () => {
      res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
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
      const headers = { ...proxyRes.headers, ...getCorsHeaders(req) };

      if (isStreamRequest) {
        // SSE mode: add anti-buffering headers, flush immediately
        Object.assign(headers, SSE_HEADERS);
        res.writeHead(proxyRes.statusCode, headers);
        res.flushHeaders();

        // SSE keepalive: send comment every 15s to prevent ngrok/browser idle timeout
        const keepalive = setInterval(() => {
          try { res.write(': keepalive\n\n'); } catch {}
        }, 15000);

        // Forward each chunk immediately — no pipe() buffering
        proxyRes.on('data', (chunk) => {
          res.write(chunk);
        });
        proxyRes.on('end', () => {
          clearInterval(keepalive);
          res.end();
        });
        proxyRes.on('error', () => {
          clearInterval(keepalive);
          res.end();
        });
      } else {
        // Non-streaming: simple pipe
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', () => {
      res.writeHead(502, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway unreachable' }));
    });

    proxyReq.end(body);
  });
});

// Increase timeouts for stable long connections (tool execution can take 30s+)
server.keepAliveTimeout = 300000;   // 5 min
server.headersTimeout = 305000;
server.timeout = 300000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CORS proxy: 127.0.0.1:${PORT} → ${GATEWAY} (SSE-optimized)`);
  console.log('Next: ngrok http ' + PORT);
});
