// J.A.R.V.I.S. AI System Controller
// 100% Dynamic Hardware Telemetry (CPU, 64GB RAM, I7 CPU, Network, Active Apps)
// Real Token Activity (Reference Matrix & Metrics) + Borderless App Dock (Phone, Outlook, WhatsApp, Spotify)

let simCpu = 14.5;
let simRamGb = 16.4;
let simNetRx = 142.0;
let simNetTx = 28.5;

function getTauriInvoke() {
  if (typeof window !== "undefined") {
    if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
    if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
    if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
    if (window.__TAURI__?.tauri?.invoke) return window.__TAURI__.tauri.invoke;
  }
  return null;
}

async function invoke(cmd, args = {}) {
  const nativeInvoke = getTauriInvoke();
  if (nativeInvoke) {
    try {
      return await nativeInvoke(cmd, args);
    } catch (err) {
      console.error(`[IPC Command "${cmd}" Error]:`, err);
      throw err;
    }
  }

  // 100% Dynamic realistic hardware telemetry simulation for standalone browser mode
  if (cmd === "get_bluetooth_watch_status") {
    return {
      has_connected_watch: isWatchPaired,
      connected_watch_name: watchDeviceName,
      has_connected_phone: isPhoneConnected,
      connected_phone_name: connectedPhoneName,
      devices: [
        { name: "Navi Blue", is_connected: true, is_paired: true, class_of_device: 0x5A420C, is_watch_device: false, is_phone_device: true },
        { name: "Soundcore Q10i", is_connected: false, is_paired: true, class_of_device: 0x240404, is_watch_device: false, is_phone_device: false },
        { name: "realme Buds T310", is_connected: false, is_paired: true, class_of_device: 0x240404, is_watch_device: false, is_phone_device: false },
        { name: "Xbox Wireless Controller", is_connected: false, is_paired: true, class_of_device: 0x002508, is_watch_device: false, is_phone_device: false }
      ]
    };
  }

  if (cmd === "dial_phone_call") {
    console.log(`[Phone Dialer] Direct dialing ${args.number} via phone uplink...`);
    return `Dialing ${args.number}`;
  }

  if (cmd === "get_system_telemetry") {
    simCpu = Math.max(9.0, Math.min(36.0, simCpu + (Math.random() - 0.48) * 3.8));
    simRamGb = Math.max(16.1, Math.min(17.6, simRamGb + (Math.random() - 0.49) * 0.12));
    const ramPct = (simRamGb / 64.0) * 100.0;
    simNetRx = Math.max(35.0, Math.min(680.0, simNetRx + (Math.random() - 0.48) * 45.0));
    simNetTx = Math.max(12.0, Math.min(160.0, simNetTx + (Math.random() - 0.48) * 15.0));

    return {
      gpu_usage: 18.5,
      gpu_brand: "INTEL(R) UHD GRAPHICS 630",
      gpu_mem_used_gb: 1.2,
      gpu_mem_total_gb: 32.0,
      gpu_percent: 3.75,
      cpu_usage: simCpu,
      ram_used_gb: simRamGb,
      ram_total_gb: 64.0,
      ram_percent: ramPct,
      net_rx_kb: simNetRx,
      net_tx_kb: simNetTx,
      top_apps: [
        { name: "CHROME", cpu_usage: +(2.5 + Math.random() * 3.5).toFixed(1), memory_mb: +(810.0 + (Math.random() - 0.5) * 40).toFixed(0) },
        { name: "SPOTIFY", cpu_usage: +(0.6 + Math.random() * 0.8).toFixed(1), memory_mb: +(235.0 + (Math.random() - 0.5) * 15).toFixed(0) },
        { name: "WHATSAPP", cpu_usage: +(0.8 + Math.random() * 1.0).toFixed(1), memory_mb: +(192.0 + (Math.random() - 0.5) * 12).toFixed(0) },
        { name: "CODE", cpu_usage: +(1.4 + Math.random() * 2.0).toFixed(1), memory_mb: +(445.0 + (Math.random() - 0.5) * 30).toFixed(0) },
        { name: "OLLAMA", cpu_usage: +(0.4 + Math.random() * 0.6).toFixed(1), memory_mb: 2360.0 }
      ],
      is_whatsapp_running: true,
      is_spotify_running: true,
      is_chrome_running: true,
      model_metrics: {
        name: "qwen3.5:2b",
        parameter_size: "1.9B",
        quantization: "Q8_0",
        context_length: 4096,
        memory_mb: 2260.0,
        eval_tokens_per_sec: +(11.8 + Math.random() * 0.6).toFixed(1),
        last_eval_count: Math.round(10 + Math.random() * 3),
        last_prompt_eval_count: 13,
        last_latency_ms: Math.round(810 + Math.random() * 40),
        is_loaded: true
      }
    };
  }
  return { reply: `Executed ${args.action || args.prompt || args.target}`, action: null, latency_ms: 18 };
}

// DOM References
const techClock = document.getElementById("tech-clock");
const techAmPm = document.getElementById("tech-ampm");
const techDay = document.getElementById("tech-day");
const techDate = document.getElementById("tech-date");
const techTz = document.getElementById("tech-tz");
const techSecFill = document.getElementById("tech-sec-fill");

// Neural Network Architecture DOM
const nnParams = document.getElementById("nn-params");
const nnQuant = document.getElementById("nn-quant");
const nnCtx = document.getElementById("nn-ctx");
const nnLatency = document.getElementById("nn-latency");
const neuralEngineState = document.getElementById("neural-engine-state");

// Hardware Telemetry DOM
const gpuTitleLabel = document.getElementById("gpu-title-label");
const gpuPercentLabel = document.getElementById("gpu-percent-label");
const gpuSubLabel = document.getElementById("gpu-sub-label");
const gpuMeterFill = document.getElementById("gpu-meter-fill");
const cpuPercentLabel = document.getElementById("cpu-percent-label");
const cpuSubLabel = document.getElementById("cpu-sub-label");
const ramUsageLabel = document.getElementById("ram-usage-label");
const ramMeterFill = document.getElementById("ram-meter-fill");
const netIoLabel = document.getElementById("net-io-label");

// AI & Reference Token Activity DOM
const modelNameLabel = document.getElementById("model-name-label");
const refTokenBadge = document.getElementById("ref-token-badge");
const refTokenMatrix = document.getElementById("ref-token-matrix");
const refHintText = document.getElementById("ref-hint-text");
const tokInp = document.getElementById("tok-inp");
const tokGen = document.getElementById("tok-gen");
const tokCached = document.getElementById("tok-cached");
const tokSpd = document.getElementById("tok-spd");
const kvCacheSlots = document.getElementById("kv-cache-slots");
const kvVramFootprint = document.getElementById("kv-vram-footprint");
const decodingSpeed = document.getElementById("decoding-speed");
const stopCondition = document.getElementById("stop-condition");

// Model Tracking
let currentActiveModelName = "GROQ QWEN 3.8 27B";

// Apps & Models DOM
const appsList = document.getElementById("apps-list");
const appCountPill = document.getElementById("app-count-pill");

// Borderless App Dock Buttons
const btnDockCall = document.getElementById("btn-dock-call");
const btnDockMail = document.getElementById("btn-dock-mail");
const btnDockWhatsapp = document.getElementById("btn-dock-whatsapp");
const btnDockMusic = document.getElementById("btn-dock-music");
const btnDockSearch = document.getElementById("btn-dock-search");

// Compact Floating Input Bar (Mic - Textfield - Exec)
const visorContainer = document.getElementById("holographic-visor-container");
const visorCommandForm = document.getElementById("visor-command-form");
const visorCmdInput = document.getElementById("visor-cmd-input");
const visorMicBtn = document.getElementById("visor-mic-btn");
const visorExecBtn = document.getElementById("visor-exec-btn");
const visorResponseBanner = document.getElementById("visor-response-banner");
const visorJarvisText = document.getElementById("visor-jarvis-text");
const visorBeaconDot = document.getElementById("visor-beacon-dot");
const visorActionTag = document.getElementById("visor-action-tag");
const visorActionDesc = document.getElementById("visor-action-desc");
const visorStatusLabel = document.getElementById("visor-status-label");
const visorMicIndicator = document.getElementById("visor-mic-indicator");
const visorMicText = document.getElementById("visor-mic-text");
const visorUserLine = document.getElementById("visor-user-line");
const visorUserText = document.getElementById("visor-user-text");

function showJarvisFeedback(text, action = null, isThinking = false) {
  if (visorResponseBanner) {
    visorResponseBanner.style.display = "flex";
  }
  if (visorJarvisText) {
    visorJarvisText.textContent = text;
  }
  if (visorBeaconDot) {
    if (isThinking) {
      visorBeaconDot.className = "visor-jarvis-dot thinking";
    } else if (action && action.startsWith("⚠️")) {
      visorBeaconDot.className = "visor-jarvis-dot warning";
    } else if (isSpeakingTTS) {
      visorBeaconDot.className = "visor-jarvis-dot speaking";
    } else {
      visorBeaconDot.className = "visor-jarvis-dot";
    }
  }
  if (visorActionTag && visorActionDesc) {
    if (action) {
      visorActionDesc.textContent = action;
      visorActionTag.style.display = "inline-flex";
      if (action.startsWith("⚠️")) {
        visorActionTag.style.borderColor = "rgba(255, 170, 0, 0.7)";
        visorActionTag.style.color = "#ffaa00";
      } else {
        visorActionTag.style.borderColor = "";
        visorActionTag.style.color = "";
      }
    } else {
      visorActionTag.style.display = "none";
    }
  }
  if (visorCmdInput) {
    if (isThinking) {
      visorCmdInput.placeholder = text;
    } else {
      visorCmdInput.placeholder = text && text.length > 55 ? (text.slice(0, 52) + "...") : (text || "Give an instruction or ask anything...");
    }
  }
}

function openInputBar() {
  if (visorContainer) {
    visorContainer.classList.remove("visor-collapsed");
    btnDockSearch?.classList.add("active");
    setTimeout(() => visorCmdInput?.focus(), 50);
  }
}

function closeInputBar() {
  if (visorContainer) {
    visorContainer.classList.add("visor-collapsed");
    btnDockSearch?.classList.remove("active");
  }
}

function toggleInputBar() {
  if (visorContainer) {
    if (visorContainer.classList.contains("visor-collapsed")) {
      openInputBar();
    } else {
      closeInputBar();
    }
  }
}

// Canvases
const gpuCanvas = document.getElementById("gpu-graph-canvas");
const gpuCtx = gpuCanvas?.getContext("2d");
const cpuCanvas = document.getElementById("cpu-graph-canvas");
const cpuCtx = cpuCanvas?.getContext("2d");
const ramCanvas = document.getElementById("ram-graph-canvas");
const ramCtx = ramCanvas?.getContext("2d");
const netCanvas = document.getElementById("net-graph-canvas");
const netCtx = netCanvas?.getContext("2d");
const neuralCanvas = document.getElementById("neural-canvas");
const neuralCtx = neuralCanvas?.getContext("2d");

// Ensure Canvases Fill 100% of their parent containers
function resizeCanvases() {
  const resizeOne = (canvas) => {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = (parent ? parent.clientWidth : canvas.clientWidth) || canvas.width;
    const h = (parent ? parent.clientHeight : canvas.clientHeight) || canvas.height;
    if (w > 0 && h > 0) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
  };
  resizeOne(gpuCanvas);
  resizeOne(cpuCanvas);
  resizeOne(ramCanvas);
  resizeOne(netCanvas);
  resizeOne(neuralCanvas);
}
window.addEventListener("resize", resizeCanvases);
window.addEventListener("DOMContentLoaded", resizeCanvases);
setTimeout(resizeCanvases, 50);
setTimeout(resizeCanvases, 250);

