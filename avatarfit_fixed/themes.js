// ── AvatarFit background themes ──────────────────────────────────────────────
window.currentTheme = 0; // 0=desert 1=underwater 2=lab
window.THEME_NAMES  = ['🏜️ Desert', '🌊 Ocean', '🧪 Lab'];
window.cycleTheme   = function() {
  window.currentTheme = (window.currentTheme + 1) % 3;
  themesInited = false;
  return window.THEME_NAMES[window.currentTheme];
};

// ── Shared particle state ─────────────────────────────
let themesInited = false;
let fish    = [];
let bubbles = [];

function initThemeState(w, h) {
  fish = Array.from({ length: 7 }, (_, i) => ({
    x:   Math.random() * w,
    y:   h * (0.15 + Math.random() * 0.60),
    spd: 0.6 + Math.random() * 1.4,
    dir: Math.random() > 0.5 ? 1 : -1,
    sz:  14 + Math.random() * 18,
    hue: [185, 200, 160, 35, 55, 270, 25][i],
  }));
  bubbles = Array.from({ length: 24 }, () => ({
    x:      Math.random() * w,
    y:      Math.random() * h,
    r:      2.5 + Math.random() * 5,
    spd:    0.4 + Math.random() * 0.9,
    wobble: Math.random() * Math.PI * 2,
  }));
  themesInited = true;
}

