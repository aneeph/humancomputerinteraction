// ── DOM refs ──────────────────────────────────────────
const canvas        = document.getElementById('mainCanvas');
const ctx           = canvas.getContext('2d');
const video         = document.getElementById('video');
const statusBadge   = document.getElementById('statusBadge');
const repCountEl    = document.getElementById('repCount');
const formScoreEl   = document.getElementById('formScore');
const angleValEl    = document.getElementById('angleVal');
const angleLabelEl  = document.getElementById('angleLabel');
const errorCountEl  = document.getElementById('errorCount');
const sessionTimeEl = document.getElementById('sessionTime');
const threshEl      = document.getElementById('threshDisplay');
const modeEl        = document.getElementById('modeDisplay');
const feedbackEl    = document.getElementById('feedbackBanner');
const goodEl        = document.getElementById('goodBanner');
const angleDispEl   = document.getElementById('angleDisplay');
const loadingEl     = document.getElementById('loadingOverlay');
const camErrorEl    = document.getElementById('camError');
const tipEl         = document.getElementById('tipBanner');
const summaryEl     = document.getElementById('summaryOverlay');
const countdownEl   = document.getElementById('countdownOverlay');
const skeletonToggle= document.getElementById('skeletonToggle');
const muteToggle    = document.getElementById('muteToggle');

// ── Exercise config ───────────────────────────────────
// Each exercise now has:
//   thresh   – angle range for "good form" (used by curl/plank)
//   limbs    – which limb groups flash red on bad form
//   jointLabel – displayed in the HUD
//   repMethod  – 'angle' or 'hipDescent' (squat/lunge use vertical movement)
//   tips     – array of coaching cues shown when form is bad
const EXERCISES = {
  squat: {
    label:'Squat', thresh:[80,110], limbs:['lleg','rleg'],
    jointLabel:'Knee Angle', repMethod:'hipDescent',
    tips:['Bend your knees more','Keep your back straight','Feet shoulder-width apart'],
  },
  curl: {
    label:'Bicep Curl', thresh:[30,150], limbs:['larm','rarm'],
    jointLabel:'Elbow Angle', repMethod:'angle',
    tips:['Full range of motion','Keep elbows close to your body','Control the lowering phase'],
  },
  lunge: {
    label:'Lunge', thresh:[75,105], limbs:['lleg','rleg'],
    jointLabel:'Knee Angle', repMethod:'hipDescent',
    tips:['Lower your back knee toward the floor','Keep front knee above ankle','Chest up'],
  },
  plank: {
    label:'Plank', thresh:[160,180], limbs:['torso'],
    jointLabel:'Hip Angle', repMethod:'angle',
    tips:['Keep hips level — no sagging','Engage your core','Eyes down, neck neutral'],
  },
};

// ── State ─────────────────────────────────────────────
const params      = new URLSearchParams(location.search);
let currentEx     = EXERCISES[params.get('ex')] ? params.get('ex') : 'squat';
let currentChar   = parseInt(params.get('char')) || 1;
let isBotMode     = false;
let isLive        = false;
let showSkeleton  = false;
let isMuted       = false;

let bgTick      = 0;
let repCount    = 0, errorCount = 0, goodFrames = 0, totalFrames = 0;
let inRep       = false, lastCorrect = true;
let consecutiveBadFrames = 0;
const BAD_FORM_CONFIRM_FRAMES = 18;  // ~0.6 s at 30 fps before triggering audio/errors
let sessionStart= Date.now();
let fakeLoopId  = null;
let goodBannerTimer   = null;
let tipTimer          = null;
let tipIndex          = 0;
let lastTipTime       = 0;

// Plank hold timer
let plankHoldMs    = 0;
let plankHoldStart = null;

// ── Hip-descent rep tracking (squat / lunge) ──────────
// We track the running minimum hip-Y (highest position = standing)
// and fire a rep each time the hip rises back above the threshold
// after having gone deep enough.
let hipBaseline     = null;   // running min hip-Y (standing position)
let hipInDescent    = false;  // true while in the "down" phase
const HIP_DOWN_RATIO  = 0.07; // hip must drop 7 % of frame height
const HIP_UP_RATIO    = 0.03; // hip must return within 3 % to count as "back up"

// Wizard of Oz — hold B to force bad form
let wozBad = false;
document.addEventListener('keydown', e => { if(e.key==='b'||e.key==='B') wozBad=true; });
document.addEventListener('keyup',   e => { if(e.key==='b'||e.key==='B') wozBad=false; });

