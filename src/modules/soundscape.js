// =============================================================
// J.A.R.V.I.S. SOUNDSCAPE MODULE (PURE WEB AUDIO SCI-FI SYNTHESIZER)
// =============================================================

export const JarvisSoundscape = (() => {
  let sfxCtx = null;

  function getAudioCtx() {
    if (!sfxCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) sfxCtx = new AudioClass();
    }
    if (sfxCtx && sfxCtx.state === "suspended") {
      sfxCtx.resume().catch(() => {});
    }
    return sfxCtx;
  }

  function play(name) {
    const actx = getAudioCtx();
    if (!actx) return;
    const now = actx.currentTime;

    try {
      switch (name) {
        case "click": {
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(700, now + 0.025);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.start(now);
          osc.stop(now + 0.028);
          break;
        }

        case "confirm": {
          const osc1 = actx.createOscillator();
          const osc2 = actx.createOscillator();
          const gain = actx.createGain();
          osc1.type = "sine";
          osc2.type = "triangle";
          osc1.frequency.setValueAtTime(659.25, now);
          osc1.frequency.setValueAtTime(987.77, now + 0.05);
          osc2.frequency.setValueAtTime(1318.51, now + 0.05);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(actx.destination);
          osc1.start(now);
          osc2.start(now + 0.05);
          osc1.stop(now + 0.17);
          osc2.stop(now + 0.17);
          break;
        }

        case "alert": {
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(1040, now);
          osc.frequency.setValueAtTime(780, now + 0.08);
          osc.frequency.setValueAtTime(1040, now + 0.14);
          const filter = actx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 1200;
          filter.Q.value = 3.0;
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(actx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }

        case "wake": {
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(1280, now + 0.12);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case "mode": {
          [523.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.03);
            gain.gain.setValueAtTime(0.06, now + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start(now + idx * 0.03);
            osc.stop(now + 0.35);
          });
          break;
        }

        case "undo": {
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(330, now + 0.11);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.start(now);
          osc.stop(now + 0.13);
          break;
        }
      }
    } catch (e) {
      console.warn("Soundscape FX playback failed:", e);
    }
  }

  return { play, getAudioCtx };
})();
