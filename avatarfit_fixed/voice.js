// voice.js — Voice commands (in) + spoken feedback (out) for AvatarFit

const _SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let _recognition  = null;
let _voiceActive  = false;
const _lastSpoken = {};

// ── Speech synthesis ──────────────────────────────────
function speak(text, priority = false) {
  if (typeof isMuted !== 'undefined' && isMuted) return;
  if (!window.speechSynthesis) return;

  const now = Date.now();
  const cooldown = priority ? 500 : 5000;
  if (_lastSpoken[text] && now - _lastSpoken[text] < cooldown) return;
  _lastSpoken[text] = now;

  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = 1.15;
  utt.pitch  = 1.0;
  utt.volume = 0.85;
  speechSynthesis.speak(utt);
}

// ── Voice command toast ───────────────────────────────
function showVoiceToast(text) {
  const toast = document.getElementById('voiceToast');
  if (!toast) return;
  toast.textContent = `🎤 "${text}"`;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Command table ─────────────────────────────────────
const VOICE_COMMANDS = [
  { match: ['squat', 'squats'],                 action: () => { setExercise('squat');  speak('Switching to squat'); } },
  { match: ['curl', 'bicep curl', 'curls'],      action: () => { setExercise('curl');   speak('Switching to bicep curl'); } },
  { match: ['lunge', 'lunges'],                  action: () => { setExercise('lunge');  speak('Switching to lunge'); } },
  { match: ['plank'],                            action: () => { setExercise('plank');  speak('Switching to plank'); } },
  { match: ['reset', 'restart', 'start over'],   action: () => { document.getElementById('resetBtn').click(); speak('Session reset'); } },
  { match: ['summary', 'show summary', 'stats'], action: () => document.getElementById('summaryBtn').click() },
  { match: ['bot mode', 'bot on', 'enable bot'], action: () => document.getElementById('botToggle').click() },
  { match: ['mute', 'silence', 'quiet'],         action: () => { if (typeof isMuted !== 'undefined' && !isMuted) document.getElementById('muteToggle').click(); } },
  { match: ['unmute', 'sound on', 'volume'],     action: () => { if (typeof isMuted !== 'undefined' && isMuted)  document.getElementById('muteToggle').click(); } },
  { match: ['skeleton', 'show skeleton', 'show bones'], action: () => document.getElementById('skeletonToggle').click() },
];

function _handleResult(transcript) {
  const text = transcript.toLowerCase().trim();
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.match.some(m => text.includes(m))) {
      showVoiceToast(cmd.match[0]);
      cmd.action();
      return;
    }
  }
}

// ── Recognition lifecycle ─────────────────────────────
function _initRecognition() {
  if (!_SpeechRecognition) return false;

  _recognition = new _SpeechRecognition();
  _recognition.continuous      = true;
  _recognition.interimResults  = false;
  _recognition.lang            = 'en-US';

  _recognition.onresult = e => {
    const result = e.results[e.results.length - 1];
    if (result.isFinal) _handleResult(result[0].transcript);
  };

  _recognition.onerror = e => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    console.warn('Voice error:', e.error);
    setVoiceStatus('error');
  };

  _recognition.onend = () => {
    if (_voiceActive) {
      setTimeout(() => { try { _recognition.start(); } catch(_) {} }, 300);
    }
  };

  return true;
}

function setVoiceStatus(state) {
  const btn = document.getElementById('voiceToggle');
  if (!btn) return;
  if (state === 'on')    { btn.textContent = '🎤 Voice: ON'; btn.classList.add('active'); }
  else if (state === 'off')   { btn.textContent = '🎤 Voice';    btn.classList.remove('active'); }
  else if (state === 'error') { btn.textContent = '🎤 Error';    btn.classList.remove('active'); _voiceActive = false; }
}

function toggleVoice() {
  if (!_SpeechRecognition) {
    showVoiceToast('Not supported in this browser');
    return;
  }

  if (!_recognition && !_initRecognition()) return;

  _voiceActive = !_voiceActive;

  if (_voiceActive) {
    try { _recognition.start(); } catch(_) {}
    setVoiceStatus('on');
    speak('Voice commands active', true);
    showVoiceToast('Listening…');
  } else {
    _recognition.stop();
    setVoiceStatus('off');
  }
}

window.toggleVoice = toggleVoice;
window.speak       = speak;
