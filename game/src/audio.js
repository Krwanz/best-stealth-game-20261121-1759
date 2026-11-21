// All sound is synthesized with WebAudio — no audio files, no network.
// Footsteps tick, a two-note sting sounds on the alarm, a chime on pickup,
// a low drone on being caught, and a short arpeggio on the win.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = null) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noiseBurst(duration, volume, frequency) {
    if (!ensure() || muted) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    /** Call on the first user gesture so the browser allows sound. */
    unlock() {
      ensure();
    },
    /** A footstep; `loud` (running) is heavier, `distance` fades far steps. */
    footstep(loud, distance = 0) {
      const volume = Math.max(0.02, (loud ? 0.22 : 0.12) * (1 - distance / 600));
      noiseBurst(0.07, volume, loud ? 500 : 900);
    },
    /** A guard's footstep heard nearby: quieter, lower, and positional. */
    guardStep(distance) {
      const volume = Math.max(0.015, 0.16 * (1 - distance / 500));
      if (volume <= 0.02) return;
      noiseBurst(0.08, volume, 350);
    },
    /** The "?" sting: a guard grew suspicious. */
    suspicious() {
      tone(660, 0.12, 'sine', 0.18);
      tone(880, 0.16, 'sine', 0.14, 0.1);
    },
    /** The "!" alarm sting: two sharp notes, then a low hit. */
    alarm() {
      tone(523, 0.14, 'square', 0.12);
      tone(784, 0.22, 'square', 0.12, 0.12);
      tone(196, 0.35, 'sawtooth', 0.1, 0.24);
    },
    /** A calmer two-note phrase when the guards give up and go back to patrol. */
    calmDown() {
      tone(392, 0.18, 'sine', 0.12);
      tone(330, 0.24, 'sine', 0.1, 0.14);
    },
    /** Picking up an intel file: a bright little chime. */
    pickup() {
      tone(880, 0.1, 'sine', 0.16);
      tone(1174, 0.14, 'sine', 0.16, 0.08);
      tone(1568, 0.2, 'sine', 0.14, 0.16);
    },
    /** The exit unlocking: a soft click and a rising tone. */
    unlockExit() {
      tone(440, 0.1, 'triangle', 0.16);
      tone(440, 0.25, 'triangle', 0.14, 0.1, 880);
    },
    /** Being caught: a low falling drone. */
    caught() {
      tone(220, 0.5, 'sawtooth', 0.16, 0, 110);
      tone(110, 0.7, 'sawtooth', 0.14, 0.15, 55);
    },
    /** Winning: a short rising arpeggio. */
    win() {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone(frequency, 0.22, 'triangle', 0.16, index * 0.11);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