// ════════════════════════════════════════════════════════
//  THEME 0 — DESERT  (warm, bright, sunny)
// ════════════════════════════════════════════════════════
function drawDesert(ctx, w, h, t) {
  // Sky — bright blue at top fading to warm golden orange at horizon
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.58);
  sky.addColorStop(0,    '#3A9BD5');   // bright sky blue
  sky.addColorStop(0.45, '#F5A623');   // golden orange
  sky.addColorStop(1,    '#E8691A');   // burnt orange
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun glow
  const sx = w * 0.78, sy = h * 0.14;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 80);
  glow.addColorStop(0,   'rgba(255,240,100,0.7)');
  glow.addColorStop(0.4, 'rgba(255,200,50,0.3)');
  glow.addColorStop(1,   'rgba(255,160,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI * 2); ctx.fill();
  // Sun disc
  ctx.fillStyle = '#FFF176';
  ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFEE58';
  ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();

  // Distant rock/mesa silhouette — warm reddish-brown
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.moveTo(0, h);
  const mesa = [0,0.60, 0.05,0.52, 0.12,0.57, 0.20,0.46, 0.30,0.58, 0.40,0.44, 0.50,0.54, 0.60,0.44, 0.70,0.51, 0.80,0.44, 0.90,0.53, 1,0.57];
  for (let i = 0; i < mesa.length; i += 2) ctx.lineTo(w * mesa[i], h * mesa[i + 1]);
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

  // Dune 1 — warm golden sand
  const d1 = ctx.createLinearGradient(0, h * 0.58, 0, h);
  d1.addColorStop(0, '#E8A826');
  d1.addColorStop(0.4, '#D4881A');
  d1.addColorStop(1, '#A0601A');
  ctx.fillStyle = d1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.70);
  const ox = Math.sin(t * 0.004) * 7;
  ctx.bezierCurveTo(w * 0.15, h * 0.58, w * 0.28 + ox, h * 0.63, w * 0.44, h * 0.70);
  ctx.bezierCurveTo(w * 0.60, h * 0.77, w * 0.76, h * 0.60, w, h * 0.66);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  // Dune 2 — darker foreground
  const d2 = ctx.createLinearGradient(0, h * 0.76, 0, h);
  d2.addColorStop(0, '#C07818');
  d2.addColorStop(1, '#7A4A10');
  ctx.fillStyle = d2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.83);
  ctx.bezierCurveTo(w * 0.22, h * 0.73, w * 0.42, h * 0.88, w * 0.60, h * 0.80);
  ctx.bezierCurveTo(w * 0.78, h * 0.72, w * 0.90, h * 0.86, w, h * 0.78);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  // Cacti (bright green)
  drawCactus(ctx, w * 0.08, h * 0.63, h * 0.21);
  drawCactus(ctx, w * 0.90, h * 0.61, h * 0.17);

  // Heat shimmer lines near horizon
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(255,200,80,${0.10 - i * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const y = h * (0.60 + i * 0.02) + Math.sin(x * 0.04 + t * 0.06 + i) * 1.8;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Birds
  const bp = t * 0.006;
  [[0.25, 0.10], [0.40, 0.07], [0.54, 0.11]].forEach(([bx, by], i) => {
    const x = ((bx + bp * 0.03 * (i + 1)) % 1.1) * w;
    drawBird(ctx, x, by * h + Math.sin(bp * 1.5 + i) * 5, 6 + i * 1.5);
  });
}

function drawCactus(ctx, x, base, h) {
  const tw = h * 0.13;
  ctx.fillStyle = '#3A7D44';
  ctx.beginPath(); ctx.roundRect(x - tw / 2, base - h, tw, h, 5); ctx.fill();
  ctx.fillStyle = '#2D6035';
  // Left arm
  ctx.beginPath(); ctx.roundRect(x - tw * 2.4, base - h * 0.62, tw * 2.0, tw * 0.85, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - tw * 2.5, base - h * 0.62 - tw * 1.4, tw, tw * 1.4, 4); ctx.fill();
  // Right arm
  ctx.beginPath(); ctx.roundRect(x + tw * 0.5, base - h * 0.46, tw * 2.0, tw * 0.85, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + tw * 2.4, base - h * 0.46 - tw * 1.2, tw, tw * 1.2, 4); ctx.fill();
}

function drawBird(ctx, x, y, sz) {
  ctx.strokeStyle = 'rgba(40,20,0,0.5)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - sz, y);
  ctx.quadraticCurveTo(x - sz / 2, y - sz * 0.45, x, y);
  ctx.quadraticCurveTo(x + sz / 2, y - sz * 0.45, x + sz, y);
  ctx.stroke();
}

// ════════════════════════════════════════════════════════
//  THEME 1 — UNDERWATER  (vivid ocean blue-teal)
// ════════════════════════════════════════════════════════
function drawUnderwater(ctx, w, h, t) {
  // Ocean — brighter mid-tone blue, not pitch black
  const oc = ctx.createLinearGradient(0, 0, 0, h);
  oc.addColorStop(0,    '#006994');   // bright ocean blue at surface
  oc.addColorStop(0.45, '#004E73');
  oc.addColorStop(1,    '#002B40');   // deeper dark blue at bottom
  ctx.fillStyle = oc;
  ctx.fillRect(0, 0, w, h);

  // Bright light rays from surface
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const rx = w * (0.06 + i * 0.13) + Math.sin(t * 0.014 + i * 0.9) * 14;
    const sp = 28 + Math.sin(t * 0.009 + i * 0.7) * 10;
    const ray = ctx.createLinearGradient(rx, 0, rx + sp * 0.3, h * 0.78);
    ray.addColorStop(0, 'rgba(150,230,255,0.22)');
    ray.addColorStop(0.6, 'rgba(80,190,255,0.08)');
    ray.addColorStop(1, 'rgba(0,120,200,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + sp, h * 0.78);
    ctx.lineTo(rx + sp * 0.5, h * 0.78);
    ctx.lineTo(rx - sp * 0.3, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Surface shimmer line
  ctx.strokeStyle = 'rgba(150,230,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = 6 + Math.sin(x * 0.03 + t * 0.08) * 4;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Seaweed (brighter green)
  for (let i = 0; i < 9; i++) {
    drawSeaweed(ctx, w * (0.04 + i * 0.115), h, h * (0.12 + (i % 3) * 0.04), t + i * 22);
  }

  // Coral
  drawCoral(ctx, w * 0.04, h, t);
  drawCoral(ctx, w * 0.46, h, t + 18);
  drawCoral(ctx, w * 0.93, h, t + 35);

  // Bubbles
  ctx.save();
  bubbles.forEach(b => {
    b.y      -= b.spd;
    b.wobble += 0.028;
    if (b.y + b.r < 0) { b.y = h + b.r; b.x = Math.random() * w; }
    const bx = b.x + Math.sin(b.wobble) * 3;
    ctx.beginPath(); ctx.arc(bx, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160,230,255,0.55)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,240,255,0.12)';
    ctx.fill();
  });
  ctx.restore();

  // Fish
  fish.forEach((f, i) => {
    f.x += f.spd * f.dir;
    if (f.dir > 0 && f.x > w + 70)  { f.x = -70;    f.y = h * (0.12 + Math.random() * 0.62); }
    if (f.dir < 0 && f.x < -70)     { f.x = w + 70; f.y = h * (0.12 + Math.random() * 0.62); }
    drawFish(ctx, f.x, f.y + Math.sin(t * 0.022 + i) * 3, f.sz, f.dir, f.hue, t);
  });

  // Sandy floor gradient
  const sf = ctx.createLinearGradient(0, h * 0.87, 0, h);
  sf.addColorStop(0,   'rgba(90,70,30,0)');
  sf.addColorStop(0.3, 'rgba(80,60,28,0.8)');
  sf.addColorStop(1,   'rgba(60,45,18,0.98)');
  ctx.fillStyle = sf;
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
}

function drawFish(ctx, x, y, sz, dir, hue, t) {
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  const wag = Math.sin(t * 0.15) * 0.28;

  ctx.fillStyle = `hsla(${hue},75%,52%,0.92)`;
  ctx.beginPath();
  ctx.moveTo(-sz * 0.28, 0);
  ctx.lineTo(-sz * 1.0, -sz * (0.33 + wag));
  ctx.lineTo(-sz * 1.0,  sz * (0.33 - wag));
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = `hsla(${hue},80%,62%,0.95)`;
  ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.64, sz * 0.36, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = `hsla(${hue + 25},65%,80%,0.45)`;
  ctx.beginPath(); ctx.ellipse(sz * 0.08, sz * 0.06, sz * 0.28, sz * 0.18, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = `hsla(${hue},65%,42%,0.80)`;
  ctx.beginPath();
  ctx.moveTo(0, -sz * 0.34); ctx.lineTo(sz * 0.28, -sz * 0.68); ctx.lineTo(sz * 0.48, -sz * 0.34);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sz * 0.38, -sz * 0.08, sz * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(sz * 0.40, -sz * 0.08, sz * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(sz * 0.41, -sz * 0.10, sz * 0.022, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawSeaweed(ctx, x, baseY, height, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(40,170,70,0.80)';
  ctx.lineWidth   = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, baseY);
  for (let i = 1; i <= 7; i++) {
    const pct  = i / 7;
    const sway = Math.sin(t * 0.024 + pct * 3.2) * (14 * pct);
    ctx.quadraticCurveTo(x + sway * 1.6, baseY - height * (pct - 0.5 / 7), x + sway, baseY - height * pct);
  }
  ctx.stroke(); ctx.restore();
}

function drawCoral(ctx, x, baseY, t) {
  [['#FF6B6B', 0], ['#FF8C42', 14], ['#FFD600', -12]].forEach(([col, dx]) => {
    ctx.strokeStyle = col + 'b0';
    ctx.lineWidth   = 2.5;
    drawCoralBranch(ctx, x + dx, baseY, -Math.PI / 2 + Math.sin(t * 0.018) * 0.06, 26, 4);
  });
}

function drawCoralBranch(ctx, x, y, ang, len, depth) {
  if (depth === 0 || len < 5) return;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  drawCoralBranch(ctx, ex, ey, ang - 0.44, len * 0.70, depth - 1);
  drawCoralBranch(ctx, ex, ey, ang + 0.44, len * 0.70, depth - 1);
}

// ════════════════════════════════════════════════════════
//  THEME 2 — LABORATORY  (dark but vivid green neon)
// ════════════════════════════════════════════════════════
function drawLab(ctx, w, h, t) {
  // Background — very dark with subtle green tint
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#050d07');
  bg.addColorStop(1, '#070e05');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Bright grid
  ctx.strokeStyle = 'rgba(0,255,100,0.10)';
  ctx.lineWidth   = 0.8;
  const gs = 36;
  for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Circuit lines along edges
  drawCircuitLines(ctx, w, h, t);

  // Glowing molecules
  [
    [w * 0.10, h * 0.18, 0.0],
    [w * 0.88, h * 0.17, 1.4],
    [w * 0.07, h * 0.74, 0.9],
    [w * 0.91, h * 0.76, 2.1],
    [w * 0.50, h * 0.09, 1.0],
  ].forEach(([cx, cy, ph]) => {
    drawMolecule(ctx,
      cx + Math.sin(t * 0.011 + ph) * 9,
      cy + Math.cos(t * 0.010 + ph) * 6,
      t, ph);
  });

  // Bright scanning line
  const scanY = (t * 1.4) % (h + 60) - 30;
  const sg = ctx.createLinearGradient(0, scanY - 24, 0, scanY + 24);
  sg.addColorStop(0,   'rgba(0,255,100,0)');
  sg.addColorStop(0.5, 'rgba(0,255,100,0.09)');
  sg.addColorStop(1,   'rgba(0,255,100,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, scanY - 24, w, 48);

  // Full-width horizontal scan glow
  ctx.strokeStyle = `rgba(0,255,100,${0.04 + Math.sin(t * 0.035) * 0.02})`;
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();

  // Data bars bottom-left
  drawDataBars(ctx, 10, h - 60, t);

  // Beaker bottom-right
  drawBeaker(ctx, w - 52, h - 74, t);

  // Pulsing corner markers
  [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]].forEach(([cx, cy]) => {
    const a = 0.4 + Math.sin(t * 0.055 + cx * 0.01) * 0.35;
    ctx.fillStyle   = `rgba(0,255,100,${a})`;
    ctx.strokeStyle = `rgba(0,255,100,${a * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
  });
}

function drawMolecule(ctx, cx, cy, t, ph) {
  const bonds = [[0, -32], [28, 16], [-28, 16]];
  ctx.strokeStyle = 'rgba(0,220,90,0.5)';
  ctx.lineWidth   = 1.5;
  bonds.forEach(([bx, by]) => {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + bx, cy + by); ctx.stroke();
  });
  const pulse = 0.6 + Math.sin(t * 0.06 + ph) * 0.3;
  // Centre glow
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
  cg.addColorStop(0, `rgba(0,255,120,${pulse})`);
  cg.addColorStop(1, 'rgba(0,255,120,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle   = `rgba(0,255,120,${pulse})`;
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(0,255,120,${pulse * 0.6})`;
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
  bonds.forEach(([bx, by]) => {
    ctx.fillStyle = `rgba(100,255,180,${pulse * 0.8})`;
    ctx.beginPath(); ctx.arc(cx + bx, cy + by, 5, 0, Math.PI * 2); ctx.fill();
  });
}

function drawDataBars(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(0,200,80,0.12)';
  ctx.beginPath(); ctx.roundRect(x - 4, y - 4, 78, 42, 5); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const bh  = 9 + Math.abs(Math.sin(t * 0.038 + i * 0.95)) * 26;
    const col = `hsl(${130 + i * 12}, 100%, ${55 + i * 4}%)`;
    ctx.fillStyle = col.replace(')', `, 0.75)`).replace('hsl', 'hsla');
    ctx.fillRect(x + i * 11, y + 34 - bh, 8, bh);
  }
}

function drawBeaker(ctx, x, y, t) {
  const liq = 0.45 + Math.sin(t * 0.028) * 0.06;
  ctx.strokeStyle = 'rgba(0,230,110,0.5)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(x - 20, y); ctx.lineTo(x - 22, y + 50);
  ctx.lineTo(x + 22, y + 50); ctx.lineTo(x + 20, y);
  ctx.stroke();
  const liqY = y + 50 - 46 * liq;
  const lg   = ctx.createLinearGradient(0, liqY, 0, y + 50);
  lg.addColorStop(0, 'rgba(0,220,255,0.30)');
  lg.addColorStop(1, 'rgba(0,160,220,0.55)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(x - 21, liqY); ctx.lineTo(x + 21, liqY);
  ctx.lineTo(x + 21.5, y + 49); ctx.lineTo(x - 21.5, y + 49);
  ctx.closePath(); ctx.fill();
  // Glow on liquid surface
  ctx.strokeStyle = 'rgba(100,240,255,0.6)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(x - 21, liqY); ctx.lineTo(x + 21, liqY); ctx.stroke();
  // Rising bubbles
  for (let i = 0; i < 3; i++) {
    const by = y + 50 - ((t * 0.8 + i * 17) % (46 * liq));
    ctx.fillStyle = 'rgba(0,230,255,0.55)';
    ctx.beginPath(); ctx.arc(x - 10 + i * 10, by, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  [0.3, 0.5, 0.7].forEach(f => {
    const my = y + 50 - 46 * f;
    ctx.strokeStyle = 'rgba(0,220,100,0.28)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x + 14, my); ctx.lineTo(x + 21, my); ctx.stroke();
  });
}

function drawCircuitLines(ctx, w, h, t) {
  ctx.strokeStyle = 'rgba(0,200,80,0.18)';
  ctx.lineWidth   = 1.2;
  const paths = [
    [[0, h * 0.32], [w * 0.10, h * 0.32], [w * 0.10, h * 0.18], [w * 0.28, h * 0.18]],
    [[w, h * 0.52], [w * 0.87, h * 0.52], [w * 0.87, h * 0.68], [w * 0.70, h * 0.68]],
    [[w * 0.18, 0],  [w * 0.18, h * 0.11], [w * 0.36, h * 0.11]],
  ];
  paths.forEach(pts => {
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    ctx.stroke();
    pts.forEach(p => {
      const a = 0.35 + Math.sin(t * 0.04 + p[0] * 0.012) * 0.22;
      ctx.fillStyle   = `rgba(0,220,80,${a})`;
      ctx.strokeStyle = `rgba(0,220,80,${a * 0.4})`;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], 7,   0, Math.PI * 2); ctx.stroke();
    });
  });
}

// ════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════
window.drawThemeBg = function(ctx, canvas, tick) {
  const w = canvas.width, h = canvas.height;
  if (!themesInited) initThemeState(w, h);
  switch (window.currentTheme) {
    case 0: drawDesert(ctx, w, h, tick);     break;
    case 1: drawUnderwater(ctx, w, h, tick); break;
    case 2: drawLab(ctx, w, h, tick);        break;
  }
};
