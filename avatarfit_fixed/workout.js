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
const EXERCISES = {
  squat: {
    label:'Squat', thresh:[60,130], limbs:['lleg','rleg'],
    jointLabel:'Knee Angle', repMethod:'hipDescent',
    tips:[
      'Keep your knees tracking over your toes',
      'Drive through your heels as you stand up',
      'Keep your chest up and back straight',
      'Go deeper — aim for thighs parallel to the floor',
      'Feet shoulder-width apart, toes slightly out',
      'Brace your core before you go down',
    ],
  },
  curl: {
    label:'Bicep Curl', thresh:[20,160], repDown:80, repUp:155, limbs:['larm','rarm'],
    jointLabel:'Elbow Angle', repMethod:'angle',
    tips:[
      'Keep your elbows pinned close to your sides',
      'Squeeze your bicep hard at the top',
      'Lower slowly — the down phase builds muscle too',
      'No swinging — keep your back straight',
      'Fully extend your arms at the bottom',
      'Breathe out as you curl up',
    ],
  },
  lunge: {
    label:'Lunge', thresh:[55,125], limbs:['lleg','rleg'],
    jointLabel:'Knee Angle', repMethod:'hipDescent',
    tips:[
      'Lower your back knee straight down toward the floor',
      'Keep your front knee directly above your ankle',
      'Chest up, shoulders back and down',
      'Take a bigger step to protect your knee',
      'Push through your front heel to stand back up',
      'Keep your torso upright — do not lean forward',
    ],
  },
  plank: {
    label:'Plank', thresh:[160,180], limbs:['torso'],
    jointLabel:'Hip Angle', repMethod:'angle',
    tips:[
      'Keep your hips level — no sagging or piking',
      'Squeeze your core and glutes the entire time',
      'Your body should form a straight line head to heel',
      'Keep your neck neutral — look at the floor',
      'Breathe steadily, do not hold your breath',
      'Press the floor away with your forearms',
    ],
  },
};

// ── Error → specific tip mapping ──────────────────────
const ERROR_TIPS = {
  kneeValgusSquat: 'Keep your knees tracking over your toes — they are caving in',
  kneeValgusLunge: 'Keep your front knee directly over your ankle — do not let it cave in',
  elbowFlare:      'Pin your elbows to your sides — they are flaring out',
  hipSag:          'Your hips are dropping — squeeze your core and glutes to hold the line',
  hipPike:         'Your hips are too high — lower them so your body forms a straight line',
  tooFast:         'Slow down — control every rep for better results',
  shallowSquat:    'Go deeper — aim for thighs parallel to the floor',
  shallowLunge:    'Go deeper — lower your back knee toward the floor',
  forwardLean:     'Straighten your back — keep your chest up and look forward',
};

// Minimum milliseconds between reps before a "too fast" warning fires
const MIN_REP_MS = { squat: 2000, curl: 1500, lunge: 2500, plank: Infinity };

// ── Error → summary display info ──────────────────────
const ERROR_DISPLAY = {
  kneeValgusSquat: { label: 'Knees caving in',   fix: 'Push your knees outward to track over your toes as you squat.' },
  kneeValgusLunge: { label: 'Knee caving inward', fix: 'Keep your front knee tracking directly over your ankle on the lunge.' },
  elbowFlare:      { label: 'Elbows flaring out', fix: 'Pin your elbows tight to your sides throughout the entire curl.' },
  hipSag:          { label: 'Hips dropping',      fix: 'Squeeze your core and glutes hard to keep your body in a straight line.' },
  hipPike:         { label: 'Hips too high',      fix: 'Lower your hips until your body forms one straight line head to heel.' },
  tooFast:         { label: 'Reps too fast',      fix: 'Slow down — take 2–3 seconds per phase for better muscle engagement.' },
  shallowSquat:    { label: 'Squat too shallow',  fix: 'Drive your hips lower until your thighs are parallel to the floor.' },
  shallowLunge:    { label: 'Lunge too shallow',  fix: 'Lower your back knee toward the floor — aim for a 90° angle on both legs.' },
  forwardLean:     { label: 'Forward lean',       fix: 'Keep your chest up and back straight — look forward, not down.' },
};

// ── Workout Plan ──────────────────────────────────────
const WORKOUT_PLAN = [
  { ex: 'squat', target: 12 },
  { ex: 'curl',  target: 12 },
  { ex: 'lunge', target: 10 },
  { ex: 'plank', targetMs: 30000 },
];

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
let errorTypeCounts = {};
let currentFormError = null;

let minDescentAngle = Infinity;  // tracks deepest knee angle during a squat descent

// Workout mode
let workoutMode        = false;
let workoutStepIdx     = 0;
let workoutLog         = [];
let workoutStartTime   = 0;
let workoutStepStart   = 0;
let restCountdownTimer = null;
let workoutPlankDone   = false;

// Hand-raise gestures: right=stop, left=switch exercise
let gestureStopStart   = null;
let gestureSwitchStart = null;

// Get-in-position detection
let gipFrameCount    = 0;
let gipOnReady       = null;
const GIP_FRAMES_NEEDED = 45; // ~1.5 s of being in frame
const BAD_FORM_CONFIRM_FRAMES = 18;  // ~0.6 s at 30 fps before triggering audio/errors
let sessionStart= Date.now();
let fakeLoopId  = null;
let goodBannerTimer   = null;
let tipTimer          = null;
let tipIndex          = 0;
let lastTipTime       = 0;
let lastRepTime       = 0;   // timestamp of previous rep, for speed detection

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
function _kneeAngle(j, side) {
  const hip   = j[side + 'Hip'];
  const knee  = j[side + 'Knee'];
  const ankle = j[side + 'Ankle'];
  if (!hip || !knee || !ankle) return null;
  const ab = {x: hip.x - knee.x,   y: hip.y - knee.y};
  const cb = {x: ankle.x - knee.x, y: ankle.y - knee.y};
  const dot = ab.x*cb.x + ab.y*cb.y;
  const mag = Math.sqrt(ab.x**2+ab.y**2) * Math.sqrt(cb.x**2+cb.y**2);
  return mag === 0 ? null : Math.round(Math.acos(Math.max(-1, Math.min(1, dot/mag))) * 180/Math.PI);
}

