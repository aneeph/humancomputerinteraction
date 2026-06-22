/**
 * pose-fake.js
 * ─────────────────────────────────────────────────────
 * FAKE version of M3's pose() API.
 * When M3 delivers their real code, replace this file
 * with theirs and make sure their function still returns:
 *   { joint: string, angle: number, isCorrect: boolean }
 *
 * This fake simulates a person doing squats, alternating
 * between good and bad form every few seconds.
 */

const THRESHOLDS = {
  squat:  { joint: 'knee',  lo: 80,  hi: 110, label: 'Knee Angle' },
  pushup: { joint: 'elbow', lo: 70,  hi: 110, label: 'Elbow Angle' },
  lunge:  { joint: 'knee',  lo: 75,  hi: 105, label: 'Knee Angle' },
  curl:   { joint: 'elbow', lo: 30,  hi: 150, label: 'Elbow Angle' },
};

// Internal fake state
let _fakeAngle = 170;
let _fakeDir = -1; // going down
let _fakeExercise = 'squat';

function setFakeExercise(ex) {
  _fakeExercise = ex;
  _fakeAngle = 170;
}

/**
 * Call this every frame to get current pose data.
 * Returns: { joint, angle, isCorrect, label }
 */
function pose() {
  const config = THRESHOLDS[_fakeExercise];

  // Simulate angle oscillating between 60° and 175°
  _fakeAngle += _fakeDir * 1.5;
  if (_fakeAngle <= 60)  _fakeDir =  1;
  if (_fakeAngle >= 175) _fakeDir = -1;

  const angle = Math.round(_fakeAngle);
  const isCorrect = angle >= config.lo && angle <= config.hi;

  return {
    joint:     config.joint,
    angle:     angle,
    isCorrect: isCorrect,
    label:     config.label,
  };
}
