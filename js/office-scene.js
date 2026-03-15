/**
 * office-scene.js — Manufacturing HQ office scene with AI agents
 * Canvas 2D tile-based rendering, FSM agents, A* pathfinding
 * 28x18 grid: lobby, security, main office, factory, kitchen, meeting room
 * Zero hardcoded colors — all via ThemePalette
 *
 * v2.1: 2x character scaling, real-state FSM, 17 seats, tile cache
 */

// Character draw size (2x sprite original for visibility)
const DRAW_W = CHAR_W * 2;  // 32
const DRAW_H = CHAR_H * 2;  // 48

class OfficeScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.T = TILE;

    // Manufacturing HQ grid (28 cols x 18 rows)
    this.cols = 28;
    this.rows = 18;

    // Scale to fit viewport
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Agents
    this.agents = [];
    this.frame = 0;
    this.lastTime = 0;

    // Furniture list (for z-sorting)
    this.furniture = [];

    // Walkable grid
    this.walkable = [];

    // Tile cache (offscreen canvas for performance)
    this._tileCache = null;
    this._tileCacheTheme = null;

    // Build the office
    this.buildLayout();
    this.buildFurniture();
    this.buildWalkableGrid();
    this.spawnAgents();

    // Build tile cache after layout
    this._rebuildTileCache();

    // Resize handler
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse tracking for agent hover
    this.mouseX = -1;
    this.mouseY = -1;
    this.hoveredAgent = null;
    this.selectedAgent = null;
    this.onAgentClick = null;

    // Office overlay status bar
    this._initOverlay();

    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => { this.hoveredAgent = null; });

    // Click + touch support (hitPad=8 for fat fingers)
    this.canvas.addEventListener('click', (e) => this.onTap(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onTap(t.clientX, t.clientY);
    }, { passive: false });
  }

  // Tile types: 0=floor, 1=wall, 2=kitchen, 3=carpet, 4=lobby, 5=factory, 6=corridor, 7=glass wall
  buildLayout() {
    const W = 1, F = 0, K = 2, C = 3, L = 4, X = 5, R = 6, G = 7;
    // 28x18 Manufacturing HQ
    this.map = [
      // Row 0: top wall
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
      // Row 1: lobby | main office corridor | factory
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      // Row 2: lobby | office | factory
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      // Row 3: lobby | office desks row 1 | factory
      [W,L,L,L,L,L,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,G,X,X,X,X,X,W],
      // Row 4: corridor connecting lobby to office
      [W,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,X,X,X,X,X,W],
      // Row 5: wall separator
      [W,W,W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W],
      // Row 6: security room | office | kitchen
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      // Row 7: security room | office | kitchen
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      // Row 8: security room | office desks row 2 | kitchen
      [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      // Row 9: wall separator
      [W,W,W,W,W,W,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,K,K,K,K,K,W],
      // Row 10: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,W,W,W,W,W,W],
      // Row 11: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 12: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 13: meeting room | office desks row 3
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 14: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 15: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 16: meeting room | office
      [W,C,C,C,C,C,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
      // Row 17: bottom wall
      [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    ];
  }

  buildFurniture() {
    this.furniture = [];
    const T = this.T;
    const f = (type, col, row, opts) => {
      this.furniture.push({
        type, x: col * T, y: row * T,
        col, row,
        zY: row * T + (opts?.zOff || T),
        ...opts
      });
    };

    // ── Lobby (cols 1-5, rows 1-3) ──────────────────
    f('receptionDesk', 2, 2, { w: 2 });
    f('sofa', 1, 1, { zOff: 4 });
    f('sofa', 4, 1, { zOff: 4 });
    f('plant', 1, 3);
    f('plant', 5, 3);

    // ── Security Room (cols 1-5, rows 6-8) ──────────
    f('securityDesk', 2, 7);
    f('monitorWall', 1, 6, { zOff: 4, w: 3 });
    f('chair', 2, 8, { zOff: T + 8 });

    // ── Main Office — Row 1: desks at row 3 (6 seats) ─
    f('desk', 9, 2);  f('computer', 9, 1);
    f('desk', 11, 2); f('computer', 11, 1);
    f('desk', 13, 2); f('computer', 13, 1);
    f('desk', 15, 2); f('computer', 15, 1);
    f('desk', 17, 2); f('computer', 17, 1);
    f('desk', 19, 2); f('computer', 19, 1);
    // Chairs
    f('chair', 9, 3, { zOff: T + 8 });
    f('chair', 11, 3, { zOff: T + 8 });
    f('chair', 13, 3, { zOff: T + 8 });
    f('chair', 15, 3, { zOff: T + 8 });
    f('chair', 17, 3, { zOff: T + 8 });
    f('chair', 19, 3, { zOff: T + 8 });

    // ── Main Office — Row 2: desks at row 7 (6 seats) ─
    f('desk', 9, 7);  f('computer', 9, 6);
    f('desk', 11, 7); f('computer', 11, 6);
    f('desk', 13, 7); f('computer', 13, 6);
    f('desk', 15, 7); f('computer', 15, 6);
    f('desk', 17, 7); f('computer', 17, 6);
    f('desk', 19, 7); f('computer', 19, 6);
    // Chairs
    f('chair', 9, 8, { zOff: T + 8 });
    f('chair', 11, 8, { zOff: T + 8 });
    f('chair', 13, 8, { zOff: T + 8 });
    f('chair', 15, 8, { zOff: T + 8 });
    f('chair', 17, 8, { zOff: T + 8 });
    f('chair', 19, 8, { zOff: T + 8 });

    // ── Main Office — Row 3: desks at row 13 (4 seats) ─
    f('desk', 10, 12); f('computer', 10, 11);
    f('desk', 13, 12); f('computer', 13, 11);
    f('desk', 16, 12); f('computer', 16, 11);
    f('desk', 19, 12); f('computer', 19, 11);
    // Chairs
    f('chair', 10, 13, { zOff: T + 8 });
    f('chair', 13, 13, { zOff: T + 8 });
    f('chair', 16, 13, { zOff: T + 8 });
    f('chair', 19, 13, { zOff: T + 8 });

    // ── PUE Business Asst. desk (seat #16) ─
    f('desk', 22, 15); f('computer', 22, 14);
    f('chair', 22, 16, { zOff: T + 8 });

    // Bookshelves along top wall of main office
    f('bookshelf', 8, 5, { zOff: 4 });
    f('bookshelf', 10, 5, { zOff: 4 });
    f('bookshelf', 12, 5, { zOff: 4 });

    // Plants in office area
    f('plant', 8, 1);
    f('plant', 20, 1);
    f('plant', 8, 16);
    f('plant', 20, 16);
    f('plant', 14, 16);

    // ── Kitchen / Break Room (cols 22-26, rows 6-9) ──
    f('vending', 22, 6, { zOff: 4 });
    f('coffeeMachine', 24, 6, { zOff: 4 });
    f('fridge', 26, 6, { zOff: 4 });
    f('waterCooler', 22, 9);
    f('clock', 24, 6, { zOff: 0 });

    // ── Factory Visible Area (cols 22-26, rows 1-4) ──
    f('conveyor', 23, 2);
    f('conveyor', 25, 2);
    f('safetySign', 22, 1, { zOff: 4 });
    f('safetySign', 26, 1, { zOff: 4 });
    f('conveyor', 23, 4);

    // ── Meeting Room (cols 1-5, rows 10-16) ──────────
    f('meetingTable', 2, 12, { w: 2 });
    f('whiteboard', 1, 10, { zOff: 4, w: 3 });
    f('painting', 5, 10, { zOff: 4 });
    f('plant', 1, 16);
    f('plant', 5, 16);

    // ── Desk seats (17 agents) ──────────────────────
    this.seats = [
      // Main office — upper row (6 seats, row 3)
      { col: 9,  row: 3, dir: 'down' },  // #0 Data Analyst
      { col: 11, row: 3, dir: 'down' },  // #1 Marketing
      { col: 13, row: 3, dir: 'down' },  // #2 Finance
      { col: 15, row: 3, dir: 'down' },  // #3 HR
      { col: 17, row: 3, dir: 'down' },  // #4 Supply Chain
      { col: 19, row: 3, dir: 'down' },  // #5 IT Architect
      // Main office — middle row (6 seats, row 8)
      { col: 9,  row: 8, dir: 'down' },  // #6 Project Mgr
      { col: 11, row: 8, dir: 'down' },  // #7 Customer Svc
      { col: 13, row: 8, dir: 'down' },  // #8 Legal
      { col: 15, row: 8, dir: 'down' },  // #9 Product Mgr
      { col: 17, row: 8, dir: 'down' },  // #10 UX Designer
      { col: 19, row: 8, dir: 'down' },  // #11 Content
      // Main office — lower row (4 seats, row 13)
      { col: 10, row: 13, dir: 'down' }, // #12 BD
      { col: 13, row: 13, dir: 'down' }, // #13 Quality
      { col: 16, row: 13, dir: 'down' }, // #14 Security
      { col: 19, row: 13, dir: 'down' }, // #15 HR Director
      // PUE Business Asst. (seat #16)
      { col: 22, row: 16, dir: 'down' }, // #16 PUE Business Asst.
    ];
  }

  buildWalkableGrid() {
    this.walkable = [];
    for (let r = 0; r < this.rows; r++) {
      this.walkable[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = this.map[r][c];
        // Wall(1), Factory(5), Glass wall(7) = not walkable
        this.walkable[r][c] = (tile !== 1 && tile !== 5 && tile !== 7);
      }
    }
    // Block furniture positions
    const blocking = [
      'desk', 'bookshelf', 'vending', 'fridge', 'meetingTable',
      'receptionDesk', 'securityDesk', 'conveyor', 'monitorWall'
    ];
    for (const furn of this.furniture) {
      if (blocking.includes(furn.type)) {
        if (furn.row >= 0 && furn.row < this.rows && furn.col >= 0 && furn.col < this.cols) {
          this.walkable[furn.row][furn.col] = false;
          // Block extra tiles for wide furniture
          if (furn.w && furn.w > 1) {
            for (let i = 1; i < furn.w; i++) {
              const nc = furn.col + i;
              if (nc < this.cols) this.walkable[furn.row][nc] = false;
            }
          }
        }
      }
    }
  }

  spawnAgents() {
    const palettes = PixelSprites.agentPalettes;
    const count = Math.min(palettes.length, this.seats.length);
    for (let i = 0; i < count; i++) {
      const seat = this.seats[i];
      const agent = {
        id: i,
        palette: palettes[i],
        name: I18n.agentName(i),
        x: seat.col * this.T + this.T / 2,
        y: seat.row * this.T + this.T / 2,
        col: seat.col,
        row: seat.row,
        state: 'working',
        dir: 'down',
        frame: Math.floor(Math.random() * 4),
        frameTimer: 0,
        realStatus: 'idle',
        currentTask: null,
        path: [],
        pathIdx: 0,
        stateTimer: Math.random() * 8 + 4,
        seatIdx: i,
        speech: null,
        speechTimer: 0,
        active: true,
        _pendingRespond: false,
      };
      this.agents.push(agent);
    }

    I18n.onChange(() => {
      for (const a of this.agents) a.name = I18n.agentName(a.id);
    });
  }

  // ── Office overlay (DOM status bar above canvas) ──
  _initOverlay() {
    const container = this.canvas.parentElement;
    if (!container) return;
    this._overlay = document.createElement('div');
    this._overlay.className = 'office-overlay';

    this._overlayResponding = document.createElement('span');
    this._overlayResponding.className = 'status-indicator responding';
    this._overlay.appendChild(this._overlayResponding);

    this._overlayIdle = document.createElement('span');
    this._overlayIdle.className = 'status-indicator idle';
    this._overlay.appendChild(this._overlayIdle);

    container.appendChild(this._overlay);
    this._updateOverlay();
  }

  _updateOverlay() {
    if (!this._overlay) return;
    let responding = 0;
    let idle = 0;
    for (const a of this.agents) {
      if (a.realStatus === 'active') responding++;
      else idle++;
    }
    const rLabel = I18n.t('office.responding') || '\u4F4D\u52A9\u7406\u56DE\u61C9\u4E2D';
    const iLabel = I18n.t('office.idle') || '\u4F4D\u5F85\u547D';
    this._overlayResponding.textContent = '\u25CF ' + responding + ' ' + rLabel;
    this._overlayIdle.textContent = '\u25CB ' + idle + ' ' + iLabel;
  }

  // ── Real-state driven status update ──────────────
  updateAgentStatus(agentId, status, task) {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;
    const prev = agent.realStatus;
    agent.realStatus = status || 'idle';
    agent.currentTask = task || null;

    if (agent.realStatus === 'active' && prev !== 'active') {
      // Immediately switch to responding (interrupts any state)
      this._goResponding(agent);
    } else if (agent.realStatus === 'idle' && prev === 'active') {
      // End responding → back to working
      if (agent.state === 'responding') {
        agent.state = 'working';
        agent.dir = 'down';
        agent.stateTimer = Math.random() * 8 + 4;
      }
    }
    this._updateOverlay();
  }

  _goResponding(agent) {
    const seat = this.seats[agent.seatIdx];
    if (agent.col !== seat.col || agent.row !== seat.row) {
      // Walk back to seat first
      agent.path = this.findPath(agent.col, agent.row, seat.col, seat.row);
      agent.pathIdx = 0;
      agent.state = 'walk';
      agent._pendingRespond = true;
      agent.stateTimer = 30;
    } else {
      agent.state = 'responding';
      agent.dir = 'down';
      agent.stateTimer = 999; // Controlled by realStatus change
    }
  }

  _returnToSeat(agent) {
    const seat = this.seats[agent.seatIdx];
    if (agent.col === seat.col && agent.row === seat.row) {
      agent.state = 'working';
      agent.dir = 'down';
      agent.stateTimer = Math.random() * 10 + 5;
    } else {
      agent.path = this.findPath(agent.col, agent.row, seat.col, seat.row);
      agent.pathIdx = 0;
      agent.state = agent.path.length > 0 ? 'walk' : 'working';
      agent.stateTimer = agent.state === 'walk' ? 20 : Math.random() * 8 + 4;
    }
  }

  // A* pathfinding
  findPath(fromCol, fromRow, toCol, toRow) {
    if (!this.walkable[toRow] || !this.walkable[toRow][toCol]) return [];

    const key = (c, r) => `${c},${r}`;
    const open = [{ col: fromCol, row: fromRow, g: 0, h: 0, f: 0, parent: null }];
    const closed = new Set();

    const heuristic = (c, r) => Math.abs(c - toCol) + Math.abs(r - toRow);
    open[0].h = heuristic(fromCol, fromRow);
    open[0].f = open[0].h;

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      const ck = key(current.col, current.row);

      if (current.col === toCol && current.row === toRow) {
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ col: node.col, row: node.row });
          node = node.parent;
        }
        return path;
      }

      closed.add(ck);

      for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nc = current.col + dc;
        const nr = current.row + dr;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
        if (!this.walkable[nr][nc]) continue;
        if (closed.has(key(nc, nr))) continue;

        const g = current.g + 1;
        const h = heuristic(nc, nr);
        const existing = open.find(n => n.col === nc && n.row === nr);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + h;
            existing.parent = current;
          }
        } else {
          open.push({ col: nc, row: nr, g, h, f: g + h, parent: current });
        }
      }
    }
    return [];
  }

  // ── FSM: real-state driven agent update ──────────
  updateAgent(agent, dt) {
    agent.frameTimer += dt;
    const rates = { walk: 0.2, working: 0.5, responding: 0.25, speaking: 0.6, idle: 0.8 };
    if (agent.frameTimer >= (rates[agent.state] || 0.5)) {
      agent.frameTimer = 0;
      agent.frame++;
    }

    if (agent.speech) {
      agent.speechTimer -= dt;
      if (agent.speechTimer <= 0) agent.speech = null;
    }
    agent.stateTimer -= dt;

    switch (agent.state) {
      case 'working':
        if (agent.stateTimer <= 0) {
          if (agent.realStatus === 'active') { this._goResponding(agent); break; }
          if (Math.random() < 0.2) {
            agent.speech = PixelSprites.speeches[Math.floor(Math.random() * PixelSprites.speeches.length)];
            agent.speechTimer = 3;
          }
          const r = Math.random();
          if (r < 0.25 && agent.realStatus === 'idle') {
            // Random walk (only when idle)
            agent.state = 'walk';
            const target = this.randomWalkTarget(agent);
            agent.path = this.findPath(agent.col, agent.row, target.col, target.row);
            agent.pathIdx = 0;
            agent.stateTimer = 20;
          } else if (r < 0.35) {
            agent.state = 'idle';
            agent.stateTimer = Math.random() * 3 + 1;
          } else {
            agent.stateTimer = Math.random() * 8 + 4;
          }
        }
        break;

      case 'responding':
        // Continues until realStatus changes back to idle (controlled by updateAgentStatus)
        break;

      case 'speaking':
        if (!agent.speech && agent.stateTimer <= 0) {
          agent.state = agent.realStatus === 'active' ? 'responding' : 'working';
          agent.dir = 'down';
          agent.stateTimer = agent.state === 'responding' ? 999 : Math.random() * 8 + 4;
        }
        break;

      case 'walk':
        if (agent.path.length > 0 && agent.pathIdx < agent.path.length) {
          const target = agent.path[agent.pathIdx];
          const tx = target.col * this.T + this.T / 2;
          const ty = target.row * this.T + this.T / 2;
          const speed = 50;
          const dx = tx - agent.x;
          const dy = ty - agent.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 2) {
            agent.x = tx;
            agent.y = ty;
            agent.col = target.col;
            agent.row = target.row;
            agent.pathIdx++;
          } else {
            agent.x += (dx / dist) * speed * dt;
            agent.y += (dy / dist) * speed * dt;
            if (Math.abs(dx) > Math.abs(dy)) {
              agent.dir = dx > 0 ? 'right' : 'left';
            } else {
              agent.dir = dy > 0 ? 'down' : 'up';
            }
          }

          // If realStatus becomes active mid-walk, reroute to seat
          if (agent.realStatus === 'active' && !agent._pendingRespond) {
            agent._pendingRespond = true;
            const seat = this.seats[agent.seatIdx];
            agent.path = this.findPath(agent.col, agent.row, seat.col, seat.row);
            agent.pathIdx = 0;
          }
        } else {
          if (agent._pendingRespond) {
            agent._pendingRespond = false;
            agent.state = 'responding';
            agent.dir = 'down';
            agent.stateTimer = 999;
          } else {
            this._returnToSeat(agent);
          }
        }
        break;

      case 'idle':
        if (agent.stateTimer <= 0) {
          if (agent.realStatus === 'active') { this._goResponding(agent); }
          else { this._returnToSeat(agent); }
        }
        break;
    }
  }

  randomWalkTarget(agent) {
    const candidates = [];
    for (let r = 2; r < this.rows - 1; r++) {
      for (let c = 1; c < this.cols - 1; c++) {
        if (this.walkable[r][c]) {
          candidates.push({ col: c, row: r });
        }
      }
    }
    if (candidates.length === 0) return { col: agent.col, row: agent.row };
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  showAgentSpeech(agentId, text) {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;
    agent.speech = text.length > 30 ? text.slice(0, 30) + '\u2026' : text;
    agent.speechTimer = 5;
    // Only switch to speaking if not responding
    if (agent.state !== 'responding') {
      agent.state = 'speaking';
      agent.dir = 'down';
      agent.stateTimer = 5;
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    // Use parent container size if available, otherwise full viewport
    const container = this.canvas.parentElement;
    const W = container ? container.clientWidth : window.innerWidth;
    const H = container ? container.clientHeight : window.innerHeight;

    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';

    const officeW = this.cols * this.T;
    const officeH = this.rows * this.T;

    this.scale = Math.min(W / officeW, H / officeH) * dpr;
    this.offsetX = (W * dpr - officeW * this.scale) / 2;
    this.offsetY = (H * dpr - officeH * this.scale) / 2;
  }

  onMouseMove(e) {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) * dpr - this.offsetX) / this.scale;
    const canvasY = ((e.clientY - rect.top) * dpr - this.offsetY) / this.scale;

    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.hoveredAgent = null;

    for (const agent of this.agents) {
      const ax = agent.x - DRAW_W / 2;
      const ay = agent.y - DRAW_H;
      if (canvasX >= ax && canvasX <= ax + DRAW_W &&
          canvasY >= ay && canvasY <= ay + DRAW_H) {
        this.hoveredAgent = agent;
        break;
      }
    }

    const panel = document.getElementById('agent-panel');
    if (this.hoveredAgent) {
      const a = this.hoveredAgent;
      panel.style.display = 'block';
      panel.style.left = (e.clientX + 16) + 'px';
      panel.style.top = (e.clientY - 10) + 'px';
      document.getElementById('panel-name').textContent = '\u26A1 ' + a.name;
      document.getElementById('panel-role').textContent = I18n.agentRole(a.id);
      const statusText = I18n.t('status.' + a.realStatus);
      const taskSuffix = a.currentTask ? ' \u2014 ' + a.currentTask : '';
      document.getElementById('panel-status').textContent = statusText + taskSuffix;
    } else {
      panel.style.display = 'none';
    }
  }

  onTap(clientX, clientY) {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = ((clientX - rect.left) * dpr - this.offsetX) / this.scale;
    const canvasY = ((clientY - rect.top) * dpr - this.offsetY) / this.scale;
    const hitPad = 8;

    let tapped = null;
    for (const agent of this.agents) {
      const ax = agent.x - DRAW_W / 2 - hitPad;
      const ay = agent.y - DRAW_H - hitPad;
      const aw = DRAW_W + hitPad * 2;
      const ah = DRAW_H + hitPad * 2;
      if (canvasX >= ax && canvasX <= ax + aw &&
          canvasY >= ay && canvasY <= ay + ah) {
        tapped = agent;
        break;
      }
    }

    if (tapped) {
      this.selectedAgent = tapped;
      if (this.onAgentClick) this.onAgentClick(tapped);
    } else {
      this.selectedAgent = null;
    }
  }

  update(dt) {
    this.frame++;
    for (const agent of this.agents) {
      this.updateAgent(agent, dt);
    }
  }

  // ── Tile cache (offscreen canvas, rebuilt on theme change) ──
  _rebuildTileCache() {
    const T = this.T;
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = this.cols * T;
    cacheCanvas.height = this.rows * T;
    const cctx = cacheCanvas.getContext('2d');

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * T;
        const y = r * T;
        switch (this.map[r][c]) {
          case 0: PixelSprites.drawFloorTile(cctx, x, y, (r * 7 + c) % 3); break;
          case 1: PixelSprites.drawWallTile(cctx, x, y); break;
          case 2: PixelSprites.drawKitchenFloor(cctx, x, y); break;
          case 3: PixelSprites.drawCarpetTile(cctx, x, y); break;
          case 4: PixelSprites.drawLobbyFloor(cctx, x, y); break;
          case 5: PixelSprites.drawFactoryFloor(cctx, x, y); break;
          case 6: PixelSprites.drawCorridorFloor(cctx, x, y); break;
          case 7: PixelSprites.drawGlassWall(cctx, x, y); break;
        }
      }
    }

    this._tileCache = cacheCanvas;
    this._tileCacheTheme = ThemePalette._current;
  }

  render() {
    const { ctx, T, scale, offsetX, offsetY } = this;
    const p = ThemePalette.current;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = p.canvasBg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    // 1. Draw tiles (from cache, rebuild on theme change)
    if (this._tileCacheTheme !== ThemePalette._current) {
      this._rebuildTileCache();
    }
    if (this._tileCache) {
      ctx.drawImage(this._tileCache, 0, 0);
    }

    // 2. Collect renderables for z-sorting
    const renderables = [];
    for (const furn of this.furniture) {
      renderables.push({ type: 'furniture', data: furn, zY: furn.zY });
    }
    for (const agent of this.agents) {
      renderables.push({ type: 'agent', data: agent, zY: agent.y });
    }
    renderables.sort((a, b) => a.zY - b.zY);

    // 3. Render sorted items
    for (const item of renderables) {
      if (item.type === 'furniture') {
        this.renderFurniture(item.data);
      } else {
        this.renderAgent(item.data);
      }
    }

    // 4. Speech bubbles (always on top)
    for (const agent of this.agents) {
      if (agent.speech) {
        PixelSprites.drawBubble(ctx, agent.x, agent.y - DRAW_H - 4, agent.speech);
      }
    }

    // 5. Selected agent glow
    if (this.selectedAgent) {
      const a = this.selectedAgent;
      const glow = 0.3 + 0.3 * Math.sin(Date.now() / 400);
      ctx.strokeStyle = p.selectGlow + glow + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(a.x - DRAW_W / 2 - 3, a.y - DRAW_H - 3, DRAW_W + 6, DRAW_H + 8);
    }

    // 6. Hovered agent highlight
    if (this.hoveredAgent && this.hoveredAgent !== this.selectedAgent) {
      ctx.strokeStyle = p.hoverGlow;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.hoveredAgent.x - DRAW_W / 2 - 2, this.hoveredAgent.y - DRAW_H - 2, DRAW_W + 4, DRAW_H + 6);
    }

    ctx.restore();
  }

  renderFurniture(f) {
    const ctx = this.ctx;
    switch (f.type) {
      case 'desk': PixelSprites.drawDesk(ctx, f.x, f.y); break;
      case 'computer': PixelSprites.drawComputer(ctx, f.x, f.y); break;
      case 'chair': PixelSprites.drawChair(ctx, f.x, f.y); break;
      case 'bookshelf': PixelSprites.drawBookshelf(ctx, f.x, f.y); break;
      case 'plant': PixelSprites.drawPlant(ctx, f.x, f.y); break;
      case 'vending': PixelSprites.drawVendingMachine(ctx, f.x, f.y); break;
      case 'fridge': PixelSprites.drawFridge(ctx, f.x, f.y); break;
      case 'coffeeMachine': PixelSprites.drawCoffeeMachine(ctx, f.x, f.y); break;
      case 'clock': PixelSprites.drawClock(ctx, f.x, f.y); break;
      case 'painting': PixelSprites.drawPainting(ctx, f.x, f.y); break;
      case 'waterCooler': PixelSprites.drawWaterCooler(ctx, f.x, f.y); break;
      case 'whiteboard': PixelSprites.drawWhiteboard(ctx, f.x, f.y, f.w); break;
      case 'meetingTable': this.drawMeetingTable(ctx, f.x, f.y); break;
      case 'receptionDesk': PixelSprites.drawReceptionDesk(ctx, f.x, f.y); break;
      case 'securityDesk': PixelSprites.drawSecurityDesk(ctx, f.x, f.y); break;
      case 'sofa': PixelSprites.drawSofa(ctx, f.x, f.y); break;
      case 'monitorWall': PixelSprites.drawMonitorWall(ctx, f.x, f.y, f.w); break;
      case 'conveyor': PixelSprites.drawConveyorBelt(ctx, f.x, f.y); break;
      case 'safetySign': PixelSprites.drawSafetySign(ctx, f.x, f.y); break;
    }
  }

  drawMeetingTable(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.mtSurface;
    ctx.fillRect(x, y + 4, TILE * 2, TILE - 4);
    ctx.fillStyle = p.mtTop;
    ctx.fillRect(x, y + 4, TILE * 2, 3);
    ctx.fillStyle = p.mtLeg;
    ctx.fillRect(x + 4, y + TILE, 3, 6);
    ctx.fillRect(x + TILE * 2 - 7, y + TILE, 3, 6);
    ctx.fillStyle = p.mtPaper;
    ctx.fillRect(x + 10, y + 10, 12, 8);
    ctx.fillRect(x + TILE + 8, y + 12, 10, 6);
  }

  renderAgent(agent) {
    const p = ThemePalette.current;
    // Map FSM state to sprite animation
    const spriteState = (agent.state === 'walk') ? 'walk'
      : (agent.state === 'idle') ? 'idle' : 'type';
    const spriteCanvas = PixelSprites.drawCharacter(
      agent.palette, agent.dir, agent.frame, spriteState
    );
    const dx = agent.x - DRAW_W / 2;
    const dy = agent.y - DRAW_H;

    // Responding state: green glow effect
    if (agent.state === 'responding') {
      const glow = 0.3 + 0.2 * Math.sin(Date.now() / 300);
      this.ctx.shadowColor = 'rgba(22, 163, 74, ' + glow + ')';
      this.ctx.shadowBlur = 12;
    }

    // 2x scaled draw (image-smoothing disabled = pixel-perfect)
    this.ctx.drawImage(spriteCanvas, dx, dy, DRAW_W, DRAW_H);
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Enlarged name label (9px + semi-transparent pill for readability)
    const name = I18n.agentName(agent.id);
    this.ctx.font = 'bold 9px "Noto Sans TC", "PingFang TC", sans-serif';
    const nameW = this.ctx.measureText(name).width + 6;
    this.ctx.fillStyle = p.namePillBg || 'rgba(255,255,255,0.6)';
    this.ctx.fillRect(agent.x - nameW / 2, agent.y + 2, nameW, 13);
    this.ctx.fillStyle = p.agentLabel;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, agent.x, agent.y + 12);
    this.ctx.textAlign = 'left';
  }

  start() {
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    this.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}