function computeAngle(j, ex) {
  try {
    if (ex === 'lunge') {
      // Track whichever knee bends deeper — works for both left- and right-leg-forward lunges
      const L = _kneeAngle(j, 'left');
      const R = _kneeAngle(j, 'right');
      if (L == null && R == null) return null;
      if (L == null) return R;
      if (R == null) return L;
      return Math.min(L, R);
    }
    let a, b, c;
    if (ex==='squat')  { a=j.leftHip;      b=j.leftKnee;  c=j.leftAnkle; }
    else if (ex==='curl') { a=j.leftShoulder; b=j.leftElbow; c=j.leftWrist; }
    else               { a=j.leftShoulder;  b=j.leftHip;   c=j.leftKnee;  }
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

  // ── Squat / Lunge ────────────────────────────────────────────────────────
  if (cfg.repMethod === 'hipDescent') {
    const hipY = joints.leftHip ? joints.leftHip.y : null;
    if (hipY === null) return { ok: true, formOk: true, ang: null };
    if (hipBaseline === null) hipBaseline = hipY;
    hipBaseline = Math.min(hipBaseline, hipY);

    const ang = computeAngle(joints, ex);

    // Only check form when the person is actively squatting (hip has descended
    // at least 30% of shoulder-width below their standing baseline).
    const ls = joints.leftShoulder, rs = joints.rightShoulder;
    const sw = ls && rs ? Math.abs(rs.x - ls.x) : 0;
    const descended = sw > 10 && (hipY - hipBaseline) > sw * 0.30;

    if (!descended) return { ok: true, formOk: true, ang };

    // ── Knee valgus (cave-in) check ──────────────────────────────────────
    // Knees should track over or outside the ankles.
    // In a front-facing (mirrored) view, left knee should NOT drift right of
    // left ankle, and right knee should NOT drift left of right ankle.
    const lk = joints.leftKnee,  la = joints.leftAnkle;
    const rk = joints.rightKnee, ra = joints.rightAnkle;

    let formOk = true, formError = null;
    if (lk && la && sw > 10) {
      const leftCave  = (lk.x - la.x) / sw;
      const rightCave = ra && rk ? (ra.x - rk.x) / sw : 0;
      const valgusThresh = ex === 'lunge' ? 0.26 : 0.18;
      if (leftCave > valgusThresh || rightCave > valgusThresh) {
        formOk = false;
        formError = ex === 'lunge' ? 'kneeValgusLunge' : 'kneeValgusSquat';
      }
    }

    // Forward lean: nose nearly at shoulder level = extreme back rounding.
    // Threshold -sw*0.15 means nose must be within 15% of shoulder-width
    // above the shoulder line — only fires on a really bad hunch.
    if (!formError && ex !== 'lunge' && hipInDescent) {
      const nose   = joints.nose;
      const midShY = ls && rs ? (ls.y + rs.y) / 2 : null;
      if (nose && midShY && sw > 10 && (nose.y - midShY) > -sw * 0.15) {
        formOk    = false;
        formError = 'forwardLean';
      }
    }

    return { ok: true, formOk, ang, formError };
  }

  // ── Bicep Curl ───────────────────────────────────────────────────────────
  if (ex === 'curl') {
    const ang = computeAngle(joints, ex);
    const ok = ang != null ? (ang >= cfg.thresh[0] && ang <= cfg.thresh[1]) : true;

    const ls = joints.leftShoulder, le = joints.leftElbow;
    const rs = joints.rightShoulder, re = joints.rightElbow;
    const sw = ls && rs ? Math.abs(rs.x - ls.x) : 0;

    let formOk = true, formError = null;
    if (sw > 10 && ang != null && ang < 150) {
      const leftFlare  = ls && le ? Math.abs(le.x - ls.x) / sw : 0;
      const rightFlare = rs && re ? Math.abs(re.x - rs.x) / sw : 0;
      if (leftFlare > 0.32 || rightFlare > 0.32) {
        formOk = false;
        formError = 'elbowFlare';
      }
    }

    return { ok, formOk, ang, formError };
  }

  // ── Plank ────────────────────────────────────────────────────────────────
  const ang = computeAngle(joints, ex);
  const ok  = ang != null ? (ang >= cfg.thresh[0] && ang <= cfg.thresh[1]) : true;
  let formError = null;
  if (!ok && ang != null) {
    // angle < thresh[0] means hip is bent (pike or sag).
    // Use hip vs shoulder Y to distinguish: if hip is lower (larger Y) it's a sag.
    const lh = joints.leftHip, ls2 = joints.leftShoulder;
    if (lh && ls2) {
      formError = lh.y > ls2.y + 20 ? 'hipSag' : 'hipPike';
    } else {
      formError = 'hipSag';
    }
  }
  return { ok, formOk: ok, ang, formError };
}

// ── Plank hold timer ──────────────────────────────────
function updatePlankTimer(formOk) {
  if (formOk) {
    if (!plankHoldStart) {
      plankHoldStart = Date.now();
      hideExIntro();  // getting into position dismisses the intro
    }
  } else {
    if (plankHoldStart) { plankHoldMs += Date.now() - plankHoldStart; plankHoldStart = null; }
  }
  const totalMs = plankHoldMs + (plankHoldStart ? Date.now() - plankHoldStart : 0);
  const s = Math.floor(totalMs / 1000);
  repCountEl.textContent =
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Workout mode: auto-complete when hold target reached
  if (workoutMode && !workoutPlankDone && sessionPhase === 'active') {
    const step = WORKOUT_PLAN[workoutStepIdx];
    if (step && step.targetMs && totalMs >= step.targetMs) {
      workoutPlankDone = true;
      setTimeout(() => completeWorkoutStep(), 600);
    }
  }
}

// ── Rep counter ───────────────────────────────────────
function updateReps(joints, ok, ang) {
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
      minDescentAngle = Infinity;  // fresh tracking for this rep
    }
    if (hipInDescent && ang != null) {
      minDescentAngle = Math.min(minDescentAngle, ang);
    }
    if (hipY < upThresh && hipInDescent) {
      hipInDescent = false;
      countRep();
      // Post-rep depth check — bypasses showTip so lastTipTime is not touched
      // (avoids blocking real-time valgus tips for 3 s after every shallow rep)
      const depthThresh = currentEx === 'lunge' ? 100 : 105;
      if (minDescentAngle > depthThresh) {
        const errorKey = currentEx === 'lunge' ? 'shallowLunge' : 'shallowSquat';
        minDescentAngle = Infinity;
        setTimeout(() => {
          errorTypeCounts[errorKey] = (errorTypeCounts[errorKey] || 0) + 1;
          const tip = ERROR_TIPS[errorKey];
          if (tip && tipEl) {
            tipEl.textContent = tip;
            tipEl.classList.add('show');
            if (tipTimer) clearTimeout(tipTimer);
            tipTimer = setTimeout(hideTip, 3500);
          }
          if (!isBotMode && typeof speak === 'function') speak(tip);
        }, 900);
      }
    }
  } else if (cfg.repDown !== undefined) {
    // Hysteresis rep counting: enter rep when arm is clearly curled,
    // count rep when arm is clearly extended — avoids double-count at threshold boundary
    if (!inRep && ang != null && ang <= cfg.repDown) inRep = true;
    if (inRep  && ang != null && ang >= cfg.repUp)   { inRep = false; countRep(); }
  } else {
    // angle-based: rep counted on transition from in-range → out-of-range
    if (ok && !inRep)        { inRep = true; }
    else if (!ok && inRep)   { inRep = false; countRep(); }
  }
}

