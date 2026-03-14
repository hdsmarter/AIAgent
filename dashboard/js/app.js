/**
 * app.js — Main dashboard application
 */
(function () {
  const fetcher = new StatusFetcher();
  const visualizer = new AgentVisualizer('agent-canvas');

  // DOM references
  const el = (id) => document.getElementById(id);

  function updateDashboard(data) {
    if (!data) return;

    // Version
    el('version').textContent = data.version || '--';

    // Last updated
    if (data.timestamp) {
      const t = new Date(data.timestamp);
      el('last-updated').textContent = formatTime(t);
    }

    // Hostname
    el('gw-hostname').textContent = data.hostname || '--';

    // Gateway status
    const gwStatus = parseGatewayStatus(data.gateway);
    const gwEl = el('gw-status');
    gwEl.textContent = gwStatus.label;
    gwEl.style.color = gwStatus.color;

    // Agent state
    const agentState = determineAgentState(data);
    visualizer.setState(agentState);
    el('agent-state').textContent = stateLabel(agentState);
    el('agent-state').style.color = stateColor(agentState);

    // Uptime
    if (data.gateway && data.gateway.uptime) {
      el('agent-uptime').textContent = 'Uptime: ' + data.gateway.uptime;
    } else if (data.timestamp) {
      el('agent-uptime').textContent = 'Last check: ' + formatTime(new Date(data.timestamp));
    }

    // Channels
    updateChannel('telegram', data.channels);
    updateChannel('line', data.channels);

    // Timeline
    updateTimeline(data);
  }

  function parseGatewayStatus(gw) {
    if (!gw || gw.error) return { label: 'offline', color: 'var(--red)' };
    if (gw.status === 'running' || gw.status === 'ok') return { label: 'running', color: 'var(--green)' };
    return { label: gw.status || 'unknown', color: 'var(--yellow)' };
  }

  function determineAgentState(data) {
    if (!data.gateway || data.gateway.error) return 'offline';
    if (data.sessions && data.sessions.length > 0) return 'active';
    if (data.gateway.status === 'running' || data.gateway.status === 'ok') return 'idle';
    return 'waiting';
  }

  function updateChannel(name, channels) {
    const statusEl = el('ch-' + name + '-status');
    if (!statusEl) return;

    let status = 'unknown';
    if (channels && channels[name]) {
      const ch = channels[name];
      if (typeof ch === 'string') {
        status = ch;
      } else if (ch.status) {
        status = ch.status;
      } else if (ch.error) {
        status = 'error';
      }
    } else if (channels && channels.error) {
      status = 'unavailable';
    }

    const map = {
      running: ['running', 'status-ok'],
      connected: ['connected', 'status-ok'],
      ok: ['ok', 'status-ok'],
      error: ['error', 'status-error'],
      unavailable: ['unavailable', 'status-warn'],
      unknown: ['--', 'status-unknown']
    };

    const [label, cls] = map[status] || map.unknown;
    statusEl.textContent = label;
    statusEl.className = 'channel-status ' + cls;
  }

  function updateTimeline(data) {
    const container = el('timeline');
    const entries = [];

    // Add status check entry
    if (data.timestamp) {
      entries.push({
        time: new Date(data.timestamp),
        text: 'Status check completed'
      });
    }

    // Add session entries
    if (data.sessions && Array.isArray(data.sessions)) {
      data.sessions.forEach(s => {
        entries.push({
          time: new Date(s.startedAt || data.timestamp),
          text: 'Session: ' + (s.id || 'active') + ' (' + (s.channel || 'unknown') + ')'
        });
      });
    }

    // Clear container using safe DOM methods
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (entries.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'timeline-empty';
      emptyEl.textContent = 'No activity data yet';
      container.appendChild(emptyEl);
      return;
    }

    entries.sort((a, b) => b.time - a.time);

    entries.forEach(e => {
      const entryEl = document.createElement('div');
      entryEl.className = 'timeline-entry';

      const timeEl = document.createElement('span');
      timeEl.className = 'timeline-time';
      timeEl.textContent = formatTime(e.time);

      const textEl = document.createElement('span');
      textEl.className = 'timeline-text';
      textEl.textContent = e.text;

      entryEl.appendChild(timeEl);
      entryEl.appendChild(textEl);
      container.appendChild(entryEl);
    });
  }

  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function stateLabel(state) {
    return { active: 'Active', idle: 'Idle', waiting: 'Waiting', offline: 'Offline' }[state] || state;
  }

  function stateColor(state) {
    return { active: 'var(--accent)', idle: 'var(--green)', waiting: 'var(--yellow)', offline: 'var(--red)' }[state] || 'var(--text-secondary)';
  }

  // Initialize
  fetcher.onChange(updateDashboard);
  fetcher.startPolling();
  visualizer.start();
})();