// ── Canvas fit ────────────────────────────────────────
function fitCanvas() {
  const col = document.getElementById('canvasCol');
  const w = col.offsetWidth, h = col.offsetHeight;
  if (w > 10 && h > 10) { canvas.width = w; canvas.height = h; }
}

// ── Demo joints (exercise-aware animation) ────────────
function buildDemoJoints(phase) {
  const w = canvas.width, h = canvas.height;
  const cx = w * 0.5;
  const s  = Math.min(w, h) * 0.55;
  const ty = h * 0.08;

  const base = {
    nose:          { x:cx,           y:ty },
    leftShoulder:  { x:cx-s*0.13,    y:ty+s*0.12 },
    rightShoulder: { x:cx+s*0.13,    y:ty+s*0.12 },
    leftElbow:     { x:cx-s*0.25,    y:ty+s*0.31 },
    rightElbow:    { x:cx+s*0.25,    y:ty+s*0.31 },
    leftWrist:     { x:cx-s*0.24,    y:ty+s*0.50 },
    rightWrist:    { x:cx+s*0.24,    y:ty+s*0.50 },
    leftHip:       { x:cx-s*0.10,    y:ty+s*0.48 },
    rightHip:      { x:cx+s*0.10,    y:ty+s*0.48 },
    leftKnee:      { x:cx-s*0.11,    y:ty+s*0.70 },
    rightKnee:     { x:cx+s*0.11,    y:ty+s*0.70 },
    leftAnkle:     { x:cx-s*0.10,    y:ty+s*0.92 },
    rightAnkle:    { x:cx+s*0.10,    y:ty+s*0.92 },
  };

  const j = {};
  for (const k in base) j[k] = { ...base[k] };

  if (currentEx === 'squat' || currentEx === 'lunge') {
    const dropY   = phase * s * 0.22;
    const spreadX = phase * s * 0.04;
    j.leftHip.y  += dropY;   j.rightHip.y  += dropY;
    j.leftKnee.y += dropY * 0.4; j.rightKnee.y += dropY * 0.4;
    j.leftKnee.x -= spreadX; j.rightKnee.x += spreadX;
    ['leftShoulder','rightShoulder','nose','leftElbow','rightElbow','leftWrist','rightWrist']
      .forEach(k => { j[k].y += dropY * 0.7; });
    j.leftHip.x  -= spreadX * 0.3; j.rightHip.x += spreadX * 0.3;

  } else if (currentEx === 'curl') {
    const raiseY = phase * s * 0.30;
    j.leftWrist.y  -= raiseY; j.leftWrist.x  += phase * s * 0.04;
    j.rightWrist.y -= raiseY; j.rightWrist.x -= phase * s * 0.04;

  } else if (currentEx === 'plank') {
    const fwd = s * 0.35;
    ['leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','nose']
      .forEach(k => { j[k].y += s * 0.1 + fwd * 0.2; });
    j.leftWrist.y  += fwd * 0.65; j.rightWrist.y += fwd * 0.65;
    j.leftWrist.x  -= s * 0.08;   j.rightWrist.x += s * 0.08;
    const breathe = Math.sin(phase * Math.PI * 2) * s * 0.008;
    j.leftHip.y += breathe; j.rightHip.y += breathe;
  }
  return j;
}

// ── Angle calculation ─────────────────────────────────
function computeAngle(j, ex) {
  try {
    let a, b, c;
    if (ex==='squat'||ex==='lunge') { a=j.leftHip;      b=j.leftKnee;  c=j.leftAnkle; }
    else if (ex==='curl')           { a=j.leftShoulder;  b=j.leftElbow; c=j.leftWrist; }
    else                            { a=j.leftShoulder;  b=j.leftHip;   c=j.leftKnee;  }
    if (!a||!b||!c) return null;
    const ab={x:a.x-b.x,y:a.y-b.y}, cb={x:c.x-b.x,y:c.y-b.y};
    const dot=ab.x*cb.x+ab.y*cb.y;
    const mag=Math.sqrt(ab.x**2+ab.y**2)*Math.sqrt(cb.x**2+cb.y**2);
    return mag===0 ? null : Math.round(Math.acos(Math.max(-1,Math.min(1,dot/mag)))*180/Math.PI);
  } catch { return null; }
}

