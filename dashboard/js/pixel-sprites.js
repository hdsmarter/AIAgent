/**
 * pixel-sprites.js — Programmatic pixel art sprites for office scene
 * All sprites drawn as small pixel arrays then scaled up on canvas
 * Zero hardcoded colors — all via ThemePalette design system
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

// ── Theme Palette (Design System — Single Source of Truth) ──────────
const ThemePalette = {
  light: {
    // Canvas
    canvasBg: '#e8e0d8',
    // Floor tiles
    floor: ['#d4c4a8', '#d0c0a4', '#ccbca0'],
    floorGrain: 'rgba(0,0,0,0.06)',
    floorHighlight: 'rgba(255,255,255,0.08)',
    // Wall
    wall: '#c8bfa8', wallEdge: '#b8af98', wallHighlight: 'rgba(255,255,255,0.1)',
    // Kitchen
    kitchenLight: '#e8e0d0', kitchenDark: '#d8d0c0', kitchenStroke: 'rgba(0,0,0,0.05)',
    // Carpet
    carpet: '#7a9aba', carpetAlt: 'rgba(255,255,255,0.04)',
    // Lobby
    lobbyBase: '#e0dcd4', lobbyLine: 'rgba(180,170,155,0.3)', lobbyHighlight: 'rgba(255,255,255,0.15)',
    // Factory
    factoryBase: '#b8b0a8', factoryMark: 'rgba(100,90,80,0.12)',
    factorySafety: '#d4a020', factoryEdge: 'rgba(0,0,0,0.08)',
    // Corridor
    corridor: '#c8c0b0', corridorLine: 'rgba(180,170,155,0.2)',
    // Glass wall
    glass: 'rgba(140,180,220,0.25)', glassFrame: '#a0a8b0', glassReflect: 'rgba(255,255,255,0.12)',
    // Desk
    deskSurface: '#c4a050', deskTop: '#d4b060', deskLeg: '#a08040', deskShadow: 'rgba(0,0,0,0.08)',
    // Computer
    monitorFrame: '#3a3a3a', monitorScreen: '#2a5a8a', monitorFlicker: 'rgba(100,200,255,0.15)',
    monitorStand: '#3a3a3a',
    // Chair
    chairSeat: '#a06030', chairBack: '#904a20', chairCushion: '#b06838', chairLeg: '#704020',
    // Bookshelf
    shelfFrame: '#7a5a2a', shelfBoard: '#9a7a3a',
    bookColors: ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#1abc9c'],
    // Plant
    potBase: '#8B4513', potRim: '#a0522d', leafLight: '#2ecc71', leafDark: '#27ae60',
    // Vending machine
    vendBody: '#4a5a6a', vendPanel: '#3a4a5a', vendDisplay: '#1a8a5a',
    vendItems: ['#e74c3c', '#3498db', '#f39c12'], vendSlot: '#1a1a2e',
    // Clock
    clockFace: '#ecf0f1', clockBorder: '#7f8c8d', clockHand: '#2c3e50',
    // Fridge
    fridgeBody: '#bdc3c7', fridgeDoor: '#a4aab0', fridgeHandle: '#7f8c8d',
    // Painting
    paintFrame: '#8B6914', paintSky: '#87CEEB', paintMountain: '#2ecc71', paintSun: '#f1c40f',
    // Coffee machine
    coffeeBody: '#3a4a5a', coffeePanel: '#4a5a6a', coffeeCup: '#ecf0f1', coffeeLed: '#2ecc71',
    // Water cooler
    waterBottle: 'rgba(100,180,255,0.5)', waterBody: '#ecf0f1',
    waterInner: '#bdc3c7', waterTapCold: '#3498db', waterTapHot: '#e74c3c',
    // Whiteboard
    wbFrame: '#7f8c8d', wbSurface: '#f5f5f0',
    wbLines: ['#3498db', '#e74c3c', '#2ecc71'],
    // Meeting table
    mtSurface: '#c4a050', mtTop: '#d4b060', mtLeg: '#a08040', mtPaper: '#f5f5f0',
    // Reception desk
    rcSurface: '#b8924a', rcTop: '#c8a25a', rcLeg: '#987430', rcPhone: '#3a3a3a',
    // Security desk
    secSurface: '#6a6a7a', secScreen: '#1a3a5a', secScreenGlow: 'rgba(0,200,100,0.2)',
    secFrame: '#4a4a5a',
    // Sofa
    sofaBase: '#7a8a9a', sofaBack: '#6a7a8a', sofaCushion: '#8a9aaa',
    // Monitor wall
    mwFrame: '#3a3a4a', mwScreen: '#0a2a4a', mwGlow: 'rgba(0,150,255,0.1)',
    // Conveyor belt
    convBelt: '#7a7a7a', convFrame: '#5a5a5a', convRoller: '#9a9a9a',
    convBox: '#c4a050', convBoxShadow: '#a08030',
    // Safety sign
    signBg: '#f0c000', signBorder: '#1a1a1a', signExcl: '#1a1a1a',
    // Agent label
    agentLabel: 'rgba(60,50,40,0.7)',
    // Speech bubble
    speechBubbleBg: 'rgba(255,255,255,0.95)',
    speechBubbleBorder: 'rgba(0,0,0,0.12)',
    speechBubbleText: '#2c3e50',
    // Selection glow
    selectGlow: 'rgba(26,115,232,',
    hoverGlow: 'rgba(26,115,232,0.5)',
  },
  dark: {
    canvasBg: '#0d1117',
    floor: ['#5a4a3a', '#564636', '#524232'],
    floorGrain: 'rgba(0,0,0,0.08)',
    floorHighlight: 'rgba(255,255,255,0.03)',
    wall: '#2a2a4a', wallEdge: '#232342', wallHighlight: 'rgba(255,255,255,0.03)',
    kitchenLight: '#d5cfc6', kitchenDark: '#c4beb5', kitchenStroke: 'rgba(0,0,0,0.05)',
    carpet: '#3a5a7a', carpetAlt: 'rgba(255,255,255,0.02)',
    lobbyBase: '#4a4a5a', lobbyLine: 'rgba(100,100,120,0.3)', lobbyHighlight: 'rgba(255,255,255,0.05)',
    factoryBase: '#3a3a3a', factoryMark: 'rgba(200,200,200,0.05)',
    factorySafety: '#b08a10', factoryEdge: 'rgba(255,255,255,0.03)',
    corridor: '#4a4a5a', corridorLine: 'rgba(100,100,120,0.2)',
    glass: 'rgba(80,120,180,0.2)', glassFrame: '#5a6a7a', glassReflect: 'rgba(255,255,255,0.06)',
    deskSurface: '#8B6914', deskTop: '#a07818', deskLeg: '#6b5210', deskShadow: 'rgba(0,0,0,0.1)',
    monitorFrame: '#2a2a2a', monitorScreen: '#1a4a6a', monitorFlicker: 'rgba(100,200,255,0.15)',
    monitorStand: '#2a2a2a',
    chairSeat: '#8B4513', chairBack: '#7a3c10', chairCushion: '#a0522d', chairLeg: '#5a3210',
    shelfFrame: '#5a3a1a', shelfBoard: '#7a5a2a',
    bookColors: ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#1abc9c'],
    potBase: '#8B4513', potRim: '#a0522d', leafLight: '#2ecc71', leafDark: '#27ae60',
    vendBody: '#34495e', vendPanel: '#2c3e50', vendDisplay: '#1a8a5a',
    vendItems: ['#e74c3c', '#3498db', '#f39c12'], vendSlot: '#1a1a2e',
    clockFace: '#ecf0f1', clockBorder: '#7f8c8d', clockHand: '#2c3e50',
    fridgeBody: '#bdc3c7', fridgeDoor: '#a4aab0', fridgeHandle: '#7f8c8d',
    paintFrame: '#8B6914', paintSky: '#87CEEB', paintMountain: '#2ecc71', paintSun: '#f1c40f',
    coffeeBody: '#2c3e50', coffeePanel: '#34495e', coffeeCup: '#ecf0f1', coffeeLed: '#2ecc71',
    waterBottle: 'rgba(100,180,255,0.5)', waterBody: '#ecf0f1',
    waterInner: '#bdc3c7', waterTapCold: '#3498db', waterTapHot: '#e74c3c',
    wbFrame: '#7f8c8d', wbSurface: '#ecf0f1',
    wbLines: ['#3498db', '#e74c3c', '#2ecc71'],
    mtSurface: '#8B6914', mtTop: '#a07818', mtLeg: '#6b5210', mtPaper: '#ecf0f1',
    rcSurface: '#8B6914', rcTop: '#a07818', rcLeg: '#6b5210', rcPhone: '#2a2a2a',
    secSurface: '#3a3a4a', secScreen: '#0a2a3a', secScreenGlow: 'rgba(0,200,100,0.15)',
    secFrame: '#2a2a3a',
    sofaBase: '#4a5a6a', sofaBack: '#3a4a5a', sofaCushion: '#5a6a7a',
    mwFrame: '#2a2a3a', mwScreen: '#0a1a2a', mwGlow: 'rgba(0,150,255,0.08)',
    convBelt: '#5a5a5a', convFrame: '#3a3a3a', convRoller: '#7a7a7a',
    convBox: '#8B6914', convBoxShadow: '#6b5210',
    signBg: '#d4a800', signBorder: '#1a1a1a', signExcl: '#1a1a1a',
    agentLabel: 'rgba(255,255,255,0.6)',
    speechBubbleBg: 'rgba(255,255,255,0.92)',
    speechBubbleBorder: 'rgba(0,0,0,0.12)',
    speechBubbleText: '#2c3e50',
    selectGlow: 'rgba(88,166,255,',
    hoverGlow: 'rgba(88,166,255,0.6)',
  },
  _current: 'light',
  get current() { return this[this._current]; },
  set(theme) {
    this._current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hdsmarter-theme', theme);
  },
  init() {
    this.set(localStorage.getItem('hdsmarter-theme') || 'light');
  },
  toggle() {
    this.set(this._current === 'light' ? 'dark' : 'light');
  }
};

const TILE = 32;   // Base tile size in pixels
const CHAR_W = 16; // Character width
const CHAR_H = 24; // Character height

const PixelSprites = {
  // Color palettes for 16 AI agents (names via I18n.agentName(i))
  agentPalettes: [
    { hair: '#2d1b69', skin: '#f4c89e', shirt: '#4a90d9', pants: '#2c3e50' }, // 0 data-analyst
    { hair: '#1a1a2e', skin: '#e8b88a', shirt: '#e74c3c', pants: '#34495e' }, // 1 marketing
    { hair: '#5d4e37', skin: '#f5d5b8', shirt: '#27ae60', pants: '#2c3e50' }, // 2 finance
    { hair: '#8b4513', skin: '#deb887', shirt: '#9b59b6', pants: '#34495e' }, // 3 hr
    { hair: '#333333', skin: '#f4c89e', shirt: '#f39c12', pants: '#2c3e50' }, // 4 supply-chain
    { hair: '#c0392b', skin: '#fddcb5', shirt: '#1abc9c', pants: '#34495e' }, // 5 it-architect
    { hair: '#2c3e50', skin: '#e8b88a', shirt: '#3498db', pants: '#2c3e50' }, // 6 project-mgr
    { hair: '#6b3fa0', skin: '#f5d5b8', shirt: '#e67e22', pants: '#34495e' }, // 7 customer-svc
    { hair: '#1a1a2e', skin: '#f4c89e', shirt: '#5b2c6f', pants: '#2c3e50' }, // 8 legal
    { hair: '#4a3728', skin: '#e8b88a', shirt: '#2874a6', pants: '#34495e' }, // 9 product
    { hair: '#5d4e37', skin: '#fddcb5', shirt: '#e91e63', pants: '#2c3e50' }, // 10 ux
    { hair: '#333333', skin: '#f5d5b8', shirt: '#00bcd4', pants: '#34495e' }, // 11 content
    { hair: '#8b4513', skin: '#f4c89e', shirt: '#1e8449', pants: '#2c3e50' }, // 12 bd
    { hair: '#2d1b69', skin: '#deb887', shirt: '#d4ac0d', pants: '#34495e' }, // 13 quality
    { hair: '#c0392b', skin: '#e8b88a', shirt: '#cb4335', pants: '#2c3e50' }, // 14 security
    { hair: '#6b3fa0', skin: '#f4c89e', shirt: '#7d3c98', pants: '#34495e' }, // 15 hr-director
    { hair: '#2c3e50', skin: '#f4c89e', shirt: '#16a34a', pants: '#1e3a2f' }, // 16 pue-business
  ],

  // Speech bubbles — delegated to I18n
  get speeches() {
    const arr = [];
    for (let i = 0; i < I18n.speechCount; i++) arr.push(I18n.speech(i));
    return arr;
  },

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
        px(6, eyeY, '#1a1a1a');
        px(9, eyeY, '#1a1a1a');
      }
    }

    return c;
  },

  // ── Tile Types 0-3 (existing) ───────────────────────

  drawFloorTile(ctx, x, y, variant) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.floor[variant % 3];
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = p.floorGrain;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x, y + i * 8 + 3, TILE, 1);
    }
    ctx.fillStyle = p.floorHighlight;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  },

  drawWallTile(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = p.wallEdge;
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    ctx.fillStyle = p.wallHighlight;
    ctx.fillRect(x, y, TILE, 1);
  },

  drawKitchenFloor(ctx, x, y) {
    const p = ThemePalette.current;
    const isLight = ((x / TILE + y / TILE) % 2 === 0);
    ctx.fillStyle = isLight ? p.kitchenLight : p.kitchenDark;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = p.kitchenStroke;
    ctx.strokeRect(x, y, TILE, TILE);
  },

  drawCarpetTile(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.carpet;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = p.carpetAlt;
    if ((Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0) {
      ctx.fillRect(x, y, TILE, TILE);
    }
  },

  // ── Tile Types 4-7 (new) ────────────────────────────

  drawLobbyFloor(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.lobbyBase;
    ctx.fillRect(x, y, TILE, TILE);
    // Marble diagonal texture
    ctx.fillStyle = p.lobbyLine;
    ctx.fillRect(x, y + 12, TILE, 1);
    ctx.fillRect(x + 12, y, 1, TILE);
    // Polish highlight
    ctx.fillStyle = p.lobbyHighlight;
    ctx.fillRect(x + 4, y + 4, 8, 8);
  },

  drawFactoryFloor(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.factoryBase;
    ctx.fillRect(x, y, TILE, TILE);
    // Concrete speckle
    ctx.fillStyle = p.factoryMark;
    ctx.fillRect(x + 6, y + 10, 3, 2);
    ctx.fillRect(x + 18, y + 20, 4, 2);
    // Safety line on edges
    ctx.fillStyle = p.factorySafety;
    ctx.fillRect(x, y, TILE, 2);
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    // Subtle edge
    ctx.fillStyle = p.factoryEdge;
    ctx.strokeStyle = p.factoryEdge;
    ctx.strokeRect(x, y, TILE, TILE);
  },

  drawCorridorFloor(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.corridor;
    ctx.fillRect(x, y, TILE, TILE);
    // Direction lines (horizontal)
    ctx.fillStyle = p.corridorLine;
    ctx.fillRect(x, y + 8, TILE, 1);
    ctx.fillRect(x, y + 24, TILE, 1);
  },

  drawGlassWall(ctx, x, y) {
    const p = ThemePalette.current;
    // Aluminum frame
    ctx.fillStyle = p.glassFrame;
    ctx.fillRect(x, y, TILE, TILE);
    // Glass pane
    ctx.fillStyle = p.glass;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    // Reflection streak
    ctx.fillStyle = p.glassReflect;
    ctx.fillRect(x + 6, y + 4, 2, TILE - 8);
    ctx.fillRect(x + 20, y + 8, 2, TILE - 12);
  },

  // ── Furniture (existing, theme-aware) ───────────────

  drawDesk(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.deskSurface;
    ctx.fillRect(x + 2, y + 8, 28, 16);
    ctx.fillStyle = p.deskTop;
    ctx.fillRect(x + 2, y + 8, 28, 3);
    ctx.fillStyle = p.deskLeg;
    ctx.fillRect(x + 4, y + 24, 3, 6);
    ctx.fillRect(x + 25, y + 24, 3, 6);
    ctx.fillStyle = p.deskShadow;
    ctx.fillRect(x + 4, y + 30, 24, 2);
  },

  drawComputer(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.monitorFrame;
    ctx.fillRect(x + 8, y, 16, 12);
    ctx.fillStyle = p.monitorScreen;
    ctx.fillRect(x + 9, y + 1, 14, 10);
    ctx.fillStyle = p.monitorFlicker;
    ctx.fillRect(x + 10, y + 3, 8, 1);
    ctx.fillRect(x + 10, y + 5, 10, 1);
    ctx.fillRect(x + 10, y + 7, 6, 1);
    ctx.fillStyle = p.monitorStand;
    ctx.fillRect(x + 14, y + 12, 4, 3);
    ctx.fillRect(x + 12, y + 15, 8, 2);
  },

  drawChair(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.chairSeat;
    ctx.fillRect(x + 6, y + 14, 20, 8);
    ctx.fillStyle = p.chairBack;
    ctx.fillRect(x + 8, y + 4, 16, 10);
    ctx.fillStyle = p.chairCushion;
    ctx.fillRect(x + 9, y + 5, 14, 8);
    ctx.fillStyle = p.chairLeg;
    ctx.fillRect(x + 8, y + 22, 3, 6);
    ctx.fillRect(x + 21, y + 22, 3, 6);
  },

  drawBookshelf(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.shelfFrame;
    ctx.fillRect(x + 2, y, 28, 30);
    ctx.fillStyle = p.shelfBoard;
    ctx.fillRect(x + 3, y + 9, 26, 2);
    ctx.fillRect(x + 3, y + 19, 26, 2);
    const colors = p.bookColors;
    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = y + shelf * 10 + 1;
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = colors[(shelf * 5 + b) % colors.length];
        ctx.fillRect(x + 4 + b * 5, shelfY, 4, 8);
      }
    }
  },

  drawPlant(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.potBase;
    ctx.fillRect(x + 10, y + 20, 12, 10);
    ctx.fillStyle = p.potRim;
    ctx.fillRect(x + 8, y + 18, 16, 4);
    ctx.fillStyle = p.leafLight;
    ctx.fillRect(x + 12, y + 10, 8, 10);
    ctx.fillRect(x + 8, y + 12, 16, 6);
    ctx.fillStyle = p.leafDark;
    ctx.fillRect(x + 14, y + 6, 4, 6);
    ctx.fillRect(x + 10, y + 8, 12, 4);
  },

  drawVendingMachine(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.vendBody;
    ctx.fillRect(x + 4, y, 24, 30);
    ctx.fillStyle = p.vendPanel;
    ctx.fillRect(x + 6, y + 2, 20, 20);
    ctx.fillStyle = p.vendDisplay;
    ctx.fillRect(x + 7, y + 3, 18, 8);
    ctx.fillStyle = p.vendItems[0];
    ctx.fillRect(x + 8, y + 12, 4, 4);
    ctx.fillStyle = p.vendItems[1];
    ctx.fillRect(x + 14, y + 12, 4, 4);
    ctx.fillStyle = p.vendItems[2];
    ctx.fillRect(x + 20, y + 12, 4, 4);
    ctx.fillStyle = p.vendSlot;
    ctx.fillRect(x + 12, y + 24, 8, 4);
  },

  drawClock(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.clockFace;
    ctx.beginPath();
    ctx.arc(x + 16, y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.clockBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    ctx.strokeStyle = p.clockHand;
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
    const p = ThemePalette.current;
    ctx.fillStyle = p.fridgeBody;
    ctx.fillRect(x + 6, y, 20, 30);
    ctx.fillStyle = p.fridgeDoor;
    ctx.fillRect(x + 7, y + 1, 18, 12);
    ctx.fillRect(x + 7, y + 15, 18, 14);
    ctx.fillStyle = p.fridgeHandle;
    ctx.fillRect(x + 23, y + 6, 2, 4);
    ctx.fillRect(x + 23, y + 20, 2, 4);
  },

  drawPainting(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.paintFrame;
    ctx.fillRect(x + 4, y + 2, 24, 18);
    ctx.fillStyle = p.paintSky;
    ctx.fillRect(x + 6, y + 4, 20, 14);
    ctx.fillStyle = p.paintMountain;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 18);
    ctx.lineTo(x + 16, y + 8);
    ctx.lineTo(x + 26, y + 18);
    ctx.fill();
    ctx.fillStyle = p.paintSun;
    ctx.beginPath();
    ctx.arc(x + 22, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  drawCoffeeMachine(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.coffeeBody;
    ctx.fillRect(x + 8, y + 8, 16, 16);
    ctx.fillStyle = p.coffeePanel;
    ctx.fillRect(x + 10, y + 10, 12, 8);
    ctx.fillStyle = p.coffeeCup;
    ctx.fillRect(x + 12, y + 20, 8, 6);
    ctx.fillStyle = p.coffeeLed;
    ctx.fillRect(x + 20, y + 12, 2, 2);
  },

  drawWaterCooler(ctx, x, y) {
    const p = ThemePalette.current;
    ctx.fillStyle = p.waterBottle;
    ctx.fillRect(x + 10, y + 2, 12, 12);
    ctx.fillStyle = p.waterBody;
    ctx.fillRect(x + 8, y + 14, 16, 14);
    ctx.fillStyle = p.waterInner;
    ctx.fillRect(x + 9, y + 15, 14, 12);
    ctx.fillStyle = p.waterTapCold;
    ctx.fillRect(x + 12, y + 22, 3, 3);
    ctx.fillStyle = p.waterTapHot;
    ctx.fillRect(x + 17, y + 22, 3, 3);
  },

  drawWhiteboard(ctx, x, y, w) {
    const p = ThemePalette.current;
    const width = (w || 2) * TILE;
    ctx.fillStyle = p.wbFrame;
    ctx.fillRect(x + 2, y + 2, width - 4, 22);
    ctx.fillStyle = p.wbSurface;
    ctx.fillRect(x + 4, y + 4, width - 8, 18);
    const lines = p.wbLines;
    ctx.lineWidth = 1;
    ctx.strokeStyle = lines[0];
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 10);
    ctx.lineTo(x + 30, y + 10);
    ctx.stroke();
    ctx.strokeStyle = lines[1];
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14);
    ctx.lineTo(x + 24, y + 14);
    ctx.stroke();
    ctx.strokeStyle = lines[2];
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 18);
    ctx.lineTo(x + 36, y + 18);
    ctx.stroke();
  },

  // ── Furniture (new — manufacturing HQ) ──────────────

  drawReceptionDesk(ctx, x, y) {
    const p = ThemePalette.current;
    // Curved reception counter (2 tiles wide)
    ctx.fillStyle = p.rcSurface;
    ctx.fillRect(x + 2, y + 10, TILE * 2 - 4, 14);
    // Top edge
    ctx.fillStyle = p.rcTop;
    ctx.fillRect(x + 2, y + 10, TILE * 2 - 4, 3);
    // Curved front (arc approximation with rectangles)
    ctx.fillStyle = p.rcSurface;
    ctx.fillRect(x, y + 14, 4, 8);
    ctx.fillRect(x + TILE * 2 - 4, y + 14, 4, 8);
    // Legs
    ctx.fillStyle = p.rcLeg;
    ctx.fillRect(x + 6, y + 24, 3, 6);
    ctx.fillRect(x + TILE * 2 - 9, y + 24, 3, 6);
    // Phone
    ctx.fillStyle = p.rcPhone;
    ctx.fillRect(x + TILE * 2 - 16, y + 12, 6, 4);
    ctx.fillRect(x + TILE * 2 - 14, y + 8, 2, 4);
  },

  drawSecurityDesk(ctx, x, y) {
    const p = ThemePalette.current;
    // Desk surface
    ctx.fillStyle = p.secSurface;
    ctx.fillRect(x + 2, y + 10, 28, 14);
    ctx.fillStyle = p.secFrame;
    ctx.fillRect(x + 2, y + 10, 28, 2);
    // Multi-monitor setup (3 small screens)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = p.secFrame;
      ctx.fillRect(x + 4 + i * 9, y + 1, 8, 8);
      ctx.fillStyle = p.secScreen;
      ctx.fillRect(x + 5 + i * 9, y + 2, 6, 6);
      ctx.fillStyle = p.secScreenGlow;
      ctx.fillRect(x + 5 + i * 9, y + 2, 6, 6);
    }
    // Keyboard
    ctx.fillStyle = p.secFrame;
    ctx.fillRect(x + 8, y + 14, 16, 4);
  },

  drawSofa(ctx, x, y) {
    const p = ThemePalette.current;
    // Sofa base
    ctx.fillStyle = p.sofaBase;
    ctx.fillRect(x + 2, y + 14, 28, 12);
    // Backrest
    ctx.fillStyle = p.sofaBack;
    ctx.fillRect(x + 2, y + 6, 28, 10);
    // Cushions
    ctx.fillStyle = p.sofaCushion;
    ctx.fillRect(x + 4, y + 8, 12, 7);
    ctx.fillRect(x + 18, y + 8, 12, 7);
    // Armrests
    ctx.fillStyle = p.sofaBack;
    ctx.fillRect(x, y + 10, 4, 16);
    ctx.fillRect(x + 28, y + 10, 4, 16);
  },

  drawMonitorWall(ctx, x, y, w) {
    const p = ThemePalette.current;
    const cols = w || 2;
    const width = cols * TILE;
    // Wall mount frame
    ctx.fillStyle = p.mwFrame;
    ctx.fillRect(x + 2, y + 2, width - 4, 24);
    // Screens (2 rows x cols)
    const sw = Math.floor((width - 12) / cols);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = p.mwScreen;
        ctx.fillRect(x + 4 + c * sw, y + 4 + r * 11, sw - 2, 9);
        ctx.fillStyle = p.mwGlow;
        ctx.fillRect(x + 4 + c * sw, y + 4 + r * 11, sw - 2, 9);
      }
    }
  },

  drawConveyorBelt(ctx, x, y) {
    const p = ThemePalette.current;
    // Belt frame
    ctx.fillStyle = p.convFrame;
    ctx.fillRect(x + 2, y + 16, 28, 10);
    // Belt surface
    ctx.fillStyle = p.convBelt;
    ctx.fillRect(x + 4, y + 18, 24, 6);
    // Rollers
    ctx.fillStyle = p.convRoller;
    ctx.fillRect(x + 2, y + 20, 3, 2);
    ctx.fillRect(x + 27, y + 20, 3, 2);
    // Product box
    ctx.fillStyle = p.convBox;
    ctx.fillRect(x + 10, y + 10, 12, 8);
    ctx.fillStyle = p.convBoxShadow;
    ctx.fillRect(x + 10, y + 16, 12, 2);
  },

  drawSafetySign(ctx, x, y) {
    const p = ThemePalette.current;
    // Triangle warning sign
    ctx.fillStyle = p.signBg;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 4);
    ctx.lineTo(x + 28, y + 24);
    ctx.lineTo(x + 4, y + 24);
    ctx.closePath();
    ctx.fill();
    // Border
    ctx.strokeStyle = p.signBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineWidth = 1;
    // Exclamation mark
    ctx.fillStyle = p.signExcl;
    ctx.fillRect(x + 15, y + 10, 2, 7);
    ctx.fillRect(x + 15, y + 19, 2, 2);
  },

  // ── Speech bubble ───────────────────────────────────

  drawBubble(ctx, x, y, text) {
    const p = ThemePalette.current;
    try {
      ctx.font = '11px "Microsoft JhengHei", "PingFang TC", sans-serif';
      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      const bw = tw + 16;
      const bh = 22;
      const bx = x - bw / 2;
      const by = y - bh - 8;

      ctx.fillStyle = p.speechBubbleBg;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      ctx.strokeStyle = p.speechBubbleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = p.speechBubbleBg;
      ctx.beginPath();
      ctx.moveTo(x - 4, by + bh);
      ctx.lineTo(x, by + bh + 6);
      ctx.lineTo(x + 4, by + bh);
      ctx.fill();

      ctx.fillStyle = p.speechBubbleText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, by + bh / 2);
      ctx.textAlign = 'left';
    } catch (e) {
      // Safety net: skip bubble if roundRect still fails
    }
  }
};
