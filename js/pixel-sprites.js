/**
 * pixel-sprites.js — Programmatic pixel art sprites for office scene
 * All sprites drawn as small pixel arrays then scaled up on canvas
 */

// roundRect polyfill (Chrome<99, Safari<15.4, Firefox<112)
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

const TILE = 32;   // Base tile size in pixels
const CHAR_W = 16; // Character width
const CHAR_H = 24; // Character height

const PixelSprites = {
  // Color palettes for AI agents
  agentPalettes: [
    { hair: '#2d1b69', skin: '#f4c89e', shirt: '#4a90d9', pants: '#2c3e50', name: '數據分析師' },
    { hair: '#1a1a2e', skin: '#e8b88a', shirt: '#e74c3c', pants: '#34495e', name: '行銷策略師' },
    { hair: '#5d4e37', skin: '#f5d5b8', shirt: '#27ae60', pants: '#2c3e50', name: '財務顧問' },
    { hair: '#8b4513', skin: '#deb887', shirt: '#9b59b6', pants: '#34495e', name: '人資管理師' },
    { hair: '#333333', skin: '#f4c89e', shirt: '#f39c12', pants: '#2c3e50', name: '供應鏈專家' },
    { hair: '#c0392b', skin: '#fddcb5', shirt: '#1abc9c', pants: '#34495e', name: 'IT 架構師' },
    { hair: '#2c3e50', skin: '#e8b88a', shirt: '#3498db', pants: '#2c3e50', name: '專案經理' },
    { hair: '#6b3fa0', skin: '#f5d5b8', shirt: '#e67e22', pants: '#34495e', name: '客服主管' },
  ],

  // Traditional Chinese speech bubble messages
  speeches: [
    '報告完成了！',
    '數據分析中...',
    '這個方案不錯',
    '我來優化流程',
    '客戶回覆了',
    'KPI 達標 ✓',
    '會議準備好了',
    '系統運作正常',
    '正在整理資料',
    '自動化部署中',
    '效率提升 23%',
    '等一下開會',
    '任務已派發',
    '品質檢查通過',
    '明天交報告',
    '這組數據有趣',
    '需要喝杯咖啡',
    '排程已更新',
    '預算審核完畢',
    '新需求進來了',
  ],

  // Draw a character onto a small canvas, return ImageData
  drawCharacter(palette, dir, frame, state) {
    const c = document.createElement('canvas');
    c.width = CHAR_W;
    c.height = CHAR_H;
    const ctx = c.getContext('2d');

    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    };

    const walkBob = (state === 'walk') ? (frame % 2 === 0 ? -1 : 0) : 0;
    const typeBob = (state === 'type') ? (frame % 2 === 0 ? 0 : -1) : 0;
    const yOff = walkBob + typeBob;

    // Shadow
    for (let x = 4; x < 12; x++) px(x, 23, 'rgba(0,0,0,0.15)');

    // Legs
    const legSpread = (state === 'walk' && frame % 2 === 0) ? 1 : 0;
    px(6 - legSpread, 20 + yOff, palette.pants);
    px(6 - legSpread, 21 + yOff, palette.pants);
    px(6 - legSpread, 22 + yOff, '#1a1a1a'); // shoe
    px(9 + legSpread, 20 + yOff, palette.pants);
    px(9 + legSpread, 21 + yOff, palette.pants);
    px(9 + legSpread, 22 + yOff, '#1a1a1a');

    // Body / shirt
    for (let x = 5; x < 11; x++) {
      for (let y = 14; y < 20; y++) {
        px(x, y + yOff, palette.shirt);
      }
    }
    // Shirt collar
    px(7, 13 + yOff, palette.shirt);
    px(8, 13 + yOff, palette.shirt);

    // Arms
    const armSwing = (state === 'walk') ? (frame % 2 === 0 ? 1 : -1) : 0;
    if (state === 'type') {
      // Arms forward typing
      px(4, 16 + yOff, palette.skin);
      px(3, 17 + yOff, palette.skin);
      px(11, 16 + yOff, palette.skin);
      px(12, 17 + yOff, palette.skin);
    } else {
      px(4, 15 + yOff + armSwing, palette.skin);
      px(4, 16 + yOff + armSwing, palette.skin);
      px(11, 15 + yOff - armSwing, palette.skin);
      px(11, 16 + yOff - armSwing, palette.skin);
    }

    // Neck
    px(7, 12 + yOff, palette.skin);
    px(8, 12 + yOff, palette.skin);

    // Head
    for (let x = 5; x < 11; x++) {
      for (let y = 6; y < 12; y++) {
        px(x, y + yOff, palette.skin);
      }
    }

    // Hair
    for (let x = 4; x < 12; x++) {
      px(x, 5 + yOff, palette.hair);
      px(x, 6 + yOff, palette.hair);
    }
    px(4, 7 + yOff, palette.hair);
    px(4, 8 + yOff, palette.hair);
    px(11, 7 + yOff, palette.hair);
    px(11, 8 + yOff, palette.hair);

    // Eyes (direction-aware)
    if (dir === 'up') {
      // No eyes visible from behind
      for (let x = 5; x < 11; x++) {
        px(x, 7 + yOff, palette.hair);
        px(x, 8 + yOff, palette.hair);
      }
    } else {
      const eyeY = 8 + yOff;
      if (dir === 'left') {
        px(5, eyeY, '#1a1a1a');
        px(7, eyeY, '#1a1a1a');
      } else if (dir === 'right') {
        px(8, eyeY, '#1a1a1a');
        px(10, eyeY, '#1a1a1a');
      } else {
        // down / default
        px(6, eyeY, '#1a1a1a');
        px(9, eyeY, '#1a1a1a');
      }
    }

    return c;
  },

  // Tile drawing functions
  drawFloorTile(ctx, x, y, variant) {
    const colors = ['#5a4a3a', '#564636', '#524232'];
    const base = colors[variant % 3];
    ctx.fillStyle = base;
    ctx.fillRect(x, y, TILE, TILE);

    // Wood grain lines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x, y + i * 8 + 3, TILE, 1);
    }

    // Subtle variation
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  },

  drawWallTile(ctx, x, y) {
    // Dark wall
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x, y, TILE, TILE);
    // Wall panel line
    ctx.fillStyle = '#232342';
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    // Subtle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(x, y, TILE, 1);
  },

  drawKitchenFloor(ctx, x, y) {
    const isLight = ((x / TILE + y / TILE) % 2 === 0);
    ctx.fillStyle = isLight ? '#d5cfc6' : '#c4beb5';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.strokeRect(x, y, TILE, TILE);
  },

  drawCarpetTile(ctx, x, y) {
    ctx.fillStyle = '#3a5a7a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    if ((Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0) {
      ctx.fillRect(x, y, TILE, TILE);
    }
  },

  // Furniture drawing
  drawDesk(ctx, x, y) {
    // Desk surface
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x + 2, y + 8, 28, 16);
    // Desk top edge
    ctx.fillStyle = '#a07818';
    ctx.fillRect(x + 2, y + 8, 28, 3);
    // Legs
    ctx.fillStyle = '#6b5210';
    ctx.fillRect(x + 4, y + 24, 3, 6);
    ctx.fillRect(x + 25, y + 24, 3, 6);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x + 4, y + 30, 24, 2);
  },

  drawComputer(ctx, x, y) {
    // Monitor
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 8, y, 16, 12);
    // Screen
    ctx.fillStyle = '#1a4a6a';
    ctx.fillRect(x + 9, y + 1, 14, 10);
    // Screen content flicker
    ctx.fillStyle = 'rgba(100,200,255,0.15)';
    ctx.fillRect(x + 10, y + 3, 8, 1);
    ctx.fillRect(x + 10, y + 5, 10, 1);
    ctx.fillRect(x + 10, y + 7, 6, 1);
    // Stand
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 14, y + 12, 4, 3);
    ctx.fillRect(x + 12, y + 15, 8, 2);
  },

  drawChair(ctx, x, y) {
    // Seat
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 6, y + 14, 20, 8);
    // Back
    ctx.fillStyle = '#7a3c10';
    ctx.fillRect(x + 8, y + 4, 16, 10);
    // Cushion
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(x + 9, y + 5, 14, 8);
    // Legs
    ctx.fillStyle = '#5a3210';
    ctx.fillRect(x + 8, y + 22, 3, 6);
    ctx.fillRect(x + 21, y + 22, 3, 6);
  },

  drawBookshelf(ctx, x, y) {
    // Frame
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 2, y, 28, 30);
    // Shelves
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(x + 3, y + 9, 26, 2);
    ctx.fillRect(x + 3, y + 19, 26, 2);
    // Books (colorful)
    const bookColors = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#1abc9c'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = y + shelf * 10 + 1;
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = bookColors[(shelf * 5 + b) % bookColors.length];
        ctx.fillRect(x + 4 + b * 5, shelfY, 4, 8);
      }
    }
  },

  drawPlant(ctx, x, y) {
    // Pot
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 10, y + 20, 12, 10);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(x + 8, y + 18, 16, 4);
    // Leaves
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x + 12, y + 10, 8, 10);
    ctx.fillRect(x + 8, y + 12, 16, 6);
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(x + 14, y + 6, 4, 6);
    ctx.fillRect(x + 10, y + 8, 12, 4);
  },

  drawVendingMachine(ctx, x, y) {
    // Body
    ctx.fillStyle = '#34495e';
    ctx.fillRect(x + 4, y, 24, 30);
    // Front panel
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 6, y + 2, 20, 20);
    // Display window
    ctx.fillStyle = '#1a8a5a';
    ctx.fillRect(x + 7, y + 3, 18, 8);
    // Items
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + 8, y + 12, 4, 4);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 14, y + 12, 4, 4);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x + 20, y + 12, 4, 4);
    // Slot
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x + 12, y + 24, 8, 4);
  },

  drawClock(ctx, x, y) {
    // Circle
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(x + 16, y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    // Border
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Hands
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 10);
    ctx.lineTo(x + 16 + Math.sin(h / 12 * Math.PI * 2) * 4, y + 10 - Math.cos(h / 12 * Math.PI * 2) * 4);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 10);
    ctx.lineTo(x + 16 + Math.sin(m / 60 * Math.PI * 2) * 6, y + 10 - Math.cos(m / 60 * Math.PI * 2) * 6);
    ctx.stroke();
  },

  drawFridge(ctx, x, y) {
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(x + 6, y, 20, 30);
    ctx.fillStyle = '#a4aab0';
    ctx.fillRect(x + 7, y + 1, 18, 12);
    ctx.fillRect(x + 7, y + 15, 18, 14);
    // Handle
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 23, y + 6, 2, 4);
    ctx.fillRect(x + 23, y + 20, 2, 4);
  },

  drawPainting(ctx, x, y) {
    // Frame
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x + 4, y + 2, 24, 18);
    // Canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 6, y + 4, 20, 14);
    // Mountains
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 18);
    ctx.lineTo(x + 16, y + 8);
    ctx.lineTo(x + 26, y + 18);
    ctx.fill();
    // Sun
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x + 22, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  drawCoffeeMachine(ctx, x, y) {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 8, y + 8, 16, 16);
    ctx.fillStyle = '#34495e';
    ctx.fillRect(x + 10, y + 10, 12, 8);
    // Cup
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x + 12, y + 20, 8, 6);
    // Light
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x + 20, y + 12, 2, 2);
  },

  drawWaterCooler(ctx, x, y) {
    // Bottle
    ctx.fillStyle = 'rgba(100,180,255,0.5)';
    ctx.fillRect(x + 10, y + 2, 12, 12);
    // Body
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x + 8, y + 14, 16, 14);
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(x + 9, y + 15, 14, 12);
    // Tap
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 12, y + 22, 3, 3);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + 17, y + 22, 3, 3);
  },

  drawWhiteboard(ctx, x, y, w) {
    const width = (w || 2) * TILE;
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 2, y + 2, width - 4, 22);
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x + 4, y + 4, width - 8, 18);
    // Scribbles
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 10);
    ctx.lineTo(x + 30, y + 10);
    ctx.stroke();
    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14);
    ctx.lineTo(x + 24, y + 14);
    ctx.stroke();
    ctx.strokeStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 18);
    ctx.lineTo(x + 36, y + 18);
    ctx.stroke();
  },

  // Speech bubble drawing
  drawBubble(ctx, x, y, text) {
    try {
      ctx.font = '11px "Microsoft JhengHei", "PingFang TC", sans-serif';
      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      const bw = tw + 16;
      const bh = 22;
      const bx = x - bw / 2;
      const by = y - bh - 8;

      // Bubble background
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Triangle pointer
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(x - 4, by + bh);
      ctx.lineTo(x, by + bh + 6);
      ctx.lineTo(x + 4, by + bh);
      ctx.fill();

      // Text
      ctx.fillStyle = '#2c3e50';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, by + bh / 2);
      ctx.textAlign = 'left';
    } catch (e) {
      // Safety net: skip bubble if roundRect still fails
    }
  }
};