function countRep() {
  const now = Date.now();
  const tooFast = lastRepTime > 0 && (now - lastRepTime) < (MIN_REP_MS[currentEx] ?? 1500);
  lastRepTime = now;

  repCount++;
  if (repCount === 1) hideExIntro();  // first rep dismisses the intro screen
  repCountEl.textContent = repCount;
  repCountEl.classList.add('rep-flash');
  setTimeout(() => repCountEl.classList.remove('rep-flash'), 300);
  triggerRepCelebration();

  if (tooFast) {
    errorTypeCounts['tooFast'] = (errorTypeCounts['tooFast'] || 0) + 1;
    showTip('tooFast');
  } else {
    if (typeof speak === 'function') speak(`Rep ${repCount}!`, true);
  }

  // Workout mode: auto-complete when target reps reached
  if (workoutMode && sessionPhase === 'active') {
    const step = WORKOUT_PLAN[workoutStepIdx];
    if (step && step.target && repCount >= step.target) {
      setTimeout(() => completeWorkoutStep(), 600);
    }
  }
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
function updateHUD(ok, ang, formError) {
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
    showTip(formError);
  } else {
    feedbackEl.style.display = 'none';
    hideTip();
  }
  errorCountEl.textContent = errorCount;
}

// ── Contextual tips ───────────────────────────────────
function showTip(formError, force = false) {
  if (!tipEl) return;
  if (isBotMode) return;
  const now = Date.now();
  if (!force && now - lastTipTime < 3000) return;   // don't spam tips
  lastTipTime = now;

  // Use the specific error tip if we know what's wrong,
  // otherwise fall back to cycling through the general tips list.
  let tip;
  if (formError && ERROR_TIPS[formError]) {
    tip = ERROR_TIPS[formError];
  } else {
    const tips = EXERCISES[currentEx].tips;
    tip = tips[tipIndex % tips.length];
    tipIndex++;
  }

  tipEl.textContent = tip;
  tipEl.classList.add('show');
  if (typeof speak === 'function') speak(tip);
  if (tipTimer) clearTimeout(tipTimer);
  tipTimer = setTimeout(hideTip, 3500);
}

function hideTip() {
  if (tipEl) tipEl.classList.remove('show');
}

// ── Angle history (for session summary chart) ─────────
const angleHistory = [];
const MAX_HISTORY  = 1800;   // ~60 s at 30 fps

// ── Session phase ─────────────────────────────────────
// waiting_permission → waiting_frame → countdown → active ↔ paused → ended
let sessionPhase      = 'waiting_permission';
let sessionEnded      = false;
let inFrameFrames     = 0;
let outOfFrameFrames  = 0;
let sessionPauseStart = null;
const IN_FRAME_CONFIRM   = 20;   // ~0.65 s of stable skeleton before countdown
const OUT_OF_FRAME_LIMIT = 45;   // ~1.5 s with no skeleton before pausing
const CAM_DIR = {
  squat: '↔ Face the camera', curl: '↔ Face the camera',
  lunge: '↔ Face the camera', plank: '↕ Turn sideways to camera',
};

// ── Session timer ─────────────────────────────────────
setInterval(() => {
  if (sessionEnded || sessionPhase !== 'active') return;
  const s = Math.floor((Date.now()-sessionStart)/1000);
  sessionTimeEl.textContent =
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}, 1000);

// ── In-frame detection ────────────────────────────────
function isFullyInFrame(joints) {
  if (!joints) return false;
  const keys = ['leftShoulder','rightShoulder','leftHip','rightHip'];
  if (currentEx !== 'plank') keys.push('leftKnee','rightKnee');
  return keys.every(k => joints[k] != null);
}

