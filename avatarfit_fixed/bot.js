/**
 * bot.js
 * Loads M3's JSON motion files and animates a bot avatar.
 *
 * Fixes applied:
 *  - Bot landmarks are re-centered horizontally so the figure
 *    fills the canvas rather than sitting left-of-center.
 *  - Plank JSON has corrupted frames (coords go negative / >1).
 *    Those frames are filtered out before playback.
 *  - Bot landmarks are mirrored (x = 1 - x) to match the live
 *    webcam mirror so both modes look consistent.
 */

const BOT_FILES = {
  squat: 'bot_squat.json',
  curl:  'bot_curl.json',
  lunge: 'bot_lunge.json',
  plank: 'bot_plank.json',
};

const BOT_DATA  = {};
let botInterval = null;
let botFrameIdx = 0;
let botCanvas   = null;
let onBotFrame  = null;

function initBot(canvasEl, onFrame) {
  botCanvas  = canvasEl;
  onBotFrame = onFrame;
}

/**
 * Return true if every visible landmark in a frame has
 * x and y in [0, 1]. Frames where the person walked out
 * of frame have coords < 0 or > 1.
 */
function isFrameValid(lm) {
  return lm.every(p => {
    if (p.v < 0.3) return true;  // low-visibility landmarks can be anywhere
    return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  });
}

/**
 * Compute the horizontal centre of all visible landmarks
 * so we can shift the whole skeleton to canvas centre.
 */
function computeXOffset(lm) {
  const visible = lm.filter(p => p.v > 0.5);
  if (visible.length === 0) return 0;
  const minX = Math.min(...visible.map(p => p.x));
  const maxX = Math.max(...visible.map(p => p.x));
  const skeletonCentre = (minX + maxX) / 2;
  return 0.5 - skeletonCentre;   // shift so centre lands at 0.5
}

async function startBot(exercise) {
  stopBot();
  botFrameIdx = 0;

  const filename = BOT_FILES[exercise];
  if (!filename) { console.warn('No bot file for', exercise); return; }

  if (!BOT_DATA[exercise]) {
    try {
      const res  = await fetch(filename);
      const json = await res.json();
      // Filter out corrupted frames (plank recording has some)
      json.frames = json.frames.filter(f => isFrameValid(f.lm));
      BOT_DATA[exercise] = json;
    } catch (e) {
      console.error('Failed to load bot JSON:', filename, e);
      return;
    }
  }

  const data   = BOT_DATA[exercise];
  if (!data.frames.length) {
    console.warn('No valid frames for', exercise);
    return;
  }

  // Pre-compute a stable x-offset from the first valid frame
  const xOffset = computeXOffset(data.frames[0].lm);

  const fps   = data.fps || 30;
  const delay = Math.round(1000 / fps);

  botInterval = setInterval(() => {
    if (!botCanvas || !onBotFrame) return;
    const frame = data.frames[botFrameIdx % data.frames.length];
    botFrameIdx++;

    // Mirror x (match live webcam) then re-center
    const lm = frame.lm.map(p => ({
      ...p,
      x: (1 - p.x) + xOffset,   // mirror + center
    }));

    const joints = landmarksToJoints(lm, botCanvas.width, botCanvas.height);
    onBotFrame(joints);
  }, delay);
}

function stopBot() {
  if (botInterval) { clearInterval(botInterval); botInterval = null; }
}

function isBotRunning() { return botInterval !== null; }
