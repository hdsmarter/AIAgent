/**
 * office-scene-v2.js — SVG Floorplan + DOM Agent Overlay
 * Replaces Canvas pixel-art OfficeScene with a hybrid approach:
 *   - Static SVG floorplan (rooms, walls, furniture shapes)
 *   - DOM <button> overlay for each Agent (56px avatar, name, status)
 *   - CSS transition for movement (no rAF loop)
 *   - Simplified FSM (setInterval 1s)
 * Public API matches OfficeScene for zero-change app.js wiring.
 */
class OfficeSceneV2 {
  constructor(containerId) {
    this._container = document.getElementById(containerId);
    if (!this._container) return;

    // Grid dimensions (same as v1)
    this._cols = 28;
    this._rows = 18;
    this._tileSize = 32;
    this._viewW = this._cols * this._tileSize;  // 896
    this._viewH = this._rows * this._tileSize;  // 576

    // State
    this.agents = [];
    this._agentEls = {};
    this._onAgentClick = null;
    this._selectedAgent = null;
    this._fsmTimer = null;

    // Tile map (same as v1)
    this._map = this._buildMap();
    this._walkable = this._buildWalkable();

    // Seats for 17 agents
    this._seats = [
      { col: 9,  row: 3,  dir: 'down' },  // #0 Data Analyst
      { col: 11, row: 3,  dir: 'down' },  // #1 Marketing
      { col: 13, row: 3,  dir: 'down' },  // #2 Finance
      { col: 15, row: 3,  dir: 'down' },  // #3 HR
      { col: 17, row: 3,  dir: 'down' },  // #4 Supply Chain
      { col: 19, row: 3,  dir: 'down' },  // #5 IT Architect
      { col: 9,  row: 8,  dir: 'down' },  // #6 Project Mgr
      { col: 11, row: 8,  dir: 'down' },  // #7 Customer Svc
      { col: 13, row: 8,  dir: 'down' },  // #8 Legal
      { col: 15, row: 8,  dir: 'down' },  // #9 Product Mgr
      { col: 17, row: 8,  dir: 'down' },  // #10 UX Designer
      { col: 19, row: 8,  dir: 'down' },  // #11 Content
      { col: 10, row: 13, dir: 'down' },  // #12 BD
      { col: 13, row: 13, dir: 'down' },  // #13 Quality
      { col: 16, row: 13, dir: 'down' },  // #14 Security
      { col: 19, row: 13, dir: 'down' },  // #15 HR Director
      { col: 10, row: 16, dir: 'down' },  // #16 PUE Business Asst.
    ];

    // Build scene
    this._buildFloorplan();
    this._spawnAgents();
    this._buildMobileList();

    // ResizeObserver for responsive positioning
    this._ro = new ResizeObserver(() => this._repositionAgents());
    this._ro.observe(this._container);

    // i18n reactivity
    I18n.onChange(() => this._updateI18n());
  }

  // ── Public API (matches OfficeScene) ──────────

  get agents() { return this._agents || []; }

  set onAgentClick(fn) { this._onAgentClick = fn; }
  get onAgentClick() { return this._onAgentClick; }

  get selectedAgent() { return this._selectedAgent; }
  set selectedAgent(agent) {
    // Deselect previous
    if (this._selectedAgent) {
      var prevEl = this._agentEls[this._selectedAgent.id];
      if (prevEl) prevEl.setAttribute('aria-pressed', 'false');
    }
    this._selectedAgent = agent;
    if (agent) {
      var el = this._agentEls[agent.id];
      if (el) el.setAttribute('aria-pressed', 'true');
    }
  }

  updateAgentStatus(agentId, status, task) {
    var agent = this.agents.find(function(a) { return a.id === agentId; });
    if (!agent) return;
    agent.realStatus = status || 'idle';
    agent.currentTask = task || null;

    var el = this._agentEls[agentId];
    if (!el) return;
    var dot = el.querySelector('.office-agent-status');
    if (dot) dot.dataset.status = agent.realStatus;
    el.setAttribute('aria-label', this._agentAriaLabel(agent));
  }

