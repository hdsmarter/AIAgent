/**
 * office-scene.js — Enterprise office scene with AI agents
 * Canvas 2D tile-based rendering, FSM agents, A* pathfinding
 */

class OfficeScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.T = TILE; // tile size

    // Office grid (20 cols x 14 rows)
    this.cols = 20;
    this.rows = 14;

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

    // Build the office
    this.buildLayout();
    this.buildFurniture();
    this.buildWalkableGrid();
    this.spawnAgents();

    // Resize handler
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse tracking for agent hover
    this.mouseX = -1;
    this.mouseY = -1;
    this.hoveredAgent = null;
    this.selectedAgent = null;
    this.onAgentClick = null; // callback(agent)

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

  // Office layout: 0=floor, 1=wall, 2=kitchen, 3=carpet (meeting room)
  buildLayout() {
    // 20x14 layout
    this.map = [
      // Row 0: top wall
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      // Row 1: wall + bookshelf area
      [1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,1,1],
      // Row 2: office floor + kitchen
      [1,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1,1],
      // Row 3
      [1,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1,1],
      // Row 4
      [1,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1,1],
      // Row 5
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      // Row 6
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      // Row 7
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      // Row 8
      [1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1],
      // Row 9
      [1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1],
      // Row 10
      [1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1],
      // Row 11
      [1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1],
      // Row 12
      [1,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,3,3,3,1],
      // Row 13: bottom wall
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
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

    // === Main office area (left) ===

    // Top row of desks (row 3-4) with computers
    f('desk', 2, 3); f('computer', 2, 2);
    f('desk', 4, 3); f('computer', 4, 2);
    f('desk', 6, 3); f('computer', 6, 2);
    f('desk', 8, 3); f('computer', 8, 2);
    f('desk', 10, 3); f('computer', 10, 2);

    // Bottom row of desks (row 9-10) with computers
    f('desk', 2, 9); f('computer', 2, 8);
    f('desk', 4, 9); f('computer', 4, 8);
    f('desk', 6, 9); f('computer', 6, 8);
    f('desk', 8, 9); f('computer', 8, 8);
    f('desk', 10, 9); f('computer', 10, 8);

    // Chairs for top desks (below desks, row 5)
    f('chair', 2, 5, { zOff: T + 8 });
    f('chair', 4, 5, { zOff: T + 8 });
    f('chair', 6, 5, { zOff: T + 8 });
    f('chair', 8, 5, { zOff: T + 8 });
    f('chair', 10, 5, { zOff: T + 8 });

    // Chairs for bottom desks (below desks, row 11)
    f('chair', 2, 11, { zOff: T + 8 });
    f('chair', 4, 11, { zOff: T + 8 });
    f('chair', 6, 11, { zOff: T + 8 });
    f('chair', 8, 11, { zOff: T + 8 });
    f('chair', 10, 11, { zOff: T + 8 });

    // Bookshelves on top wall
    f('bookshelf', 1, 1, { zOff: 4 });
    f('bookshelf', 3, 1, { zOff: 4 });
    f('bookshelf', 5, 1, { zOff: 4 });
    f('bookshelf', 7, 1, { zOff: 4 });

    // Plants
    f('plant', 1, 6);
    f('plant', 11, 6);
    f('plant', 1, 12);
    f('plant', 11, 12);

    // === Kitchen area (top right) ===
    f('vending', 13, 1, { zOff: 4 });
    f('fridge', 17, 1, { zOff: 4 });
    f('coffeeMachine', 15, 1, { zOff: 4 });
    f('clock', 15, 1, { zOff: 0 }); // wall-mounted

    // === Meeting room (bottom right) ===
    // Big meeting table
    f('meetingTable', 15, 10, { w: 2 });
    // Whiteboard on wall
    f('whiteboard', 14, 8, { zOff: 4, w: 2 });
    // Painting
    f('painting', 17, 8, { zOff: 4 });
    // Plants in meeting room
    f('plant', 13, 12);
    f('plant', 18, 12);
    // Water cooler
    f('waterCooler', 18, 9);

    // Desk seats (where agents sit)
    this.seats = [
      { col: 2, row: 4, dir: 'down' },
      { col: 4, row: 4, dir: 'down' },
      { col: 6, row: 4, dir: 'down' },
      { col: 8, row: 4, dir: 'down' },
      { col: 10, row: 4, dir: 'down' },
      { col: 2, row: 10, dir: 'down' },
      { col: 4, row: 10, dir: 'down' },
      { col: 6, row: 10, dir: 'down' },
    ];
  }

  buildWalkableGrid() {
    this.walkable = [];
    for (let r = 0; r < this.rows; r++) {
      this.walkable[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.walkable[r][c] = (this.map[r][c] !== 1);
      }
    }
    // Block furniture positions (desks, bookshelves, etc.)
    for (const f of this.furniture) {
      if (['desk', 'bookshelf', 'vending', 'fridge', 'meetingTable'].includes(f.type)) {
        if (f.row >= 0 && f.row < this.rows && f.col >= 0 && f.col < this.cols) {
          this.walkable[f.row][f.col] = false;
        }
      }
    }
  }

  spawnAgents() {
    const palettes = PixelSprites.agentPalettes;
    for (let i = 0; i < 8; i++) {
      const seat = this.seats[i];
      const agent = {
        id: i,
        palette: palettes[i],
        name: palettes[i].name,
        // Position (pixel coords)
        x: seat.col * this.T + this.T / 2,
        y: seat.row * this.T + this.T / 2,
        // Grid position
        col: seat.col,
        row: seat.row,
        // FSM state
        state: 'type', // idle, walk, type
        dir: 'down',
        frame: Math.floor(Math.random() * 4),
        frameTimer: 0,
        // Path
        path: [],
        pathIdx: 0,
        // Timers
        stateTimer: Math.random() * 8 + 4, // seconds until next action
        // Seat assignment
        seatIdx: i,
        // Speech
        speech: null,
        speechTimer: 0,
        // Alive
        active: true,
      };
      this.agents.push(agent);
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
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ col: node.col, row: node.row });
          node = node.parent;
        }
        return path;
      }

      closed.add(ck);

      // 4 directions
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
    return []; // No path found
  }

  // Update agent FSM
  updateAgent(agent, dt) {
    agent.frameTimer += dt;

    // Animation frame update
    const frameRate = agent.state === 'walk' ? 0.2 : 0.5;
    if (agent.frameTimer >= frameRate) {
      agent.frameTimer = 0;
      agent.frame++;
    }

    // Speech timer
    if (agent.speech) {
      agent.speechTimer -= dt;
      if (agent.speechTimer <= 0) {
        agent.speech = null;
      }
    }

    // State timer
    agent.stateTimer -= dt;

    switch (agent.state) {
      case 'type':
        if (agent.stateTimer <= 0) {
          // Randomly speak while typing
          if (Math.random() < 0.3) {
            agent.speech = PixelSprites.speeches[Math.floor(Math.random() * PixelSprites.speeches.length)];
            agent.speechTimer = 3;
          }

          // Decide: keep typing, go walk, or go idle
          const r = Math.random();
          if (r < 0.4) {
            // Go for a walk
            agent.state = 'walk';
            const target = this.randomWalkTarget(agent);
            agent.path = this.findPath(agent.col, agent.row, target.col, target.row);
            agent.pathIdx = 0;
            agent.stateTimer = 20;
          } else if (r < 0.6) {
            // Go idle for a moment
            agent.state = 'idle';
            agent.stateTimer = Math.random() * 3 + 1;
          } else {
            // Keep typing
            agent.stateTimer = Math.random() * 8 + 4;
          }
        }
        break;

      case 'walk':
        if (agent.path.length > 0 && agent.pathIdx < agent.path.length) {
          const target = agent.path[agent.pathIdx];
          const tx = target.col * this.T + this.T / 2;
          const ty = target.row * this.T + this.T / 2;

          // Move toward target
          const speed = 50; // pixels per second
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
            // Update direction
            if (Math.abs(dx) > Math.abs(dy)) {
              agent.dir = dx > 0 ? 'right' : 'left';
            } else {
              agent.dir = dy > 0 ? 'down' : 'up';
            }
          }
        } else {
          // Path complete or no path — return to seat or go idle
          if (agent.seatIdx !== undefined) {
            const seat = this.seats[agent.seatIdx];
            if (agent.col === seat.col && agent.row === seat.row) {
              agent.state = 'type';
              agent.dir = 'down';
              agent.stateTimer = Math.random() * 10 + 5;
            } else {
              // Path back to seat
              agent.path = this.findPath(agent.col, agent.row, seat.col, seat.row);
              agent.pathIdx = 0;
              if (agent.path.length === 0) {
                agent.state = 'idle';
                agent.stateTimer = 2;
              }
            }
          } else {
            agent.state = 'idle';
            agent.stateTimer = Math.random() * 3 + 1;
          }
        }
        break;

      case 'idle':
        if (agent.stateTimer <= 0) {
          // Go back to seat to type
          const seat = this.seats[agent.seatIdx];
          agent.path = this.findPath(agent.col, agent.row, seat.col, seat.row);
          agent.pathIdx = 0;
          agent.state = agent.path.length > 0 ? 'walk' : 'type';
          agent.stateTimer = agent.state === 'walk' ? 20 : (Math.random() * 8 + 4);
          agent.dir = 'down';

          // Maybe say something
          if (Math.random() < 0.5) {
            agent.speech = PixelSprites.speeches[Math.floor(Math.random() * PixelSprites.speeches.length)];
            agent.speechTimer = 3.5;
          }
        }
        break;
    }
  }

  randomWalkTarget(agent) {
    // Pick a random walkable tile
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

  // Resize canvas to fit window
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';

    // Dynamic status bar height instead of hardcoded 40px
    const statusBar = document.querySelector('.status-bar');
    const barH = statusBar ? statusBar.offsetHeight : 40;

    // Calculate scale to fit office in viewport
    const officeW = this.cols * this.T;
    const officeH = this.rows * this.T;
    const viewH = H - barH;

    this.scale = Math.min(W / officeW, viewH / officeH) * dpr;
    this.offsetX = (W * dpr - officeW * this.scale) / 2;
    this.offsetY = barH * dpr + (viewH * dpr - officeH * this.scale) / 2;
  }

  // Mouse move for hover detection
  onMouseMove(e) {
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (e.clientX * dpr - this.offsetX) / this.scale;
    const canvasY = (e.clientY * dpr - this.offsetY) / this.scale;

    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.hoveredAgent = null;

    for (const agent of this.agents) {
      const ax = agent.x - CHAR_W / 2;
      const ay = agent.y - CHAR_H;
      if (canvasX >= ax && canvasX <= ax + CHAR_W &&
          canvasY >= ay && canvasY <= ay + CHAR_H) {
        this.hoveredAgent = agent;
        break;
      }
    }

    // Update agent panel
    const panel = document.getElementById('agent-panel');
    if (this.hoveredAgent) {
      const a = this.hoveredAgent;
      panel.style.display = 'block';
      panel.style.left = (e.clientX + 16) + 'px';
      panel.style.top = (e.clientY - 10) + 'px';
      document.getElementById('panel-name').textContent = '⚡ ' + a.name;
      document.getElementById('panel-role').textContent = a.palette.name;
      const stateNames = { type: '工作中', walk: '走動中', idle: '休息中' };
      document.getElementById('panel-status').textContent = stateNames[a.state] || a.state;
    } else {
      panel.style.display = 'none';
    }
  }

  // Tap handler (click + touch)
  onTap(clientX, clientY) {
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (clientX * dpr - this.offsetX) / this.scale;
    const canvasY = (clientY * dpr - this.offsetY) / this.scale;
    const hitPad = 8; // extra pixels for touch targets

    let tapped = null;
    for (const agent of this.agents) {
      const ax = agent.x - CHAR_W / 2 - hitPad;
      const ay = agent.y - CHAR_H - hitPad;
      const aw = CHAR_W + hitPad * 2;
      const ah = CHAR_H + hitPad * 2;
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

  // Show speech bubble on agent (called from chat)
  showAgentSpeech(agentId, text) {
    const agent = this.agents.find(a => a.id === agentId);
    if (agent) {
      agent.speech = text.length > 20 ? text.slice(0, 20) + '…' : text;
      agent.speechTimer = 4;
    }
  }

  // Main update
  update(dt) {
    this.frame++;
    for (const agent of this.agents) {
      this.updateAgent(agent, dt);
    }
  }

  // Main render
  render() {
    const { ctx, T, scale, offsetX, offsetY } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Clear
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Apply transform
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    // 1. Draw tiles (floor)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * T;
        const y = r * T;
        switch (this.map[r][c]) {
          case 0: PixelSprites.drawFloorTile(ctx, x, y, (r * 7 + c) % 3); break;
          case 1: PixelSprites.drawWallTile(ctx, x, y); break;
          case 2: PixelSprites.drawKitchenFloor(ctx, x, y); break;
          case 3: PixelSprites.drawCarpetTile(ctx, x, y); break;
        }
      }
    }

    // 2. Collect all renderables for z-sorting
    const renderables = [];

    // Add furniture
    for (const f of this.furniture) {
      renderables.push({ type: 'furniture', data: f, zY: f.zY });
    }

    // Add agents
    for (const agent of this.agents) {
      renderables.push({ type: 'agent', data: agent, zY: agent.y });
    }

    // Z-sort
    renderables.sort((a, b) => a.zY - b.zY);

    // 3. Render all sorted items
    for (const item of renderables) {
      if (item.type === 'furniture') {
        this.renderFurniture(item.data);
      } else {
        this.renderAgent(item.data);
      }
    }

    // 4. Render speech bubbles (always on top)
    for (const agent of this.agents) {
      if (agent.speech) {
        const sx = agent.x;
        const sy = agent.y - CHAR_H - 4;
        PixelSprites.drawBubble(ctx, sx, sy, agent.speech);
      }
    }

    // 5. Render selected agent breathing glow
    if (this.selectedAgent) {
      const a = this.selectedAgent;
      const glow = 0.3 + 0.3 * Math.sin(Date.now() / 400);
      ctx.strokeStyle = `rgba(88, 166, 255, ${glow})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(a.x - CHAR_W / 2 - 3, a.y - CHAR_H - 3, CHAR_W + 6, CHAR_H + 8);
    }

    // 6. Render hovered agent highlight
    if (this.hoveredAgent && this.hoveredAgent !== this.selectedAgent) {
      const a = this.hoveredAgent;
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x - CHAR_W / 2 - 2, a.y - CHAR_H - 2, CHAR_W + 4, CHAR_H + 6);
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
    }
  }

  drawMeetingTable(ctx, x, y) {
    // Large meeting table spanning 2x2 tiles
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, y + 4, TILE * 2, TILE - 4);
    ctx.fillStyle = '#a07818';
    ctx.fillRect(x, y + 4, TILE * 2, 3);
    // Legs
    ctx.fillStyle = '#6b5210';
    ctx.fillRect(x + 4, y + TILE, 3, 6);
    ctx.fillRect(x + TILE * 2 - 7, y + TILE, 3, 6);
    // Papers on table
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x + 10, y + 10, 12, 8);
    ctx.fillRect(x + TILE + 8, y + 12, 10, 6);
  }

  renderAgent(agent) {
    const spriteCanvas = PixelSprites.drawCharacter(
      agent.palette, agent.dir, agent.frame, agent.state
    );

    // Draw scaled sprite
    const dx = agent.x - CHAR_W / 2;
    const dy = agent.y - CHAR_H;
    this.ctx.drawImage(spriteCanvas, dx, dy, CHAR_W, CHAR_H);

    // Name label below agent
    this.ctx.font = '5px sans-serif';
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(agent.name, agent.x, agent.y + 6);
    this.ctx.textAlign = 'left';
  }

  // Game loop
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
