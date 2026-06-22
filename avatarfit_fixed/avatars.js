/**
 * avatars.js
 * Draws a fully articulated avatar whose every limb matches
 * the live MediaPipe / bot joint positions exactly.
 *
 * Improvements in this version:
 *  - Joint smoothing: each joint is lerped toward its target
 *    position over ~4 frames, eliminating MediaPipe jitter.
 *  - Head tilts with the shoulder angle instead of staying upright.
 *  - Hands and feet are drawn as small distinct shapes.
 *  - Rep celebration: avatar flashes gold for 0.5 s after a rep.
 */

// ── Character palettes ────────────────────────────────
const CHARS = {
  1: { skin:'#f5c5a3', hair:'#3b2314', top:'#2563eb', bottom:'#1e3a5f', shoes:'#1e293b', outline:'#1e293b' },
  2: { skin:'#c68642', hair:'#1a1a1a', top:'#dc2626', bottom:'#111827', shoes:'#292524', outline:'#111' },
  3: { skin:'#ffe0bd', hair:'#7c3aed', top:'#059669', bottom:'#064e3b', shoes:'#022c22', outline:'#022c22' },
  4: { skin:'#f5c5a0', hair:'#4a3728', top:'#d63a6e', bottom:'#7044aa', shoes:'#e8e8e0', outline:'#2d1a0e' },
};

// ── Bone / limb maps (unchanged) ──────────────────────
const BONES = [
  ['leftShoulder','rightShoulder'],
  ['leftShoulder','leftElbow'],   ['leftElbow','leftWrist'],
  ['rightShoulder','rightElbow'], ['rightElbow','rightWrist'],
  ['leftShoulder','leftHip'],     ['rightShoulder','rightHip'],
  ['leftHip','rightHip'],
  ['leftHip','leftKnee'],         ['leftKnee','leftAnkle'],
  ['rightHip','rightKnee'],       ['rightKnee','rightAnkle'],
];

const LIMB_BONES = {
  larm:  ['leftShoulder-leftElbow','leftElbow-leftWrist'],
  rarm:  ['rightShoulder-rightElbow','rightElbow-rightWrist'],
  torso: ['leftShoulder-rightShoulder','leftShoulder-leftHip','rightShoulder-rightHip','leftHip-rightHip'],
  lleg:  ['leftHip-leftKnee','leftKnee-leftAnkle'],
  rleg:  ['rightHip-rightKnee','rightKnee-rightAnkle'],
};

const EXERCISE_LIMBS = {
  squat: ['lleg','rleg'],
  curl:  ['larm','rarm'],
  lunge: ['lleg','rleg'],
  plank: ['torso'],
};

function getBadBoneSet(isCorrect, exercise) {
  if (isCorrect) return new Set();
  const s = new Set();
  (EXERCISE_LIMBS[exercise] || []).forEach(l =>
    (LIMB_BONES[l] || []).forEach(b => s.add(b)));
  return s;
}

// ── Joint smoothing ───────────────────────────────────
// Keeps a running "display" position for each joint and
// lerps it toward the incoming target each frame.
// This removes the per-frame jitter from MediaPipe without
// adding noticeable lag (alpha = 0.35 → ~4 frame blend).
const _smoothed = {};
const SMOOTH_ALPHA = 0.35;

function smoothJoints(rawJoints) {
  const out = {};
  for (const key in rawJoints) {
    const raw = rawJoints[key];
    if (!raw) { out[key] = null; continue; }
    if (!_smoothed[key]) {
      _smoothed[key] = { x: raw.x, y: raw.y };
    } else {
      _smoothed[key].x += (raw.x - _smoothed[key].x) * SMOOTH_ALPHA;
      _smoothed[key].y += (raw.y - _smoothed[key].y) * SMOOTH_ALPHA;
    }
    out[key] = { x: _smoothed[key].x, y: _smoothed[key].y };
  }
  return out;
}

// ── Rep celebration ───────────────────────────────────
let _celebrateUntil = 0;

function triggerRepCelebration() {
  _celebrateUntil = Date.now() + 500;
}

// ── Geometry helpers ──────────────────────────────────
function midpoint(a, b) { return { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }; }
function dist(a, b)      { return Math.hypot(b.x-a.x, b.y-a.y); }
function ang(a, b)       { return Math.atan2(b.y-a.y, b.x-a.x); }

