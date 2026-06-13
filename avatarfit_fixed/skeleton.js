/**
 * skeleton.js
 * Exports landmarksToJoints() for converting MediaPipe landmark arrays
 * to named pixel-space joint positions used by avatars.js.
 *
 * NOTE: avatars.js no longer re-declares this function.
 * This is the single source of truth.
 */

function landmarksToJoints(lm, w, h) {
  function s(idx) {
    const p = lm[idx];
    if (!p) return null;
    // Clamp to avoid drawing outside the canvas
    return {
      x: Math.min(Math.max(p.x * w, 0), w),
      y: Math.min(Math.max(p.y * h, 0), h),
    };
  }
  return {
    nose:          s(0),
    leftShoulder:  s(11),  rightShoulder: s(12),
    leftElbow:     s(13),  rightElbow:    s(14),
    leftWrist:     s(15),  rightWrist:    s(16),
    leftHip:       s(23),  rightHip:      s(24),
    leftKnee:      s(25),  rightKnee:     s(26),
    leftAnkle:     s(27),  rightAnkle:    s(28),
  };
}
