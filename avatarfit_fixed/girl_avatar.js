/**
 * girl_avatar.js
 * Vector-based Zoe renderer (charId === 4).
 *
 * Draws Zoe using canvas 2D shapes keyed to live joint positions —
 * same approach as the other characters but with her specific style:
 *   - Pink/red jacket, green shirt collar, purple pants, white+pink sneakers
 *   - Brown hair with side ponytail and orange clip
 *   - Large cartoon eyes with white highlights, rosy cheeks
 */

// ── Geometry helpers (local copies so this file is self-contained) ──
function _zm(a, b) { return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 }; }
function _zd(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function _za(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

// ── Torso: filled trapezoid (jacket) with green shirt showing at collar ──
function _zTorso(ctx, ls, rs, lh, rh, sw, celebrating) {
  const sM = _zm(ls, rs);
  const hM = _zm(lh, rh);

  // Jacket (pink-red trapezoid)
  ctx.beginPath();
  ctx.moveTo(ls.x, ls.y);
  ctx.lineTo(rs.x, rs.y);
  ctx.lineTo(rh.x, rh.y);
  ctx.lineTo(lh.x, lh.y);
  ctx.closePath();
  ctx.fillStyle = celebrating ? '#fbbf24' : '#d63a6e';
  ctx.fill();
  ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.5; ctx.stroke();

  // Green shirt triangle at collar
  if (!celebrating) {
    const torsoAngle = _za(sM, hM);
    const dx = Math.cos(torsoAngle), dy = Math.sin(torsoAngle);
    const hw = sw * 0.22;
    ctx.beginPath();
    ctx.moveTo(sM.x - dx * hw - dy * hw, sM.y - dy * hw + dx * hw);
    ctx.lineTo(sM.x + dx * hw + dy * hw, sM.y + dy * hw - dx * hw);
    ctx.lineTo(sM.x + dx * sw * 0.28, sM.y + dy * sw * 0.28);
    ctx.closePath();
    ctx.fillStyle = '#7ec87e';
    ctx.fill();
  }

  // Shoulder joint dots
  [ls, rs].forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, sw * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = celebrating ? '#fbbf24' : '#c03060';
    ctx.fill();
  });
}