// Parse a hex colour → {r,g,b}
function _hexRGB(hex) {
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c+c).join('') : h, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
// Mix two hex colours by t∈[0,1]
function _mixHex(a, b, t) {
  const ca = _hexRGB(a), cb = _hexRGB(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bl})`;
}

// Cylindrical gradient for a capsule (light from upper-left).
// Returns a canvas LinearGradient perpendicular to the bone direction.
function _capsuleGrad(ctx, a, b, hw, fill) {
  const angle = ang(a, b);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  // Perpendicular direction (rotated 90°)
  const px = -Math.sin(angle), py = Math.cos(angle);
  const gx0 = mx - px * hw, gy0 = my - py * hw;
  const gx1 = mx + px * hw, gy1 = my + py * hw;
  const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  const bright = _mixHex(fill, '#ffffff', 0.38);
  const dark   = _mixHex(fill, '#000000', 0.30);
  grad.addColorStop(0,    bright);
  grad.addColorStop(0.38, fill);
  grad.addColorStop(1,    dark);
  return grad;
}

function drawCapsule(ctx, a, b, hw, fill, stroke, sw) {
  const angle = ang(a, b);
  const len   = dist(a, b);
  if (len < 1) return;
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(angle);
  const r = Math.min(hw, len / 2);
  ctx.beginPath();
  ctx.moveTo(r, -hw);
  ctx.lineTo(len - r, -hw);
  ctx.arc(len - r, 0, r, -Math.PI/2, Math.PI/2);
  ctx.lineTo(r, hw);
  ctx.arc(r, 0, r, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.restore();
  // Apply gradient in world space (before save/restore so coords match)
  ctx.save();
  ctx.beginPath();
  ctx.translate(a.x, a.y);
  ctx.rotate(angle);
  ctx.moveTo(r, -hw);
  ctx.lineTo(len - r, -hw);
  ctx.arc(len - r, 0, r, -Math.PI/2, Math.PI/2);
  ctx.lineTo(r, hw);
  ctx.arc(r, 0, r, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.fillStyle = (typeof fill === 'string') ? _capsuleGrad(ctx, a, b, hw, fill) : fill;
  ctx.fill();
  if (stroke && sw) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  ctx.restore();
}

function drawCircle(ctx, p, r, fill, stroke, sw) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI*2);
  if (typeof fill === 'string') {
    const grad = ctx.createRadialGradient(
      p.x - r*0.28, p.y - r*0.28, r*0.05,
      p.x, p.y, r
    );
    grad.addColorStop(0, _mixHex(fill, '#ffffff', 0.45));
    grad.addColorStop(0.5, fill);
    grad.addColorStop(1, _mixHex(fill, '#000000', 0.35));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = fill;
  }
  ctx.fill();
  if (stroke && sw) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
}

// Draw a small mitten-like hand shape centred at `p`,
// oriented in the direction `dirAngle`.
function drawHand(ctx, p, r, fill, stroke, sw) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Palm
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && sw) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  // Tiny thumb bump
  ctx.beginPath();
  ctx.arc(r * 0.7, -r * 0.5, r * 0.45, 0, Math.PI*2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// Draw a small rounded shoe shape at ankle `p`,
// pointing in `dirAngle` direction.
function drawShoe(ctx, p, r, fill, stroke, sw, dirAngle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(dirAngle);
  ctx.beginPath();
  ctx.ellipse(r * 0.4, 0, r * 1.1, r * 0.55, 0, 0, Math.PI*2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && sw) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  ctx.restore();
}

// ── Skeleton overlay (optional debug) ─────────────────
function drawSkeleton(ctx, joints, isCorrect, exercise) {
  const bad = getBadBoneSet(isCorrect, exercise);
  BONES.forEach(([a, b]) => {
    if (!joints[a] || !joints[b]) return;
    const isBad = bad.has(`${a}-${b}`);
    ctx.strokeStyle = isBad ? '#ef4444' : '#34d399';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(joints[a].x, joints[a].y);
    ctx.lineTo(joints[b].x, joints[b].y);
    ctx.stroke();
  });
}

// ── Main draw ─────────────────────────────────────────
function drawAvatar(ctx, rawJoints, isCorrect, exercise, charId) {
  if (!rawJoints || !rawJoints.leftShoulder) return;

  // Sprite-based renderer for Zoe
  if (charId === 4) {
    drawGirlAvatar(ctx, rawJoints, isCorrect, exercise);
    return;
  }

  // Smooth joints to remove jitter
  const joints = smoothJoints(rawJoints);

  const pal  = CHARS[charId] || CHARS[1];
  const bad  = getBadBoneSet(isCorrect, exercise);
  const celebrating = Date.now() < _celebrateUntil;

  const ls = joints.leftShoulder,  rs = joints.rightShoulder;
  const lh = joints.leftHip,       rh = joints.rightHip;
  const lk = joints.leftKnee,      rk = joints.rightKnee;
  const la = joints.leftAnkle,     ra = joints.rightAnkle;
  const le = joints.leftElbow,     re = joints.rightElbow;
  const lw = joints.leftWrist,     rw = joints.rightWrist;

  if (!ls || !rs || !lh || !rh) return;

  const sw      = dist(ls, rs);
  const limbW   = Math.max(sw * 0.18, 5);
  const jR      = limbW * 0.85;
  const headR   = sw * 0.42;
  const outW    = 1.5;

  // Soft drop shadow beneath entire figure
  ctx.shadowColor   = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur    = limbW * 1.2;
  ctx.shadowOffsetX = limbW * 0.3;
  ctx.shadowOffsetY = limbW * 0.5;

  const shoulderMid = midpoint(ls, rs);
  const hipMid      = midpoint(lh, rh);

  // During celebration, tint limb fills gold
  function celebFill(base) {
    return celebrating ? '#fbbf24' : base;
  }

  function segColor(bones) {
    const isBad = bones.some(b => bad.has(b));
    return isBad ? '#ef4444' : null;
  }

  function withGlow(ctx, color, fn) {
    if (color) {
      ctx.shadowBlur = 18; ctx.shadowColor = color + '99';
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    }
    fn();
    // Restore figure drop shadow after glow
    ctx.shadowColor   = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur    = limbW * 1.2;
    ctx.shadowOffsetX = limbW * 0.3;
    ctx.shadowOffsetY = limbW * 0.5;
  }

  // ── Back arm (left) ──────────────────────────────────
  if (ls && le && lw) {
    const c    = segColor(['leftShoulder-leftElbow','leftElbow-leftWrist']);
    const fill = celebFill(c || pal.top);
    withGlow(ctx, c, () => {
      drawCapsule(ctx, ls, le, limbW * 0.85, fill, pal.outline, outW);
      drawCircle (ctx, le, jR, fill, pal.outline, outW);
      drawCapsule(ctx, le, lw, limbW * 0.75, celebFill(pal.skin), pal.outline, outW);
      drawHand   (ctx, lw, jR * 0.9, celebFill(pal.skin), pal.outline, outW);
    });
  }

  // ── Back leg (left) ──────────────────────────────────
  if (lh && lk && la) {
    const c    = segColor(['leftHip-leftKnee','leftKnee-leftAnkle']);
    const fill = celebFill(c || pal.bottom);
    withGlow(ctx, c, () => {
      drawCapsule(ctx, lh, lk, limbW, fill, pal.outline, outW);
      drawCircle (ctx, lk, jR, fill, pal.outline, outW);
      drawCapsule(ctx, lk, la, limbW * 0.9, fill, pal.outline, outW);
      // Shoe points in the direction of the lower leg
      const shoeAngle = la && lk ? ang(lk, la) : 0;
      drawShoe   (ctx, la, jR * 1.2, celebFill(pal.shoes), pal.outline, outW, shoeAngle);
    });
  }

  // ── Torso ────────────────────────────────────────────
  {
    const c    = segColor(['leftShoulder-rightShoulder','leftShoulder-leftHip','rightShoulder-rightHip','leftHip-rightHip']);
    const fill = celebFill(c || pal.top);
    withGlow(ctx, c, () => {
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.lineTo(rs.x, rs.y);
      ctx.lineTo(rh.x, rh.y);
      ctx.lineTo(lh.x, lh.y);
      ctx.closePath();
      if (typeof fill === 'string') {
        const tGrad = ctx.createLinearGradient(ls.x, ls.y, rs.x, rs.y);
        tGrad.addColorStop(0,    _mixHex(fill, '#ffffff', 0.32));
        tGrad.addColorStop(0.4,  fill);
        tGrad.addColorStop(1,    _mixHex(fill, '#000000', 0.28));
        ctx.fillStyle = tGrad;
      } else {
        ctx.fillStyle = fill;
      }
      ctx.fill();
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth   = outW;
      ctx.stroke();
    });
  }

  // ── Front leg (right) ────────────────────────────────
  if (rh && rk && ra) {
    const c    = segColor(['rightHip-rightKnee','rightKnee-rightAnkle']);
    const fill = celebFill(c || pal.bottom);
    withGlow(ctx, c, () => {
      drawCapsule(ctx, rh, rk, limbW, fill, pal.outline, outW);
      drawCircle (ctx, rk, jR, fill, pal.outline, outW);
      drawCapsule(ctx, rk, ra, limbW * 0.9, fill, pal.outline, outW);
      const shoeAngle = ra && rk ? ang(rk, ra) : 0;
      drawShoe   (ctx, ra, jR * 1.2, celebFill(pal.shoes), pal.outline, outW, shoeAngle);
    });
  }

  // ── Front arm (right) ────────────────────────────────
  if (rs && re && rw) {
    const c    = segColor(['rightShoulder-rightElbow','rightElbow-rightWrist']);
    const fill = celebFill(c || pal.top);
    withGlow(ctx, c, () => {
      drawCapsule(ctx, rs, re, limbW * 0.85, fill, pal.outline, outW);
      drawCircle (ctx, re, jR, fill, pal.outline, outW);
      drawCapsule(ctx, re, rw, limbW * 0.75, celebFill(pal.skin), pal.outline, outW);
      drawHand   (ctx, rw, jR * 0.9, celebFill(pal.skin), pal.outline, outW);
    });
  }

  // ── Head (tilts with shoulder angle) ─────────────────
  // Shoulder angle drives the head tilt so it feels connected.
  const shoulderAngle = ang(ls, rs);    // angle of shoulder line
  const torsoAngle    = ang(shoulderMid, hipMid);
  const headCenter = {
    x: shoulderMid.x - Math.cos(torsoAngle) * headR * 1.05,
    y: shoulderMid.y - Math.sin(torsoAngle) * headR * 1.05,
  };

  // Head base
  drawCircle(ctx, headCenter, headR, celebFill(pal.skin), pal.outline, outW);

  // Zoe (char 4): ponytail drawn behind head before hair cap
  if (charId === 4 && !celebrating) {
    ctx.save();
    ctx.translate(headCenter.x, headCenter.y);
    ctx.rotate(shoulderAngle - Math.PI / 2);
    // Ponytail: two bezier strands hanging down-left of head
    ctx.strokeStyle = pal.hair;
    ctx.lineWidth   = headR * 0.32;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-headR * 0.5, -headR * 0.2);
    ctx.bezierCurveTo(-headR * 1.1, headR * 0.5, -headR * 0.8, headR * 1.2, -headR * 0.4, headR * 1.6);
    ctx.stroke();
    ctx.restore();
  }

  // Hair cap — rotated with shoulder tilt for the head-tilt effect
  ctx.save();
  ctx.translate(headCenter.x, headCenter.y);
  ctx.rotate(shoulderAngle - Math.PI / 2);   // 90° offset: shoulders → head tilt
  ctx.beginPath();
  ctx.arc(0, 0, headR * 0.98, Math.PI, 2*Math.PI);
  ctx.closePath();
  ctx.fillStyle = celebrating ? '#fbbf24' : pal.hair;
  ctx.fill();
  // Zoe: orange hair clip
  if (charId === 4 && !celebrating) {
    ctx.beginPath();
    ctx.arc(-headR * 0.55, -headR * 0.65, headR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#f5a623';
    ctx.fill();
  }
  ctx.restore();

  // Eyes
  const eyeOffX = headR * 0.28;
  const eyeOffY = headR * 0.05;
  [[headCenter.x - eyeOffX, headCenter.y + eyeOffY],
   [headCenter.x + eyeOffX, headCenter.y + eyeOffY]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, headR * 0.12, 0, Math.PI*2);
    ctx.fillStyle = charId === 4 ? '#6b3fa0' : '#1e293b';   // Zoe has purple eyes
    ctx.fill();
  });

  // Zoe: rosy cheeks
  if (charId === 4 && !celebrating) {
    ctx.globalAlpha = 0.35;
    [[-eyeOffX * 1.5, eyeOffY * 3], [eyeOffX * 1.5, eyeOffY * 3]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(headCenter.x + ox, headCenter.y + oy, headR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#e8708a';
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Smile (or big grin during celebration)
  ctx.beginPath();
  if (celebrating) {
    ctx.arc(headCenter.x, headCenter.y + headR * 0.1, headR * 0.28, 0.05*Math.PI, 0.95*Math.PI);
  } else {
    ctx.arc(headCenter.x, headCenter.y + headR * 0.15, headR * 0.22, 0.1*Math.PI, 0.9*Math.PI);
  }
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth   = celebrating ? 2.5 : 1.5;
  ctx.stroke();

  // ── Shoulder / hip joint dots ────────────────────────
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  [ls, rs].forEach(pt => { if (pt) drawCircle(ctx, pt, jR*0.8, celebFill(pal.top), pal.outline, 1); });
  [lh, rh].forEach(pt => { if (pt) drawCircle(ctx, pt, jR*0.8, celebFill(pal.bottom), pal.outline, 1); });
}