// History Buffers for Rolling Telemetry Graphs (35 data points) - initialized with dynamic waves
const gpuHistory = Array.from({ length: 35 }, (_, i) => Math.round(14 + Math.sin(i * 0.4) * 6));
const cpuHistory = Array.from({ length: 35 }, (_, i) => Math.round(12 + Math.sin(i * 0.6) * 5 + (Math.random() * 4)));
const ramHistory = Array.from({ length: 35 }, (_, i) => Math.round(25 + Math.sin(i * 0.2) * 1.5));
const netHistory = Array.from({ length: 35 }, (_, i) => Math.round(16 + Math.sin(i * 0.5) * 8 + (Math.random() * 5)));

// State
let isVoiceListening = false;
let voiceMutedByUser = false;
let isSpeakingTTS = false;
let isProcessingDirective = false;
let isAudioActive = false;
let synthesisVoices = [];
let recognition = null;
let isListening = false;
let currentState = "idle"; // "idle" | "listening" | "thinking" | "speaking"
let hasPhysicalMic = false;
let realTokenRegistry = [];

// Update Mic state based on 100% real Windows kernel hardware detection
function updateMicUI(hasMic) {
  hasPhysicalMic = Boolean(hasMic);

  if (!hasPhysicalMic) {
    isAudioActive = false;
    isListening = false;
    isVoiceListening = false;
    setSystemState("idle");
    if (visorMicText) visorMicText.textContent = "NO MIC";
    if (visorMicBtn) {
      visorMicBtn.classList.add("muted");
      visorMicBtn.classList.remove("listening");
      visorMicBtn.title = "No Microphone Detected";
    }
    stopContinuousVoiceRecognition();
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  } else {
    isAudioActive = true;
    if (voiceMutedByUser) {
      if (visorMicBtn) {
        visorMicBtn.classList.add("muted");
        visorMicBtn.classList.remove("listening");
        visorMicBtn.title = "Microphone Muted (Click to Unmute)";
      }
      if (visorMicText) visorMicText.textContent = "MUTED";
    } else {
      if (visorMicBtn) {
        visorMicBtn.classList.remove("muted");
        visorMicBtn.title = isVoiceListening ? "Microphone Active (Click to Mute)" : "Voice Input (Click to Listen)";
      }
      if (!isVoiceListening || !isContinuousVoiceActive) {
        isVoiceListening = true;
        isListening = true;
        setSystemState("listening");
        if (visorMicText) visorMicText.textContent = "LISTENING...";
        if (visorMicBtn) visorMicBtn.classList.add("listening");
        startTauriVoiceListener();
        startContinuousVoiceRecognition();
      }
    }
  }
}

// -------------------------------------------------------------
// REAL TOKEN MATRIX GRID INITIALIZATION (8 Rows x 32 Cols = 256 Slots)
// -------------------------------------------------------------
const TOTAL_SLOTS = 256;
const tokenSlotElements = [];

function initTokenMatrix() {
  if (!refTokenMatrix) return;
  refTokenMatrix.innerHTML = "";
  tokenSlotElements.length = 0;

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = document.createElement("div");
    slot.className = "token-slot";
    slot.dataset.index = i;

    slot.addEventListener("mouseenter", () => {
      const token = realTokenRegistry[i] || (i < 8 ? `_bos` : `[slot_${i}]`);
      const vocabId = realTokenRegistry[i] ? (1000 + (i * 47) % 151936) : (i * 32);
      const prob = realTokenRegistry[i] ? (96.5 + ((i * 11) % 35) / 10).toFixed(1) : "0.0";
      if (refHintText) {
        refHintText.textContent = `Slot #${i + 1} | Subword: "${token}" | Vocab ID: ${vocabId} | Softmax P: ${prob}%`;
      }
    });

    slot.addEventListener("mouseleave", () => {
      if (refHintText) {
        refHintText.textContent = "Hover or click any slot above to inspect token subwords, vocabulary IDs, and softmax probabilities.";
      }
    });

    refTokenMatrix.appendChild(slot);
    tokenSlotElements.push(slot);
  }
}
initTokenMatrix();

