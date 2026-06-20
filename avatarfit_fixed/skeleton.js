/**
 * skeleton.js
 * Converts MediaPipe landmark arrays to named pixel-space joint positions.
 *
 * Keeps a stable 1:1 pixel mapping so rep-counting (which tracks joint Y
 * positions across frames) stays accurate.
 *
 * Extrapolates knees and ankles from body proportions when they fall outside
 * the camera frame, so the avatar always has complete legs.
 */

function resetSkeletonSmoothing() { /* no-op — kept so bot.js calls don't error */ }

function landmarksToJoints(lm, w, h) {

  function raw(idx, minVis) {
    const p = lm[idx];
    if (!p) return null;
    if (minVis !== undefined && (p.visibility ?? 1) < minVis) return null;
    return { x: p.x, y: p.y };
  }

  // Pixel-space helper — clamp to canvas
  function px(p) {
    if (!p) return null;
    return {
      x: Math.min(Math.max(p.x * w, 0), w),
      y: Math.min(Math.max(p.y * h, 0), h),
    };
  }

  // Pixel-space helper — no clamp (for extrapolated joints that may go below bottom)
  function pxNoClamp(p) {
    if (!p) return null;
    return { x: p.x * w, y: p.y * h };
  }

  const lsh = raw(11, 0.25), rsh = raw(12, 0.25);
  const lel = raw(13, 0.25), rel = raw(14, 0.25);
  const lwr = raw(15, 0.20), rwr = raw(16, 0.20);
  const lhi = raw(23, 0.25), rhi = raw(24, 0.25);
  let   lkn = raw(25, 0.20), rkn = raw(26, 0.20);
  let   lan = raw(27, 0.15), ran = raw(28, 0.15);

  // ── Torso direction vector (normalised space) ────────────────────────────
  const shMid = lsh && rsh ? { x:(lsh.x+rsh.x)/2, y:(lsh.y+rsh.y)/2 } : null;
  const hiMid = lhi && rhi ? { x:(lhi.x+rhi.x)/2, y:(lhi.y+rhi.y)/2 } : null;

  let torsoLen = 0, tDx = 0, tDy = 1;
  if (shMid && hiMid) {
    tDx = hiMid.x - shMid.x;
    tDy = hiMid.y - shMid.y;
    torsoLen = Math.hypot(tDx, tDy);
    if (torsoLen > 0.001) { tDx /= torsoLen; tDy /= torsoLen; }
  }

  // ── Extrapolate knees when off-screen ────────────────────────────────────
  if (!lkn && lhi && torsoLen > 0) {
    lkn = { x: lhi.x + tDx * torsoLen * 0.92,
            y: lhi.y + tDy * torsoLen * 0.92 };
  }
  if (!rkn && rhi && torsoLen > 0) {
    rkn = { x: rhi.x + tDx * torsoLen * 0.92,
            y: rhi.y + tDy * torsoLen * 0.92 };
  }

  // ── Extrapolate ankles when off-screen ───────────────────────────────────
  if (!lan && lkn && lhi) {
    lan = { x: lkn.x + (lkn.x - lhi.x) * 0.88,
            y: lkn.y + (lkn.y - lhi.y) * 0.88 };
  }
  if (!ran && rkn && rhi) {
    ran = { x: rkn.x + (rkn.x - rhi.x) * 0.88,
            y: rkn.y + (rkn.y - rhi.y) * 0.88 };
  }

  return {
    nose:          px(raw(0, 0.1)),
    leftShoulder:  px(lsh),        rightShoulder: px(rsh),
    leftElbow:     px(lel),        rightElbow:    px(rel),
    leftWrist:     px(lwr),        rightWrist:    px(rwr),
    leftHip:       px(lhi),        rightHip:      px(rhi),
    leftKnee:      pxNoClamp(lkn), rightKnee:     pxNoClamp(rkn),
    leftAnkle:     pxNoClamp(lan), rightAnkle:    pxNoClamp(ran),
  };
}