  showAgentSpeech(agentId, text) {
    var agent = this.agents.find(function(a) { return a.id === agentId; });
    if (!agent) return;
    var truncated = text.length > 25 ? text.slice(0, 25) + '\u2026' : text;
    agent.speech = truncated;
    agent.speechTimer = 4;

    var el = this._agentEls[agentId];
    if (!el) return;
    var bubble = el.querySelector('.office-agent-speech');
    if (!bubble) return;
    bubble.textContent = truncated;
    bubble.classList.add('visible');

    clearTimeout(agent._speechTimeout);
    agent._speechTimeout = setTimeout(function() {
      bubble.classList.remove('visible');
      agent.speech = null;
    }, 4000);
  }

  resize() {
    this._repositionAgents();
  }

  start() {
    var self = this;
    if (this._fsmTimer) clearInterval(this._fsmTimer);
    this._fsmTimer = setInterval(function() { self._fsmTick(); }, 1000);
  }

  // ── SVG Floorplan ─────────────────────────────

  _buildFloorplan() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + this._viewW + ' ' + this._viewH);
    svg.setAttribute('class', 'office-floorplan');
    svg.setAttribute('role', 'presentation');
    svg.setAttribute('aria-hidden', 'true');

    // Room definitions (x, y, w, h, fill CSS var, labelKey)
    var rooms = [
      // Lobby
      { x: 1, y: 1, w: 5, h: 3, fill: 'var(--office-lobby)', label: 'office.lobby' },
      // Main Office upper
      { x: 7, y: 1, w: 14, h: 3, fill: 'var(--office-floor)', label: null },
      // Corridor
      { x: 1, y: 4, w: 21, h: 1, fill: 'var(--office-floor-alt)', label: null },
      // Factory
      { x: 22, y: 1, w: 5, h: 4, fill: 'var(--office-factory)', label: 'office.factory' },
      // Security
      { x: 1, y: 6, w: 5, h: 3, fill: 'var(--office-floor)', label: 'office.security' },
      // Main Office middle
      { x: 7, y: 6, w: 14, h: 3, fill: 'var(--office-floor)', label: null },
      // Kitchen
      { x: 22, y: 6, w: 5, h: 4, fill: 'var(--office-kitchen)', label: 'office.kitchen' },
      // Meeting Room
      { x: 1, y: 10, w: 5, h: 7, fill: 'var(--office-carpet)', label: 'office.meeting' },
      // Main Office lower
      { x: 7, y: 10, w: 20, h: 7, fill: 'var(--office-floor)', label: 'office.mainOffice' },
    ];

    var T = this._tileSize;

    // Background
    var bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', this._viewW);
    bg.setAttribute('height', this._viewH);
    bg.setAttribute('fill', 'var(--office-wall)');
    svg.appendChild(bg);

    // Draw rooms
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i];
      var rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', r.x * T);
      rect.setAttribute('y', r.y * T);
      rect.setAttribute('width', r.w * T);
      rect.setAttribute('height', r.h * T);
      rect.setAttribute('fill', r.fill);
      rect.setAttribute('stroke', 'var(--office-wall-stroke)');
      rect.setAttribute('stroke-width', '0.5');
      svg.appendChild(rect);

      // Room label
      if (r.label) {
        var text = document.createElementNS(ns, 'text');
        text.setAttribute('x', (r.x + r.w / 2) * T);
        text.setAttribute('y', (r.y + 0.7) * T);
        text.setAttribute('class', 'room-label');
        text.textContent = I18n.t(r.label);
        text.dataset.i18nKey = r.label;
        svg.appendChild(text);
      }
    }

    // Simplified furniture — desks as small rectangles
    var deskColor = 'var(--office-desk)';
    var deskRows = [
      // Upper row (row 2)
      [9, 11, 13, 15, 17, 19],
      // Middle row (row 7)
      [9, 11, 13, 15, 17, 19],
      // Lower row (row 12)
      [10, 13, 16, 19],
    ];
    var deskYs = [2, 7, 12];

    for (var ri = 0; ri < deskRows.length; ri++) {
      var cols = deskRows[ri];
      var dy = deskYs[ri];
      for (var ci = 0; ci < cols.length; ci++) {
        var deskRect = document.createElementNS(ns, 'rect');
        deskRect.setAttribute('x', cols[ci] * T + 4);
        deskRect.setAttribute('y', dy * T + 8);
        deskRect.setAttribute('width', T - 8);
        deskRect.setAttribute('height', T - 12);
        deskRect.setAttribute('rx', '3');
        deskRect.setAttribute('fill', deskColor);
        deskRect.setAttribute('opacity', '0.6');
        svg.appendChild(deskRect);
      }
    }

    // Meeting table
    var mt = document.createElementNS(ns, 'rect');
    mt.setAttribute('x', 2 * T + 4);
    mt.setAttribute('y', 12 * T + 4);
    mt.setAttribute('width', 2 * T - 8);
    mt.setAttribute('height', T * 2 - 8);
    mt.setAttribute('rx', '4');
    mt.setAttribute('fill', deskColor);
    mt.setAttribute('opacity', '0.5');
    svg.appendChild(mt);

    // Reception desk
    var rd = document.createElementNS(ns, 'rect');
    rd.setAttribute('x', 2 * T);
    rd.setAttribute('y', 2 * T + 8);
    rd.setAttribute('width', 2 * T);
    rd.setAttribute('height', T - 12);
    rd.setAttribute('rx', '4');
    rd.setAttribute('fill', deskColor);
    rd.setAttribute('opacity', '0.5');
    svg.appendChild(rd);

    this._container.appendChild(svg);
    this._svg = svg;
    this._rooms = rooms;

    // Agent overlay layer
    var overlay = document.createElement('div');
    overlay.className = 'office-agents-layer';
    this._container.appendChild(overlay);
    this._overlay = overlay;
  }

  // ── Agent Spawning ────────────────────────────

  _spawnAgents() {
    var palettes = PixelSprites.agentPalettes;
    var count = Math.min(palettes.length, this._seats.length);
    this._agents = [];

    for (var i = 0; i < count; i++) {
      var seat = this._seats[i];
      var agent = {
        id: i,
        palette: palettes[i],
        name: I18n.agentName(i),
        col: seat.col,
        row: seat.row,
        state: 'typing',
        dir: seat.dir,
        realStatus: 'idle',
        currentTask: null,
        speech: null,
        speechTimer: 0,
        _speechTimeout: null,
        stateTimer: Math.random() * 8 + 4,
        seatCol: seat.col,
        seatRow: seat.row,
        path: [],
        pathIdx: 0,
        active: true,
      };
      this._agents.push(agent);
      this._buildAgentEl(agent);
    }

    this._repositionAgents();
  }

  _buildAgentEl(agent) {
    var self = this;
    var btn = document.createElement('button');
    btn.className = 'office-agent';
    btn.dataset.agentId = agent.id;
    btn.dataset.state = 'typing';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', this._agentAriaLabel(agent));
    btn.setAttribute('tabindex', '0');

    // Avatar
    var avatar = document.createElement('span');
    avatar.className = 'office-agent-avatar';
    avatar.style.setProperty('--agent-color', agent.palette.shirt);

    // SVG icon from SvgIcons
    var iconKey = AgentIconMap[agent.id] || 'robot';
    if (SvgIcons[iconKey]) {
      avatar.appendChild(svgFromTemplate(SvgIcons[iconKey]));
    }

    // Status dot
    var statusDot = document.createElement('span');
    statusDot.className = 'office-agent-status';
    statusDot.dataset.status = agent.realStatus;
    avatar.appendChild(statusDot);

    btn.appendChild(avatar);

    // Name label
    var nameEl = document.createElement('span');
    nameEl.className = 'office-agent-name';
    nameEl.textContent = agent.name;
    btn.appendChild(nameEl);

    // Speech bubble
    var speech = document.createElement('div');
    speech.className = 'office-agent-speech';
    speech.setAttribute('aria-live', 'polite');
    btn.appendChild(speech);

    // Click handler
    btn.addEventListener('click', function() {
      self.selectedAgent = agent;
      if (self._onAgentClick) self._onAgentClick(agent);
    });

    this._overlay.appendChild(btn);
    this._agentEls[agent.id] = btn;
  }

  _agentAriaLabel(agent) {
    var name = I18n.agentName(agent.id);
    var role = I18n.agentRole(agent.id);
    var status = I18n.t('status.' + agent.realStatus);
    return name + ' \u2014 ' + role + ' \u2014 ' + status;
  }

  // ── Positioning (percentage-based) ────────────

  _repositionAgents() {
    var containerW = this._container.clientWidth;
    var containerH = this._container.clientHeight;
    if (!containerW || !containerH) return;

    // Calculate SVG actual rendered size (preserving aspect ratio)
    var aspect = this._viewW / this._viewH;
    var renderedW, renderedH, offsetX, offsetY;

    if (containerW / containerH > aspect) {
      // Container is wider than SVG aspect
      renderedH = containerH;
      renderedW = containerH * aspect;
      offsetX = (containerW - renderedW) / 2;
      offsetY = 0;
    } else {
      renderedW = containerW;
      renderedH = containerW / aspect;
      offsetX = 0;
      offsetY = (containerH - renderedH) / 2;
    }

    var scaleX = renderedW / this._viewW;
    var scaleY = renderedH / this._viewH;
    var T = this._tileSize;

    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      var el = this._agentEls[agent.id];
      if (!el) continue;

      var pixelX = agent.col * T + T / 2;
      var pixelY = agent.row * T + T / 2;

      var screenX = offsetX + pixelX * scaleX;
      var screenY = offsetY + pixelY * scaleY;

      // Center agent on position
      el.style.left = screenX + 'px';
      el.style.top = screenY + 'px';
      el.style.transform = 'translate(-50%, -50%)';
    }

    // Store for FSM movement
    this._scaleX = scaleX;
    this._scaleY = scaleY;
    this._offsetX = offsetX;
    this._offsetY = offsetY;
  }

  // ── Mobile List View ──────────────────────────

  _buildMobileList() {
    var self = this;
    var list = document.createElement('div');
    list.className = 'office-mobile-list';

    // Group agents by room
    var groups = [
      { labelKey: 'office.mainOffice', agents: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    ];

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var title = document.createElement('div');
      title.className = 'office-mobile-group-title';
      title.textContent = I18n.t(group.labelKey);
      title.dataset.i18nKey = group.labelKey;
      list.appendChild(title);

      for (var a = 0; a < group.agents.length; a++) {
        var agentId = group.agents[a];
        if (agentId >= this._agents.length) continue;
        var agent = this._agents[agentId];

        var card = document.createElement('div');
        card.className = 'office-mobile-agent';
        card.dataset.agentId = agentId;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        // Avatar
        var avatar = document.createElement('span');
        avatar.className = 'office-agent-avatar';
        avatar.style.setProperty('--agent-color', agent.palette.shirt);
        var iconKey = AgentIconMap[agentId] || 'robot';
        if (SvgIcons[iconKey]) {
          avatar.appendChild(svgFromTemplate(SvgIcons[iconKey]));
        }
        card.appendChild(avatar);

        // Info
        var info = document.createElement('div');
        info.className = 'office-mobile-agent-info';
        var nameEl = document.createElement('div');
        nameEl.className = 'office-mobile-agent-name';
        nameEl.textContent = I18n.agentName(agentId);
        info.appendChild(nameEl);
        var roleEl = document.createElement('div');
        roleEl.className = 'office-mobile-agent-role';
        roleEl.textContent = I18n.agentRole(agentId);
        info.appendChild(roleEl);
        card.appendChild(info);

        // Click
        (function(ag) {
          card.addEventListener('click', function() {
            self.selectedAgent = ag;
            if (self._onAgentClick) self._onAgentClick(ag);
          });
        })(agent);

        list.appendChild(card);
      }
    }

    this._container.appendChild(list);
    this._mobileList = list;
  }

  // ── FSM (1-second tick) ───────────────────────

  _fsmTick() {
    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      agent.stateTimer -= 1;

      // Speech decay
      if (agent.speech) {
        agent.speechTimer -= 1;
        if (agent.speechTimer <= 0) {
          agent.speech = null;
          var el = this._agentEls[agent.id];
          if (el) {
            var bubble = el.querySelector('.office-agent-speech');
            if (bubble) bubble.classList.remove('visible');
          }
        }
      }

      switch (agent.state) {
        case 'typing':
          if (agent.stateTimer <= 0) {
            this._onTypingDone(agent);
          }
          break;

        case 'walking':
          this._walkStep(agent);
          break;

        case 'idle':
          if (agent.stateTimer <= 0) {
            this._returnToSeat(agent);
          }
          break;
      }
    }
  }

  _onTypingDone(agent) {
    // Random speech
    if (Math.random() < 0.25) {
      var speeches = PixelSprites.speeches;
      this.showAgentSpeech(agent.id, speeches[Math.floor(Math.random() * speeches.length)]);
    }

    var r = Math.random();
    if (r < 0.3) {
      // Walk somewhere
      var target = this._randomWalkTarget(agent);
      agent.path = this._findPath(agent.col, agent.row, target.col, target.row);
      agent.pathIdx = 0;
      if (agent.path.length > 0) {
        agent.state = 'walking';
        agent.stateTimer = 20;
        this._setAgentState(agent, 'walking');
      } else {
        agent.stateTimer = Math.random() * 6 + 3;
      }
    } else if (r < 0.45) {
      agent.state = 'idle';
      agent.stateTimer = Math.floor(Math.random() * 3) + 1;
      this._setAgentState(agent, 'idle');
    } else {
      agent.stateTimer = Math.floor(Math.random() * 8) + 4;
    }
  }

  _walkStep(agent) {
    if (agent.path.length > 0 && agent.pathIdx < agent.path.length) {
      var target = agent.path[agent.pathIdx];
      agent.col = target.col;
      agent.row = target.row;
      agent.pathIdx++;
      this._moveAgentEl(agent);

      if (agent.pathIdx >= agent.path.length) {
        // Path complete — go idle briefly then return
        agent.state = 'idle';
        agent.stateTimer = Math.floor(Math.random() * 3) + 1;
        this._setAgentState(agent, 'idle');
      }
    } else {
      this._returnToSeat(agent);
    }
  }

  _returnToSeat(agent) {
    if (agent.col === agent.seatCol && agent.row === agent.seatRow) {
      agent.state = 'typing';
      agent.stateTimer = Math.floor(Math.random() * 10) + 5;
      this._setAgentState(agent, 'typing');
    } else {
      agent.path = this._findPath(agent.col, agent.row, agent.seatCol, agent.seatRow);
      agent.pathIdx = 0;
      if (agent.path.length > 0) {
        agent.state = 'walking';
        agent.stateTimer = 20;
        this._setAgentState(agent, 'walking');
      } else {
        // Can't find path, teleport back
        agent.col = agent.seatCol;
        agent.row = agent.seatRow;
        agent.state = 'typing';
        agent.stateTimer = Math.floor(Math.random() * 8) + 4;
        this._setAgentState(agent, 'typing');
        this._moveAgentEl(agent);
      }
    }
  }

  _setAgentState(agent, state) {
    var el = this._agentEls[agent.id];
    if (el) el.dataset.state = state;
  }

  _moveAgentEl(agent) {
    var el = this._agentEls[agent.id];
    if (!el || !this._scaleX) return;

    var T = this._tileSize;
    var pixelX = agent.col * T + T / 2;
    var pixelY = agent.row * T + T / 2;

    var screenX = this._offsetX + pixelX * this._scaleX;
    var screenY = this._offsetY + pixelY * this._scaleY;

    el.style.left = screenX + 'px';
    el.style.top = screenY + 'px';
  }

  _randomWalkTarget(agent) {
    // Pick a walkable tile within 2-5 tiles distance
    var candidates = [];
    var minDist = 2, maxDist = 5;
    for (var r = Math.max(1, agent.row - maxDist); r < Math.min(this._rows - 1, agent.row + maxDist); r++) {
      for (var c = Math.max(1, agent.col - maxDist); c < Math.min(this._cols - 1, agent.col + maxDist); c++) {
        var dist = Math.abs(c - agent.col) + Math.abs(r - agent.row);
        if (dist >= minDist && dist <= maxDist && this._walkable[r] && this._walkable[r][c]) {
          candidates.push({ col: c, row: r });
        }
      }
    }
    if (candidates.length === 0) return { col: agent.col, row: agent.row };
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ── A* Pathfinding (same as v1) ───────────────

  _findPath(fromCol, fromRow, toCol, toRow) {
    if (!this._walkable[toRow] || !this._walkable[toRow][toCol]) return [];

    var key = function(c, r) { return c + ',' + r; };
    var open = [{ col: fromCol, row: fromRow, g: 0, h: 0, f: 0, parent: null }];
    var closed = {};
    var heuristic = function(c, r) { return Math.abs(c - toCol) + Math.abs(r - toRow); };
    open[0].h = heuristic(fromCol, fromRow);
    open[0].f = open[0].h;

    var maxIter = 500; // Safety limit
    var iter = 0;

    while (open.length > 0 && iter < maxIter) {
      iter++;
      open.sort(function(a, b) { return a.f - b.f; });
      var current = open.shift();
      var ck = key(current.col, current.row);

      if (current.col === toCol && current.row === toRow) {
        var path = [];
        var node = current;
        while (node) {
          path.unshift({ col: node.col, row: node.row });
          node = node.parent;
        }
        return path;
      }

      closed[ck] = true;

      var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (var d = 0; d < dirs.length; d++) {
        var nc = current.col + dirs[d][0];
        var nr = current.row + dirs[d][1];
        if (nr < 0 || nr >= this._rows || nc < 0 || nc >= this._cols) continue;
        if (!this._walkable[nr][nc]) continue;
        var nk = key(nc, nr);
        if (closed[nk]) continue;

        var g = current.g + 1;
        var h = heuristic(nc, nr);
        var existing = null;
        for (var e = 0; e < open.length; e++) {
          if (open[e].col === nc && open[e].row === nr) { existing = open[e]; break; }
        }
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + h;
            existing.parent = current;
          }
        } else {
          open.push({ col: nc, row: nr, g: g, h: h, f: g + h, parent: current });
        }
      }
    }
    return [];
  }

  // ── Map + Walkable ────────────────────────────

  _buildMap() {
    var W = 1, F = 0, K = 2, C = 3, L = 4, X = 5, R = 6, G = 7;
    return [
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      [W,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,X,X,X,X,X,W],
      [W,W,W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W],
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      [W,W,W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    ];
  }

  _buildWalkable() {
    var walkable = [];
    for (var r = 0; r < this._rows; r++) {
      walkable[r] = [];
      for (var c = 0; c < this._cols; c++) {
        var tile = this._map[r][c];
        walkable[r][c] = (tile !== 1 && tile !== 5 && tile !== 7);
      }
    }
    // Block desk positions
    var deskPositions = [
      [2, 9], [2, 11], [2, 13], [2, 15], [2, 17], [2, 19],
      [7, 9], [7, 11], [7, 13], [7, 15], [7, 17], [7, 19],
      [12, 10], [12, 13], [12, 16], [12, 19],
    ];
    for (var d = 0; d < deskPositions.length; d++) {
      walkable[deskPositions[d][0]][deskPositions[d][1]] = false;
    }
    return walkable;
  }

  // ── i18n Updates ──────────────────────────────

  _updateI18n() {
    // Update agent name labels
    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      agent.name = I18n.agentName(agent.id);
      var el = this._agentEls[agent.id];
      if (!el) continue;
      var nameEl = el.querySelector('.office-agent-name');
      if (nameEl) nameEl.textContent = agent.name;
      el.setAttribute('aria-label', this._agentAriaLabel(agent));
    }

    // Update SVG room labels
    if (this._svg) {
      var labels = this._svg.querySelectorAll('[data-i18n-key]');
      for (var j = 0; j < labels.length; j++) {
        labels[j].textContent = I18n.t(labels[j].dataset.i18nKey);
      }
    }

    // Update mobile list
    if (this._mobileList) {
      var titles = this._mobileList.querySelectorAll('[data-i18n-key]');
      for (var k = 0; k < titles.length; k++) {
        titles[k].textContent = I18n.t(titles[k].dataset.i18nKey);
      }
      var names = this._mobileList.querySelectorAll('.office-mobile-agent-name');
      for (var n = 0; n < names.length; n++) {
        var card = names[n].closest('.office-mobile-agent');
        if (card) {
          var aid = parseInt(card.dataset.agentId, 10);
          names[n].textContent = I18n.agentName(aid);
          var roleEl = card.querySelector('.office-mobile-agent-role');
          if (roleEl) roleEl.textContent = I18n.agentRole(aid);
        }
      }
    }
  }
}
