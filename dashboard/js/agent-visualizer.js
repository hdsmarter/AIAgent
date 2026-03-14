/**
 * AgentVisualizer — Canvas 2D pixel-art agent with FSM states
 * States: active (working), idle (breathing), waiting (pulsing), offline (dim)
 */
class AgentVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.state = 'idle';
    this.frame = 0;
    this.animFrame = null;

    // Pixel scale (each "pixel" is 8x8 real pixels)
    this.scale = 8;

    // Color palette
    this.colors = {
      active:  { body: '#58a6ff', eye: '#ffffff', glow: 'rgba(88, 166, 255, 0.3)' },
      idle:    { body: '#3fb950', eye: '#ffffff', glow: 'rgba(63, 185, 80, 0.2)' },
      waiting: { body: '#d29922', eye: '#ffffff', glow: 'rgba(210, 153, 34, 0.2)' },
      offline: { body: '#484f58', eye: '#30363d', glow: 'rgba(0, 0, 0, 0)' }
    };
  }

  setState(newState) {
    if (['active', 'idle', 'waiting', 'offline'].includes(newState)) {
      this.state = newState;
    }
  }

  start() {
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.animFrame);
  }

  animate() {
    this.frame++;
    this.draw();
    this.animFrame = requestAnimationFrame(() => this.animate());
  }

  draw() {
    const { ctx, canvas, scale, state, frame, colors } = this;
    const palette = colors[state];
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Animation offsets based on state
    let breathe = 0;
    let eyeBlink = false;

    switch (state) {
      case 'active':
        // Fast bobbing
        breathe = Math.sin(frame * 0.15) * 2;
        eyeBlink = frame % 60 < 3;
        break;
      case 'idle':
        // Slow breathing
        breathe = Math.sin(frame * 0.04) * 1.5;
        eyeBlink = frame % 120 < 3;
        break;
      case 'waiting':
        // Pulsing
        breathe = Math.sin(frame * 0.08) * 1;
        eyeBlink = frame % 90 < 3;
        break;
      case 'offline':
        breathe = 0;
        eyeBlink = true; // Eyes always "closed"
        break;
    }

    const cx = w / 2;
    const cy = h / 2 + breathe;

    // Glow effect
    if (state !== 'offline') {
      const glowSize = 40 + Math.sin(frame * 0.05) * 5;
      const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowSize);
      gradient.addColorStop(0, palette.glow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Body (robot shape — 8x10 pixel grid centered)
    const px = (x, y) => {
      ctx.fillRect(
        cx + (x - 4) * scale,
        cy + (y - 6) * scale,
        scale - 1,
        scale - 1
      );
    };

    ctx.fillStyle = palette.body;

    // Head (6 wide, 4 tall, centered)
    for (let x = 2; x < 7; x++) for (let y = 0; y < 4; y++) px(x, y);
    // Antenna
    px(4, -1);

    // Body (6 wide, 4 tall)
    for (let x = 2; x < 7; x++) for (let y = 5; y < 9; y++) px(x, y);
    // Neck
    px(3, 4); px(4, 4); px(5, 4);

    // Arms
    px(1, 5); px(1, 6);
    px(7, 5); px(7, 6);

    // Active state: arms move
    if (state === 'active') {
      const armWave = Math.sin(frame * 0.2) > 0;
      if (armWave) {
        px(0, 5);
        px(8, 6);
      } else {
        px(1, 7);
        px(7, 7);
      }
    }

    // Legs
    px(3, 9); px(3, 10);
    px(5, 9); px(5, 10);

    // Eyes
    if (!eyeBlink) {
      ctx.fillStyle = palette.eye;
      px(3, 2);
      px(5, 2);
    }

    // Mouth (changes with state)
    ctx.fillStyle = palette.eye;
    if (state === 'active') {
      // Smile
      px(3, 3); px(4, 3); px(5, 3);
    } else if (state === 'waiting') {
      // Neutral
      px(3, 3); px(5, 3);
    } else if (state === 'idle') {
      // Slight smile
      px(4, 3);
    }
    // offline: no mouth

    // Lightning bolt accent (⚡ brand)
    if (state === 'active' && frame % 30 < 15) {
      ctx.fillStyle = '#ffd700';
      px(8, 1); px(7, 2); px(8, 2); px(7, 3);
    }
  }
}