// ── Camera wait overlay helpers ───────────────────────
function showCameraWait(phase) {
  const overlay = document.getElementById('cameraWaitOverlay');
  if (!overlay) return;
  const title  = document.getElementById('camWaitTitle');
  const sub    = document.getElementById('camWaitSub');
  const badge  = document.getElementById('camDirBadge');
  const bar    = document.getElementById('camInFrameBar');
  const icon   = document.getElementById('camWaitIcon');
  if (phase === 'step_back') {
    icon.textContent  = '🧍';
    title.textContent = 'Step Into Frame';
    sub.textContent   = 'Step back until your full body is visible. The session will begin automatically.';
    badge.textContent = CAM_DIR[currentEx] || '↔ Face the camera';
    badge.classList.add('show');
    bar.classList.add('show');
  } else {
    icon.textContent  = '📷';
    title.textContent = 'Allow Camera Access';
    sub.textContent   = 'Please allow camera access in your browser to start your workout.';
    badge.classList.remove('show');
    bar.classList.remove('show');
  }
  overlay.style.display = 'flex';
}

function hideCameraWait() {
  const el = document.getElementById('cameraWaitOverlay');
  if (el) el.style.display = 'none';
}

// ── Cycle to next exercise (left-hand gesture, free mode) ───────
function cycleExercise() {
  const exList = ['squat', 'curl', 'lunge', 'plank'];
  const idx  = exList.indexOf(currentEx);
  const next = exList[(idx + 1) % exList.length];
  if (typeof speak === 'function') speak('Switching to ' + (EXERCISES[next] ? EXERCISES[next].label : next));
  setExercise(next);
  runCountdown(() => { sessionPhase = 'active'; sessionStart = Date.now(); });
}

// ── Hand-raise gestures ───────────────────────────────
// Right hand raised → stop session (3 s)
// Left  hand raised → switch exercise (3 s)
function checkStopGesture(joints) {
  const stopEl   = document.getElementById('gestureIndicator');
  const switchEl = document.getElementById('gestureSwitchIndicator');

  if (!joints || sessionPhase !== 'active') {
    gestureStopStart = gestureSwitchStart = null;
    if (stopEl)   stopEl.style.display   = 'none';
    if (switchEl) switchEl.style.display = 'none';
    return;
  }

  const ls = joints.leftShoulder, rs = joints.rightShoulder;
  const lw = joints.leftWrist,    rw = joints.rightWrist;
  const sw = ls && rs ? Math.abs(rs.x - ls.x) : 0;
  if (sw < 10) return;

  const cx = (ls.x + rs.x) / 2;
  // Wrist must be clearly ABOVE shoulder (not just at shoulder height) to avoid
  // accidental triggers during exercises where the arm naturally rises.
  const rightRaised = rw && rs && rw.y < rs.y - sw * 0.4 && rw.x > cx + sw * 0.7;
  const leftRaised  = lw && ls && lw.y < ls.y - sw * 0.4 && lw.x < cx - sw * 0.7;

  // Right hand: stop session
  if (rightRaised) {
    if (!gestureStopStart) gestureStopStart = Date.now();
    const pct = Math.min((Date.now() - gestureStopStart) / 3000 * 100, 100);
    if (stopEl) {
      stopEl.style.display = 'flex';
      const arc = document.getElementById('gestureArc');
      if (arc) arc.style.strokeDashoffset = 138.2 * (1 - pct / 100);
    }
    if (pct >= 100) {
      gestureStopStart = null;
      if (stopEl) stopEl.style.display = 'none';
      if (typeof speak === 'function') speak('Ending session');
      setTimeout(() => showSummary(), 600);
    }
  } else {
    gestureStopStart = null;
    if (stopEl) stopEl.style.display = 'none';
  }

  // Left hand: switch exercise (ignored if right hand is also raised)
  if (leftRaised && !rightRaised) {
    if (!gestureSwitchStart) gestureSwitchStart = Date.now();
    const pct = Math.min((Date.now() - gestureSwitchStart) / 3000 * 100, 100);
    if (switchEl) {
      switchEl.style.display = 'flex';
      const arc = document.getElementById('gestureSwitchArc');
      if (arc) arc.style.strokeDashoffset = 138.2 * (1 - pct / 100);
    }
    if (pct >= 100) {
      gestureSwitchStart = null;
      if (switchEl) switchEl.style.display = 'none';
      if (workoutMode) advanceWorkoutStep();
      else showGetInPosition(cycleExercise);
    }
  } else {
    gestureSwitchStart = null;
    if (switchEl) switchEl.style.display = 'none';
  }
}