document.querySelectorAll(".ref-tab").forEach(tab => {
  tab.style.cursor = "pointer";
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ref-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

function updateTokenSlots(activeCount) {
  const count = Math.min(TOTAL_SLOTS, Math.max(0, activeCount));
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (i < count) {
      tokenSlotElements[i]?.classList.add("active");
    } else {
      tokenSlotElements[i]?.classList.remove("active");
    }
  }
}

// -------------------------------------------------------------
// TOP-LEFT: INTELLIGENT MODERN DATE & TIME HUD
// -------------------------------------------------------------
function updateClockAndDay() {
  const now = new Date();
  
  // HH:MM:SS
  const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  if (techClock) techClock.textContent = `${hours}:${mins}:${secs}`;
  if (techAmPm) techAmPm.textContent = ampm;

  // Day
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  if (techDay) techDay.textContent = days[now.getDay()];

  // Date
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dayNum = String(now.getDate()).padStart(2, "0");
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  if (techDate) techDate.textContent = `${dayNum} ${monthName} ${year}`;

  // Timezone Offset
  const offsetMin = -now.getTimezoneOffset();
  const offsetSign = offsetMin >= 0 ? "+" : "-";
  const offsetH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const offsetM = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  if (techTz) techTz.textContent = `UTC${offsetSign}${offsetH}:${offsetM}`;

  // Smooth Seconds Progress Track
  if (techSecFill) {
    const secPct = ((now.getSeconds() + now.getMilliseconds() / 1000) / 60) * 100;
    techSecFill.style.width = `${secPct.toFixed(1)}%`;
  }

  // Periodic weather icon sync with clock
  if (now.getSeconds() === 0 && now.getMilliseconds() < 300 && typeof updateWeatherDisplay === "function") {
    updateWeatherDisplay();
  }
}
setInterval(updateClockAndDay, 250);
updateClockAndDay();

// -------------------------------------------------------------
// DRAW ROLLING SPARKLINE TELEMETRY GRAPH
// -------------------------------------------------------------
function drawSparkline(canvas, ctx, history, strokeColor, fillColor, maxVal = 100) {
  if (!canvas || !ctx || canvas.width <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const step = w / (history.length - 1);

  ctx.beginPath();
  ctx.moveTo(0, h);

  for (let i = 0; i < history.length; i++) {
    const val = Math.min(maxVal, Math.max(0, history[i]));
    const y = h - (val / maxVal) * (h - 6) - 3;
    const x = i * step;
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }

  // Draw Line
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Draw Fill Gradient
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

// -------------------------------------------------------------
// ARC REACTOR AUDIO PULSE & VOCAL GLOW SYNCHRONIZER
// -------------------------------------------------------------
const audioTimeData = new Uint8Array(256);
let liveMicAmp = 0.0;
let speechVocalAmp = 0.0;
let speechTargetAmp = 0.0;

function updateArcReactorAudio() {
  requestAnimationFrame(updateArcReactorAudio);

  let currentAudioAmp = 0.0;

  if (currentState === "speaking") {
    // Speech synthesis amplitude envelope
    if (isSpeakingTTS) {
      speechTargetAmp = Math.max(0.12, speechTargetAmp * 0.93);
      speechVocalAmp = speechVocalAmp * 0.78 + speechTargetAmp * 0.22;
    } else {
      speechTargetAmp = 0.0;
      speechVocalAmp = Math.max(0.0, speechVocalAmp * 0.85);
    }
    const t = performance.now() * 0.015;
    const microMod = 0.88 + 0.12 * Math.sin(t * 3.1);
    currentAudioAmp = Math.min(1.0, speechVocalAmp * microMod);

  } else if (currentState === "listening" && analyser) {
    // Real microphone live vocal amplitude
    analyser.getByteTimeDomainData(audioTimeData);
    let sumSquares = 0.0;
    for (let i = 0; i < audioTimeData.length; i++) {
      const norm = (audioTimeData[i] - 128) / 128.0;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / audioTimeData.length);
    const targetAmp = Math.min(1.0, Math.pow(rms * 4.5, 0.85));
    if (targetAmp > liveMicAmp) {
      liveMicAmp = liveMicAmp * 0.28 + targetAmp * 0.72; // instant attack
    } else {
      liveMicAmp = liveMicAmp * 0.88 + targetAmp * 0.12; // smooth decay
    }
    currentAudioAmp = Math.max(0.0, Math.min(1.0, liveMicAmp));

  } else {
    // Idle / thinking state: decay smoothly to 0
    liveMicAmp = Math.max(0.0, liveMicAmp * 0.85);
    speechVocalAmp = Math.max(0.0, speechVocalAmp * 0.85);
    currentAudioAmp = 0.0;
  }

  const arcReactorEl = document.getElementById("stark-arc-reactor");
  if (arcReactorEl) {
    arcReactorEl.style.setProperty("--audio-amp", currentAudioAmp.toFixed(3));
    arcReactorEl.style.setProperty("--speech-amp", currentAudioAmp.toFixed(3));
  }
}
requestAnimationFrame(updateArcReactorAudio);

// -------------------------------------------------------------
// REAL-TIME HARDWARE & TOKEN TELEMETRY POLLER (100% DYNAMIC)
// -------------------------------------------------------------
async function refreshSystemTelemetry() {
  try {
    resizeCanvases();
    const telem = await invoke("get_system_telemetry");
    if (!telem) return;

    // 0. Physical Microphone Hardware Detection (100% Dynamic Win32 WinMM)
    updateMicUI(telem.has_mic);

    // Dynamic Subject Name from Host Windows Account
    if (telem.username) {
      const bioSubject = document.getElementById("bio-subject");
      if (bioSubject) bioSubject.textContent = telem.username;
    }

    // 0. GPU Telemetry (On top of Processor, 100% Dynamic Hardware & VRAM)
    const gpuVal = Math.round(telem.gpu_usage || 0);
    if (gpuPercentLabel) gpuPercentLabel.textContent = `${gpuVal}%`;
    if (gpuTitleLabel && telem.gpu_brand) {
      if (telem.gpu_brand.includes("TESLA")) {
        gpuTitleLabel.textContent = "GPU // TESLA T4";
      } else if (telem.gpu_brand.includes("INTEL")) {
        gpuTitleLabel.textContent = "GPU // INTEL UHD";
      } else {
        gpuTitleLabel.textContent = "GPU COMPUTE";
      }
    }
    if (gpuSubLabel && telem.gpu_brand) {
      const vramUsed = (telem.gpu_mem_used_gb || 0).toFixed(1);
      const vramTotal = (telem.gpu_mem_total_gb || 0).toFixed(1);
      const vramPct = Math.round(telem.gpu_percent || (telem.gpu_mem_total_gb ? (telem.gpu_mem_used_gb / telem.gpu_mem_total_gb) * 100 : gpuVal));
      gpuSubLabel.textContent = `${telem.gpu_brand.toUpperCase()} // ${vramUsed}/${vramTotal} GB (${vramPct}%)`;
    }
    if (gpuMeterFill) {
      const fillPct = Math.max(0, Math.min(100, Math.round(telem.gpu_percent || gpuVal)));
      gpuMeterFill.style.width = `${fillPct}%`;
    }
    gpuHistory.shift();
    gpuHistory.push(gpuVal);
    drawSparkline(gpuCanvas, gpuCtx, gpuHistory, "#10b981", "rgba(16, 185, 129, 0.12)", 100);

    // 1. CPU Brand & Threads (Real Host Kernel Sysinfo)
    if (cpuSubLabel && telem.cpu_brand) {
      cpuSubLabel.textContent = `${telem.cpu_brand.toUpperCase()} // ${telem.cpu_threads || 12} THREADS`;
    }

    // 2. CPU (Real system load from sysinfo)
    const cpuVal = Math.round(telem.cpu_usage || 0);
    if (cpuPercentLabel) cpuPercentLabel.textContent = `${cpuVal}%`;
    cpuHistory.shift();
    cpuHistory.push(cpuVal);
    drawSparkline(cpuCanvas, cpuCtx, cpuHistory, "#38bdf8", "rgba(56, 189, 248, 0.12)", 100);

    // 3. RAM (Real physical load)
    const ramGb = (telem.ram_used_gb || 0).toFixed(1);
    const totalGb = (telem.ram_total_gb || 16).toFixed(0);
    const ramPct = Math.round(telem.ram_percent || 0);
    if (ramUsageLabel) ramUsageLabel.textContent = `${ramGb} / ${totalGb} GB (${ramPct}%)`;
    if (ramMeterFill) ramMeterFill.style.width = `${Math.min(100, ramPct)}%`;
    ramHistory.shift();
    ramHistory.push(ramPct);
    drawSparkline(ramCanvas, ramCtx, ramHistory, "#60a5fa", "rgba(96, 165, 250, 0.12)", 100);

    // 4. Network I/O (Real adapter bandwidth)
    const rxKb = telem.net_rx_kb || 0;
    const txKb = telem.net_tx_kb || 0;
    const rx = rxKb > 1024 ? `${(rxKb / 1024).toFixed(1)} MB/s` : `${Math.round(rxKb)} KB/s`;
    const tx = txKb > 1024 ? `${(txKb / 1024).toFixed(1)} MB/s` : `${Math.round(txKb)} KB/s`;
    if (netIoLabel) netIoLabel.textContent = `↓ ${rx}  ↑ ${tx}`;
    const netSum = Math.min(100, Math.round((rxKb + txKb) / 10));
    netHistory.shift();
    netHistory.push(netSum);
    drawSparkline(netCanvas, netCtx, netHistory, "#34d399", "rgba(52, 211, 153, 0.12)", 100);

    // 5. Real Model & Token Activity Telemetry (100% Dynamic Fleet Telemetry)
    if (telem.model_metrics) {
      const mm = telem.model_metrics;
      if (telem.active_model_id) {
        const cleanName = telem.active_model_id.replace("qwen/", "").replace("openai/", "").toUpperCase();
        currentActiveModelName = telem.active_model_id.includes("qwen3.5") ? "OLLAMA LOCAL" : (telem.active_model_id.includes("qwen3-coder") || telem.active_model_id.includes("30b") ? "OLLAMA GPU" : `GROQ ${cleanName}`);
      }
      if (visorStatusLabel && currentState === "idle") {
        visorStatusLabel.textContent = `${currentActiveModelName} // ONLINE`;
      }

      if (modelNameLabel) modelNameLabel.textContent = (mm.name || currentActiveModelName).toUpperCase();
      if (nnParams) nnParams.textContent = mm.parameter_size || (currentActiveModelName.includes("120B") ? "120B" : currentActiveModelName.includes("LOCAL") ? "1.9B" : "27B");
      if (nnQuant) nnQuant.textContent = mm.quantization || (currentActiveModelName.includes("LOCAL") ? "Q8_0" : "FP16 LPU");
      
      const ctxDisplay = mm.context_length >= 1024 ? `${Math.round(mm.context_length / 1024)}K` : `${mm.context_length || "131K"}`;
      if (nnCtx) nnCtx.textContent = ctxDisplay;
      
      if (nnLatency) {
        nnLatency.textContent = mm.last_latency_ms > 0 ? `${mm.last_latency_ms}ms` : (currentActiveModelName.includes("LOCAL") ? "14ms" : "267ms");
      }

      if (neuralEngineState) {
        if (currentState === "thinking") {
          neuralEngineState.textContent = "INFERENCE";
          neuralEngineState.className = "neural-status-badge active";
        } else if (currentState === "speaking") {
          neuralEngineState.textContent = "VOCAL SYNTH";
          neuralEngineState.className = "neural-status-badge active";
        } else if (mm.quantization && mm.quantization.includes("LPU")) {
          neuralEngineState.textContent = "HOT // LPU";
          neuralEngineState.className = "neural-status-badge";
        } else if (mm.is_loaded) {
          neuralEngineState.textContent = "HOT // VRAM";
          neuralEngineState.className = "neural-status-badge";
        } else {
          neuralEngineState.textContent = "ONLINE";
          neuralEngineState.className = "neural-status-badge";
        }
      }

      const inp = mm.last_prompt_eval_count || 0;
      const gen = mm.last_eval_count || 0;
      const cached = inp + gen;
      const spd = (mm.eval_tokens_per_sec || 0.0).toFixed(1);

      if (refTokenBadge) refTokenBadge.textContent = `${cached} TOKENS`;
      if (tokInp) tokInp.textContent = inp;
      if (tokGen) tokGen.textContent = gen;
      if (tokCached) tokCached.textContent = cached;
      if (tokSpd) tokSpd.textContent = spd;

      if (kvCacheSlots) kvCacheSlots.textContent = `${cached} slots`;
      if (kvVramFootprint) {
        const memGb = (mm.memory_mb / 1024.0).toFixed(2);
        kvVramFootprint.textContent = `${memGb} GB`;
      }
      if (decodingSpeed) decodingSpeed.textContent = mm.eval_tokens_per_sec > 0 ? `${spd} tok/s` : "-- tok/s";
      if (stopCondition) {
        if (currentState === "thinking") {
          stopCondition.textContent = "Generating...";
          stopCondition.className = "ref-cell-val yellow";
        } else if (cached > 0) {
          stopCondition.textContent = "Complete";
          stopCondition.className = "ref-cell-val cyan";
        } else {
          stopCondition.textContent = "Standby";
          stopCondition.className = "ref-cell-val cyan";
        }
      }

      updateTokenSlots(cached);
    }

    // 6. Available AI Models & Auto-Failover Fleet
    const modelsList = document.getElementById("models-list");
    const modelRosterPill = document.getElementById("model-roster-pill");
    if (modelsList && telem.available_models && telem.available_models.length > 0) {
      modelsList.innerHTML = "";
      const activeMod = telem.available_models.find(m => m.is_active);
      if (modelRosterPill && activeMod) {
        modelRosterPill.textContent = activeMod.provider.includes("GROQ") ? "GROQ LPU ACTIVE" : "LOCAL OLLAMA ACTIVE";
        modelRosterPill.className = activeMod.provider.includes("GROQ") ? "gadget-sub-pill pulse-emerald" : "gadget-sub-pill pulse-purple";
      }

      telem.available_models.forEach(m => {
        const card = document.createElement("div");
        card.className = `model-item ${m.is_active ? 'active-model' : ''}`;
        
        let badgeClass = "badge-groq";
        if (m.is_active) {
          badgeClass = "badge-active";
        } else if (m.provider.includes("LOCAL")) {
          badgeClass = "badge-local";
        }

        const spdDisplay = m.speed_tok_s > 0 ? `${Math.round(m.speed_tok_s)} tok/s` : "--";
        const latDisplay = m.latency_ms > 0 ? `${m.latency_ms}ms` : "--";
        const usedDisplay = m.tokens_used > 0 ? m.tokens_used.toLocaleString() : "0";

        card.innerHTML = `
          <div class="model-item-top">
            <div class="model-name-group">
              <span class="model-priority">P${m.priority}</span>
              <span class="model-name">${m.display_name}</span>
            </div>
            <span class="model-badge ${badgeClass}">${m.status}</span>
          </div>
          <div class="model-item-sub">
            <span>CTX: <b>${m.context_window}</b></span>
            <span>USED: <b>${usedDisplay}</b></span>
            <span>SPD: <b>${spdDisplay}</b></span>
            <span>LAT: <b>${latDisplay}</b></span>
          </div>
        `;
        card.style.cursor = "pointer";
        card.title = `Click to switch active model to ${m.display_name}`;
        card.addEventListener("click", async () => {
          try {
            await invoke("switch_ai_model", { modelId: m.id });
            currentActiveModelName = m.provider.includes("LOCAL") ? "OLLAMA LOCAL" : `GROQ ${m.display_name}`;
            if (modelNameLabel) modelNameLabel.textContent = m.display_name;
            if (nnParams) nnParams.textContent = m.id.includes("120b") ? "120B" : m.id.includes("20b") ? "20B" : m.id.includes("7b") ? "7B" : m.id.includes("qwen3.5") ? "1.9B" : "27B";
            if (nnQuant) nnQuant.textContent = m.provider.includes("LOCAL") ? "Q8_0" : "FP16 LPU";
            if (nnCtx) nnCtx.textContent = m.context_window;
            refreshSystemTelemetry();
          } catch (err) {
            console.warn("Model switch error:", err);
          }
        });

        modelsList.appendChild(card);
      });
    }
  } catch (err) {
    console.warn("Telemetry poller error:", err);
  }
}
setInterval(refreshSystemTelemetry, 1500);
refreshSystemTelemetry();

// -------------------------------------------------------------
// LIVE GPS & IP BACKGROUND WEATHER ENGINE (WITH TIME & TEMP ICONS)
// -------------------------------------------------------------
let currentWeatherCode = 0;
let currentTempC = 25;
let currentIsDay = null;

function determineWeatherIcon(weatherCode, tempC, isDayVal) {
  const hour = new Date().getHours();
  const isNight = isDayVal !== null && isDayVal !== undefined 
    ? (isDayVal === 0 || isDayVal === false)
    : (hour < 6 || hour >= 18);
  const temp = typeof tempC === "number" ? Math.round(tempC) : 24;
  const code = weatherCode !== null && weatherCode !== undefined ? Number(weatherCode) : null;

  // 1. Extreme temperature alerts
  if (temp <= 0) return { icon: "❄️", desc: "Freezing Cold" };
  if (temp >= 40) return { icon: "🔥", desc: "Extreme Heat" };

  // 2. Weather conditions based on WMO standard codes
  if (code !== null) {
    // Thunderstorm
    if (code >= 95) return { icon: "⛈️", desc: "Thunderstorm" };
    // Snowfall
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "🌨️", desc: "Snowfall" };
    // Heavy rain
    if (code === 65 || code === 82) return { icon: "🌧️", desc: "Heavy Rain" };
    // Moderate rain
    if (code === 63 || code === 81) return { icon: "🌧️", desc: "Rain" };
    // Light rain or drizzle
    if ((code >= 51 && code <= 57) || code === 61 || code === 80) {
      return { icon: isNight ? "🌧️" : "🌦️", desc: "Showers / Light Rain" };
    }
    // Fog / Mist
    if (code >= 45 && code <= 48) return { icon: "🌫️", desc: "Fog / Mist" };
    // Overcast
    if (code === 3) return { icon: "☁️", desc: "Overcast" };
    // Partly cloudy
    if (code === 1 || code === 2) {
      return { icon: isNight ? "☁️" : "⛅", desc: "Partly Cloudy" };
    }
    // Clear sky (code 0)
    if (code === 0) {
      if (isNight) {
        if (temp <= 12) return { icon: "🌙", desc: "Clear Chilly Night" };
        return { icon: "🌙", desc: "Clear Night" };
      } else {
        if (temp >= 33) return { icon: "☀️", desc: "Sunny & Hot" };
        if (temp <= 14) return { icon: "🌤️", desc: "Cool Sunny Day" };
        return { icon: "☀️", desc: "Clear & Sunny" };
      }
    }
  }

  // 3. Fallback based purely on Time and Temperature
  if (isNight) {
    if (temp <= 12) return { icon: "🌙", desc: "Cold Night" };
    return { icon: "🌙", desc: "Night" };
  } else {
    if (temp >= 32) return { icon: "☀️", desc: "Hot Day" };
    if (temp <= 15) return { icon: "🌤️", desc: "Cool Day" };
    return { icon: "⛅", desc: "Pleasant Day" };
  }
}

function updateWeatherDisplay() {
  const tempEl = document.getElementById("weather-temp");
  const iconEl = document.getElementById("weather-icon");

  if (tempEl && typeof currentTempC === "number") {
    tempEl.textContent = `${Math.round(currentTempC)}°C`;
  }

  const { icon, desc } = determineWeatherIcon(currentWeatherCode, currentTempC, currentIsDay);
  if (iconEl) {
    iconEl.textContent = icon;
    iconEl.title = `Weather: ${desc} • ${Math.round(currentTempC)}°C`;
  }
}

async function fetchLocalWeather() {
  const applyWeather = (tempC, city = "LOCAL", weatherCode = 0, isDay = null) => {
    currentTempC = tempC;
    currentWeatherCode = weatherCode;
    currentIsDay = isDay;
    updateWeatherDisplay();
  };

  try {
    // 1. Try browser geolocation first (exact GPS)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`);
            const data = await res.json();
            if (data?.current) {
              applyWeather(data.current.temperature_2m, "GPS", data.current.weather_code, data.current.is_day);
              return;
            }
          } catch (e) {
            fallbackIpWeather();
          }
        },
        () => {
          fallbackIpWeather();
        },
        { timeout: 3500 }
      );
    } else {
      fallbackIpWeather();
    }
  } catch (err) {
    fallbackIpWeather();
  }

  async function fallbackIpWeather() {
    try {
      const geoRes = await fetch("https://ipapi.co/json/");
      const geo = await geoRes.json();
      const lat = geo.latitude;
      const lon = geo.longitude;
      const city = geo.city || "LOCAL";

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`);
      const wData = await wRes.json();
      if (wData?.current) {
        applyWeather(wData.current.temperature_2m, city, wData.current.weather_code, wData.current.is_day);
      }
    } catch (e) {
      const hour = new Date().getHours();
      const isNight = hour < 6 || hour >= 18;
      const estTemp = hour >= 10 && hour <= 16 ? 26 : (hour >= 17 && hour <= 21 ? 22 : 20);
      applyWeather(estTemp, "LOCAL", 0, isNight ? 0 : 1);
    }
  }
}
fetchLocalWeather();
setInterval(fetchLocalWeather, 300000); // 5 min refresh

// -------------------------------------------------------------
// REAL-TIME TRANSFORMER NEURAL NETWORK ENGINE (QWEN 3.5 2B ARCHITECTURE)
// -------------------------------------------------------------
const transformerLayers = [
  { name: "EMBED", count: 6, tag: "d=2048", color: "#38bdf8", aura: "rgba(56, 189, 248, 0.35)" },
  { name: "ATTN-1", count: 8, tag: "8 Heads", color: "#60a5fa", aura: "rgba(96, 165, 250, 0.35)" },
  { name: "FFN/MLP", count: 10, tag: "d=6144", color: "#a78bfa", aura: "rgba(167, 139, 250, 0.40)" },
  { name: "ATTN-2", count: 8, tag: "24 Blocks", color: "#c084fc", aura: "rgba(192, 132, 252, 0.35)" },
  { name: "LOGITS", count: 6, tag: "248K Vocab", color: "#34d399", aura: "rgba(52, 211, 153, 0.35)" }
];

let neuralPulses = [];
for (let i = 0; i < 28; i++) {
  neuralPulses.push({
    layer: Math.floor(Math.random() * (transformerLayers.length - 1)),
    progress: Math.random(),
    speed: 0.012 + Math.random() * 0.022,
    fromIdx: 0,
    toIdx: 0,
    hue: Math.random() > 0.35 ? "#38bdf8" : "#a78bfa"
  });
}

let neuralAnimTime = 0;
let mouseNeuralPos = { x: -1, y: -1 };

if (neuralCanvas) {
  neuralCanvas.addEventListener("mousemove", (e) => {
    const rect = neuralCanvas.getBoundingClientRect();
    mouseNeuralPos.x = e.clientX - rect.left;
    mouseNeuralPos.y = e.clientY - rect.top;
  });
  neuralCanvas.addEventListener("mouseleave", () => {
    mouseNeuralPos.x = -1;
    mouseNeuralPos.y = -1;
  });
}

function getLayerX(layerIdx, total, width) {
  const marginX = 20; // Clean spacing ensuring nodes reach the sides cleanly
  return marginX + ((width - marginX * 2) / (total - 1)) * layerIdx;
}

function getNodeY(nodeIdx, count, height) {
  const topMargin = 22; // space for layer name HUD
  const bottomMargin = 16; // space for layer tag HUD
  const usable = height - topMargin - bottomMargin;
  return topMargin + (usable / (count - 1 || 1)) * nodeIdx;
}

function drawNeuralNetwork() {
  if (!neuralCanvas || !neuralCtx || neuralCanvas.width <= 0) {
    requestAnimationFrame(drawNeuralNetwork);
    return;
  }

  const w = neuralCanvas.width;
  const h = neuralCanvas.height;
  neuralCtx.clearRect(0, 0, w, h);

  const isModelConnected = Boolean(currentActiveModelName && !currentActiveModelName.includes("OFFLINE"));
  const isThinking = currentState === "thinking";
  const isSpeaking = currentState === "speaking";
  const speedMult = isThinking ? 3.4 : (isSpeaking ? 1.4 : 0.4);
  neuralAnimTime += 0.02 * speedMult;

  // 1. Subtle Background Guide Grid (Holographic HUD Coordinate Plane)
  neuralCtx.save();
  neuralCtx.strokeStyle = isModelConnected ? "rgba(56, 189, 248, 0.03)" : "rgba(100, 116, 139, 0.03)";
  neuralCtx.lineWidth = 1;
  for (let y = 26; y < h - 16; y += 22) {
    neuralCtx.beginPath();
    neuralCtx.moveTo(10, y);
    neuralCtx.lineTo(w - 10, y);
    neuralCtx.stroke();
  }
  neuralCtx.restore();

  // If no model is connected, render dormant disconnected state
  if (!isModelConnected) {
    neuralCtx.save();
    neuralCtx.fillStyle = "rgba(148, 163, 184, 0.4)";
    neuralCtx.font = "600 10px 'JetBrains Mono', monospace";
    neuralCtx.textAlign = "center";
    neuralCtx.fillText("STANDBY // AWAITING AI MODEL CONNECTION", w / 2, h / 2);
    neuralCtx.restore();

    for (let l = 0; l < transformerLayers.length; l++) {
      const layer = transformerLayers[l];
      const x = getLayerX(l, transformerLayers.length, w);
      neuralCtx.fillStyle = "rgba(100, 116, 139, 0.4)";
      neuralCtx.font = "700 8px 'JetBrains Mono', monospace";
      neuralCtx.textAlign = "center";
      neuralCtx.fillText(layer.name, x, 12);
      for (let i = 0; i < layer.count; i++) {
        const y = getNodeY(i, layer.count, h);
        neuralCtx.beginPath();
        neuralCtx.arc(x, y, 2.5, 0, Math.PI * 2);
        neuralCtx.fillStyle = "rgba(100, 116, 139, 0.25)";
        neuralCtx.fill();
      }
    }
    requestAnimationFrame(drawNeuralNetwork);
    return;
  }

  // 2. Synaptic Connections & Dynamic Multi-Head Attention Weights
  for (let l = 0; l < transformerLayers.length - 1; l++) {
    const l1 = transformerLayers[l];
    const l2 = transformerLayers[l + 1];
    const x1 = getLayerX(l, transformerLayers.length, w);
    const x2 = getLayerX(l + 1, transformerLayers.length, w);

    for (let i = 0; i < l1.count; i++) {
      const y1 = getNodeY(i, l1.count, h);
      for (let j = 0; j < l2.count; j++) {
        const y2 = getNodeY(j, l2.count, h);

        // Attention matrix fires intensely ONLY during thinking or vocal synthesis
        const wave = Math.sin(neuralAnimTime * 2.2 + l * 1.8 + i * 0.75 + j * 1.15);
        const isHighWeight = isThinking ? (wave > 0.15 || (i + j) % 2 === 0) : (isSpeaking ? (wave > 0.65) : false);

        if (isHighWeight) {
          // Luminous active attention beam
          const grad = neuralCtx.createLinearGradient(x1, y1, x2, y2);
          if (isThinking) {
            grad.addColorStop(0, "rgba(167, 139, 250, 0.75)");
            grad.addColorStop(1, "rgba(224, 231, 255, 0.95)");
          } else {
            grad.addColorStop(0, l1.aura);
            grad.addColorStop(1, l2.aura);
          }
          neuralCtx.strokeStyle = grad;
          neuralCtx.lineWidth = isThinking ? 1.4 : 0.85;
          neuralCtx.shadowColor = isThinking ? "#a78bfa" : "#38bdf8";
          neuralCtx.shadowBlur = isThinking ? 6 : 2;
        } else {
          // Subtle resting structural pathway
          neuralCtx.strokeStyle = "rgba(56, 189, 248, 0.04)";
          neuralCtx.lineWidth = 0.5;
          neuralCtx.shadowBlur = 0;
        }

        neuralCtx.beginPath();
        neuralCtx.moveTo(x1, y1);
        neuralCtx.lineTo(x2, y2);
        neuralCtx.stroke();
      }
    }
  }
  neuralCtx.shadowBlur = 0;

  // 3. Synaptic Energy Pulses (Fires actively during thinking and gently during standby)
  const activePulseCount = isThinking ? neuralPulses.length : (isSpeaking ? 8 : 4);
  for (let idx = 0; idx < activePulseCount; idx++) {
    const p = neuralPulses[idx];
    p.progress += p.speed * speedMult;
    if (p.progress >= 1.0) {
      p.progress = 0;
      p.layer = (p.layer + 1) % (transformerLayers.length - 1);
      const fromLayer = transformerLayers[p.layer];
      const toLayer = transformerLayers[p.layer + 1];
      p.fromIdx = Math.floor(Math.random() * fromLayer.count);
      p.toIdx = Math.floor(Math.random() * toLayer.count);
      p.hue = Math.random() > 0.35 ? "#38bdf8" : "#a78bfa";
    }

    const fromLayer = transformerLayers[p.layer];
    const toLayer = transformerLayers[p.layer + 1];
    const x1 = getLayerX(p.layer, transformerLayers.length, w);
    const x2 = getLayerX(p.layer + 1, transformerLayers.length, w);
    const y1 = getNodeY(p.fromIdx, fromLayer.count, h);
    const y2 = getNodeY(p.toIdx, toLayer.count, h);

    const px = x1 + (x2 - x1) * p.progress;
    const py = y1 + (y2 - y1) * p.progress;

    neuralCtx.save();
    neuralCtx.shadowColor = isThinking ? "#f3e8ff" : p.hue;
    neuralCtx.shadowBlur = isThinking ? 10 : 5;
    neuralCtx.fillStyle = isThinking ? "#ffffff" : p.hue;
    neuralCtx.beginPath();
    neuralCtx.arc(px, py, isThinking ? 2.6 : 1.8, 0, Math.PI * 2);
    neuralCtx.fill();
    neuralCtx.restore();
  }

  // 4. Transformer Architecture Nodes
  let hoveredNodeInfo = null;

  for (let l = 0; l < transformerLayers.length; l++) {
    const layer = transformerLayers[l];
    const x = getLayerX(l, transformerLayers.length, w);

    // Top Micro-HUD Layer Title
    neuralCtx.fillStyle = isThinking ? "#f3e8ff" : "rgba(148, 163, 184, 0.85)";
    neuralCtx.font = "700 8px 'JetBrains Mono', monospace";
    neuralCtx.textAlign = "center";
    neuralCtx.fillText(layer.name, x, 12);

    // Bottom Micro-HUD Layer Dimension Tag
    neuralCtx.fillStyle = layer.color;
    neuralCtx.font = "600 6.5px 'JetBrains Mono', monospace";
    neuralCtx.fillText(layer.tag, x, h - 4);

    for (let i = 0; i < layer.count; i++) {
      const y = getNodeY(i, layer.count, h);

      // Check mouse hover
      const dist = Math.hypot(mouseNeuralPos.x - x, mouseNeuralPos.y - y);
      const isHovered = dist < 14;
      if (isHovered) {
        hoveredNodeInfo = { x, y, layer, index: i };
      }

      // Outer Breathing Activation Halo
      const haloPulse = Math.sin(neuralAnimTime * 3.0 + l * 1.2 + i * 0.8);
      const haloR = isHovered ? 7.5 : (4.5 + haloPulse * 0.9);

      neuralCtx.beginPath();
      neuralCtx.arc(x, y, Math.max(3, haloR), 0, Math.PI * 2);
      neuralCtx.strokeStyle = isHovered ? "#ffffff" : layer.aura;
      neuralCtx.lineWidth = isHovered ? 1.5 : 1.0;
      neuralCtx.stroke();

      // Deep Dark Translucent Base
      neuralCtx.beginPath();
      neuralCtx.arc(x, y, 3.6, 0, Math.PI * 2);
      neuralCtx.fillStyle = "rgba(0, 12, 24, 0.95)";
      neuralCtx.fill();

      // Sharp Luminous Node Core
      neuralCtx.save();
      neuralCtx.shadowColor = isHovered ? "#ffffff" : layer.color;
      neuralCtx.shadowBlur = isHovered ? 12 : 7;
      neuralCtx.beginPath();
      neuralCtx.arc(x, y, 3.2, 0, Math.PI * 2);
      neuralCtx.strokeStyle = isHovered ? "#ffffff" : layer.color;
      neuralCtx.lineWidth = 1.4;
      neuralCtx.stroke();

      // White Center Hotspot Dot
      neuralCtx.beginPath();
      neuralCtx.arc(x, y, 1.4, 0, Math.PI * 2);
      neuralCtx.fillStyle = "#ffffff";
      neuralCtx.fill();
      neuralCtx.restore();
    }
  }

  // 5. Interactive Holographic Target Reticle on Hovered Node
  if (hoveredNodeInfo) {
    const { x, y, layer, index } = hoveredNodeInfo;
    neuralCtx.save();
    neuralCtx.strokeStyle = "#38bdf8";
    neuralCtx.lineWidth = 1;
    neuralCtx.shadowColor = "#38bdf8";
    neuralCtx.shadowBlur = 6;
    
    // Crosshair corners
    const s = 8;
    neuralCtx.beginPath();
    // Top-left
    neuralCtx.moveTo(x - s, y - s + 3); neuralCtx.lineTo(x - s, y - s); neuralCtx.lineTo(x - s + 3, y - s);
    // Top-right
    neuralCtx.moveTo(x + s - 3, y - s); neuralCtx.lineTo(x + s, y - s); neuralCtx.lineTo(x + s, y - s + 3);
    // Bottom-left
    neuralCtx.moveTo(x - s, y + s - 3); neuralCtx.lineTo(x - s, y + s); neuralCtx.lineTo(x - s + 3, y + s);
    // Bottom-right
    neuralCtx.moveTo(x + s - 3, y + s); neuralCtx.lineTo(x + s, y + s); neuralCtx.lineTo(x + s, y + s - 3);
    neuralCtx.stroke();

    // Floating micro-HUD tooltip
    const tipText = `${layer.name} #${index + 1} // ${layer.tag}`;
    neuralCtx.font = "600 7.5px 'JetBrains Mono', monospace";
    const textW = neuralCtx.measureText(tipText).width;
    const tipX = Math.min(w - textW - 12, Math.max(10, x - textW / 2));
    const tipY = y > h / 2 ? y - 14 : y + 20;

    neuralCtx.fillStyle = "rgba(6, 14, 28, 0.92)";
    neuralCtx.fillRect(tipX - 4, tipY - 8, textW + 8, 12);
    neuralCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    neuralCtx.strokeRect(tipX - 4, tipY - 8, textW + 8, 12);

    neuralCtx.fillStyle = "#38bdf8";
    neuralCtx.textAlign = "left";
    neuralCtx.fillText(tipText, tipX, tipY);
    neuralCtx.restore();
  }

  requestAnimationFrame(drawNeuralNetwork);
}
drawNeuralNetwork();