// ── Form check ────────────────────────────────────────
// Returns { ok, formOk, ang }
//   ok      — used for rep counting (angle-based exercises)
//   formOk  — used for form score % and visual/audio feedback
//             separating them prevents penalising rest positions between reps
function checkForm(joints, ex) {
  const cfg = EXERCISES[ex];

  if (cfg.repMethod === 'hipDescent') {
    const hipY = joints.leftHip ? joints.leftHip.y : null;
    if (hipY === null) return { ok: true, formOk: true, ang: null };
    if (hipBaseline === null) hipBaseline = hipY;
    hipBaseline = Math.min(hipBaseline, hipY);
    const downThresh = hipBaseline + canvas.height * HIP_DOWN_RATIO;
    const ang = computeAngle(joints, ex);

    // Standing = neutral (good form); only check knee angle once in squat
    const isInSquat = hipY > downThresh;
    const formOk = !isInSquat || (ang != null ? (ang >= cfg.thresh[0] && ang <= cfg.thresh[1]) : true);
    return { ok: formOk, formOk, ang };
  }

  // angle-based check
  const ang = computeAngle(joints, ex);
  const ok  = ang != null ? (ang >= cfg.thresh[0] && ang <= cfg.thresh[1]) : true;

  // For curl: rest position (arm extended, angle > 145°) is not bad form — don't penalise it
  const formOk = ex === 'curl'
    ? (ok || (ang != null && ang > 145))
    : ok;

  return { ok, formOk, ang };
}

// ── Plank hold timer ──────────────────────────────────
function updatePlankTimer(formOk) {
  if (formOk) {
    if (!plankHoldStart) plankHoldStart = Date.now();
  } else {
    if (plankHoldStart) { plankHoldMs += Date.now() - plankHoldStart; plankHoldStart = null; }
  }
  const totalMs = plankHoldMs + (plankHoldStart ? Date.now() - plankHoldStart : 0);
  const s = Math.floor(totalMs / 1000);
  repCountEl.textContent =
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── Rep counter ───────────────────────────────────────
function updateReps(joints, ok) {
  if (currentEx === 'plank') return;  // plank uses hold timer instead

  const cfg = EXERCISES[currentEx];

  if (cfg.repMethod === 'hipDescent') {
    // Rep = go down (hip low) then come back up
    const hipY = joints.leftHip ? joints.leftHip.y : null;
    if (hipY === null || hipBaseline === null) return;
    const downThresh = hipBaseline + canvas.height * HIP_DOWN_RATIO;
    const upThresh   = hipBaseline + canvas.height * HIP_UP_RATIO;

    if (hipY > downThresh && !hipInDescent) {
      hipInDescent = true;
    } else if (hipY < upThresh && hipInDescent) {
      hipInDescent = false;
      countRep();
    }
  } else {
    // angle-based: rep counted on transition from in-range → out-of-range
    if (ok && !inRep)        { inRep = true; }
    else if (!ok && inRep)   { inRep = false; countRep(); }
  }
}

function countRep() {
  repCount++;
  repCountEl.textContent = repCount;
  repCountEl.classList.add('rep-flash');
  setTimeout(() => repCountEl.classList.remove('rep-flash'), 300);
  triggerRepCelebration();
  if (typeof speak === 'function') speak(`Rep ${repCount}!`, true);
}

// ── Background ────────────────────────────────────────
function drawBg() {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#0f0f1a');
  grad.addColorStop(1, '#0a1628');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let x=30; x<canvas.width; x+=40)
    for (let y=30; y<canvas.height; y+=40) {
      ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill();
    }
}