// ── Render ────────────────────────────────────────────
function renderFrame(joints, poseOverride) {
  if (canvas.width < 10 || sessionEnded) return;

  const hasJoints = !!(joints && joints.leftShoulder);

  // Waiting for user to step into frame
  if (sessionPhase === 'waiting_frame' && isLive) {
    if (isFullyInFrame(joints)) {
      inFrameFrames++;
      const pct = Math.min(inFrameFrames / IN_FRAME_CONFIRM * 100, 100);
      const fill = document.getElementById('camInFrameBarFill');
      if (fill) fill.style.width = pct + '%';
      if (inFrameFrames >= IN_FRAME_CONFIRM) {
        inFrameFrames = 0;
        hideCameraWait();
        sessionPhase = 'countdown';
        runCountdown(() => { sessionPhase = 'active'; sessionStart = Date.now(); });
      }
    } else {
      inFrameFrames = 0;
      const fill = document.getElementById('camInFrameBarFill');
      if (fill) fill.style.width = '0%';
    }
    if (hasJoints) {
      bgTick++;
      if (typeof drawThemeBg === 'function') drawThemeBg(ctx, canvas, bgTick); else drawBg();
      drawAvatar(ctx, joints, true, currentEx, currentChar);
      if (showSkeleton) drawSkeleton(ctx, joints, true, currentEx);
    }
    return;
  }

  // Workout "get in position" — wait for user to step into frame before intro
  if (sessionPhase === 'get_in_position') {
    const bar = document.getElementById('gipBar');
    if (isFullyInFrame(joints)) {
      gipFrameCount++;
      const pct = Math.min(gipFrameCount / GIP_FRAMES_NEEDED * 100, 100);
      if (bar) bar.style.width = pct + '%';
      if (gipFrameCount >= GIP_FRAMES_NEEDED) {
        gipFrameCount = 0;
        document.getElementById('getInPositionOverlay')?.classList.remove('show');
        const cb = gipOnReady; gipOnReady = null;
        if (cb) cb();
      }
    } else {
      gipFrameCount = 0;
      if (bar) bar.style.width = '0%';
    }
    if (hasJoints) {
      bgTick++;
      if (typeof drawThemeBg === 'function') drawThemeBg(ctx, canvas, bgTick); else drawBg();
      drawAvatar(ctx, joints, true, currentEx, currentChar);
      if (showSkeleton) drawSkeleton(ctx, joints, true, currentEx);
    }
    return;
  }

  // During countdown: draw avatar in background
  if (sessionPhase === 'countdown') {
    if (hasJoints) {
      bgTick++;
      if (typeof drawThemeBg === 'function') drawThemeBg(ctx, canvas, bgTick); else drawBg();
      drawAvatar(ctx, joints, true, currentEx, currentChar);
    }
    return;
  }

  // Out-of-frame detection during active live session
  if (sessionPhase === 'active' && isLive && !isBotMode) {
    if (!hasJoints) {
      if (++outOfFrameFrames >= OUT_OF_FRAME_LIMIT) {
        sessionPhase = 'paused'; sessionPauseStart = Date.now();
        document.getElementById('outOfFrameOverlay')?.classList.add('show');
      }
      return;
    }
    outOfFrameFrames = 0;
  }

  // Resume from pause when skeleton returns
  if (sessionPhase === 'paused') {
    if (hasJoints) {
      outOfFrameFrames = 0; sessionPhase = 'active';
      if (sessionPauseStart) { sessionStart += Date.now() - sessionPauseStart; sessionPauseStart = null; }
      document.getElementById('outOfFrameOverlay')?.classList.remove('show');
    } else { return; }
  }

  // Skip if not active or no joints
  if (sessionPhase !== 'active' || !hasJoints) return;

  let ok, formOk, ang, formError;
  if (poseOverride) {
    ok = formOk = poseOverride.isCorrect;
    ang = poseOverride.angle;
    formError = null;
  } else {
    const result = checkForm(joints, currentEx);
    ok        = result.ok;
    formOk    = result.formOk !== undefined ? result.formOk : result.ok;
    ang       = result.ang;
    formError = result.formError || null;
  }
  currentFormError = formError;

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
      if (currentFormError) {
        errorTypeCounts[currentFormError] = (errorTypeCounts[currentFormError] || 0) + 1;
      }
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
  updateReps(joints, ok, ang);
  updateHUD(formOk, ang, formError);
  checkStopGesture(joints);
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
  if (workoutMode) {
    if (sessionPhase === 'active') saveWorkoutStep();
    exitWorkoutMode();
    showWorkoutSummary();
    return;
  }
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

  // Build "Focus for next time" from tracked error types
  const focusEl = summaryEl.querySelector('#sum-focus');
  if (focusEl) {
    const sorted = Object.entries(errorTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (sorted.length === 0) {
      focusEl.innerHTML = '<div class="sum-focus-clean">Perfect form! Keep it up next session. 💪</div>';
    } else {
      focusEl.innerHTML = sorted.map(([code, count]) => {
        const info = ERROR_DISPLAY[code];
        if (!info) return '';
        return `<div class="sum-focus-item">
          <div class="sum-focus-label">${info.label} <span class="sum-focus-count">${count}×</span></div>
          <div class="sum-focus-fix">${info.fix}</div>
        </div>`;
      }).join('');
    }
  }

  // Draw mini angle chart
  drawSummaryChart(summaryEl.querySelector('#sum-chart'));

  sessionEnded = true;
  sessionPhase = 'ended';
  feedbackEl.style.display = 'none';
  goodEl.style.display = 'none';
  document.getElementById('outOfFrameOverlay')?.classList.remove('show');
  hideTip();
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
  if (typeof Pose === 'undefined') { hideCameraWait(); camErrorEl.classList.add('show'); return; }

  const mpPose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
  mpPose.setOptions({ modelComplexity:1, smoothLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });

  // Always call renderFrame — null joints trigger out-of-frame / step-back detection
  mpPose.onResults(results => {
    if (isBotMode) return;
    const joints = results.poseLandmarks
      ? landmarksToJoints(results.poseLandmarks.map(p => ({ ...p, x: 1-p.x })), canvas.width, canvas.height)
      : null;
    renderFrame(joints, null);
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
      // Permission granted — only switch to waiting_frame if no other phase has already been set
      // (e.g. workout auto-start may have already set get_in_position via the 400ms timeout)
      if (sessionPhase === 'waiting_permission') {
        sessionPhase = 'waiting_frame';
        showCameraWait('step_back');
      }
    })
    .catch(err => {
      console.warn('Cam failed:', err);
      hideCameraWait();
      camErrorEl.classList.add('show');
    });
}

// ── Bot mode ──────────────────────────────────────────
async function enableBotMode() {
  isBotMode = true; stopFakeLoop();
  hideCameraWait();
  document.getElementById('outOfFrameOverlay')?.classList.remove('show');
  sessionPhase = 'active';
  sessionStart = Date.now();
  loadingEl.classList.add('show');
  camErrorEl.classList.remove('show');
  document.getElementById('botToggle').textContent = '✅ Demo: ON';
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
  document.getElementById('botToggle').textContent = '🎯 Demo';
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
    muteToggle.classList.toggle('active', !isMuted);
    muteToggle.textContent = isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
  });
}