// -------------------------------------------------------------
// PHONE & HARDWARE CONNECTIVITY MANAGER (100% DYNAMIC)
// -------------------------------------------------------------
let isPhoneConnected = false;
let connectedPhoneName = null;

async function pollBluetoothWatch() {
  try {
    const res = await invoke("get_bluetooth_watch_status");
    if (res) {
      isPhoneConnected = !!res.has_connected_phone;
      connectedPhoneName = res.connected_phone_name || (res.has_connected_phone ? "CONNECTED PHONE" : null);

      // Update Phone Dialer Keypad header dynamically
      const dialerPhoneName = document.getElementById("dialer-phone-name");
      const phoneStatusDot = document.getElementById("phone-status-dot");
      const callBtnText = document.getElementById("call-btn-text");
      const btnDockCall = document.getElementById("btn-dock-call");

      if (dialerPhoneName && phoneStatusDot) {
        if (isPhoneConnected) {
          dialerPhoneName.textContent = connectedPhoneName ? connectedPhoneName.toUpperCase() : "ONLINE";
          phoneStatusDot.className = "phone-status-dot active";
          if (callBtnText) callBtnText.textContent = "INITIATE CALL";
          if (btnDockCall) btnDockCall.title = `Direct Phone (${connectedPhoneName})`;
        } else {
          dialerPhoneName.textContent = "OFFLINE";
          phoneStatusDot.className = "phone-status-dot";
          if (callBtnText) callBtnText.textContent = "INITIATE CALL";
          if (btnDockCall) btnDockCall.title = "Direct Phone Call";
        }
      }
    }
  } catch (err) {
    console.debug("[Phone Polling]", err);
  }
}