// ── HUD ───────────────────────────────────────────────
function updateHUD(ok, ang) {
  const ex = EXERCISES[currentEx];

  if (ang != null) {
    angleValEl.textContent   = `${ang}°`;
    angleLabelEl.textContent = ex.jointLabel;
    angleDispEl.textContent  = `${ex.jointLabel}: ${ang}°`;
  }
  threshEl.textContent = `${ex.thresh[0]}°–${ex.thresh[1]}°`;

  const pct = totalFrames > 0 ? Math.round((goodFrames/totalFrames)*100) : 0;
  formScoreEl.textContent = `${pct}%`;
  formScoreEl.style.color = pct >= 70 ? '#34d399' : '#ef4444';
  const bar = document.getElementById('scoreBarFill');
  if (bar) { bar.style.width = pct + '%'; bar.style.background = pct >= 70 ? '#34d399' : '#ef4444'; }

  const bad = ok ? [] : ex.limbs;
  ['larm','rarm','torso','lleg','rleg'].forEach(l => {
    const el = document.getElementById(`li-${l}`);
    el.textContent = bad.includes(l) ? '✗' : '✓';
    el.className   = bad.includes(l) ? 'limb-bad' : 'limb-ok';
  });

  statusBadge.textContent = ok ? '✓ Good form!' : '⚠ Fix your form!';
  statusBadge.className   = ok ? 'good' : 'bad';

  if (!ok) {
    feedbackEl.style.display = 'block';
    goodEl.style.display     = 'none';
    if (goodBannerTimer) { clearTimeout(goodBannerTimer); goodBannerTimer = null; }
    showTip();
  } else {
    feedbackEl.style.display = 'none';
    hideTip();
  }
  errorCountEl.textContent = errorCount;
}

// ── Contextual tips ───────────────────────────────────
function showTip() {
  if (!tipEl) return;
  const now = Date.now();
  if (now - lastTipTime < 3000) return;   // don't spam tips
  lastTipTime = now;
  const tips = EXERCISES[currentEx].tips;
  tipEl.textContent = tips[tipIndex % tips.length];
  tipIndex++;
  tipEl.classList.add('show');
  if (tipTimer) clearTimeout(tipTimer);
  tipTimer = setTimeout(hideTip, 3500);
}

function hideTip() {
  if (tipEl) tipEl.classList.remove('show');
}

// ── Angle history (for session summary chart) ─────────
const angleHistory = [];
const MAX_HISTORY  = 1800;   // ~60 s at 30 fps

// ── Session timer ─────────────────────────────────────
setInterval(() => {
  const s = Math.floor((Date.now()-sessionStart)/1000);
  sessionTimeEl.textContent =
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}, 1000);

// ── Render ────────────────────────────────────────────
function renderFrame(joints, poseOverride) {
  if (!joints || canvas.width < 10) return;

  let ok, formOk, ang;
  if (poseOverride) {
    ok = formOk = poseOverride.isCorrect;
    ang = poseOverride.angle;
  } else {
    const result = checkForm(joints, currentEx);
    ok     = result.ok;
    formOk = result.formOk !== undefined ? result.formOk : result.ok;
    ang    = result.ang;
  }

  if (wozBad) { ok = false; formOk = false; }
  else if (isBotMode) { formOk = true; }  // bot is always perfect form → 100% score

  // Plank: update hold timer instead of reps
  if (currentEx === 'plank') updatePlankTimer(formOk);

  totalFrames++;
  if (formOk) goodFrames++;
  if (ang != null) {
    if (angleHistory.length >= MAX_HISTORY) angleHistory.shift();
    angleHistory.push(ang);
  }

  // Debounce bad-form feedback: only fire audio/errors after sustained bad form,
  // not during brief transitions at the start/end of a rep.
  if (!formOk) {
    consecutiveBadFrames++;
    if (consecutiveBadFrames === BAD_FORM_CONFIRM_FRAMES) {
      if (!isMuted) playBuzz();
      errorCount++;
      if (isLive && typeof speak === 'function') speak('Fix your form');
    }
  } else {
    if (consecutiveBadFrames >= BAD_FORM_CONFIRM_FRAMES) {
      // Recovering from confirmed bad form → chime
      if (!isMuted) playChime();
      goodEl.style.display = 'block';
      if (goodBannerTimer) clearTimeout(goodBannerTimer);
      goodBannerTimer = setTimeout(() => { goodEl.style.display = 'none'; }, 1200);
    }
    consecutiveBadFrames = 0;
  }
  lastCorrect = formOk;

  bgTick++;
  if (typeof drawThemeBg === 'function') drawThemeBg(ctx, canvas, bgTick); else drawBg();
  drawAvatar(ctx, joints, formOk, currentEx, currentChar);
  if (showSkeleton) drawSkeleton(ctx, joints, formOk, currentEx);
  updateReps(joints, ok);
  updateHUD(formOk, ang);
}

// ── Countdown overlay ─────────────────────────────────
function runCountdown(onDone) {
  if (!countdownEl) { onDone(); return; }
  let count = 3;
  countdownEl.classList.add('show');
  countdownEl.querySelector('.cd-number').textContent = count;

  const tick = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.querySelector('.cd-number').textContent = count;
    } else {
      clearInterval(tick);
      countdownEl.classList.remove('show');
      onDone();
    }
  }, 1000);
}

