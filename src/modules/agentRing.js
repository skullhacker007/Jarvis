// =============================================================
// JARVIS AGENT VOICE RING — WEB AUDIO API & RADIAL WAVE ENGINE
// =============================================================
// Renders dynamic, sound-reactive outer harmonic waves around
// the central CSS glowing circular ring in Agent Mode.
// States: "idle" | "listening" | "processing" | "speaking"

const VALID_STATES = new Set(["idle", "listening", "processing", "speaking"]);

const WAVE_LAYERS = [
  { radiusOffset: 5, ampScale: 0.55, harmonics: 6, speed: 0.85, alpha: 0.62, lineWidth: 1.4, color: "rgba(186, 230, 253, ", band: "high" },
  { radiusOffset: 8, ampScale: 0.70, harmonics: 8, speed: -1.05, alpha: 0.52, lineWidth: 1.3, color: "rgba(56, 189, 248, ", band: "mid" },
  { radiusOffset: 11, ampScale: 0.85, harmonics: 10, speed: 1.2, alpha: 0.44, lineWidth: 1.2, color: "rgba(0, 216, 255, ", band: "bass" },
  { radiusOffset: 15, ampScale: 0.95, harmonics: 12, speed: -0.9, alpha: 0.34, lineWidth: 1.1, color: "rgba(34, 211, 238, ", band: "mid" },
  { radiusOffset: 19, ampScale: 1.05, harmonics: 14, speed: 1.35, alpha: 0.24, lineWidth: 1.0, color: "rgba(56, 189, 248, ", band: "high" },
  { radiusOffset: 23, ampScale: 1.15, harmonics: 16, speed: -1.15, alpha: 0.16, lineWidth: 0.9, color: "rgba(14, 165, 233, ", band: "bass" },
];