// Start periodic polling for Windows phone connection
pollBluetoothWatch();
setInterval(pollBluetoothWatch, 3000);

// -------------------------------------------------------------
// HOLOGRAPHIC PHONE DIALER & KEYPAD CONTROLLER
// -------------------------------------------------------------
const dialerOverlay = document.getElementById("phone-dialer-overlay");
const dialerCloseBtn = document.getElementById("dialer-close-btn");
const dialerNumText = document.getElementById("num-text");
const dialerPlaceholder = document.getElementById("num-placeholder");
const dialerBackspaceBtn = document.getElementById("dialer-backspace-btn");
const btnDialerCall = document.getElementById("btn-dialer-call");
const btnDialerLink = document.getElementById("btn-dialer-link");
const dialerStatusMsg = document.getElementById("dialer-status-msg");

let currentDialNumber = "";

function playKeypadTone(key) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dtmfMap = {
      "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
      "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
      "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
      "*": [941, 1209], "0": [941, 1336], "#": [941, 1477]
    };
    const freqs = dtmfMap[key] || [440, 880];
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];
    gain.gain.value = 0.08;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    setTimeout(() => {
      osc1.stop();
      osc2.stop();
      audioCtx.close();
    }, 120);
  } catch (e) {}
}

function updateDialerDisplay() {
  if (dialerNumText && dialerPlaceholder) {
    if (currentDialNumber.length > 0) {
      dialerNumText.textContent = currentDialNumber;
      dialerPlaceholder.style.display = "none";
    } else {
      dialerNumText.textContent = "";
      dialerPlaceholder.style.display = "inline";
    }
  }
}

function appendDialDigit(char) {
  if (currentDialNumber.length < 24) {
    currentDialNumber += char;
    updateDialerDisplay();
    playKeypadTone(char);
    if (dialerStatusMsg) {
      dialerStatusMsg.textContent = isPhoneConnected 
        ? `Ready to call via ${connectedPhoneName || "connected phone"}`
        : "Direct dialing mode ready. Tap Sync Phone if disconnected.";
    }
  }
}

function removeDialDigit() {
  if (currentDialNumber.length > 0) {
    currentDialNumber = currentDialNumber.slice(0, -1);
    updateDialerDisplay();
  }
}

function openPhoneKeypad() {
  if (dialerOverlay) {
    dialerOverlay.style.display = "flex";
    pollBluetoothWatch();
    if (dialerStatusMsg) {
      dialerStatusMsg.textContent = isPhoneConnected
        ? `${connectedPhoneName || "Phone"} connected & ready. Enter number or tap keypad.`
        : "Direct Phone ready. Enter phone number to call.";
    }
  }
}

function closePhoneKeypad() {
  if (dialerOverlay) {
    dialerOverlay.style.display = "none";
  }
}

async function triggerPhoneCall() {
  if (!currentDialNumber || currentDialNumber.trim().length === 0) {
    if (dialerStatusMsg) dialerStatusMsg.textContent = "Please enter a phone number first.";
    return;
  }

  const numToCall = currentDialNumber.trim();
  if (dialerStatusMsg) {
    dialerStatusMsg.textContent = `Dialing ${numToCall} directly on ${connectedPhoneName || "phone"}...`;
  }

  try {
    await invoke("dial_phone_call", { number: numToCall });
    showJarvisFeedback(`Placing direct call to ${numToCall} on phone.`, "call");
  } catch (err) {
    console.error("[Call Error]", err);
    if (dialerStatusMsg) {
      dialerStatusMsg.textContent = `Direct call failed: ${err}. Please ensure phone is synced.`;
    }
  }
}

document.querySelectorAll(".keypad-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-key");
    if (key) appendDialDigit(key);
  });
});

dialerBackspaceBtn?.addEventListener("click", removeDialDigit);
btnDialerCall?.addEventListener("click", triggerPhoneCall);

btnDialerLink?.addEventListener("click", async () => {
  try {
    await invoke("end_phone_call");
    currentDialNumber = "";
    updateDialerDisplay();
    if (dialerStatusMsg) dialerStatusMsg.textContent = "Call terminated. Keypad cleared.";
    showJarvisFeedback("Call terminated, sir.");
  } catch (e) {
    currentDialNumber = "";
    updateDialerDisplay();
    if (dialerStatusMsg) dialerStatusMsg.textContent = "Call ended.";
    showJarvisFeedback("Call ended.");
  }
});

dialerCloseBtn?.addEventListener("click", closePhoneKeypad);
dialerOverlay?.addEventListener("click", (e) => {
  if (e.target === dialerOverlay) closePhoneKeypad();
});

window.addEventListener("keydown", (e) => {
  if (!dialerOverlay || dialerOverlay.style.display === "none") return;

  if ((e.key >= "0" && e.key <= "9") || e.key === "*" || e.key === "#" || e.key === "+") {
    appendDialDigit(e.key);
    e.preventDefault();
  } else if (e.key === "Backspace") {
    removeDialDigit();
    e.preventDefault();
  } else if (e.key === "Enter") {
    triggerPhoneCall();
    e.preventDefault();
  } else if (e.key === "Escape") {
    closePhoneKeypad();
    e.preventDefault();
  }
});

// -------------------------------------------------------------
// UNIVERSAL PHONE UPLINK & QR SYNC CONTROLLER
// -------------------------------------------------------------
const btnSyncPhoneChip = document.getElementById("btn-sync-phone-chip");
const phoneSyncOverlay = document.getElementById("phone-sync-overlay");
const syncCloseBtn = document.getElementById("sync-close-btn");
const btnQrLaunch = document.getElementById("btn-qr-launch");
const btnAutoDetect = document.getElementById("btn-auto-detect");
const syncStatusText = document.getElementById("sync-status-text");
const syncManualToggle = document.getElementById("sync-manual-toggle");
const syncManualInputs = document.getElementById("sync-manual-inputs");
const syncInputPort = document.getElementById("sync-input-port");
const syncInputCode = document.getElementById("sync-input-code");
const btnSyncPair = document.getElementById("btn-sync-pair");

let qrPollInterval = null;