// ── Session summary ───────────────────────────────────
function showSummary() {
  if (!summaryEl) return;
  const elapsed = Math.floor((Date.now()-sessionStart)/1000);
  const pct     = totalFrames > 0 ? Math.round((goodFrames/totalFrames)*100) : 0;
  const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
  const ss = String(elapsed%60).padStart(2,'0');

  // Plank: show hold time instead of reps
  if (currentEx === 'plank') {
    const holdS = Math.floor((plankHoldMs + (plankHoldStart ? Date.now() - plankHoldStart : 0)) / 1000);
    const hm = String(Math.floor(holdS/60)).padStart(2,'0');
    const hs = String(holdS%60).padStart(2,'0');
    summaryEl.querySelector('#sum-reps').textContent = `${hm}:${hs}`;
    summaryEl.querySelector('.sum-card-label').textContent = 'Hold Time';
  } else {
    summaryEl.querySelector('#sum-reps').textContent = repCount;
    summaryEl.querySelector('.sum-card-label').textContent = 'Reps';
  }
  summaryEl.querySelector('#sum-score').textContent     = pct + '%';
  summaryEl.querySelector('#sum-errors').textContent    = errorCount;
  summaryEl.querySelector('#sum-time').textContent      = `${mm}:${ss}`;
  summaryEl.querySelector('#sum-exercise').textContent  = EXERCISES[currentEx].label;

  // Draw mini angle chart
  drawSummaryChart(summaryEl.querySelector('#sum-chart'));

  summaryEl.classList.add('show');
}

function hideSummary() {
  if (summaryEl) summaryEl.classList.remove('show');
}

function drawSummaryChart(canvas) {
  if (!canvas || angleHistory.length < 2) return;
  const w = canvas.width  = canvas.offsetWidth  || 260;
  const h = canvas.height = canvas.offsetHeight || 70;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, w, h);

  const data    = angleHistory.slice(-300);  // last ~10 s
  const ex      = EXERCISES[currentEx];
  const minA    = ex.thresh[0] - 20;
  const maxA    = ex.thresh[1] + 20;
  const range   = maxA - minA || 1;

  // Good-form zone
  const zTop = h - ((ex.thresh[1] - minA) / range) * h;
  const zBot = h - ((ex.thresh[0] - minA) / range) * h;
  c.fillStyle = 'rgba(52,211,153,0.12)';
  c.fillRect(0, zTop, w, zBot - zTop);

  // Angle line
  c.beginPath();
  data.forEach((a, i) => {
    const x = (i / (data.length-1)) * w;
    const y = h - ((a - minA) / range) * h;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  });
  c.strokeStyle = '#60a5fa';
  c.lineWidth   = 2;
  c.stroke();
}

// ── Demo loop ─────────────────────────────────────────
function startFakeLoop() {
  stopFakeLoop();
  let tick = 0;
  fakeLoopId = setInterval(() => {
    if (canvas.width < 10) { fitCanvas(); return; }
    tick++;
    const phase  = (Math.sin(tick * 0.06) + 1) / 2;
    const joints = buildDemoJoints(phase);
    setFakeExercise(currentEx);
    renderFrame(joints, pose());
  }, 50);
  modeEl.textContent      = 'Demo';
  statusBadge.textContent = '● Demo mode';
  statusBadge.className   = 'info';
}
function stopFakeLoop() {
  if (fakeLoopId) { clearInterval(fakeLoopId); fakeLoopId = null; }
}

// ── Live webcam ───────────────────────────────────────
function startLiveWebcam() {
  if (typeof Pose === 'undefined') { startFakeLoop(); return; }

  const mpPose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
  mpPose.setOptions({ modelComplexity:1, smoothLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });

  mpPose.onResults(results => {
    if (isBotMode) return;
    if (results.poseLandmarks) {
      const lm     = results.poseLandmarks.map(p => ({ ...p, x: 1-p.x }));
      const joints = landmarksToJoints(lm, canvas.width, canvas.height);
      renderFrame(joints, null);
    }
  });

  const camera = new Camera(video, {
    onFrame: async () => { if (!isBotMode) await mpPose.send({ image: video }); },
    width:640, height:480,
  });

  camera.start()
    .then(() => {
      isLive = true;
      stopFakeLoop();
      modeEl.textContent      = 'Live Webcam 📷';
      statusBadge.textContent = '● Camera live';
      statusBadge.className   = 'good';
      if (loadingEl) loadingEl.classList.remove('show');
    })
    .catch(err => { console.warn('Cam failed:', err); camErrorEl.classList.add('show'); startFakeLoop(); });
}