export const AgentVoiceRing = (() => {
  let coreEl = null;
  let ringEl = null;
  let canvasEl = null;
  let ctx = null;

  let currentState = "idle";
  let isActiveMode = false;
  let rafId = null;

  // Web Audio API nodes
  let micAudioCtx = null;
  let micAnalyser = null;
  let micStream = null;
  let micInitPromise = null;

  let ttsAnalyser = null;
  let ttsAnalyserCtx = null;

  const freqData = new Uint8Array(128);
  const timeData = new Uint8Array(256);

  // Smoothed audio metrics (0..1)
  let smoothVol = 0;
  let smoothBass = 0;
  let smoothMid = 0;
  let smoothHigh = 0;

  let canvasWidth = 560;
  let canvasHeight = 560;
  let dpr = 1;

  function normalizeState(rawState) {
    const s = String(rawState || "idle").toLowerCase().trim();
    if (s === "thinking" || s === "generating") return "processing";
    return VALID_STATES.has(s) ? s : "idle";
  }

  function resizeCanvas() {
    if (!canvasEl || !coreEl) return;
    const rect = coreEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    const targetW = Math.round(canvasWidth * dpr);
    const targetH = Math.round(canvasHeight * dpr);
    if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
      canvasEl.width = targetW;
      canvasEl.height = targetH;
    }
  }

  async function ensureMicAnalyser() {
    if (micAnalyser) return micAnalyser;
    if (micInitPromise) return micInitPromise;

    micInitPromise = (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return null;
        }
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        micAudioCtx = new AudioCtx();
        if (micAudioCtx.state === "suspended") {
          await micAudioCtx.resume().catch(() => {});
        }
        const source = micAudioCtx.createMediaStreamSource(micStream);
        micAnalyser = micAudioCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        micAnalyser.smoothingTimeConstant = 0.78;
        source.connect(micAnalyser);
        return micAnalyser;
      } catch (err) {
        console.warn("[AgentVoiceRing] Microphone Web Audio setup unavailable:", err?.message || err);
        return null;
      } finally {
        micInitPromise = null;
      }
    })();

    return micInitPromise;
  }

  function getTtsAnalyser(audioCtx) {
    if (!audioCtx) return null;
    if (ttsAnalyser && ttsAnalyserCtx === audioCtx) {
      return ttsAnalyser;
    }
    try {
      ttsAnalyser = audioCtx.createAnalyser();
      ttsAnalyser.fftSize = 256;
      ttsAnalyser.smoothingTimeConstant = 0.72;
      ttsAnalyser.connect(audioCtx.destination);
      ttsAnalyserCtx = audioCtx;
      return ttsAnalyser;
    } catch (err) {
      console.warn("[AgentVoiceRing] TTS Analyser creation failed:", err);
      return null;
    }
  }

  function connectOutputSource(sourceNode, audioCtx) {
    if (!sourceNode || !audioCtx) return;
    const analyserNode = getTtsAnalyser(audioCtx);
    if (analyserNode) {
      sourceNode.connect(analyserNode);
    } else {
      sourceNode.connect(audioCtx.destination);
    }
  }

  function sampleAnalyser(analyserNode) {
    analyserNode.getByteFrequencyData(freqData);
    analyserNode.getByteTimeDomainData(timeData);

    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const norm = (timeData[i] - 128) / 128.0;
      sumSq += norm * norm;
    }
    const rms = Math.sqrt(sumSq / timeData.length);

    let bassSum = 0;
    for (let i = 0; i < 8; i++) bassSum += freqData[i];
    let midSum = 0;
    for (let i = 8; i < 32; i++) midSum += freqData[i];
    let highSum = 0;
    for (let i = 32; i < 80; i++) highSum += freqData[i];

    const bass = Math.min(1, (bassSum / (8 * 255)) * 1.35);
    const mid = Math.min(1, (midSum / (24 * 255)) * 1.55);
    const high = Math.min(1, (highSum / (48 * 255)) * 1.9);
    const vol = Math.min(1, Math.max(Math.pow(rms * 4.2, 0.85), bass * 0.55 + mid * 0.45));

    return { vol, bass, mid, high, hasSignal: vol > 0.015 };
  }

  function updateAudioMetrics(t) {
    let targetVol = 0;
    let targetBass = 0;
    let targetMid = 0;
    let targetHigh = 0;

    if (currentState === "listening" && micAnalyser) {
      const sampled = sampleAnalyser(micAnalyser);
      targetVol = sampled.vol;
      targetBass = sampled.bass;
      targetMid = sampled.mid;
      targetHigh = sampled.high;
    } else if (currentState === "speaking") {
      let sampled = null;
      if (ttsAnalyser) {
        sampled = sampleAnalyser(ttsAnalyser);
      }
      if (sampled && sampled.hasSignal) {
        targetVol = sampled.vol;
        targetBass = sampled.bass;
        targetMid = sampled.mid;
        targetHigh = sampled.high;
      } else {
        // Fallback cadence when Web Speech synthesis is used without an AudioBuffer
        const cadence = 0.42 + 0.28 * Math.sin(t * 7.4) + 0.16 * Math.sin(t * 13.1);
        targetVol = Math.max(0.18, Math.min(0.92, cadence));
        targetBass = targetVol * (0.75 + 0.25 * Math.sin(t * 4.2));
        targetMid = targetVol * (0.7 + 0.3 * Math.cos(t * 6.5));
        targetHigh = targetVol * (0.55 + 0.35 * Math.sin(t * 9.8));
      }
    } else if (currentState === "processing") {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
      targetVol = 0.22 + pulse * 0.24;
      targetBass = 0.2 + pulse * 0.3;
      targetMid = 0.25 + (1 - pulse) * 0.25;
      targetHigh = 0.18 + pulse * 0.2;
    } else {
      // Idle: subtle ambient shimmer
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.4);
      targetVol = 0.04 + breathe * 0.04;
      targetBass = 0.04 + breathe * 0.04;
      targetMid = 0.04;
      targetHigh = 0.03;
    }

    const attack = 0.42;
    const decay = 0.14;
    smoothVol += (targetVol - smoothVol) * (targetVol > smoothVol ? attack : decay);
    smoothBass += (targetBass - smoothBass) * (targetBass > smoothBass ? attack : decay);
    smoothMid += (targetMid - smoothMid) * (targetMid > smoothMid ? attack : decay);
    smoothHigh += (targetHigh - smoothHigh) * (targetHigh > smoothHigh ? attack : decay);

    if (coreEl) {
      coreEl.style.setProperty("--audio-level", smoothVol.toFixed(3));
      coreEl.style.setProperty("--bass-level", smoothBass.toFixed(3));
      coreEl.style.setProperty("--mid-level", smoothMid.toFixed(3));
      coreEl.style.setProperty("--high-level", smoothHigh.toFixed(3));
    }
  }

  function getBandEnergy(band) {
    if (band === "bass") return smoothBass;
    if (band === "high") return smoothHigh;
    return smoothMid;
  }

  function drawWaves(t) {
    if (!ctx || !canvasEl) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    // Match the CSS --ring-size radius so waves emanate right from the glowing ring edge
    const ringDiameter = ringEl ? ringEl.getBoundingClientRect().width : Math.min(230, Math.min(canvasWidth, canvasHeight) * 0.42);
    const baseRadius = (ringDiameter / 2) + 2;

    const stateEnergy =
      currentState === "speaking" ? 1.0 :
      currentState === "listening" ? 0.9 :
      currentState === "processing" ? 0.6 :
      0.22;

    const pointsCount = 240;
    const twoPi = Math.PI * 2;
    const hasLiveSpectrum =
      (currentState === "listening" && micAnalyser) ||
      (currentState === "speaking" && ttsAnalyser);

    ctx.globalCompositeOperation = "screen";

    for (let l = 0; l < WAVE_LAYERS.length; l++) {
      const layer = WAVE_LAYERS[l];
      const bandEnergy = getBandEnergy(layer.band);
      const dynamicAmp =
        (1.6 + smoothVol * 7.5 + bandEnergy * 5.0) *
        layer.ampScale *
        stateEnergy;

      const layerRadius = baseRadius + layer.radiusOffset * (0.65 + smoothVol * 0.35);
      const phase = t * layer.speed * (1 + smoothVol * 0.65) + l * 0.85;
      const alpha = Math.min(0.88, layer.alpha * (0.45 + smoothVol * 0.75 + stateEnergy * 0.2));

      ctx.beginPath();
      for (let i = 0; i <= pointsCount; i++) {
        const theta = (i / pointsCount) * twoPi;

        // Smooth sinusoidal multi-frequency wave around the circle (no sharp cusps)
        const h1 = Math.sin(theta * layer.harmonics + phase);
        const h2 = 0.45 * Math.sin(theta * (layer.harmonics - 3) - phase * 1.25);

        let spectrumBoost = 0;
        if (hasLiveSpectrum) {
          const mirrored = Math.abs(((i % pointsCount) / pointsCount) * 2 - 1);
          const binIndex = Math.min(64, Math.floor(mirrored * 48));
          spectrumBoost = (freqData[binIndex] / 255) * 3.5 * layer.ampScale;
        }

        const displacement =
          (0.5 + 0.5 * ((h1 + h2) / 1.45)) * dynamicAmp +
          spectrumBoost * (0.4 + bandEnergy * 0.6);

        const r = layerRadius + displacement;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.strokeStyle = `${layer.color}${alpha.toFixed(3)})`;
      ctx.lineWidth = layer.lineWidth + smoothVol * 0.35;
      ctx.shadowColor = "rgba(0, 216, 255, 0.65)";
      ctx.shadowBlur = l < 3 ? 8 + smoothVol * 6 : 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  function tick(nowMs) {
    if (!isActiveMode) {
      rafId = null;
      return;
    }
    const t = nowMs * 0.001;
    updateAudioMetrics(t);
    drawWaves(t);
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId !== null) return;
    resizeCanvas();
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setState(newState) {
    const normalized = normalizeState(newState);
    currentState = normalized;

    if (coreEl) {
      coreEl.setAttribute("data-state", normalized);
    }
    if (isActiveMode && normalized === "listening") {
      ensureMicAnalyser();
    }
    return normalized;
  }

  function setModeActive(active) {
    isActiveMode = Boolean(active);
    if (isActiveMode) {
      if (currentState === "listening") {
        ensureMicAnalyser();
      }
      startLoop();
    } else {
      stopLoop();
    }
  }

  function init() {
    coreEl = document.getElementById("agent-voice-core");
    ringEl = document.getElementById("agent-core-ring");
    canvasEl = document.getElementById("agent-wave-canvas");

    if (canvasEl) {
      ctx = canvasEl.getContext("2d");
    }

    if (coreEl && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => resizeCanvas());
      ro.observe(coreEl);
    }
    window.addEventListener("resize", resizeCanvas);

    // Sync initial mode
    setModeActive(document.body.classList.contains("agent-mode-active"));
  }

  return {
    init,
    setState,
    getState: () => currentState,
    setModeActive,
    ensureMicAnalyser,
    getMicAnalyser: () => micAnalyser,
    connectOutputSource,
  };
})();