document.getElementById('charBtns').addEventListener('click', e => {
  const thumb = e.target.closest('.char-thumb');
  if (!thumb) return;
  currentChar = parseInt(thumb.dataset.char);
  document.querySelectorAll('.char-thumb').forEach(t =>
    t.classList.toggle('active', t.dataset.char === thumb.dataset.char));
});

// ── Avatar picker modal ───────────────────────────────
function setCharacter(num) {
  currentChar = num;
  // sync sidebar thumbs
  document.querySelectorAll('.char-thumb').forEach(t =>
    t.classList.toggle('active', parseInt(t.dataset.char) === num));
  // sync modal cards
  document.querySelectorAll('.av-card').forEach(c =>
    c.classList.toggle('active', parseInt(c.dataset.char) === num));
}

const avatarModal  = document.getElementById('avatarModal');
const openAvatarBtn = document.getElementById('openAvatarModal');
if (openAvatarBtn) openAvatarBtn.addEventListener('click', () => {
  avatarModal.style.display = 'flex';
});
document.getElementById('avClose').addEventListener('click', () => {
  avatarModal.style.display = 'none';
});
document.getElementById('avBackdrop').addEventListener('click', () => {
  avatarModal.style.display = 'none';
});
document.getElementById('avatarModal').querySelector('.av-grid').addEventListener('click', e => {
  const card = e.target.closest('.av-card');
  if (!card) return;
  setCharacter(parseInt(card.dataset.char));
  const name = card.querySelector('.av-card-name').textContent;
  if (typeof speak === 'function') speak(name + ' selected');
  setTimeout(() => { avatarModal.style.display = 'none'; }, 300);
});