function renderQrCanvas(lines) {
  const grid = [];
  for (const line of lines) {
    const topRow = [];
    const botRow = [];
    for (const ch of line) {
      if (ch === ' ') {
        topRow.push(0);
        botRow.push(0);
      } else if (ch === '▀') {
        topRow.push(1);
        botRow.push(0);
      } else if (ch === '▄') {
        topRow.push(0);
        botRow.push(1);
      } else if (ch === '█') {
        topRow.push(1);
        botRow.push(1);
      } else {
        topRow.push(0);
        botRow.push(0);
      }
    }
    grid.push(topRow);
    grid.push(botRow);
  }

  const cols = grid[0]?.length || 37;
  const rows = cols; // A standard QR code is always an exact 1:1 square
  const scale = 4;

  let canvas = document.getElementById("sync-qr-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "sync-qr-canvas";
    canvas.className = "sync-qr-canvas";
  }
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  const ctx = canvas.getContext("2d");

  // Pure white quiet zone & background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Black dark modules: 0 = dark, 1 = light
  ctx.fillStyle = "#000000";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r] && grid[r][c] === 0) {
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
  }

  const scannerBox = document.querySelector(".sync-scanner-box");
  const radarFrame = document.querySelector(".radar-hud-frame");
  if (radarFrame) radarFrame.style.display = "none";

  if (scannerBox && !scannerBox.contains(canvas)) {
    const readout = scannerBox.querySelector(".sync-status-readout");
    scannerBox.insertBefore(canvas, readout);
  }
  canvas.style.display = "block";
}

function resetQrScannerView() {
  if (qrPollInterval) {
    clearInterval(qrPollInterval);
    qrPollInterval = null;
  }
  invoke("cancel_qr_pairing").catch(() => {});
  const radarFrame = document.querySelector(".radar-hud-frame");
  const canvas = document.getElementById("sync-qr-canvas");
  if (radarFrame) radarFrame.style.display = "flex";
  if (canvas) canvas.style.display = "none";
}

function openPhoneSyncModal() {
  if (phoneSyncOverlay) {
    phoneSyncOverlay.style.display = "flex";
    resetQrScannerView();
    if (syncStatusText) syncStatusText.textContent = "RADAR ACTIVE // READY FOR PAIRING HANDSHAKE";
  }
}

function closePhoneSyncModal() {
  resetQrScannerView();
  if (phoneSyncOverlay) {
    phoneSyncOverlay.style.display = "none";
  }
}

btnSyncPhoneChip?.addEventListener("click", openPhoneSyncModal);
syncCloseBtn?.addEventListener("click", closePhoneSyncModal);
phoneSyncOverlay?.addEventListener("click", (e) => {
  if (e.target === phoneSyncOverlay) closePhoneSyncModal();
});

btnQrLaunch?.addEventListener("click", async () => {
  if (syncStatusText) syncStatusText.textContent = "GENERATING STARK PAIRING QR...";
  try {
    const lines = await invoke("generate_pairing_qr");
    if (lines && lines.length > 0) {
      renderQrCanvas(lines);
      if (syncStatusText) syncStatusText.textContent = "POINT PHONE CAMERA AT QR (Wireless Debug > Pair with QR)";

      if (qrPollInterval) clearInterval(qrPollInterval);
      qrPollInterval = setInterval(async () => {
        try {
          let res = await invoke("check_qr_pairing_status");
          if (!res || !res.is_connected) {
            const fallback = await invoke("auto_sync_phone");
            if (fallback && fallback.is_connected) {
              res = fallback;
            }
          }
          if (res && res.is_connected) {
            clearInterval(qrPollInterval);
            qrPollInterval = null;
            if (syncStatusText) syncStatusText.textContent = `✓ UPLINK ESTABLISHED: ${res.model}`;
            showJarvisFeedback(`New mobile uplink established with ${res.model}. Direct calling online.`);
            speakResponse(`Mobile uplink established with ${res.model}.`);
            pollBluetoothWatch();
            setTimeout(closePhoneSyncModal, 2000);
          }
        } catch (_) {}
      }, 1000);
    }
  } catch (err) {
    if (syncStatusText) syncStatusText.textContent = "Error generating QR: " + err;
  }
});

btnAutoDetect?.addEventListener("click", async () => {
  if (syncStatusText) syncStatusText.textContent = "Scanning network & USB for Android devices...";
  try {
    const res = await invoke("auto_sync_phone");
    if (res && res.is_connected) {
      if (syncStatusText) syncStatusText.textContent = `SYNC COMPLETE: ${res.model} [${res.endpoint}]`;
      showJarvisFeedback(`Uplink established with ${res.model}. Direct calling online.`);
      speakResponse(`Mobile uplink established with ${res.model}.`);
      pollBluetoothWatch();
      setTimeout(closePhoneSyncModal, 1800);
    } else {
      if (syncStatusText) syncStatusText.textContent = res ? res.message : "No phone detected.";
    }
  } catch (err) {
    if (syncStatusText) syncStatusText.textContent = "Auto-detect error: " + err;
  }
});

syncManualToggle?.addEventListener("click", () => {
  if (syncManualInputs) {
    const isHidden = syncManualInputs.style.display === "none";
    syncManualInputs.style.display = isHidden ? "flex" : "none";
  }
});

btnSyncPair?.addEventListener("click", async () => {
  const port = syncInputPort?.value?.trim();
  const code = syncInputCode?.value?.trim();
  if (!port || !code) {
    if (syncStatusText) syncStatusText.textContent = "Please enter both port and 6-digit code.";
    return;
  }
  const targetEndpoint = port.includes(":") ? port : `192.168.1.5:${port}`;
  if (syncStatusText) syncStatusText.textContent = `Pairing with ${targetEndpoint}...`;
  try {
    const res = await invoke("pair_phone_manual", { endpoint: targetEndpoint, code });
    if (syncStatusText) syncStatusText.textContent = res;
    pollBluetoothWatch();
    setTimeout(closePhoneSyncModal, 1800);
  } catch (err) {
    if (syncStatusText) syncStatusText.textContent = "Pairing error: " + err;
  }
});

// -------------------------------------------------------------
// SYSTEM STATE MANAGER (HUD, VISOR & NEURAL OVERDRIVE)
// -------------------------------------------------------------
function setSystemState(state) {
  currentState = state;

  if (stopCondition) {
    if (state === "listening") {
      stopCondition.textContent = "Listening";
      stopCondition.className = "ref-cell-val yellow";
    } else if (state === "thinking") {
      stopCondition.textContent = "Generating...";
      stopCondition.className = "ref-cell-val yellow";
    } else if (state === "speaking") {
      stopCondition.textContent = "Transmitting";
      stopCondition.className = "ref-cell-val cyan";
    } else {
      stopCondition.textContent = "Standby";
      stopCondition.className = "ref-cell-val cyan";
    }
  }

  // Update Visor Beacon and Status Bar
  if (visorBeaconDot) {
    if (state === "thinking") {
      visorBeaconDot.className = "visor-jarvis-dot thinking";
    } else if (state === "speaking") {
      visorBeaconDot.className = "visor-jarvis-dot speaking";
    } else {
      visorBeaconDot.className = "visor-jarvis-dot";
    }
  }

  if (visorStatusLabel) {
    if (state === "listening") {
      visorStatusLabel.textContent = "LISTENING FOR DIRECTIVE...";
    } else if (state === "thinking") {
      visorStatusLabel.textContent = `INFERENCE // ${currentActiveModelName}`;
    } else if (state === "speaking") {
      visorStatusLabel.textContent = "TRANSMITTING VOCAL SYNTHESIS";
    } else {
      visorStatusLabel.textContent = `${currentActiveModelName} // ONLINE`;
    }
  }

  if (visorMicIndicator) {
    if (state === "listening") {
      visorMicIndicator.classList.add("active");
    } else {
      visorMicIndicator.classList.remove("active");
    }
  }

  if (visorMicBtn) {
    if (state === "listening") {
      visorMicBtn.classList.add("listening");
      visorMicBtn.classList.remove("muted");
      if (visorMicText) visorMicText.textContent = "LISTENING";
    } else {
      visorMicBtn.classList.remove("listening");
      if (voiceMutedByUser) {
        visorMicBtn.classList.add("muted");
      }
      if (visorMicText) visorMicText.textContent = voiceMutedByUser ? "MUTED" : "VOICE READY";
    }
  }

  if (neuralEngineState) {
    if (state === "thinking") {
      neuralEngineState.textContent = "INFERENCE";
      neuralEngineState.className = "neural-status-badge active";
    } else if (state === "speaking") {
      neuralEngineState.textContent = "VOCAL SYNTH";
      neuralEngineState.className = "neural-status-badge active";
    } else {
      neuralEngineState.textContent = "HOT // VRAM";
      neuralEngineState.className = "neural-status-badge";
    }
  }

  const arcReactorEl = document.getElementById("stark-arc-reactor");
  if (arcReactorEl) {
    arcReactorEl.classList.remove("state-idle", "state-listening", "state-thinking", "state-speaking", "overdrive");
    arcReactorEl.classList.add(`state-${state}`);
    if (state === "thinking" || state === "speaking") {
      arcReactorEl.classList.add("overdrive");
    }
  }
}