// ── Bot mode ──────────────────────────────────────────
async function enableBotMode() {
  isBotMode = true; stopFakeLoop();
  loadingEl.classList.add('show');
  camErrorEl.classList.remove('show');
  document.getElementById('botToggle').textContent = '✅ Bot: ON';
  document.getElementById('botToggle').classList.add('active');
  modeEl.textContent      = 'Bot Avatar 🤖';
  statusBadge.textContent = '● Bot active';
  statusBadge.className   = 'info';

  initBot(canvas, joints => {
    loadingEl.classList.remove('show');
    renderFrame(joints, null);
  });
  await startBot(currentEx);
}

function disableBotMode() {
  isBotMode = false; stopBot();
  document.getElementById('botToggle').textContent = '🤖 Bot Mode';
  document.getElementById('botToggle').classList.remove('active');
  if (isLive) modeEl.textContent = 'Live Webcam 📷';
  else startFakeLoop();
}

document.getElementById('botToggle').addEventListener('click', () => {
  if (isBotMode) disableBotMode(); else enableBotMode();
});
window.enableBotMode = enableBotMode;

// ── UI controls ───────────────────────────────────────
if (skeletonToggle) {
  skeletonToggle.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    skeletonToggle.classList.toggle('active', showSkeleton);
    skeletonToggle.textContent = showSkeleton ? '🦴 Skeleton: ON' : '🦴 Skeleton';
  });
}

if (muteToggle) {
  muteToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    muteToggle.classList.toggle('active', isMuted);
    muteToggle.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
  });
}

document.getElementById('charBtns').addEventListener('click', e => {
  const thumb = e.target.closest('.char-thumb');
  if (!thumb) return;
  currentChar = parseInt(thumb.dataset.char);
  document.querySelectorAll('.char-thumb').forEach(t =>
    t.classList.toggle('active', t.dataset.char === thumb.dataset.char));
});

function setExercise(ex) {
  currentEx = ex; setFakeExercise(ex);
  repCount = errorCount = goodFrames = totalFrames = 0;
  inRep = false; lastCorrect = true; consecutiveBadFrames = 0;
  hipBaseline = null; hipInDescent = false;
  plankHoldMs = 0; plankHoldStart = null;
  repCountEl.textContent   = ex === 'plank' ? '00:00' : '0';
  errorCountEl.textContent = '0';
  formScoreEl.textContent  = '--%';
  angleHistory.length = 0;
  const repsLabel = document.getElementById('repsLabel');
  if (repsLabel) repsLabel.textContent = ex === 'plank' ? 'Hold Time' : 'Reps';
  document.querySelectorAll('.ex-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.ex === ex));
  if (isBotMode) { stopBot(); startBot(ex); }
}

document.getElementById('exBtns').addEventListener('click', e => {
  const btn = e.target.closest('.ex-btn'); if (btn) setExercise(btn.dataset.ex);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  repCount = errorCount = goodFrames = totalFrames = 0;
  inRep = false; lastCorrect = true; consecutiveBadFrames = 0;
  hipBaseline = null; hipInDescent = false;
  plankHoldMs = 0; plankHoldStart = null;
  sessionStart = Date.now();
  repCountEl.textContent   = currentEx === 'plank' ? '00:00' : '0';
  errorCountEl.textContent = '0';
  formScoreEl.textContent  = '--%';
  angleHistory.length = 0;
  hideSummary();
});

// Summary button
const summaryBtn = document.getElementById('summaryBtn');
if (summaryBtn) summaryBtn.addEventListener('click', showSummary);
const summaryClose = document.getElementById('summaryClose');
if (summaryClose) summaryClose.addEventListener('click', hideSummary);

// ── Start ─────────────────────────────────────────────
function start() {
  fitCanvas();
  if (canvas.width < 10 || canvas.height < 10) { requestAnimationFrame(start); return; }
  setExercise(currentEx);
  document.querySelectorAll('.char-thumb').forEach(t =>
    t.classList.toggle('active', parseInt(t.dataset.char) === currentChar));

  // 3-second countdown before starting camera
  runCountdown(() => startLiveWebcam());
}
requestAnimationFrame(start);
