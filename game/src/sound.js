// Phở Rush — sound: tiny WebAudio beeps, no audio files.
// Every effect is one oscillator burst so the game needs zero network.

let ctx = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  const ac = ctx;
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  pick() { tone(520, 0.07, 'triangle', 0.06); },
  chop() { tone(180, 0.05, 'square', 0.05); tone(320, 0.04, 'square', 0.04, 0.02); },
  start() { tone(330, 0.09, 'sine', 0.06); tone(440, 0.09, 'sine', 0.06, 0.08); },
  ding() { tone(880, 0.18, 'sine', 0.08); tone(1320, 0.22, 'sine', 0.05, 0.08); },
  plate() { tone(660, 0.06, 'triangle', 0.07); },
  serve() { tone(523, 0.1, 'triangle', 0.08); tone(659, 0.1, 'triangle', 0.08, 0.09); tone(784, 0.16, 'triangle', 0.09, 0.18); },
  bad() { tone(140, 0.16, 'sawtooth', 0.05); },
  rush() { tone(392, 0.12, 'square', 0.06); tone(392, 0.12, 'square', 0.06, 0.15); tone(523, 0.2, 'square', 0.06, 0.3); },
  over() { tone(392, 0.15, 'triangle', 0.07); tone(330, 0.15, 'triangle', 0.07, 0.14); tone(262, 0.3, 'triangle', 0.07, 0.28); },
};