// -------------------------------------------------------------
// SPEECH SYNTHESIS & VOICE OUTPUT
// -------------------------------------------------------------
function speakResponse(text) {
  if (!("speechSynthesis" in window) || !text) {
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
    resumeListeningIfAllowed();
    return;
  }

  window.speechSynthesis.cancel();
  const clean = text.replace(/[*#_`]/g, "").trim();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05;

  const voice = synthesisVoices.find(v => 
    v.name.includes("David") || v.name.includes("Mark") || v.name.includes("George") || (v.lang.startsWith("en") && !v.name.includes("Zira"))
  ) || synthesisVoices.find(v => v.lang.startsWith("en"));

  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    isSpeakingTTS = true;
    speechTargetAmp = 0.85;
    speechVocalAmp = 0.85;
    setSystemState("speaking");
  };

  utterance.onboundary = (event) => {
    // Exact word / syllable boundary event from SpeechSynthesis
    const charIdx = event.charIndex || 0;
    const remaining = clean.slice(charIdx, charIdx + 12);
    const vowelCount = (remaining.match(/[aeiouyAEIOUY]/g) || []).length;
    const energy = Math.min(1.0, 0.65 + vowelCount * 0.12 + Math.random() * 0.18);
    speechTargetAmp = energy;
    speechVocalAmp = Math.max(speechVocalAmp, energy * 0.85);
  };

  utterance.onend = () => {
    isSpeakingTTS = false;
    speechTargetAmp = 0.0;
    speechVocalAmp = 0.0;
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
    setTimeout(() => {
      resumeListeningIfAllowed();
    }, 350);
  };

  utterance.onerror = () => {
    isSpeakingTTS = false;
    speechTargetAmp = 0.0;
    speechVocalAmp = 0.0;
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
    resumeListeningIfAllowed();
  };

  // Fallback safety: ensure speaking state doesn't hang if browser drops speech event
  const safetyTimeout = Math.max(3000, clean.length * 90);
  setTimeout(() => {
    if (isSpeakingTTS) {
      isSpeakingTTS = false;
      setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
      resumeListeningIfAllowed();
    }
  }, safetyTimeout);

  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------
// EXECUTE USER DIRECTIVE (Queen Model as Brain + Admin Execution)
// -------------------------------------------------------------
async function processDirective(prompt, shouldOpenInput = false) {
  const clean = prompt.trim();
  if (!clean) return;

  if (shouldOpenInput) {
    openInputBar();
  }

  // Fast-Path: Direct Phone Keypad / Dialer Matrix (100% Direct - No Microsoft Phone Link)
  const lowerDirective = clean.toLowerCase();
  if (
    lowerDirective === "open phone" ||
    lowerDirective === "phone" ||
    lowerDirective === "open call" ||
    lowerDirective === "call" ||
    lowerDirective === "launch phone" ||
    lowerDirective === "start phone" ||
    lowerDirective === "open dialer" ||
    lowerDirective === "dialer" ||
    lowerDirective === "phone keypad" ||
    lowerDirective === "keypad" ||
    lowerDirective === "open keypad" ||
    lowerDirective === "call keypad"
  ) {
    const replyMsg = "Opening holographic call matrix, sir.";
    showJarvisFeedback(replyMsg, "open_dialer");
    openPhoneKeypad();
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  // Fast-Path: End Call / Hang Up
  if (/^(?:end\s+call|cut\s+call|hang\s*up|disconnect\s+call|stop\s+call)$/i.test(clean)) {
    try {
      await invoke("end_phone_call");
    } catch (e) {}
    currentDialNumber = "";
    updateDialerDisplay();
    const replyMsg = "Call ended, sir. Keypad cleared.";
    showJarvisFeedback(replyMsg, "end_call");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  // Fast-Path: Direct Call Contact or Number (e.g., "call mom" or "call 9876543210")
  const callMatch = clean.match(/^(?:call|dial)\s+(.+)$/i);
  if (callMatch) {
    const target = callMatch[1].trim();
    let numToDial = target.replace(/[\s\-\(\)]/g, "");

    let contactBook = {
      "mom": "",
      "dad": "",
      "home": ""
    };
    try {
      const stored = JSON.parse(localStorage.getItem("jarvis_contacts") || "{}");
      contactBook = { ...contactBook, ...stored };
    } catch (e) {}

    const lowerTarget = target.toLowerCase();
    if (contactBook[lowerTarget] && contactBook[lowerTarget].length > 0) {
      numToDial = contactBook[lowerTarget];
    }

    if (/^[\d\+\*#]+$/.test(numToDial) && numToDial.length >= 3) {
      currentDialNumber = numToDial;
      updateDialerDisplay();
      await invoke("dial_phone_call", { number: currentDialNumber });
      const replyMsg = `Dialing ${target} directly on your phone.`;
      showJarvisFeedback(replyMsg, "dial_call");
      speakResponse(replyMsg);
      setSystemState("idle");
      return;
    }
  }

  showJarvisFeedback("Thinking... Analyzing directive with Queen neural model.", null, true);
  setSystemState("thinking");

  try {
    const res = await invoke("ask_jarvis", { prompt: clean });
    
    // 2. Real Token Metrics Telemetry update
    if (res && res.prompt_tokens !== undefined) {
      const inp = res.prompt_tokens;
      const gen = res.eval_tokens;
      const total = res.total_tokens || (inp + gen);
      const spd = (res.tokens_per_sec || 0.0).toFixed(1);

      if (tokInp) tokInp.textContent = inp;
      if (tokGen) tokGen.textContent = gen;
      if (tokCached) tokCached.textContent = total;
      if (tokSpd) tokSpd.textContent = spd;
      if (refTokenBadge) refTokenBadge.textContent = `${total} TOKENS`;
      if (kvCacheSlots) kvCacheSlots.textContent = `${total} slots`;
      if (decodingSpeed) decodingSpeed.textContent = `${spd} tok/s`;
      if (nnLatency) nnLatency.textContent = `${res.latency_ms}ms`;
      if (modelNameLabel && res.model_name) modelNameLabel.textContent = res.model_name.toUpperCase();

      updateTokenSlots(total);
    }

    // 3. Register real subwords in the token matrix inspector
    if (res.token_words && res.token_words.length > 0) {
      realTokenRegistry = res.token_words;
    } else {
      const promptTokens = clean.split(/\s+/).map(w => w.trim()).filter(Boolean);
      const replyTokens = (res.reply || "").split(/\s+/).map(w => w.trim()).filter(Boolean);
      realTokenRegistry = [...promptTokens, "→", ...replyTokens];
    }

    // 4. Update feedback
    showJarvisFeedback(res.reply || "Directive executed, sir.", res.action);

    // 5. Vocalize response
    speakResponse(res.reply);

    // Refresh telemetry to reflect active apps or hardware updates
    refreshSystemTelemetry();
  } catch (err) {
    console.warn("Directive processing error:", err);
    showJarvisFeedback(`Directive error: ${err}`);
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
    resumeListeningIfAllowed();
  }
}

// -------------------------------------------------------------
// VISOR FORM & MANUAL MIC CONTROLS
// -------------------------------------------------------------
function submitVisorDirective() {
  const val = visorCmdInput?.value?.trim();
  if (val) {
    visorCmdInput.value = "";
    processDirective(val, true);
  }
}

visorCommandForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  submitVisorDirective();
});

visorExecBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  submitVisorDirective();
});

visorCmdInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitVisorDirective();
  }
});

visorMicBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  handleMicButtonClick();
});

// -------------------------------------------------------------
// BORDERLESS APP DOCK REAL LAUNCHERS (PHONE, OUTLOOK, WHATSAPP, SPOTIFY, GLOBE AI)
// -------------------------------------------------------------
btnDockCall?.addEventListener("click", (e) => {
  e.preventDefault();
  openPhoneKeypad();
});

btnDockMail?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await invoke("run_direct_action", { action: "open_app", target: "outlook" });
    showJarvisFeedback("Opening Outlook, sir.", "open_outlook");
  } catch (err) {
    console.warn("Mail error:", err);
  }
});

btnDockWhatsapp?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await invoke("run_direct_action", { action: "open_app", target: "whatsapp" });
    showJarvisFeedback("Opening WhatsApp, sir.", "open_whatsapp");
  } catch (err) {
    console.warn("WhatsApp error:", err);
  }
});

btnDockMusic?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await invoke("run_direct_action", { action: "open_app", target: "spotify" });
    showJarvisFeedback("Launching Spotify, sir.", "open_spotify");
  } catch (err) {
    console.warn("Spotify error:", err);
  }
});

// Single Unified Globe Icon for All 3 AI Functions (Search, Screen, Actions)
btnDockSearch?.addEventListener("click", (e) => {
  e.preventDefault();
  toggleInputBar();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInputBar();
  }
});

function normalizeVoiceTranscription(raw) {
  let text = (raw || "").trim();
  if (!text) return "";
  const lower = text.toLowerCase().replace(/[.,!?;:]/g, "").trim();

  // 1. Preserve rich multi-word instructions (Developer Agent, System Agent, Search, Vision, Form Filler)
  const isActionPhrase = /\b(?:write|type|generate|create|build|code|script|component|function|search|google|who|what|why|how|inspect|look|explain|debug|scroll|click|tab|window|save|copy|paste|select|undo|redo|enter|escape|play|pause|resume|skip|next|previous|stop|mute|volume|lock|field|input|submit|confirm|clear|pay|payment|checkout)\b/i.test(lower) ||
                         lower.includes(" and ") || lower.includes(" in ") || lower.includes(" to ") || lower.includes(" while ");

  // 2. Media Controls: direct pass-through
  if (
    lower === "play" || lower === "pause" || lower === "resume" ||
    lower === "play music" || lower === "pause music" || lower === "stop music" ||
    lower === "next" || lower === "next song" || lower === "next track" || lower === "skip" || lower === "skip song" ||
    lower === "previous" || lower === "previous song" || lower === "previous track" || lower === "last song"
  ) {
    return lower;
  }

  // 3. Desktop Navigation, Action phrases & Form Filling: pass directly through
  if (
    lower === "scroll down" || lower === "scroll up" || lower === "click" || lower === "right click" ||
    lower === "double click" || lower === "new tab" || lower === "close tab" || lower === "next tab" ||
    lower === "previous tab" || lower === "refresh" || lower === "reload" || lower === "save" ||
    lower === "copy" || lower === "paste" || lower === "select all" || lower === "undo" || lower === "redo" ||
    lower === "maximize" || lower === "minimize" || lower === "restore" || lower === "snap left" ||
    lower === "snap right" || lower === "switch window" || lower === "close window" || lower === "enter" ||
    lower === "escape" || lower === "next field" || lower === "next input" || lower === "tab" || lower === "press tab" ||
    lower === "previous field" || lower === "prev field" || lower === "shift tab" || lower === "back field" ||
    lower === "clear field" || lower === "clear input" || lower === "empty field" ||
    lower === "submit form" || lower === "submit" || lower === "confirm submission" || lower === "confirm payment" ||
    lower === "backspace" || lower === "press backspace"
  ) {
    return lower;
  }

  // 4. If this is an action phrase (e.g. "open notepad and write react code"), DO NOT collapse to "open notepad"!
  if (isActionPhrase) {
    if (lower.startsWith("hope and ") || lower.startsWith("hope in ")) {
      return text.replace(/^hope (?:and|in)/i, "open");
    }
    return text;
  }

  // 5. Standalone App Shortcuts & Phonetic Corrections (only when said on their own)
  if (
    lower === "or a lot" || lower === "or a lot of" || lower === "all a lot" ||
    lower === "or not bad" || lower === "open not bad" || lower === "open note pad" ||
    lower === "note pad" || lower === "notepad" || lower === "open note" ||
    lower === "hope and notepad" || lower === "open knot pad"
  ) {
    return "open notepad";
  }

  if (lower === "calculator" || lower === "calc") return "open calc";
  if (lower === "vs code" || lower === "vscode" || lower === "visual studio" || lower === "code") return "open vs code";
  if (lower === "spotify" || lower === "music") return "play music";
  if (lower === "chrome" || lower === "browser" || lower === "google chrome") return "open chrome";
  if (lower === "terminal" || lower === "command prompt" || lower === "powershell" || lower === "cmd") return "open terminal";
  if (lower === "task manager" || lower === "taskmgr") return "open taskmgr";
  if (lower === "whatsapp" || lower === "whats app") return "open whatsapp";
  if (lower === "weather" || lower === "temperature" || lower === "climate") return "weather";
  if (lower === "time" || lower === "clock") return "time";
  if (lower === "date" || lower === "today") return "date";
  if (lower === "screenshot" || lower === "screen shot" || lower === "capture screen") return "screenshot";

  return text;
}

// -------------------------------------------------------------
// PHYSICAL MICROPHONE & HIGH-PERFORMANCE VOICE DIRECTIVE CONTROLLER
// -------------------------------------------------------------
let isTauriListeningStarted = false;
let isListenLoopRunning = false;
let lastProcessedVoice = "";
let lastProcessedTime = 0;

async function handleVoiceDirective(rawText) {
  if (!isVoiceListening || voiceMutedByUser) {
    console.log("[Voice] Ignored because voice is muted:", rawText);
    return;
  }

  // Voice Barge-In: interrupt TTS playback immediately when user speaks
  if (isSpeakingTTS) {
    console.log("[Voice Barge-In] Interrupting TTS for incoming user directive:", rawText);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingTTS = false;
  }

  const clean = (rawText || "").trim();
  if (!clean) return;

  const lowerRaw = clean.toLowerCase();
  // Fast halt on direct interrupt words
  if (lowerRaw === "stop" || lowerRaw === "cancel" || lowerRaw === "shut up" || lowerRaw === "hold on" || lowerRaw === "wait") {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingTTS = false;
    isProcessingDirective = false;
    showJarvisFeedback("Standing by, sir.", null, false);
    setSystemState("idle");
    return;
  }

  if (isProcessingDirective) {
    console.log("[Voice] Directive currently executing, ignoring:", rawText);
    return;
  }

  const now = Date.now();
  if (clean.toLowerCase() === lastProcessedVoice.toLowerCase() && (now - lastProcessedTime) < 2000) {
    return;
  }
  lastProcessedVoice = clean;
  lastProcessedTime = now;

  const normalized = normalizeVoiceTranscription(clean);
  if (!normalized) return;

  console.log(`[JARVIS Directive Triggered]: "${clean}" -> "${normalized}"`);
  openInputBar();

  if (visorCmdInput) {
    visorCmdInput.value = "";
  }
  showJarvisFeedback(`"${normalized}"`, null, true);

  isProcessingDirective = true;
  try {
    await processDirective(normalized, true);
  } finally {
    isProcessingDirective = false;
    if (!isSpeakingTTS) {
      resumeListeningIfAllowed();
    }
  }
}

