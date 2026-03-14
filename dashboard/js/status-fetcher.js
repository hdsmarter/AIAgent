/**
 * StatusFetcher — Loads and parses status.json for the dashboard
 */
class StatusFetcher {
  constructor(url = 'data/status.json') {
    this.url = url;
    this.data = null;
    this.listeners = [];
    this.refreshInterval = 60000; // 1 minute
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.data));
  }

  async fetch() {
    try {
      const res = await window.fetch(this.url + '?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.data = await res.json();
      this.notify();
      return this.data;
    } catch (err) {
      console.warn('StatusFetcher: failed to load status.json', err.message);
      // Return fallback data
      this.data = this.fallback();
      this.notify();
      return this.data;
    }
  }

  fallback() {
    return {
      timestamp: new Date().toISOString(),
      hostname: 'unknown',
      gateway: { status: 'unknown' },
      channels: {
        telegram: { status: 'unknown' },
        line: { status: 'unknown' }
      },
      sessions: [],
      version: '--'
    };
  }

  startPolling() {
    this.fetch();
    this.timer = setInterval(() => this.fetch(), this.refreshInterval);
  }

  stopPolling() {
    clearInterval(this.timer);
  }
}