// ── Shoe ─────────────────────────────────────────────────────────────
function _zShoe(ctx, ankle, knee, sw, isRight) {
  if (!ankle) return;
  const fw = sw * 0.32, fh = fw * 0.46;
  let angle = 0;
  if (knee) angle = (_za(knee, ankle) - Math.PI / 2) * 0.15;

  ctx.save();
  ctx.translate(ankle.x, ankle.y);
  ctx.rotate(angle);
  if (isRight) ctx.scale(-1, 1);

  // White sole
  ctx.beginPath();
  ctx.ellipse(-fw * 0.05, fh * 0.12, fw * 0.55, fh * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e8e0'; ctx.fill();
  ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.2; ctx.stroke();

  // Pink upper
  ctx.beginPath();
  ctx.ellipse(-fw * 0.04, -fh * 0.06, fw * 0.42, fh * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e0406a'; ctx.fill();
  ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1; ctx.stroke();

  ctx.restore();
}

// ── Head ─────────────────────────────────────────────────────────────
function _zHead(ctx, ls, rs, lh, rh, isCorrect, celebrating, sw) {
  const sM  = _zm(ls, rs);
  const hM  = _zm(lh, rh);
  const headR = sw * 0.38;

  const torsoA = _za(sM, hM);
  const upX = Math.cos(torsoA + Math.PI);
  const upY = Math.sin(torsoA + Math.PI);
  const hc = { x: sM.x + upX * headR * 1.15, y: sM.y + upY * headR * 1.15 };

  const shA = _za(ls, rs);   // shoulder lean angle

  // ── Face circle ───────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(hc.x, hc.y, headR, 0, Math.PI * 2);
  ctx.fillStyle = celebrating ? '#fbbf24' : '#f5c5a0';
  ctx.fill();
  ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.5; ctx.stroke();

  // ── Hair cap ──────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(hc.x, hc.y);
  ctx.rotate(shA - Math.PI / 2);
  ctx.beginPath();
  ctx.arc(0, 0, headR * 1.02, Math.PI, 2 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = celebrating ? '#fbbf24' : '#4a3728';
  ctx.fill();
  ctx.restore();

  // ── Bun on top (replaces ponytail — stays centered, never sticks out) ──
  if (!celebrating) {
    const bunX = hc.x + upX * headR * 0.85;
    const bunY = hc.y + upY * headR * 0.85;
    ctx.beginPath();
    ctx.arc(bunX, bunY, headR * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#4a3728'; ctx.fill();
    ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1; ctx.stroke();
    // Orange clip on bun
    ctx.beginPath();
    ctx.arc(bunX, bunY, headR * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#f5a623'; ctx.fill();
    ctx.beginPath();
    ctx.arc(bunX, bunY, headR * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066'; ctx.fill();
  }

  // ── Eyes ─────────────────────────────────────────────────────────
  const eyeR  = headR * 0.175;
  const eyeOX = headR * 0.27;
  const eyeOY = headR * 0.06;
  [[hc.x - eyeOX, hc.y + eyeOY], [hc.x + eyeOX, hc.y + eyeOY]].forEach(([ex, ey]) => {
    // white
    ctx.beginPath(); ctx.arc(ex, ey, eyeR * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // iris
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = celebrating ? '#fbbf24' : '#2d1a0e'; ctx.fill();
    // highlight
    ctx.beginPath(); ctx.arc(ex + eyeR * 0.32, ey - eyeR * 0.32, eyeR * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  });

  // ── Cheeks ───────────────────────────────────────────────────────
  if (!celebrating) {
    ctx.globalAlpha = 0.38;
    [[-headR * 0.5, headR * 0.24], [headR * 0.5, headR * 0.24]].forEach(([ox, oy]) => {
      ctx.beginPath(); ctx.arc(hc.x + ox, hc.y + oy, headR * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = '#e8708a'; ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ── Smile / grin ─────────────────────────────────────────────────
  ctx.beginPath();
  if (celebrating) {
    ctx.arc(hc.x, hc.y + headR * 0.1, headR * 0.27, 0.05 * Math.PI, 0.95 * Math.PI);
  } else {
    ctx.arc(hc.x, hc.y + headR * 0.18, headR * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
  }
  ctx.strokeStyle = '#2d1a0e';
  ctx.lineWidth = Math.max(headR * 0.06, 1.5);
  ctx.stroke();
}

// ── Main entry point ─────────────────────────────────────────────────
function drawGirlAvatar(ctx, rawJoints, isCorrect, exercise) {
  if (!rawJoints || !rawJoints.leftShoulder) return;

  const j   = smoothJoints(rawJoints);
  const ls  = j.leftShoulder,  rs = j.rightShoulder;
  const lh  = j.leftHip,       rh = j.rightHip;
  const lk  = j.leftKnee,      rk = j.rightKnee;
  const la  = j.leftAnkle,     ra = j.rightAnkle;
  const le  = j.leftElbow,     re = j.rightElbow;
  const lw  = j.leftWrist,     rw = j.rightWrist;

  if (!ls || !rs || !lh || !rh) return;

  const celebrating = Date.now() < _celebrateUntil;
  const sw   = _zd(ls, rs);
  const lR   = Math.max(sw * 0.13, 4);   // limb radius
  const jR   = lR * 0.82;                // joint dot radius
  const out  = 1.5;
  const PINK = celebrating ? '#fbbf24' : '#d63a6e';
  const PUR  = celebrating ? '#fbbf24' : '#7044aa';
  const SKIN = celebrating ? '#fbbf24' : '#f5c5a0';
  const OL   = '#2d1a0e';

  // ── 1. Back arm (left) ───────────────────────────────────────────
  if (ls && le) {
    drawCapsule(ctx, ls, le, lR * 0.88, PINK, OL, out);
    drawCircle (ctx, le, jR, PINK, OL, out);
  }
  if (le && lw) {
    drawCapsule(ctx, le, lw, lR * 0.78, SKIN, OL, out);
    drawCircle (ctx, lw, jR * 0.85, SKIN, OL, out);
  }

  // ── 2. Back leg (left) ───────────────────────────────────────────
  if (lh && lk) {
    drawCapsule(ctx, lh, lk, lR, PUR, OL, out);
    drawCircle (ctx, lk, jR, PUR, OL, out);
  }
  if (lk && la) drawCapsule(ctx, lk, la, lR * 0.9, PUR, OL, out);
  _zShoe(ctx, la, lk, sw, false);

  // ── 3. Torso ─────────────────────────────────────────────────────
  _zTorso(ctx, ls, rs, lh, rh, sw, celebrating);

  // ── 4. Front leg (right) ─────────────────────────────────────────
  if (rh && rk) {
    drawCapsule(ctx, rh, rk, lR, PUR, OL, out);
    drawCircle (ctx, rk, jR, PUR, OL, out);
  }
  if (rk && ra) drawCapsule(ctx, rk, ra, lR * 0.9, PUR, OL, out);
  _zShoe(ctx, ra, rk, sw, true);

  // ── 5. Front arm (right) ─────────────────────────────────────────
  if (rs && re) {
    drawCapsule(ctx, rs, re, lR * 0.88, PINK, OL, out);
    drawCircle (ctx, re, jR, PINK, OL, out);
  }
  if (re && rw) {
    drawCapsule(ctx, re, rw, lR * 0.78, SKIN, OL, out);
    drawCircle (ctx, rw, jR * 0.85, SKIN, OL, out);
  }

  // ── 6. Head ──────────────────────────────────────────────────────
  _zHead(ctx, ls, rs, lh, rh, isCorrect, celebrating, sw);
}