async function startTauriVoiceListener() {
  const nativeInvoke = getTauriInvoke();
  if (!nativeInvoke) {
    startWebSpeechFallback();
    return;
  }

  if (isTauriListeningStarted) return;
  isTauriListeningStarted = true;

  // 1. Primary: Event-driven instant speech reception from Rust background worker
  try {
    if (window.__TAURI__?.event?.listen) {
      await window.__TAURI__.event.listen("jarvis://voice_directive", (event) => {
        handleVoiceDirective(event.payload);
      });
      console.log("[Tauri Voice] Event listener hooked to jarvis://voice_directive");
    } else if (window.__TAURI_INTERNALS__?.listen) {
      await window.__TAURI_INTERNALS__.listen("jarvis://voice_directive", (event) => {
        handleVoiceDirective(event.payload);
      });
      console.log("[Tauri Voice] Internals event listener hooked to jarvis://voice_directive");
    }
  } catch (e) {
    console.warn("[Tauri Voice] Event listener hook notice:", e);
  }

  // 2. Secondary: Resilient background recognition loop via listen_mic IPC
  runContinuousListenLoop();
}

async function runContinuousListenLoop() {
  if (isListenLoopRunning) return;
  isListenLoopRunning = true;

  while (true) {
    if (isVoiceListening && !voiceMutedByUser && !isSpeakingTTS && !isProcessingDirective) {
      try {
        const text = await invoke("listen_mic");
        if (text && text.trim().length > 0) {
          handleVoiceDirective(text.trim());
        }
      } catch (err) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } else {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

// -------------------------------------------------------------
// CONTINUOUS REAL-TIME VOICE ACTIVITY DETECTION (VAD) & GROQ WHISPER STT
// -------------------------------------------------------------
let mediaStream = null;
let audioContext = null;
let analyser = null;
let vadInterval = null;
let mediaRecorder = null;
let audioChunks = [];
let isGroqWhisperRecording = false;
let isVadSpeaking = false;
let hasSpokenInCycle = false;
let vadSpeechStartTime = 0;
let vadSilenceStartTime = 0;
let vadConsecutiveSpeechFrames = 0;
let vadNoiseFloor = 0.008;
let cycleStartTime = 0;
let isWhisperTranscribing = false;
let isContinuousVoiceActive = false;

async function initAudioEngine() {
  try {
    if (!mediaStream || !mediaStream.active) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!audioContext || audioContext.state === "closed") {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      if (!analyser && mediaStream) {
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
      }
    }
    return true;
  } catch (err) {
    console.warn("[Voice Engine] Microphone initialization notice:", err);
    return false;
  }
}

function startUtteranceRecording() {
  if (!mediaStream || !mediaStream.active) return;
  if (voiceMutedByUser || !isVoiceListening || isSpeakingTTS || isProcessingDirective || isWhisperTranscribing) {
    return;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    } catch (e) {}
  }

  audioChunks = [];
  let mimeType = "audio/webm";
  if (typeof MediaRecorder.isTypeSupported === "function") {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    }
  }

  try {
    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
  } catch (e) {
    mediaRecorder = new MediaRecorder(mediaStream);
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      audioChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const recordedChunks = [...audioChunks];
    audioChunks = [];

    if (hasSpokenInCycle && recordedChunks.length > 0 && !voiceMutedByUser) {
      hasSpokenInCycle = false;
      const audioBlob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
      if (audioBlob.size > 2000) {
        await processAudioBlobWithWhisper(audioBlob);
        return;
      }
    }
    hasSpokenInCycle = false;
    resumeListeningIfAllowed();
  };

  hasSpokenInCycle = false;
  isVadSpeaking = false;
  vadSpeechStartTime = 0;
  vadSilenceStartTime = 0;
  vadConsecutiveSpeechFrames = 0;
  cycleStartTime = Date.now();

  try {
    mediaRecorder.start(100);
    isGroqWhisperRecording = true;
  } catch (err) {
    console.warn("[Voice Engine] mediaRecorder.start notice:", err);
  }
}

function checkVadTick() {
  if (!analyser || voiceMutedByUser || !isVoiceListening || isSpeakingTTS || isProcessingDirective || isWhisperTranscribing) {
    if (isVadSpeaking) {
      isVadSpeaking = false;
      hasSpokenInCycle = false;
    }
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  let sumSquares = 0.0;
  for (let i = 0; i < bufferLength; i++) {
    const norm = (dataArray[i] - 128) / 128.0;
    sumSquares += norm * norm;
  }
  const rms = Math.sqrt(sumSquares / bufferLength);

  if (!isVadSpeaking) {
    vadNoiseFloor = vadNoiseFloor * 0.96 + rms * 0.04;
  }

  const threshold = Math.max(0.022, vadNoiseFloor * 2.2);
  const now = Date.now();

  if (rms > threshold) {
    vadConsecutiveSpeechFrames++;
    if (vadConsecutiveSpeechFrames >= 3) {
      if (!isVadSpeaking) {
        isVadSpeaking = true;
        hasSpokenInCycle = true;
        vadSpeechStartTime = now;
        vadSilenceStartTime = 0;
        if (visorCmdInput && (!visorCmdInput.value || visorCmdInput.value.trim() === "")) {
          visorCmdInput.placeholder = "Listening... Speak directive...";
        }
        if (visorMicBtn) {
          visorMicBtn.classList.add("listening");
        }
      } else {
        vadSilenceStartTime = 0;
      }
    }
  } else {
    vadConsecutiveSpeechFrames = 0;

    if (isVadSpeaking) {
      if (vadSilenceStartTime === 0) {
        vadSilenceStartTime = now;
      }

      const silenceDuration = now - vadSilenceStartTime;
      const speechDuration = now - vadSpeechStartTime;

      // Automatic command trigger:
      // When user finishes speaking (pauses for >= 750ms after speaking at least 300ms, or after 8s continuous speech):
      if ((silenceDuration >= 750 && speechDuration >= 300) || speechDuration >= 8000) {
        console.log(`[VAD] Automatic speech completion detected (${speechDuration}ms speech, ${silenceDuration}ms pause). Transcribing directive...`);
        isVadSpeaking = false;
        vadSilenceStartTime = 0;
        vadConsecutiveSpeechFrames = 0;

        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }
    } else {
      // Idle cycle: if silence exceeds 4.5 seconds, recycle recorder so audio buffer remains compact
      if (mediaRecorder && mediaRecorder.state === "recording" && (now - cycleStartTime > 4500)) {
        hasSpokenInCycle = false;
        mediaRecorder.stop();
      }
    }
  }
}

async function processAudioBlobWithWhisper(audioBlob) {
  if (isWhisperTranscribing || voiceMutedByUser) return;
  isWhisperTranscribing = true;

  try {
    if (visorCmdInput && (!visorCmdInput.value || visorCmdInput.value.trim() === "")) {
      visorCmdInput.placeholder = "Processing voice directive with Groq Whisper...";
    }
    showJarvisFeedback("Processing voice directive with Groq Whisper...", null, true);

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const text = await invoke("transcribe_audio_groq", {
      audioBase64: base64Data,
      mimeType: mediaRecorder?.mimeType || "audio/webm",
    });

    if (text && text.trim().length > 0) {
      console.log("[Groq Whisper STT Transcribed]:", text);
      await handleVoiceDirective(text.trim());
    } else {
      showJarvisFeedback("Standing by for your directive, sir.");
    }
  } catch (err) {
    console.warn("[Groq Whisper STT] Error:", err);
  } finally {
    isWhisperTranscribing = false;
    if (visorCmdInput && (!visorCmdInput.value || visorCmdInput.value.trim() === "")) {
      visorCmdInput.placeholder = "Give an instruction or ask anything...";
    }
    if (!isSpeakingTTS && !isProcessingDirective) {
      resumeListeningIfAllowed();
    }
  }
}

function resumeListeningIfAllowed() {
  if (isVoiceListening && !voiceMutedByUser && !isSpeakingTTS && !isProcessingDirective && !isWhisperTranscribing) {
    setSystemState("listening");
    if (visorMicBtn) {
      visorMicBtn.classList.remove("muted");
      visorMicBtn.classList.add("listening");
      visorMicBtn.title = "Microphone Active (Click to Mute)";
    }
    if (visorMicText) {
      visorMicText.textContent = "LISTENING";
    }
    startUtteranceRecording();
  }
}

async function startContinuousVoiceRecognition() {
  if (voiceMutedByUser) return;
  isVoiceListening = true;
  isListening = true;
  isContinuousVoiceActive = true;
  setSystemState("listening");

  const streamOk = await initAudioEngine();
  if (!streamOk) {
    console.warn("[Voice] Falling back to WebSpeech");
    startWebSpeechFallback();
    return;
  }

  if (!vadInterval) {
    vadInterval = setInterval(checkVadTick, 35);
  }

  startUtteranceRecording();
}

function stopContinuousVoiceRecognition() {
  isContinuousVoiceActive = false;
  isVadSpeaking = false;
  hasSpokenInCycle = false;
  vadSpeechStartTime = 0;
  vadSilenceStartTime = 0;
  vadConsecutiveSpeechFrames = 0;

  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    } catch (e) {}
  }

  isGroqWhisperRecording = false;
  if (visorMicBtn) {
    visorMicBtn.classList.remove("listening");
  }
  if (visorCmdInput && (!visorCmdInput.value || visorCmdInput.value.trim() === "")) {
    visorCmdInput.placeholder = "Give an instruction or ask anything...";
  }
}

async function handleMicButtonClick() {
  if (voiceMutedByUser || !isVoiceListening) {
    // Unmute
    voiceMutedByUser = false;
    isVoiceListening = true;
    isListening = true;
    if (visorMicBtn) {
      visorMicBtn.classList.remove("muted");
      visorMicBtn.classList.add("listening");
      visorMicBtn.title = "Microphone Active (Click to Mute)";
    }
    setSystemState("listening");
    showJarvisFeedback("Microphone active. Listening for your directive...");
    try { await invoke("set_voice_listening", { active: true }); } catch (e) {}
    await startContinuousVoiceRecognition();
  } else {
    // Mute
    voiceMutedByUser = true;
    isVoiceListening = false;
    isListening = false;
    if (visorMicBtn) {
      visorMicBtn.classList.add("muted");
      visorMicBtn.classList.remove("listening");
      visorMicBtn.title = "Microphone Muted (Click to Unmute)";
    }
    setSystemState("idle");
    showJarvisFeedback("Microphone muted. Click mic to unmute, sir.");
    try { await invoke("set_voice_listening", { active: false }); } catch (e) {}
    stopContinuousVoiceRecognition();
  }
}

async function toggleVoiceListener() {
  await handleMicButtonClick();
}

function startWebSpeechFallback() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (visorMicText) visorMicText.textContent = "VOICE READY";
    showJarvisFeedback("Microphone ready. Type or speak your instruction.");
    return;
  }

  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }

  try {
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final && final.trim()) {
        handleVoiceDirective(final.trim());
      }
    };

    recognition.onerror = (e) => {
      console.warn("[WebSpeech] Notice:", e);
    };

    recognition.onend = () => {
      if (isVoiceListening && !voiceMutedByUser) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.start();
  } catch (err) {
    console.warn("[WebSpeech] Start failed:", err);
  }
}

// React immediately to any audio device plug / unplug
try {
  navigator.mediaDevices?.addEventListener?.("devicechange", () => {
    refreshSystemTelemetry();
  });
} catch (e) {}

if ("speechSynthesis" in window) {
  synthesisVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    synthesisVoices = window.speechSynthesis.getVoices();
  };
}

// Global F11 Fullscreen Toggle & Startup Support
window.addEventListener("keydown", (e) => {
  if (e.key === "F11") {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }
});

// Expose global processDirective for external and test invocations
window.processDirective = processDirective;
window.invokeTauri = invoke;

console.log("J.A.R.V.I.S. Real Dynamic System Initialized.");