function setExercise(ex) {
  currentEx = ex; setFakeExercise(ex);
  repCount = errorCount = goodFrames = totalFrames = 0;
  inRep = false; lastCorrect = true; consecutiveBadFrames = 0;
  hipBaseline = null; hipInDescent = false;
  plankHoldMs = 0; plankHoldStart = null;
  lastRepTime = 0; errorTypeCounts = {}; currentFormError = null; minDescentAngle = Infinity;
  repCountEl.textContent   = ex === 'plank' ? '00:00' : '0';
  errorCountEl.textContent = '0';
  formScoreEl.textContent  = '--%';
  angleHistory.length = 0;
  const repsLabel = document.getElementById('repsLabel');
  if (repsLabel) repsLabel.textContent = ex === 'plank' ? 'Hold Time' : 'Reps';
  const badge = document.getElementById('camDirBadge');
  if (badge) badge.textContent = CAM_DIR[ex] || '↔ Face the camera';
  document.querySelectorAll('.ex-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.ex === ex));
  if (isBotMode) { stopBot(); startBot(ex); }
}

document.getElementById('exBtns').addEventListener('click', e => {
  if (workoutMode) return;
  const btn = e.target.closest('.ex-btn'); if (btn) setExercise(btn.dataset.ex);
});

function doReset() {
  repCount = errorCount = goodFrames = totalFrames = 0;
  inRep = false; lastCorrect = true; consecutiveBadFrames = 0;
  hipBaseline = null; hipInDescent = false;
  plankHoldMs = 0; plankHoldStart = null;
  lastRepTime = 0; errorTypeCounts = {}; currentFormError = null; minDescentAngle = Infinity;
  inFrameFrames = 0; outOfFrameFrames = 0; sessionPauseStart = null;
  sessionStart = Date.now();
  sessionEnded = false;
  if (sessionPhase === 'ended') sessionPhase = 'active';
  document.getElementById('outOfFrameOverlay')?.classList.remove('show');
  repCountEl.textContent   = currentEx === 'plank' ? '00:00' : '0';
  errorCountEl.textContent = '0';
  formScoreEl.textContent  = '--%';
  angleHistory.length = 0;
  hideSummary();
}
window.doReset = doReset;
window.exitWorkoutMode = exitWorkoutMode;

// Full exercise start: reset → GIP → countdown → active
// Used by voice commands so switching/starting always works from any state
function startExercise(ex) {
  doReset();
  if (ex) setExercise(ex);
  showGetInPosition(() => runCountdown(() => { sessionPhase = 'active'; sessionStart = Date.now(); }));
}
window.startExercise = startExercise;

document.getElementById('resetBtn').addEventListener('click', () => {
  if (sessionEnded) { doReset(); return; }
  const modal = document.getElementById('resetConfirmModal');
  if (modal) modal.classList.add('show');
  else doReset();
});

// ── Workout Mode ──────────────────────────────────────
function startWorkoutMode() {
  workoutMode      = true;
  workoutStepIdx   = 0;
  workoutLog       = [];
  workoutStartTime = Date.now();
  workoutPlankDone = false;
  if (restCountdownTimer) { clearInterval(restCountdownTimer); restCountdownTimer = null; }
  hideSummary();
  hideRestScreen();
  hideWorkoutSummary();
  doReset();
  setExercise(WORKOUT_PLAN[0].ex);
  updateWorkoutUI();
  sessionEnded = false;
  showGetInPosition(() => showExIntro());
}

function exitWorkoutMode() {
  workoutMode = false;
  if (restCountdownTimer) { clearInterval(restCountdownTimer); restCountdownTimer = null; }
  hideRestScreen();
  hideExIntro();
  updateWorkoutUI();
}

function updateWorkoutUI() {
  const btn   = document.getElementById('workoutBtn');
  const badge = document.getElementById('workoutProgressBadge');
  if (!workoutMode) {
    if (btn)   { btn.textContent = '🏋️ Workout'; btn.classList.remove('active'); }
    if (badge) badge.style.display = 'none';
    document.querySelectorAll('.ex-btn').forEach(b => b.style.opacity = '');
    return;
  }
  const step = WORKOUT_PLAN[workoutStepIdx];
  const targetStr = step ? (step.targetMs ? `${step.targetMs/1000}s hold` : `${step.target} reps`) : '';
  if (btn)   { btn.textContent = '✕ Exit Workout'; btn.classList.add('active'); }
  if (badge) {
    badge.textContent = `Step ${workoutStepIdx+1}/${WORKOUT_PLAN.length} · ${EXERCISES[step.ex].label} · ${targetStr}`;
    badge.style.display = 'block';
  }
  document.querySelectorAll('.ex-btn').forEach(b => b.style.opacity = '0.4');
}

function saveWorkoutStep() {
  const step     = WORKOUT_PLAN[workoutStepIdx];
  const duration = Math.floor((Date.now() - workoutStepStart) / 1000);
  const pct      = totalFrames > 0 ? Math.round((goodFrames / totalFrames) * 100) : 0;
  const log      = { ex: step.ex, pct, errorCount, errorTypeCounts: { ...errorTypeCounts }, duration };
  if (step.ex === 'plank') {
    log.holdMs = plankHoldMs + (plankHoldStart ? Date.now() - plankHoldStart : 0);
    log.reps   = null;
  } else {
    log.reps   = repCount;
    log.holdMs = null;
  }
  workoutLog.push(log);
}

function completeWorkoutStep() {
  if (sessionPhase === 'ended') return;
  sessionPhase = 'ended';
  saveWorkoutStep();
  const ex = EXERCISES[WORKOUT_PLAN[workoutStepIdx].ex];
  if (typeof speak === 'function') speak(`${ex.label} complete! Great work!`);
  feedbackEl.style.display = 'none';
  goodEl.style.display = 'none';
  hideTip();
  if (workoutStepIdx >= WORKOUT_PLAN.length - 1) {
    setTimeout(() => showWorkoutSummary(), 900);
  } else {
    setTimeout(() => showRestScreen(), 900);
  }
}

function showRestScreen() {
  const restEl = document.getElementById('restOverlay');
  if (!restEl) return;
  const step     = WORKOUT_PLAN[workoutStepIdx];
  const nextStep = WORKOUT_PLAN[workoutStepIdx + 1];
  const log      = workoutLog[workoutLog.length - 1];

  restEl.querySelector('#rest-ex-done').textContent = EXERCISES[step.ex].label + ' Complete! ✓';
  if (step.ex === 'plank') {
    const holdS = Math.round((log.holdMs || 0) / 1000);
    restEl.querySelector('#rest-stats').textContent = `${holdS}s held · ${log.pct}% form`;
  } else {
    restEl.querySelector('#rest-stats').textContent = `${log.reps} reps · ${log.pct}% form`;
  }
  const nextTarget = nextStep.targetMs ? `${nextStep.targetMs/1000}s hold` : `${nextStep.target} reps`;
  restEl.querySelector('#rest-next-name').textContent   = EXERCISES[nextStep.ex].label;
  restEl.querySelector('#rest-next-target').textContent = nextTarget;

  let remaining = 10;
  restEl.querySelector('#rest-countdown').textContent = remaining;
  restEl.classList.add('show');

  if (restCountdownTimer) clearInterval(restCountdownTimer);
  restCountdownTimer = setInterval(() => {
    remaining--;
    restEl.querySelector('#rest-countdown').textContent = remaining;
    if (remaining <= 0) {
      clearInterval(restCountdownTimer); restCountdownTimer = null;
      restEl.classList.remove('show');
      advanceWorkoutStep();
    }
  }, 1000);

  restEl.querySelector('#restSkip').onclick = () => {
    if (restCountdownTimer) { clearInterval(restCountdownTimer); restCountdownTimer = null; }
    restEl.classList.remove('show');
    advanceWorkoutStep();
  };
}

function hideRestScreen() {
  document.getElementById('restOverlay')?.classList.remove('show');
}

const EX_EMOJI = { squat: '🦵', curl: '💪', lunge: '🏃', plank: '🤸' };

function showExIntro() {
  const el = document.getElementById('workoutExIntroOverlay');
  if (!el) return;
  const step = WORKOUT_PLAN[workoutStepIdx];
  const ex   = EXERCISES[step.ex];
  const goalStr = step.targetMs
    ? `Goal: ${step.targetMs / 1000}s hold`
    : `Goal: ${step.target} reps`;
  el.querySelector('#wxi-step').textContent  = `Step ${workoutStepIdx + 1} of ${WORKOUT_PLAN.length}`;
  el.querySelector('#wxi-emoji').textContent = EX_EMOJI[step.ex] || '🏋️';
  el.querySelector('#wxi-name').textContent  = ex.label;
  el.querySelector('#wxi-goal').textContent  = goalStr;
  el.querySelector('#wxi-tip').textContent   = ex.tips[0];
  el.classList.add('show');

  // Start detection immediately — first rep (or plank position) will dismiss the overlay
  sessionStart = workoutStepStart = Date.now();
  sessionPhase = 'active';

  // Voice cue after a short pause so it doesn't clash with rest-screen speech
  const voiceTarget = step.targetMs
    ? `${step.targetMs / 1000} second hold`
    : `${step.target} reps`;
  setTimeout(() => {
    if (typeof speak === 'function')
      speak(`Up next: ${ex.label}. Goal: ${voiceTarget}. Do one rep to start.`);
  }, 400);
}

function hideExIntro() {
  document.getElementById('workoutExIntroOverlay')?.classList.remove('show');
}

function advanceWorkoutStep() {
  workoutStepIdx++;
  if (workoutStepIdx >= WORKOUT_PLAN.length) { showWorkoutSummary(); return; }
  workoutPlankDone = false;
  doReset();
  setExercise(WORKOUT_PLAN[workoutStepIdx].ex);
  sessionEnded = false;
  updateWorkoutUI();
  showGetInPosition(() => showExIntro());
}

function showGetInPosition(onReady) {
  hideCameraWait();                              // dismiss camera-wait overlay so it can't block countdown
  const el = document.getElementById('getInPositionOverlay');
  if (!el) { onReady(); return; }
  gipFrameCount = 0;
  gipOnReady    = onReady;
  sessionPhase  = 'get_in_position';
  const bar = document.getElementById('gipBar');
  if (bar) bar.style.width = '0%';
  el.classList.add('show');
  document.getElementById('gipSkip').onclick = () => {
    gipFrameCount = 0;
    gipOnReady    = null;
    el.classList.remove('show');
    onReady();
  };
}

function showWorkoutSummary() {
  const wsEl = document.getElementById('workoutSummaryOverlay');
  if (!wsEl) return;
  const totalDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
  wsEl.querySelector('#wsum-total-time').textContent =
    `${String(Math.floor(totalDuration/60)).padStart(2,'0')}:${String(totalDuration%60).padStart(2,'0')}`;
  const avgForm = workoutLog.length
    ? Math.round(workoutLog.reduce((s,l) => s + l.pct, 0) / workoutLog.length) : 0;
  wsEl.querySelector('#wsum-form-avg').textContent  = avgForm + '%';
  wsEl.querySelector('#wsum-errors').textContent    = workoutLog.reduce((s,l) => s + l.errorCount, 0);
  wsEl.querySelector('#wsum-stars').textContent     = avgForm >= 85 ? '⭐⭐⭐' : avgForm >= 65 ? '⭐⭐' : '⭐';
  wsEl.querySelector('#wsum-motivation').textContent = avgForm >= 85
    ? 'Incredible! You crushed the whole workout! 🔥'
    : avgForm >= 65 ? 'Solid work — keep pushing! 💪'
    : 'Every rep counts — you showed up! 🏃';

  const totalReps     = workoutLog.reduce((s, l) => s + (l.reps || 0), 0);
  const totalMistakes = workoutLog.reduce((s, l) => s + l.errorCount, 0);
  wsEl.querySelector('#wsum-total-reps').textContent = totalReps;
  wsEl.querySelector('#wsum-errors').textContent     = totalMistakes;

  const exIcons = { squat:'🦵', curl:'💪', lunge:'🏃', plank:'🤸' };
  wsEl.querySelector('#wsum-exlist').innerHTML = workoutLog.map(log => {
    const val = log.holdMs != null
      ? (() => { const s = Math.round(log.holdMs/1000); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; })()
      : `${log.reps} reps`;
    const color = log.pct >= 80 ? '#34D399' : log.pct >= 60 ? '#FBBF24' : '#EF4444';
    const exErrors = Object.entries(log.errorTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([code]) => ERROR_DISPLAY[code]);
    const errHtml = exErrors.length > 0
      ? `<div class="wsum-ex-errs">${exErrors.map(([code, cnt]) =>
          `<div class="wsum-ex-err-item"><span>${cnt}×</span> ${ERROR_DISPLAY[code].label}</div>`
        ).join('')}</div>`
      : '';
    return `<div class="wsum-ex-row">
      <div class="wsum-ex-top">
        <div class="wsum-ex-icon">${exIcons[log.ex]||'🏋️'}</div>
        <div class="wsum-ex-name">${EXERCISES[log.ex].label}</div>
        <div class="wsum-ex-val">${val}</div>
        <div class="wsum-ex-pct" style="color:${color}">${log.pct}%</div>
      </div>${errHtml}
    </div>`;
  }).join('');

  const combined = {};
  workoutLog.forEach(log => Object.entries(log.errorTypeCounts).forEach(([c, n]) => {
    combined[c] = (combined[c] || 0) + n;
  }));
  const sorted = Object.entries(combined).sort((a, b) => b[1] - a[1]);
  const totalCombined = sorted.reduce((s, [, n]) => s + n, 0);
  const focusTitleEl = wsEl.querySelector('#wsum-focus-title');
  if (focusTitleEl) focusTitleEl.textContent = sorted.length > 0 ? `All Mistakes (${totalCombined} total)` : 'Mistakes';
  wsEl.querySelector('#wsum-focus').innerHTML = sorted.length === 0
    ? '<div class="sum-focus-clean">Flawless form across the whole workout! 🏆</div>'
    : sorted.map(([code, cnt]) => {
        const info = ERROR_DISPLAY[code]; if (!info) return '';
        return `<div class="sum-focus-item">
          <div class="sum-focus-label">${info.label} <span class="sum-focus-count">${cnt}×</span></div>
          <div class="sum-focus-fix">${info.fix}</div>
        </div>`;
      }).join('');

  feedbackEl.style.display = 'none';
  goodEl.style.display = 'none';
  hideTip();
  sessionEnded = true;
  sessionPhase = 'ended';
  wsEl.classList.add('show');
}

function hideWorkoutSummary() {
  document.getElementById('workoutSummaryOverlay')?.classList.remove('show');
}
window.showSummary = showSummary;

document.getElementById('workoutBtn')?.addEventListener('click', () => {
  if (workoutMode) { exitWorkoutMode(); doReset(); } else { startWorkoutMode(); }
});
document.getElementById('workoutSummaryClose')?.addEventListener('click', () => {
  hideWorkoutSummary(); exitWorkoutMode();
});
document.getElementById('workoutSummaryReset')?.addEventListener('click', () => {
  hideWorkoutSummary(); startWorkoutMode();
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

  // Show camera permission request; countdown fires after user steps into frame
  sessionPhase = 'waiting_permission';
  showCameraWait('requesting');
  startLiveWebcam();

  // Auto-start workout mode when launched from the Full Workout button
  if (params.get('workout') === 'true') {
    setTimeout(() => {
      if (!workoutMode) startWorkoutMode();
    }, 400);
  }
}
requestAnimationFrame(start);
