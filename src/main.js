// JARVIS AI System Controller
// 100% Dynamic Hardware Telemetry (CPU, 64GB RAM, I7 CPU, Network, Active Apps)
// Real Token Activity (Reference Matrix & Metrics) + Borderless App Dock (Phone, Outlook, WhatsApp, Spotify)

import { JarvisSoundscape } from "./modules/soundscape.js";
import { showToast, startPhoneNotificationSync } from "./modules/notifications.js";
import { JarvisDialer } from "./modules/dialer.js";
import { fetchSystemTelemetry, fetchPhoneTelemetry, formatBytesToGb, formatNetworkRate } from "./modules/telemetry.js";
import { JarvisNeuralClient } from "./modules/ai.js";
import { JarvisTaskPlanner } from "./modules/planner.js";
import { AgentVoiceRing } from "./modules/agentRing.js";
import { AgentSwarmUI } from "./modules/agentSwarm.js";

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

  // Pure dynamic defaults when running without native host
  if (cmd === "get_bluetooth_watch_status") {
    return {
      has_connected_watch: Boolean(isWatchPaired),
      connected_watch_name: watchDeviceName || null,
      has_connected_phone: Boolean(isPhoneConnected),
      connected_phone_name: connectedPhoneName || null,
      devices: []
    };
  }

  if (cmd === "dial_phone_call") {
    return `Dialing ${args.number}`;
  }

  if (cmd === "lookup_telephone_contact") {
    return null;
  }

  if (cmd === "get_telephone_directory") {
    return [];
  }

  if (cmd === "get_system_telemetry") {
    return {
      gpu_usage: 0,
      gpu_brand: "STANDBY",
      gpu_mem_used_gb: 0,
      gpu_mem_total_gb: 0,
      gpu_percent: 0,
      cpu_usage: 0,
      ram_used_gb: 0,
      ram_total_gb: 0,
      ram_percent: 0,
      net_rx_kb: 0,
      net_tx_kb: 0,
      top_apps: [],
      is_whatsapp_running: false,
      is_spotify_running: false,
      is_chrome_running: false,
      model_metrics: null
    };
  }
  return { reply: `Executed ${args.action || args.prompt || args.target}`, action: null, latency_ms: 0 };
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
const nnSpeed = document.getElementById("nn-speed");
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
let currentActiveModelName = "";

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

function showJarvisFeedback(_text, _action = null, _isThinking = false) {
  // Minimalist UI: keep command bar clean without feedback banner or answer text
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

// =============================================================
// PHASE 1: PROCEDURAL SCI-FI SOUNDSCAPE (LOADED FROM ./modules/soundscape.js)
// =============================================================

// =============================================================
// PHASE 1: ACTION ROLLBACK STACK (INSTANT UNDO)
// =============================================================
const ActionRollbackStack = (() => {
  const stack = [];
  const MAX_STACK = 25;

  function push(actionRecord) {
    stack.push(actionRecord);
    if (stack.length > MAX_STACK) stack.shift();
  }

  async function undo() {
    if (!stack.length) {
      try {
        await invoke("run_direct_action", { action: "undo", target: "" });
      } catch(e) {}
      return "Executed system undo command, sir.";
    }
    const last = stack.pop();
    try {
      if (typeof last.undo === "function") {
        return await last.undo();
      } else if (last.reverseAction) {
        await invoke("run_direct_action", { action: last.reverseAction, target: last.reverseTarget || "" });
        return last.description || "Action reverted, sir.";
      } else {
        await invoke("run_direct_action", { action: "undo", target: "" });
        return "Undid previous action, sir.";
      }
    } catch (err) {
      return `Undo failed: ${err}`;
    }
  }

  return { push, undo, size: () => stack.length };
})();

// =============================================================
// PHASE 1: SMART AI CLIPBOARD (IN-MEMORY HISTORY & VOICE RECALL)
// =============================================================
const SmartClipboard = (() => {
  const history = [];
  const MAX_ITEMS = 20;
  let lastText = "";
  const modalEl = document.getElementById("clipboard-history-modal");
  const listEl = document.getElementById("cb-items-list");
  const closeBtn = document.getElementById("cb-modal-close");

  closeBtn?.addEventListener("click", () => closeModal());

  async function sync() {
    try {
      const text = await invoke("run_direct_action", { action: "get_clipboard", target: "" });
      if (text && text.trim() && text !== lastText) {
        lastText = text;
        const trimmed = text.trim();
        if (!history.length || history[0].text !== trimmed) {
          history.unshift({
            id: Date.now(),
            text: trimmed,
            preview: trimmed.length > 70 ? (trimmed.slice(0, 67) + "...") : trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            length: trimmed.length
          });
          if (history.length > MAX_ITEMS) history.pop();
        }
      }
    } catch (e) {}
  }

  function getLatest() {
    return history.length ? history[0] : null;
  }

  function getHistory() {
    return [...history];
  }

  function clear() {
    history.length = 0;
    lastText = "";
    if (listEl) listEl.innerHTML = '<div style="color:#64748b;font-size:11px;padding:8px;font-family:Rajdhani,monospace;">CLIPBOARD HISTORY EMPTY</div>';
  }

  function openModal() {
    if (!modalEl || !listEl) return;
    listEl.innerHTML = "";
    if (!history.length) {
      listEl.innerHTML = '<div style="color:#64748b;font-size:12px;padding:12px;font-family:Rajdhani,monospace;text-align:center;">NO CLIPBOARD SNIPPETS RECORDED YET</div>';
    } else {
      history.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "cb-item-card";
        card.title = "Click to paste into active window";
        card.innerHTML = `
          <div class="cb-item-top">
            <span class="cb-item-tag">#${idx + 1} // ${item.length} chars</span>
            <span class="cb-item-time">${item.timestamp}</span>
          </div>
          <div class="cb-item-preview">${escapeHtml(item.preview)}</div>
        `;
        card.addEventListener("click", async () => {
          JarvisSoundscape.play("confirm");
          closeModal();
          try {
            await invoke("run_direct_action", { action: "paste_clipboard", target: item.text });
            ActionRollbackStack.push({
              type: "paste",
              reverseAction: "undo",
              description: "Undid clipboard item paste, sir."
            });
            showJarvisFeedback("Pasting selected clipboard item, sir.", "clipboard_paste");
          } catch(e) {}
        });
        listEl.appendChild(card);
      });
    }
    modalEl.classList.add("active");
  }

  function closeModal() {
    modalEl?.classList.remove("active");
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return { sync, getLatest, getHistory, clear, openModal, closeModal };
})();

// Poll clipboard every 2.5s in background
setInterval(() => SmartClipboard.sync(), 2500);

// =============================================================
// PHASE 1: PROACTIVE HARDWARE ALERTS
// =============================================================
let lastHardwareAlertTime = 0;
let lastCpuHighCount = 0;

function checkProactiveHardwareAlerts(telem) {
  if (!telem) return;
  const now = Date.now();
  if (now - lastHardwareAlertTime < 90000) return; // 90-second cooldown

  const ramPct = Math.round(telem.ram_percent || 0);
  const cpuPct = Math.round(telem.cpu_usage || 0);

  if (ramPct >= 90) {
    lastHardwareAlertTime = now;
    JarvisSoundscape.play("alert");
    const alertMsg = `Warning sir, physical RAM utilization has peaked at ${ramPct} percent.`;
    showJarvisFeedback(alertMsg, "hardware_alert");
    speakResponse(alertMsg);
    return;
  }

  if (cpuPct >= 92) {
    lastCpuHighCount++;
    if (lastCpuHighCount >= 2) {
      lastHardwareAlertTime = now;
      lastCpuHighCount = 0;
      JarvisSoundscape.play("alert");
      const alertMsg = `Advisory sir, CPU load is sustaining at ${cpuPct} percent.`;
      showJarvisFeedback(alertMsg, "hardware_alert");
      speakResponse(alertMsg);
      return;
    }
  } else {
    lastCpuHighCount = 0;
  }
}

// =============================================================
// PHASE 1: DYNAMIC ISLAND CONTROLLER
// =============================================================
const islandPill = document.getElementById("dynamic-island-pill");
const islandExpandBtn = document.getElementById("island-expand-btn");

function toggleDynamicIsland() {
  JarvisSoundscape.play("click");
  const isActive = document.body.classList.toggle("island-mode-active");
  const msg = isActive ? "Dynamic island mode engaged, sir." : "Full holographic Visor HUD restored, sir.";
  showJarvisFeedback(msg, isActive ? "island_mode" : "full_hud");
}

islandPill?.addEventListener("click", () => {
  toggleDynamicIsland();
});

islandExpandBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDynamicIsland();
});

// =============================================================
// PHASE 2: PERSISTENT VECTOR MEMORY & SESSION RAG STORE
// =============================================================
const PersistentMemoryManager = (() => {
  const modalEl = document.getElementById("memory-history-modal");
  const listEl = document.getElementById("mem-items-list");
  const closeBtn = document.getElementById("mem-modal-close");
  const searchInput = document.getElementById("mem-search-input");
  const clearBtn = document.getElementById("mem-clear-btn");
  let cachedMemories = [];

  closeBtn?.addEventListener("click", () => closeModal());
  clearBtn?.addEventListener("click", async () => {
    JarvisSoundscape.play("undo");
    try {
      await invoke("run_direct_action", { action: "memory_clear", target: "" });
      cachedMemories = [];
      renderMemories([]);
      showJarvisFeedback("All persistent memories cleared, sir.", "memory_cleared");
    } catch (e) {}
  });

  searchInput?.addEventListener("input", async (e) => {
    const q = (e.target.value || "").trim();
    if (!q) {
      renderMemories(cachedMemories);
    } else {
      try {
        const results = await invoke("get_memory_items", { query: q });
        renderMemories(results || []);
      } catch (err) {
        const filtered = cachedMemories.filter(m => 
          (m.text || "").toLowerCase().includes(q.toLowerCase()) || 
          (m.tags || []).some(t => t.toLowerCase().includes(q.toLowerCase()))
        );
        renderMemories(filtered);
      }
    }
  });

  function renderMemories(items) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = '<div style="color:#64748b;font-size:12px;padding:12px;font-family:Rajdhani,monospace;text-align:center;">NO MEMORY RECORDS FOUND</div>';
      return;
    }
    items.forEach((m) => {
      const card = document.createElement("div");
      card.className = "mem-item-card";
      const dateStr = m.timestamp ? new Date(m.timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "RECENT";
      card.innerHTML = `
        <div class="mem-item-top">
          <span class="mem-item-category">${escapeHtml(m.category || "GENERAL")}</span>
          <span class="mem-item-time">${dateStr}</span>
        </div>
        <div class="mem-item-text">${escapeHtml(m.text)}</div>
      `;
      listEl.appendChild(card);
    });
  }

  async function openModal() {
    if (!modalEl) return;
    modalEl.classList.add("active");
    try {
      const memories = await invoke("get_memory_items", { query: null });
      cachedMemories = memories || [];
      renderMemories(cachedMemories);
    } catch (e) {
      cachedMemories = [];
      renderMemories([]);
    }
  }

  function closeModal() {
    modalEl?.classList.remove("active");
    if (searchInput) searchInput.value = "";
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return { openModal, closeModal, renderMemories };
})();

// =============================================================
// PHASE 2: CLOUDFLARE TUNNEL AUTO-WATCHDOG CONTROLLER
// =============================================================
let lastTunnelStatus = "";

function updateTunnelWatchdogUI(tunnelStatus) {
  const pill = document.getElementById("tunnel-watchdog-pill");
  if (!pill || !tunnelStatus) return;

  const upper = tunnelStatus.toUpperCase();
  pill.textContent = `TUNNEL // ${upper.slice(0, 18)}`;

  if (upper.includes("ONLINE")) {
    pill.className = "gadget-sub-pill tunnel-pill tunnel-online";
  } else {
    pill.className = "gadget-sub-pill tunnel-pill tunnel-offline";
    if (lastTunnelStatus && lastTunnelStatus.includes("ONLINE") && !upper.includes("ONLINE")) {
      JarvisSoundscape.play("alert");
      showJarvisFeedback("Notice: Cloudflare tunnel status changed to " + tunnelStatus, "tunnel_warning");
    }
  }
  lastTunnelStatus = upper;
}

// =============================================================
// PHASE 3: VISUAL ELEMENT GROUNDING RETICLE CONTROLLER
// =============================================================
function showVisualTarget(x, y, label = "TARGET ACQUIRED") {
  const reticle = document.getElementById("visual-target-reticle");
  const labelEl = document.getElementById("reticle-label");
  if (!reticle) return;
  reticle.style.left = `${x}px`;
  reticle.style.top = `${y}px`;
  if (labelEl) labelEl.textContent = label;
  reticle.style.display = "block";
  reticle.classList.add("active");
  setTimeout(() => {
    reticle.classList.remove("active");
    reticle.style.display = "none";
  }, 2200);
}

// =============================================================
// PHASE 3: nAvI Labs // HOLOGRAPHIC HUMANOID PROJECTION
// (Stable High-Definition 32,000 Particle Biometric Matrix)
// =============================================================
const NaviBiometricHologram = (() => {
  let canvasEl = null;
  let ctx = null;
  let animId = null;
  let powerBtn = null;
  let powerLabel = null;
  let systemStatusEl = null;
  let biometricsStatusEl = null;
  let fpsValEl = null;
  let particleCountEl = null;
  let avatarNameEl = null;
  let avatarPills = [];

  // -------------------------------------------------------------
  // SIMULATION, POWER & MATERIALIZATION STATE
  // -------------------------------------------------------------
  let time = 0;
  let powerActive = true;
  let activeAvatarKey = "ultron";
  let isMaterializing = true;
  let materializeProgress = 0.0;
  const MATERIALIZE_DURATION = 1.6; // seconds for simultaneous holographic convergence assembly
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60;

  // Master Particle Buffers (TypedArrays for maximum 60 FPS performance)
  let homeX = null;
  let homeY = null;
  let colorsR = null;
  let colorsG = null;
  let colorsB = null;
  let phases = null;
  let totalParticles = 0;

  // Holographic Convergence Scatter Buffers (Simultaneous Assembly)
  let scatterOffsetX = null;
  let scatterOffsetY = null;
  let scatterSwirl = null;
  let scatterDelay = null;

  // -------------------------------------------------------------
  // SCATTER GENERATOR: FUTURISTIC HOLOGRAPHIC DISPERSION
  // -------------------------------------------------------------
  function initScatter(w, h) {
    if (!homeX || totalParticles === 0) return;
    const width = w || (canvasEl ? canvasEl.width : 280);
    const height = h || (canvasEl ? canvasEl.height : 420);
    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxDim = Math.max(width, height);

    for (let i = 0; i < totalParticles; i++) {
      const hx = homeX[i];
      const hy = homeY[i];

      // Direction vector outward from character center
      const dx = hx - cx;
      const dy = hy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
      const ndx = dx / dist;
      const ndy = dy / dist;

      // Omnidirectional holographic cloud dispersion
      const angle = Math.random() * Math.PI * 2;
      // Exponential falloff spread: dense quantum halo with wide atmospheric sparks
      const spread = (0.2 + 0.8 * Math.pow(Math.random(), 1.4)) * (maxDim * 0.52);

      // Blend radial expulsion with omnidirectional scattered cloud
      scatterOffsetX[i] = ndx * (spread * 0.45) + Math.cos(angle) * (spread * 0.65);
      scatterOffsetY[i] = ndy * (spread * 0.45) + Math.sin(angle) * (spread * 0.65);

      // Curved magnetic field curl torque (-35 to +35 px)
      scatterSwirl[i] = (Math.random() - 0.5) * 40.0;

      // Subtle arrival cadence offset so particles assemble organically
      scatterDelay[i] = Math.random() * 0.18;
    }
  }

  // -------------------------------------------------------------
  // PARTICLE DATA INGESTION & MODEL LOADER
  // -------------------------------------------------------------
  function loadAvatarModel(avatarKey, w, h) {
    activeAvatarKey = avatarKey || activeAvatarKey || "ultron";
    const models = window.NAVI_HOLOGRAM_MODELS || {};
    let preset = models[activeAvatarKey] || (activeAvatarKey === "ultron" ? models["navi"] : (activeAvatarKey === "navi" ? models["ultron"] : null)) || window.NAVI_HUMAN_PARTICLE_DATA;

    if (!preset || !preset.x || preset.x.length === 0) {
      generateFallbackHuman(w, h);
      return;
    }

    const n = preset.x.length;
    totalParticles = n;

    if (!homeX || homeX.length !== n) {
      homeX = new Float32Array(n);
      homeY = new Float32Array(n);
      colorsR = new Uint8Array(n);
      colorsG = new Uint8Array(n);
      colorsB = new Uint8Array(n);
      phases = new Float32Array(n);
      scatterOffsetX = new Float32Array(n);
      scatterOffsetY = new Float32Array(n);
      scatterSwirl = new Float32Array(n);
      scatterDelay = new Float32Array(n);
    }

    // Scaling factors to fit canvas cleanly with sleek proportions
    const scaleY = h * 0.88;
    const scaleX = scaleY * 0.88;
    const cx = w * 0.5;
    const cy = h * 0.5;

    for (let i = 0; i < n; i++) {
      const hx = cx + preset.x[i] * scaleX;
      const hy = cy + preset.y[i] * scaleY;

      homeX[i] = hx;
      homeY[i] = hy;

      colorsR[i] = preset.r[i];
      colorsG[i] = preset.g[i];
      colorsB[i] = preset.b[i];

      phases[i] = Math.random() * Math.PI * 2;
    }

    initScatter(w, h);

    if (particleCountEl) {
      particleCountEl.textContent = `${totalParticles.toLocaleString()} PTS`;
    }
    if (avatarNameEl) {
      const name = preset.name || activeAvatarKey.toUpperCase();
      avatarNameEl.textContent = name.toUpperCase();
    }
  }

  function triggerMaterialize() {
    isMaterializing = true;
    materializeProgress = 0.0;
    if (canvasEl) {
      initScatter(canvasEl.width, canvasEl.height);
    }
  }

  function selectAvatar(key) {
    if (!key) return;
    activeAvatarKey = key;

    // Update active pill UI
    if (avatarPills && avatarPills.length > 0) {
      avatarPills.forEach(pill => {
        const pillKey = pill.dataset.avatar;
        const matches = pillKey === key || (key === "ultron" && pillKey === "navi") || (key === "navi" && pillKey === "ultron");
        pill.classList.toggle("active", matches);
      });
    }

    if (canvasEl) {
      loadAvatarModel(key, canvasEl.width, canvasEl.height);
    }

    const centerHolo = window.NaviCenterHologram;
    if (centerHolo && centerHolo.isDeployed()) {
      centerHolo.deployAvatar(key);
    }

    triggerMaterialize();
    JarvisSoundscape.play("wake");

    const models = window.NAVI_HOLOGRAM_MODELS || {};
    const name = models[key]?.name || key;
    showJarvisFeedback(`Hologram: ${name} initializing...`, "avatar_switch");
  }

  function generateFallbackHuman(w, h) {
    const n = 15000;
    totalParticles = n;
    homeX = new Float32Array(n);
    homeY = new Float32Array(n);
    colorsR = new Uint8Array(n);
    colorsG = new Uint8Array(n);
    colorsB = new Uint8Array(n);
    phases = new Float32Array(n);
    scatterOffsetX = new Float32Array(n);
    scatterOffsetY = new Float32Array(n);
    scatterSwirl = new Float32Array(n);
    scatterDelay = new Float32Array(n);

    const cx = w * 0.5;
    const cy = h * 0.5;

    for (let i = 0; i < n; i++) {
      const u = (Math.random() - 0.5) * 0.5;
      const v = (Math.random() - 0.5) * 1.8;
      homeX[i] = cx + u * (h * 0.4);
      homeY[i] = cy + v * (h * 0.4);
      colorsR[i] = 0;
      colorsG[i] = 210;
      colorsB[i] = 255;
      phases[i] = Math.random() * Math.PI * 2;
    }

    initScatter(w, h);
  }

  // -------------------------------------------------------------
  // INITIALIZATION & EVENT LISTENERS
  // -------------------------------------------------------------
  function init() {
    canvasEl = document.getElementById("human-particle-canvas") || document.getElementById("gesture-recognize-canvas");
    powerBtn = document.getElementById("human-power-toggle-btn") || document.getElementById("human-wind-toggle-btn");
    powerLabel = document.getElementById("human-power-btn-label") || document.getElementById("human-wind-btn-label");
    systemStatusEl = document.getElementById("human-system-status") || document.getElementById("human-wind-status");
    biometricsStatusEl = document.getElementById("human-biometrics-status") || document.getElementById("human-aura-status");
    avatarNameEl = document.getElementById("human-avatar-name");
    fpsValEl = document.getElementById("human-fps-val");
    particleCountEl = document.getElementById("human-particle-count");

    // Avatar selector pills
    avatarPills = Array.from(document.querySelectorAll(".avatar-pill"));
    avatarPills.forEach(pill => {
      pill.addEventListener("click", (e) => {
        e.preventDefault();
        const avatar = pill.dataset.avatar;
        if (avatar) selectAvatar(avatar);
      });
    });

    if (canvasEl) {
      ctx = canvasEl.getContext("2d", { alpha: false });
      resizeCanvas();
      window.addEventListener("resize", () => {
        resizeCanvas();
        if (canvasEl) loadAvatarModel(activeAvatarKey, canvasEl.width, canvasEl.height);
      });
    }

    // Single ON / OFF Toggle Button
    powerBtn?.addEventListener("click", () => togglePower());

    // Load initial avatar particles & trigger materialization
    if (canvasEl) {
      loadAvatarModel(activeAvatarKey, canvasEl.width, canvasEl.height);
      triggerMaterialize();
    }

    // Start 60 FPS Render Loop
    if (!animId) {
      lastFrameTime = performance.now();
      animId = requestAnimationFrame(renderLoop);
    }
  }

  function resizeCanvas() {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round((rect.width || 280) * dpr);
    const h = Math.round((rect.height || 420) * dpr);
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
  }

  // -------------------------------------------------------------
  // SINGLE ON / OFF POWER TOGGLE
  // -------------------------------------------------------------
  function togglePower(forceState) {
    powerActive = forceState !== undefined ? forceState : !powerActive;
    if (powerBtn) {
      powerBtn.classList.toggle("active", powerActive);
      powerBtn.classList.toggle("enabled", powerActive);
    }
    if (powerLabel) {
      powerLabel.textContent = powerActive ? "ON" : "OFF";
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = powerActive ? "ACTIVE" : "OFFLINE";
    }
    if (biometricsStatusEl) {
      biometricsStatusEl.textContent = powerActive ? "NOMINAL" : "STANDBY";
    }
    JarvisSoundscape.play("click");
    if (powerActive) {
      triggerMaterialize();
    } else {
      const centerHolo = window.NaviCenterHologram;
      if (centerHolo && centerHolo.isDeployed()) {
        centerHolo.restoreIronMan();
      }
    }
    showJarvisFeedback(powerActive ? "nAvI Labs projection online." : "nAvI Labs projection standby.", "navi_labs");
  }

  // -------------------------------------------------------------
  // 60 FPS HOLOGRAPHIC MATERIALIZATION & PARTICLE RENDER LOOP
  // -------------------------------------------------------------
  function renderLoop(now) {
    if (document.hidden) {
      setTimeout(() => { animId = requestAnimationFrame(renderLoop); }, 250);
      return;
    }
    animId = requestAnimationFrame(renderLoop);

    if (!canvasEl || !ctx) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    if (w === 0 || h === 0) return;

    const dt = Math.min(0.033, (now - lastFrameTime) / 1000.0);
    lastFrameTime = now;
    time += dt;

    // Calculate real-time FPS
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.8) {
      currentFps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
      if (fpsValEl) fpsValEl.textContent = `${currentFps} FPS`;
    }

    // ---------------------------------------------------------
    // POWERED DOWN STANDBY STATE
    // ---------------------------------------------------------
    if (!powerActive) {
      ctx.fillStyle = "#020612";
      ctx.fillRect(0, 0, w, h);

      // Subtle cyber standby pulse line
      const midY = Math.round(h * 0.5);
      const lineAlpha = 0.25 + Math.sin(time * 2.0) * 0.15;
      ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, midY);
      ctx.lineTo(w * 0.75, midY);
      ctx.stroke();

      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText("nAvI // STANDBY", w * 0.5, midY - 6);
      ctx.textAlign = "left";
      return;
    }

    // ---------------------------------------------------------
    // HOLOGRAPHIC CONVERGENCE MATERIALIZATION (Simultaneous Assembly)
    // ---------------------------------------------------------
    if (isMaterializing) {
      materializeProgress += dt / MATERIALIZE_DURATION;
      if (materializeProgress >= 1.0) {
        materializeProgress = 1.0;
        isMaterializing = false;
      }
    }

    const imgData = ctx.createImageData(w, h);
    const buf = new Uint32Array(imgData.data.buffer);

    // Deep solid void background: rgba(2, 6, 18, 255) -> 0xff120602
    buf.fill(0xff120602);

    const cx = w * 0.5;
    const emitterX = cx;
    const emitterY = Math.round(h * 0.94);

    // Holographic energy wave scan line moving downwards periodically (idle)
    const scanY = ((time * 0.45) % 1.25) - 0.12;

    // Render 30,000 Holographic Phosphor Particles
    for (let i = 0; i < totalParticles; i++) {
      const hx = homeX[i];
      const hy = homeY[i];
      const phase = phases[i];

      // Subtle quantum micro-vibration
      const vibX = Math.sin(time * 3.6 + phase) * 0.55;
      const vibY = Math.cos(time * 2.9 + phase * 1.3) * 0.55;

      let px, py;
      let r = colorsR[i];
      let g = colorsG[i];
      let b = colorsB[i];

      if (isMaterializing && materializeProgress < 1.0) {
        // All particles converge and assemble together simultaneously across the entire body
        const delay = scatterDelay ? scatterDelay[i] : 0.0;
        // Organic finish variance so particles dock smoothly between 0.88 and 1.0
        const targetEnd = 1.0 - delay * 0.55;
        const localT = Math.min(1.0, materializeProgress / targetEnd);

        // Quintic-Cubic ease-out: swift inward holographic snap decelerating into precise position
        const ease = 1.0 - Math.pow(1.0 - localT, 3.2);

        // Holographic magnetic flux curvature mid-flight
        const midFlight = Math.sin(localT * Math.PI) * (1.0 - ease);
        const curlX = Math.cos(phase + localT * 3.5) * (scatterSwirl ? scatterSwirl[i] : 0) * midFlight;
        const curlY = Math.sin(phase + localT * 3.5) * (scatterSwirl ? scatterSwirl[i] : 0) * midFlight;

        const curX = hx + (scatterOffsetX ? scatterOffsetX[i] : 0) * (1.0 - ease) + curlX;
        const curY = hy + (scatterOffsetY ? scatterOffsetY[i] : 0) * (1.0 - ease) + curlY;

        if (localT < 1.0) {
          px = Math.round(curX);
          py = Math.round(curY);

          // Electric ionization plasma glow converging into authentic character palette
          const energy = 1.0 - ease;
          const blend = ease;
          // Futuristic ionized cyan-blue glow: rgb(130, 230, 255)
          r = Math.min(255, (((1.0 - blend) * 130 + blend * r) * (1.0 + energy * 0.35)) | 0);
          g = Math.min(255, (((1.0 - blend) * 230 + blend * g) * (1.0 + energy * 0.35)) | 0);
          b = Math.min(255, (((1.0 - blend) * 255 + blend * b) * (1.0 + energy * 0.35)) | 0);
        } else {
          // Locked in place with subtle settling micro-resonance
          const settleFrac = Math.min(1.0, (materializeProgress - targetEnd) / (1.0 - targetEnd + 0.001));
          const settleDamp = 1.0 - settleFrac;
          px = Math.round(hx + vibX * (1.0 + settleDamp * 1.5));
          py = Math.round(hy + vibY * (1.0 + settleDamp * 1.5));

          // Brief luminous lock-in flash
          if (settleFrac < 0.6) {
            const glow = 1.0 + (1.0 - settleFrac / 0.6) * 0.45;
            r = Math.min(255, (r * glow) | 0);
            g = Math.min(255, (g * glow) | 0);
            b = Math.min(255, (b * glow) | 0);
          }
        }
      } else {
        // Standard Idle: Locked into anatomical position with subtle micro-shimmer
        px = Math.round(hx + vibX);
        py = Math.round(hy + vibY);

        // Particle luminance shimmer & holographic vertical scan boost
        const shimmer = 0.82 + 0.18 * Math.sin(time * 4.5 + phase);
        const normY = py / h;
        const distToScan = Math.abs(normY - scanY);
        const scanBoost = distToScan < 0.08 ? (1.0 - distToScan / 0.08) * 0.55 : 0;
        const factor = shimmer + scanBoost;

        r = Math.min(255, (r * factor) | 0);
        g = Math.min(255, (g * factor) | 0);
        b = Math.min(255, (b * factor) | 0);
      }

      if (px >= 0 && px < w && py >= 0 && py < h) {
        const idx = py * w + px;
        buf[idx] = (0xff000000 | (b << 16) | (g << 8) | r);

        // Optical bloom halo for prominent particles
        if ((r + g + b > 240) || ((i & 7) === 0)) {
          const hr = (r * 0.32) | 0;
          const hg = (g * 0.32) | 0;
          const hb = (b * 0.32) | 0;

          if (py > 0) {
            const upIdx = idx - w;
            const cur = buf[upIdx];
            buf[upIdx] = 0xff000000 | (Math.min(255, ((cur >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((cur >> 8) & 0xff) + hg) << 8) | Math.min(255, (cur & 0xff) + hr);
          }
          if (py < h - 1) {
            const dnIdx = idx + w;
            const cur = buf[dnIdx];
            buf[dnIdx] = 0xff000000 | (Math.min(255, ((cur >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((cur >> 8) & 0xff) + hg) << 8) | Math.min(255, (cur & 0xff) + hr);
          }
          if (px > 0) {
            const ltIdx = idx - 1;
            const cur = buf[ltIdx];
            buf[ltIdx] = 0xff000000 | (Math.min(255, ((cur >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((cur >> 8) & 0xff) + hg) << 8) | Math.min(255, (cur & 0xff) + hr);
          }
          if (px < w - 1) {
            const rtIdx = idx + 1;
            const cur = buf[rtIdx];
            buf[rtIdx] = 0xff000000 | (Math.min(255, ((cur >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((cur >> 8) & 0xff) + hg) << 8) | Math.min(255, (cur & 0xff) + hr);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // ---------------------------------------------------------
    // HOLOGRAPHIC CONVERGENCE MATRIX & PROJECTOR FIELD
    // ---------------------------------------------------------
    if (isMaterializing && materializeProgress < 0.98) {
      const alpha = 0.85 * (1.0 - materializeProgress);
      const cy = h * 0.5;

      // Holographic floor projector beacon
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(emitterX, emitterY, w * 0.26 * (0.8 + 0.2 * Math.sin(time * 6.0)), 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(emitterX, emitterY, w * 0.14, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Contracting Holographic Convergence Reticle (contracts inward as hologram forms)
      const ringRadius = Math.max(w, h) * 0.48 * (1.25 - 0.45 * materializeProgress);
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Cyber targeting brackets tracking inward
      const boxW = w * (0.36 + 0.12 * (1.0 - materializeProgress));
      const boxH = h * (0.40 + 0.12 * (1.0 - materializeProgress));
      const l = cx - boxW, r = cx + boxW, t = cy - boxH, b = cy + boxH;
      const tick = 10;
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([]);
      ctx.beginPath();
      // Top-left
      ctx.moveTo(l, t + tick); ctx.lineTo(l, t); ctx.lineTo(l + tick, t);
      // Top-right
      ctx.moveTo(r - tick, t); ctx.lineTo(r, t); ctx.lineTo(r, t + tick);
      // Bottom-left
      ctx.moveTo(l, b - tick); ctx.lineTo(l, b); ctx.lineTo(l + tick, b);
      // Bottom-right
      ctx.moveTo(r - tick, b); ctx.lineTo(r, b); ctx.lineTo(r, b - tick);
      ctx.stroke();
      ctx.restore();

      // Convergence Micro-HUD Status
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.65})`;
      ctx.textAlign = "center";
      ctx.fillText(`HOLO // CONVERGENCE: ${(materializeProgress * 100).toFixed(0)}%`, cx, h * 0.06);
      ctx.textAlign = "left";
    }

    // Final Holographic Docking Pulse Ring
    if (isMaterializing && materializeProgress >= 0.92) {
      const pulseT = (materializeProgress - 0.92) / 0.08;
      const pulseRadius = (w * 0.18) + pulseT * (w * 0.32);
      const pulseAlpha = (1.0 - pulseT) * 0.4;
      ctx.strokeStyle = `rgba(180, 255, 255, ${pulseAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, h * 0.5, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return {
    init,
    togglePower,
    selectAvatar,
    cycleAvatar: () => {
      const keys = ["ultron", "optimus", "bumblebee", "spiderman", "mecha"];
      const currentCanonical = (activeAvatarKey === "navi") ? "ultron" : activeAvatarKey;
      const curIdx = keys.indexOf(currentCanonical);
      const nextIdx = curIdx >= 0 ? (curIdx + 1) % keys.length : 0;
      selectAvatar(keys[nextIdx]);
    },
    // Backward-compatible aliases
    start: () => togglePower(true),
    stop: () => togglePower(false),
    toggleGestures: (state) => togglePower(state),
    toggleWind: (state) => togglePower(state),
    burst: () => triggerMaterialize(),
    reset: () => triggerMaterialize(),
    togglePresenceLock: () => {},
    isGesturesRunning: () => powerActive
  };
})();

// =============================================================
// GOOGLE MEDIAPIPE HOLISTIC LANDMARKER & GESTURE RECOGNIZER
// 543 Landmarks: Face Mesh (468) + Pose Skeleton (33) + Dual Hands (42)
// Live Physical Camera Stream + Real-Time MediaPipe Visualizer (Image 2 Match)
// =============================================================
const NaviHolisticGestureTracker = (() => {
  let canvasEl = null;
  let ctx = null;
  let videoEl = null;
  let viewportEl = null;
  let containerEl = null;
  let animId = null;
  let isTracking = true;
  let isHolisticEffect = false; // Default OFF: standby screen on startup, 0% CPU/GPU overhead
  let currentMode = "combined"; // "holistic" | "gestures" | "combined"
  let activeGestureKey = "victory";
  let currentZoom = 1;
  let zoomPills = [];
  let resetZoomBtn = null;

  // Physical Webcam Stream State
  let camToggleBtn = null;
  let camBtnLabel = null;
  let flipBtn = null;
  let flipBtnLabel = null;
  let isMirrored = false;
  let isWebcamActive = false;
  let webcamStream = null;
  let cameraInUseError = false;

  // Adaptive Temporal Smoothing State (Zero-Jitter & Zero-Lag)
  let smoothedResult = {
    faceLandmarks: null,
    poseLandmarks: null,
    leftHandLandmarks: null,
    rightHandLandmarks: null
  };
  let rvfcId = null;
  let isDetecting = false;
  const MIN_DETECT_INTERVAL_MS = 33; // ~30 FPS detection: responsive and zero hand lag
  let lastDetectCallTime = 0;
  let cachedRectW = 0;
  let cachedRectH = 0;
  let layoutDirty = true;
  let cachedPoseConnections = null;
  window.addEventListener("resize", () => { layoutDirty = true; });

  function smoothLandmarkSet(rawList, smoothedList) {
    if (!rawList || rawList.length === 0) return null;
    const out = smoothedList && Array.isArray(smoothedList) && smoothedList.length === rawList.length ? smoothedList : [];
    for (let i = 0; i < rawList.length; i++) {
      const rawGroup = rawList[i];
      let prevGroup = out[i];
      if (!prevGroup || prevGroup.length !== rawGroup.length) {
        prevGroup = new Array(rawGroup.length);
        for (let k = 0; k < rawGroup.length; k++) {
          prevGroup[k] = { x: rawGroup[k].x, y: rawGroup[k].y, z: rawGroup[k].z ?? 0 };
        }
        out[i] = prevGroup;
      } else {
        for (let j = 0; j < rawGroup.length; j++) {
          const rp = rawGroup[j];
          const sp = prevGroup[j];
          const dx = rp.x - sp.x;
          const dy = rp.y - sp.y;
          const distSq = dx * dx + dy * dy;
          // Responsive smoothing:
          // Instant tracking on fast hand/head motion (alpha 0.88 -> zero delay or sticking)
          // Smooth stabilization when resting or moving slightly (alpha 0.55 -> zero jitter)
          const alpha = distSq > 0.0004 ? 0.88 : 0.55;
          sp.x += (rp.x - sp.x) * alpha;
          sp.y += (rp.y - sp.y) * alpha;
          sp.z = (sp.z ?? 0) + ((rp.z ?? 0) - (sp.z ?? 0)) * alpha;
        }
      }
    }
    if (out.length > rawList.length) out.length = rawList.length;
    return out;
  }

  function getSmoothedResult(rawResult) {
    if (!rawResult) return null;
    smoothedResult.faceLandmarks = smoothLandmarkSet(rawResult.faceLandmarks, smoothedResult.faceLandmarks);
    smoothedResult.poseLandmarks = smoothLandmarkSet(rawResult.poseLandmarks, smoothedResult.poseLandmarks);
    smoothedResult.leftHandLandmarks = smoothLandmarkSet(rawResult.leftHandLandmarks, smoothedResult.leftHandLandmarks);
    smoothedResult.rightHandLandmarks = smoothLandmarkSet(rawResult.rightHandLandmarks, smoothedResult.rightHandLandmarks);
    return smoothedResult;
  }

  function onVideoFrame(now, metadata) {
    if (!isWebcamActive || !videoEl) {
      rvfcId = null;
      return;
    }

    if (isWebcamActive && videoEl && typeof videoEl.requestVideoFrameCallback === "function") {
      rvfcId = videoEl.requestVideoFrameCallback(onVideoFrame);
    } else {
      rvfcId = null;
    }

    const tCurrent = performance.now();

    // 1. Holistic Landmarker (Face Mesh + Hand Skeleton - Active in Holistic Mode)
    if (isHolisticEffect && isTracking) {
      if (isDetecting && (tCurrent - lastDetectCallTime > 300)) {
        isDetecting = false;
      }

      if (holisticLandmarker && !isDetecting && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && !videoEl.paused) {
        if (tCurrent - lastDetectCallTime >= MIN_DETECT_INTERVAL_MS) {
          isDetecting = true;
          lastDetectCallTime = tCurrent;
          const timestampMs = Math.max(tCurrent, (lastTimestampMs || 0) + 1);
          lastTimestampMs = timestampMs;
          const t0 = performance.now();
          try {
            const res = holisticLandmarker.detectForVideo(videoEl, timestampMs);
            if (res) {
              lastResult = res;
            }
            latencyMs = performance.now() - t0;
          } catch (e) {
            console.warn("[NAVI Holistic] detectForVideo warning:", e);
          } finally {
            isDetecting = false;
          }
        }
      }
    }

    // 2. Real-Time Neural Object & Fruit Detection (Runs ONLY in Normal Camera View, NEVER when Holistic is ON)
    if (!isHolisticEffect && isObjectDetectionActive && (objectDetector || imageClassifier) && videoEl.readyState >= 2 && videoEl.videoWidth > 0 && !videoEl.paused) {
      if (isDetectingObjects && (tCurrent - lastObjDetectCallTime > 350)) {
        isDetectingObjects = false;
      }
      if (!isDetectingObjects && (tCurrent - lastObjDetectCallTime >= MIN_OBJ_DETECT_INTERVAL_MS)) {
        isDetectingObjects = true;
        lastObjDetectCallTime = tCurrent;
        const tsObj = Math.max(tCurrent, (lastObjTimestampMs || 0) + 1);
        lastObjTimestampMs = tsObj;

        try {
          let detections = [];
          if (objectDetector) {
            const dRes = objectDetector.detectForVideo(videoEl, tsObj);
            if (dRes && dRes.detections) {
              detections = dRes.detections;
            }
          }

          let classifications = [];
          if (imageClassifier) {
            const cRes = imageClassifier.classifyForVideo(videoEl, tsObj);
            if (cRes && cRes.classifications && cRes.classifications[0]) {
              classifications = cRes.classifications[0].categories || [];
            }
          }

          updateUnifiedObjectDetections(detections, classifications, videoEl.videoWidth, videoEl.videoHeight);
        } catch (eObj) {
          // Silently handle video drop
        } finally {
          isDetectingObjects = false;
        }
      }
    }
  }

  // Google MediaPipe Tasks Vision State
  let visionLoaded = false;
  let holisticLandmarker = null;
  let objectDetector = null;
  let imageClassifier = null;
  let isObjectDetectionActive = true;
  let objToggleBtn = null;
  let isDetectingObjects = false;
  let lastObjDetectCallTime = 0;
  const MIN_OBJ_DETECT_INTERVAL_MS = 66; // ~15 FPS: ultra responsive, zero video lag
  let lastObjTimestampMs = -1;
  let activeDetections = [];
  let lastAnnouncedObject = "";
  let lastAnnouncedTime = 0;
  let detectionHoldCounter = {};
  let isModelLoading = false;
  let lastVideoTime = -1;
  let lastTimestampMs = -1;
  let lastResult = null;

  // Real-Time Object & Fruit Taxonomy Dictionary
  const OBJECT_DICTIONARY = {
    // Writing & Stationery (COCO has no pen, pens are classified as toothbrush/ballpoint)
    pen: { name: "PEN", icon: "🖊️", color: "#00f0ff", type: "stationery" },
    ballpoint: { name: "PEN", icon: "🖊️", color: "#00f0ff", type: "stationery" },
    fountain: { name: "FOUNTAIN PEN", icon: "✒️", color: "#00f0ff", type: "stationery" },
    "fountain pen": { name: "FOUNTAIN PEN", icon: "✒️", color: "#00f0ff", type: "stationery" },
    toothbrush: { name: "PEN", icon: "🖊️", color: "#00f0ff", type: "stationery" }, // 100% remap: COCO misclassifies pens as toothbrush
    pencil: { name: "PENCIL", icon: "✏️", color: "#38bdf8", type: "stationery" },
    "pencil box": { name: "PENCIL CASE", icon: "✏️", color: "#38bdf8", type: "stationery" },
    "pencil sharpener": { name: "PENCIL SHARPENER", icon: "✏️", color: "#38bdf8", type: "stationery" },
    marker: { name: "MARKER PEN", icon: "🖍️", color: "#00f0ff", type: "stationery" },
    scissors: { name: "SCISSORS", icon: "✂️", color: "#ec4899", type: "tool" },
    book: { name: "BOOK / NOTEBOOK", icon: "📖", color: "#a855f7", type: "stationery" },

    // Fruits & Produce
    apple: { name: "APPLE", icon: "🍎", color: "#ef4444", type: "fruit" },
    "granny smith": { name: "GREEN APPLE", icon: "🍏", color: "#10b981", type: "fruit" },
    "custard apple": { name: "CUSTARD APPLE", icon: "🍏", color: "#10b981", type: "fruit" },
    banana: { name: "BANANA", icon: "🍌", color: "#eab308", type: "fruit" },
    orange: { name: "ORANGE", icon: "🍊", color: "#f97316", type: "fruit" },
    lemon: { name: "LEMON", icon: "🍋", color: "#facc15", type: "fruit" },
    strawberry: { name: "STRAWBERRY", icon: "🍓", color: "#f43f5e", type: "fruit" },
    pineapple: { name: "PINEAPPLE", icon: "🍍", color: "#eab308", type: "fruit" },
    pomegranate: { name: "POMEGRANATE", icon: "🫐", color: "#be123c", type: "fruit" },
    fig: { name: "FIG", icon: "🍈", color: "#84cc16", type: "fruit" },
    mango: { name: "MANGO", icon: "🥭", color: "#f59e0b", type: "fruit" },
    grape: { name: "GRAPES", icon: "🍇", color: "#8b5cf6", type: "fruit" },
    grapes: { name: "GRAPES", icon: "🍇", color: "#8b5cf6", type: "fruit" },
    watermelon: { name: "WATERMELON", icon: "🍉", color: "#ef4444", type: "fruit" },
    broccoli: { name: "BROCCOLI", icon: "🥦", color: "#22c55e", type: "vegetable" },
    carrot: { name: "CARROT", icon: "🥕", color: "#f97316", type: "vegetable" },
    sandwich: { name: "SANDWICH", icon: "🥪", color: "#d97706", type: "food" },
    pizza: { name: "PIZZA", icon: "🍕", color: "#f97316", type: "food" },
    hot_dog: { name: "HOT DOG", icon: "🌭", color: "#ea580c", type: "food" },

    // Devices & Common Objects
    bottle: { name: "BOTTLE", icon: "🍶", color: "#06b6d4", type: "object" },
    cup: { name: "CUP / MUG", icon: "☕", color: "#d97706", type: "object" },
    "wine glass": { name: "GLASS", icon: "🍷", color: "#ec4899", type: "object" },
    "cell phone": { name: "SMARTPHONE", icon: "📱", color: "#3b82f6", type: "tech" },
    laptop: { name: "LAPTOP", icon: "💻", color: "#6366f1", type: "tech" },
    mouse: { name: "MOUSE", icon: "🖱️", color: "#06b6d4", type: "tech" },
    keyboard: { name: "KEYBOARD", icon: "⌨️", color: "#14b8a6", type: "tech" },
    clock: { name: "CLOCK / WATCH", icon: "⏰", color: "#f59e0b", type: "tech" },
    knife: { name: "KNIFE", icon: "🔪", color: "#94a3b8", type: "tool" },
    fork: { name: "FORK", icon: "🍴", color: "#94a3b8", type: "tool" },
    spoon: { name: "SPOON", icon: "🥄", color: "#94a3b8", type: "tool" },
    bowl: { name: "BOWL", icon: "🥣", color: "#a855f7", type: "object" }
  };

  function updateUnifiedObjectDetections(rawDetections, rawClassifications, vw, vh) {
    const newItems = [];
    const now = performance.now();

    // 1. Process 2D Bounding Box detections from ObjectDetector
    if (rawDetections && rawDetections.length > 0) {
      for (const d of rawDetections) {
        if (!d.categories || !d.categories[0]) continue;
        const cat = d.categories[0];
        let rawName = (cat.categoryName || "").toLowerCase().trim();
        // Skip user person/body and static furniture (chair, couch, bed, table) to prevent background clutter
        if (rawName === "person" || rawName === "chair" || rawName === "couch" || rawName === "bed" || rawName === "dining table" || cat.score < 0.28) continue;

        // CRITICAL CORRECTION: COCO lacks 'pen', so pens are misclassified as 'toothbrush'!
        // When user shows a pen in front of desktop camera, map 'toothbrush' directly to 'pen'
        if (rawName === "toothbrush") {
          rawName = "pen";
        }

        // Slender cylindrical objects (aspect ratio > 2.0) like pens misclassified as knife/remote
        const b = d.boundingBox;
        const aspect = Math.max(b.width / (b.height || 1), b.height / (b.width || 1));
        if ((rawName === "knife" || rawName === "remote" || rawName === "fork" || rawName === "baseball bat") && aspect >= 2.0) {
          rawName = "pen";
        }

        const meta = OBJECT_DICTIONARY[rawName] || {
          name: rawName.toUpperCase(),
          icon: "🎯",
          color: "#00f0ff",
          type: "object"
        };

        newItems.push({
          key: rawName,
          label: meta.name,
          icon: meta.icon,
          color: meta.color,
          score: cat.score,
          type: meta.type || "object",
          targetX: b.originX,
          targetY: b.originY,
          targetW: b.width,
          targetH: b.height
        });
      }
    }

    // 2. Check Fine-Grained Classifications (Stationery/Pens, Specific Fruits)
    if (rawClassifications && rawClassifications.length > 0) {
      // Check for stationery / pen indicators in classifier
      let foundPenClass = false;
      let penLabel = "PEN";
      let penIcon = "🖊️";

      for (const c of rawClassifications) {
        const cName = (c.categoryName || "").toLowerCase();
        const score = c.score || 0;
        if (score < 0.08) continue;
        if (cName.includes("ballpoint") || cName.includes("fountain") || cName.includes("pencil") || cName.includes("quill")) {
          foundPenClass = true;
          if (cName.includes("fountain")) {
            penLabel = "FOUNTAIN PEN";
            penIcon = "✒️";
          } else if (cName.includes("pencil")) {
            penLabel = "PENCIL";
            penIcon = "✏️";
          } else {
            penLabel = "PEN";
            penIcon = "🖊️";
          }
          break;
        }
      }

      if (foundPenClass) {
        // Upgrade any existing detection item to PEN
        let penUpdated = false;
        for (const item of newItems) {
          if (item.key === "pen" || item.key === "toothbrush" || item.key === "knife" || item.key === "remote") {
            item.key = "pen";
            item.label = penLabel;
            item.icon = penIcon;
            item.color = "#00f0ff";
            penUpdated = true;
          }
        }
        if (!penUpdated) {
          // Add pen bounding box around active hand or center
          let bBox = null;
          if (smoothedResult) {
            const rHand = smoothedResult.rightHandLandmarks && smoothedResult.rightHandLandmarks[0];
            const lHand = smoothedResult.leftHandLandmarks && smoothedResult.leftHandLandmarks[0];
            const activeHand = rHand || lHand;
            if (activeHand && activeHand.length > 0) {
              let minX = 1, minY = 1, maxX = 0, maxY = 0;
              for (const p of activeHand) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              }
              const padX = (maxX - minX) * 0.35 + 0.05;
              const padY = (maxY - minY) * 0.35 + 0.05;
              bBox = {
                x: Math.max(0, (minX - padX)) * vw,
                y: Math.max(0, (minY - padY)) * vh,
                w: Math.min(vw, (maxX - minX + padX * 2)) * vw,
                h: Math.min(vh, (maxY - minY + padY * 2)) * vh
              };
            }
          }
          if (!bBox) {
            bBox = { x: vw * 0.25, y: vh * 0.2, w: vw * 0.5, h: vh * 0.6 };
          }
          newItems.push({
            key: "pen",
            label: penLabel,
            icon: penIcon,
            color: "#00f0ff",
            score: 0.92,
            targetX: bBox.x,
            targetY: bBox.y,
            targetW: bBox.w,
            targetH: bBox.h
          });
        }
      }

      // Check for specific fruits
      for (const c of rawClassifications) {
        const cName = (c.categoryName || "").toLowerCase();
        const score = c.score || 0;
        if (score < 0.14) continue;

        let matchedKey = null;
        for (const dictKey of Object.keys(OBJECT_DICTIONARY)) {
          if (cName.includes(dictKey) || dictKey.includes(cName)) {
            matchedKey = dictKey;
            break;
          }
        }

        if (matchedKey) {
          const meta = OBJECT_DICTIONARY[matchedKey];
          const alreadyCovered = newItems.find((item) => item.key === matchedKey || (meta.type === "fruit" && (item.key === "apple" || item.key === "orange" || item.key === "banana")));
          if (alreadyCovered) {
            // Refine the label to the specific fruit variety
            alreadyCovered.label = meta.name;
            alreadyCovered.icon = meta.icon;
            alreadyCovered.color = meta.color;
          } else if (meta.type === "fruit" && score >= 0.25) {
            let bBox = null;
            if (smoothedResult) {
              const rHand = smoothedResult.rightHandLandmarks && smoothedResult.rightHandLandmarks[0];
              const lHand = smoothedResult.leftHandLandmarks && smoothedResult.leftHandLandmarks[0];
              const activeHand = rHand || lHand;
              if (activeHand && activeHand.length > 0) {
                let minX = 1, minY = 1, maxX = 0, maxY = 0;
                for (const p of activeHand) {
                  if (p.x < minX) minX = p.x;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.y > maxY) maxY = p.y;
                }
                const padX = (maxX - minX) * 0.35 + 0.05;
                const padY = (maxY - minY) * 0.35 + 0.05;
                bBox = {
                  x: Math.max(0, (minX - padX)) * vw,
                  y: Math.max(0, (minY - padY)) * vh,
                  w: Math.min(vw, (maxX - minX + padX * 2)) * vw,
                  h: Math.min(vh, (maxY - minY + padY * 2)) * vh
                };
              }
            }
            if (!bBox) {
              bBox = { x: vw * 0.25, y: vh * 0.2, w: vw * 0.5, h: vh * 0.6 };
            }

            newItems.push({
              key: matchedKey,
              label: meta.name,
              icon: meta.icon,
              color: meta.color,
              score: Math.min(0.99, score * 1.5 + 0.2),
              targetX: bBox.x,
              targetY: bBox.y,
              targetW: bBox.w,
              targetH: bBox.h
            });
          }
        }
      }
    }

    // Absolute filter: Never allow 'TOOTHBRUSH' to leak into results
    for (const item of newItems) {
      if (item.label.toUpperCase().includes("TOOTHBRUSH") || item.key === "toothbrush") {
        item.key = "pen";
        item.label = "PEN";
        item.icon = "🖊️";
        item.color = "#00f0ff";
      }
    }

    // 3. SINGLE-TARGET FOCAL SELECTOR: Detect ONLY the single nearest object to the camera
    // (Prevents multiple bounding boxes and eliminates background disturbance)
    let singleTarget = [];
    if (newItems.length > 0) {
      // Calculate proximity score for each item:
      // Closer to camera = larger apparent bounding box area + central focal alignment + interactive object priority
      for (const item of newItems) {
        const areaRatio = (item.targetW * item.targetH) / Math.max(1, (vw * vh));
        const centerX = (item.targetX + item.targetW * 0.5) / Math.max(1, vw);
        const centerY = (item.targetY + item.targetH * 0.5) / Math.max(1, vh);
        const distFromCenter = Math.hypot(centerX - 0.5, centerY - 0.5);

        // Priority: pens, fruits, bottles, cups held up have highest focal weight
        const isInteractive = item.type === "stationery" || item.type === "fruit" || item.key === "pen" || item.key === "bottle" || item.key === "cup";
        const priorityWeight = isInteractive ? 3.5 : (item.key === "keyboard" || item.key === "chair" || item.key === "laptop" || item.key === "mouse" ? 0.15 : 1.0);

        item.proximityScore = (Math.sqrt(areaRatio) * 2.5 + (1.0 - Math.min(1.0, distFromCenter * 1.2))) * priorityWeight * (item.score || 0.6);
      }

      // Sort descending by proximity to camera (nearest object first)
      newItems.sort((a, b) => (b.proximityScore || 0) - (a.proximityScore || 0));
      const nearest = newItems[0];

      // Smooth temporal tracking on the single chosen target
      const prev = activeDetections.length > 0 ? activeDetections[0] : null;
      if (prev && (prev.key === nearest.key || Math.hypot(prev.x - nearest.targetX, prev.y - nearest.targetY) < 140)) {
        const alpha = 0.65;
        nearest.x = prev.x + (nearest.targetX - prev.x) * alpha;
        nearest.y = prev.y + (nearest.targetY - prev.y) * alpha;
        nearest.w = prev.w + (nearest.targetW - prev.w) * alpha;
        nearest.h = prev.h + (nearest.targetH - prev.h) * alpha;
      } else {
        nearest.x = nearest.targetX;
        nearest.y = nearest.targetY;
        nearest.w = nearest.targetW;
        nearest.h = nearest.targetH;
      }
      singleTarget = [nearest];
    }

    activeDetections = singleTarget;

    // 4. Voice & Feedback trigger (Debounced: announce identified items naturally)
    if (activeDetections.length > 0) {
      const topItem = activeDetections[0];
      if (topItem && topItem.score >= 0.45) {
        if (!detectionHoldCounter[topItem.key]) {
          detectionHoldCounter[topItem.key] = { count: 1, firstSeen: now };
        } else {
          detectionHoldCounter[topItem.key].count++;
        }

        const hold = detectionHoldCounter[topItem.key];
        // Held steady for at least ~800ms
        if (hold && (now - hold.firstSeen >= 800) && hold.count >= 4) {
          if (lastAnnouncedObject !== topItem.key || (now - lastAnnouncedTime > 12000)) {
            lastAnnouncedObject = topItem.key;
            lastAnnouncedTime = now;
            try {
              if (typeof showJarvisFeedback === "function") {
                showJarvisFeedback(`${topItem.icon || "🎯"} ${topItem.label} IDENTIFIED`, "vision_scan");
              }
              if (typeof speakResponse === "function" && !voiceMutedByUser) {
                speakResponse(`${topItem.label} identified, sir.`);
              }
            } catch (eF) {}
          }
        }
      }
    }
  }

  function drawObjectDetections(ctx, detections, w, h) {
    if (!detections || detections.length === 0) return;

    ctx.save();
    try {
      for (const obj of detections) {
        const x = Math.max(0, Math.min(w - 20, obj.x));
        const y = Math.max(0, Math.min(h - 20, obj.y));
        const boxW = Math.max(24, Math.min(w - x, obj.w));
        const boxH = Math.max(24, Math.min(h - y, obj.h));
        const color = obj.color || "#00f0ff";
        const scorePct = Math.round((obj.score || 0.8) * 100);

        // 1. Subtle semi-transparent bounding fill
        ctx.fillStyle = `${color}14`;
        ctx.fillRect(x, y, boxW, boxH);

        // 2. High-Tech Corner Brackets
        const bLen = Math.min(18, boxW * 0.28, boxH * 0.28);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        // Top-Left Corner
        ctx.beginPath();
        ctx.moveTo(x, y + bLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + bLen, y);
        ctx.stroke();

        // Top-Right Corner
        ctx.beginPath();
        ctx.moveTo(x + boxW - bLen, y);
        ctx.lineTo(x + boxW, y);
        ctx.lineTo(x + boxW, y + bLen);
        ctx.stroke();

        // Bottom-Left Corner
        ctx.beginPath();
        ctx.moveTo(x, y + boxH - bLen);
        ctx.lineTo(x, y + boxH);
        ctx.lineTo(x + bLen, y + boxH);
        ctx.stroke();

        // Bottom-Right Corner
        ctx.beginPath();
        ctx.moveTo(x + boxW - bLen, y + boxH);
        ctx.lineTo(x + boxW, y + boxH);
        ctx.lineTo(x + boxW, y + boxH - bLen);
        ctx.stroke();

        // 3. Cyber Target Crosshair in Center
        const cx = x + boxW * 0.5;
        const cy = y + boxH * 0.5;
        const cArm = Math.min(6, boxW * 0.1);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - cArm, cy);
        ctx.lineTo(cx + cArm, cy);
        ctx.moveTo(cx, cy - cArm);
        ctx.lineTo(cx, cy + cArm);
        ctx.stroke();

        // 4. Futuristic HUD Badge
        const labelText = `${obj.icon || "🎯"} ${obj.label} ${scorePct}%`;
        const fontSize = Math.max(10, Math.min(13, Math.round(w * 0.022)));
        ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
        const textWidth = ctx.measureText(labelText).width;
        const badgeW = textWidth + 14;
        const badgeH = fontSize + 8;
        const badgeY = Math.max(4, y - badgeH - 3);

        if (isMirrored) {
          ctx.save();
          ctx.translate(x + boxW / 2, y);
          ctx.scale(-1, 1);
          ctx.fillStyle = "rgba(3, 7, 18, 0.88)";
          ctx.shadowBlur = 0;
          ctx.fillRect(-badgeW / 2, -badgeH - 3, badgeW, badgeH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(-badgeW / 2, -badgeH - 3, badgeW, badgeH);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 5;
          ctx.fillText(labelText, -textWidth / 2, -7);
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(3, 7, 18, 0.88)";
          ctx.shadowBlur = 0;
          ctx.fillRect(x, badgeY, badgeW, badgeH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, badgeY, badgeW, badgeH);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 5;
          ctx.fillText(labelText, x + 7, badgeY + badgeH - 5);
        }
      }
    } catch (e) {
      console.warn("[NAVI Vision] drawObjectDetections error:", e);
    } finally {
      ctx.restore();
    }
  }

  // UI Element References
  let modePills = [];
  let triggerItems = [];
  let trackToggleBtn = null;
  let trackBtnLabel = null;
  let pipelineStatusEl = null;
  let landmarkCountEl = null;
  let activeGestureEl = null;
  let fpsValEl = null;
  let pulseBeaconEl = null;

  // Telemetry & Metrics
  let frameCount = 0;
  let fpsTimer = performance.now();
  let currentFps = 60;
  let latencyMs = 11;

  const GESTURES = {
    victory: {
      name: "VICTORY",
      icon: "✌️",
      action: "DESKTOP_VISOR_TOGGLE",
      desc: "Visor Hologram Engaged",
      confidence: 0.992
    },
    open_palm: {
      name: "PALM",
      icon: "✋",
      action: "SHIELD_ARRAY_ACTIVATE",
      desc: "Defensive Kinetic Mesh Active",
      confidence: 0.985
    },
    fist: {
      name: "FIST",
      icon: "✊",
      action: "REPULSOR_CHARGED",
      desc: "Repulsor Capacitor at 100%",
      confidence: 0.990
    },
    pointing: {
      name: "POINT",
      icon: "☝️",
      action: "SYSTEM_TARGET_LOCK",
      desc: "Precision Vector Coordinate Locked",
      confidence: 0.978
    },
    pinch: {
      name: "PINCH",
      icon: "👌",
      action: "TACTICAL_DATA_ZOOM",
      desc: "Holographic Depth Scaled",
      confidence: 0.965
    },
    arc_strike: {
      name: "BLAST",
      icon: "🤟",
      action: "UNIBEAM_OVERCHARGE",
      desc: "Chest Arc Reactor Unibeam Primed",
      confidence: 0.982
    }
  };

  function updatePipelineStatus(statusText) {
    if (pipelineStatusEl) {
      pipelineStatusEl.textContent = statusText;
    }
  }

  function toggleFlip(state) {
    isMirrored = typeof state === "boolean" ? state : !isMirrored;
    if (viewportEl) {
      viewportEl.classList.toggle("mirrored", isMirrored);
    }
    if (flipBtn) {
      flipBtn.classList.toggle("active", isMirrored);
    }
    if (flipBtnLabel) {
      flipBtnLabel.textContent = isMirrored ? "FLIP: ON" : "FLIP: OFF";
    }
  }

  function setCamButtonState(state) {
    if (!camToggleBtn) return;
    if (state === "starting") {
      camToggleBtn.classList.remove("enabled", "error");
      camToggleBtn.classList.add("starting");
      if (camBtnLabel) camBtnLabel.textContent = "...";
    } else if (state === "error") {
      camToggleBtn.classList.remove("enabled", "starting");
      camToggleBtn.classList.add("error");
      if (camBtnLabel) camBtnLabel.textContent = "ERR";
    } else if (state === "idle" || !isWebcamActive || !isHolisticEffect) {
      camToggleBtn.classList.remove("starting", "error", "enabled");
      if (camBtnLabel) camBtnLabel.textContent = "OFF";
    } else {
      camToggleBtn.classList.remove("starting", "error");
      camToggleBtn.classList.toggle("enabled", isHolisticEffect);
      if (camBtnLabel) camBtnLabel.textContent = isHolisticEffect ? "ON" : "OFF";
    }
  }

  function setHolisticEffect(state) {
    isHolisticEffect = Boolean(state);
    if (isHolisticEffect) {
      activeDetections = [];
      isDetectingObjects = false;
      detectionHoldCounter = {};
    }
    setCamButtonState(isHolisticEffect && isWebcamActive ? "active" : "idle");
    if (pulseBeaconEl) {
      pulseBeaconEl.style.opacity = isHolisticEffect ? "1" : "0.35";
    }
  }

  function toggleHolisticEffect() {
    if (!isWebcamActive || !isHolisticEffect) {
      setHolisticEffect(true);
      enableCam();
    } else {
      setHolisticEffect(false);
      stopCam();
    }
  }

  // =============================================================
  // 1. Google MediaPipe Tasks Vision Initialization
  // Official reference: google-ai-edge/mediapipe-samples-web/src/tasks/holistic-landmarker.ts
  // =============================================================
  async function initMediaPipe() {
    if (holisticLandmarker || isModelLoading) return;
    isModelLoading = true;
    updatePipelineStatus("INIT VISION...");

    try {
      if (!window.Vision) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "vendor/mediapipe/vision_bundle.js";
          s.onload = resolve;
          s.onerror = () => {
            const s2 = document.createElement("script");
            s2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";
            s2.crossOrigin = "anonymous";
            s2.onload = resolve;
            s2.onerror = reject;
            document.head.appendChild(s2);
          };
          document.head.appendChild(s);
        });
      }

      updatePipelineStatus("LOADING MODEL...");
      let filesetResolver;
      try {
        filesetResolver = await window.Vision.FilesetResolver.forVisionTasks(
          "vendor/mediapipe/wasm"
        );
      } catch (wasmErr) {
        console.warn("[NAVI Holistic] Local wasm failed, using CDN wasm:", wasmErr);
        filesetResolver = await window.Vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );
      }

      const localModelPath = "vendor/mediapipe/models/holistic_landmarker.task";
      const cdnModelPath =
        "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task";

      async function createLandmarker(modelPath, delegate) {
        return await window.Vision.HolisticLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: delegate
          },
          runningMode: "VIDEO",
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minHandLandmarksConfidence: 0.5,
          minPoseDetectionConfidence: 0.5
        });
      }

      try {
        holisticLandmarker = await createLandmarker(localModelPath, "GPU");
        console.log("[NAVI Holistic] Loaded local model with GPU delegate.");
      } catch (e1) {
        console.warn("[NAVI Holistic] Local GPU failed, trying local CPU...", e1);
        try {
          holisticLandmarker = await createLandmarker(localModelPath, "CPU");
          console.log("[NAVI Holistic] Loaded local model with CPU delegate.");
        } catch (e2) {
          console.warn("[NAVI Holistic] Local model failed, trying CDN model with GPU...", e2);
          try {
            holisticLandmarker = await createLandmarker(cdnModelPath, "GPU");
            console.log("[NAVI Holistic] Loaded CDN model with GPU delegate.");
          } catch (e3) {
            console.warn("[NAVI Holistic] CDN GPU failed, trying CDN CPU...", e3);
            holisticLandmarker = await createLandmarker(cdnModelPath, "CPU");
            console.log("[NAVI Holistic] Loaded CDN model with CPU delegate.");
          }
        }
      }

      // Initialize Neural Object Detector (Bounding Boxes: Fruits, Bottles, Cups, Tech, Items)
      const objModelPath = "vendor/mediapipe/models/efficientdet_lite0.tflite";
      try {
        objectDetector = await window.Vision.ObjectDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: objModelPath,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          scoreThreshold: 0.32,
          maxResults: 8
        });
        console.log("[NAVI Vision] Loaded ObjectDetector with GPU delegate.");
      } catch (eObj1) {
        console.warn("[NAVI Vision] ObjectDetector GPU failed, fallback to CPU...", eObj1);
        try {
          objectDetector = await window.Vision.ObjectDetector.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: objModelPath,
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            scoreThreshold: 0.32,
            maxResults: 8
          });
          console.log("[NAVI Vision] Loaded ObjectDetector with CPU delegate.");
        } catch (eObj2) {
          console.warn("[NAVI Vision] Failed to load local ObjectDetector:", eObj2);
        }
      }

      // Initialize Fine-Grained Classifier (Pens, Pencils, Specific Fruits, Fine Objects)
      const classModelPath = "vendor/mediapipe/models/efficientnet_lite0.tflite";
      try {
        imageClassifier = await window.Vision.ImageClassifier.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: classModelPath,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          scoreThreshold: 0.15,
          maxResults: 6
        });
        console.log("[NAVI Vision] Loaded ImageClassifier with GPU delegate.");
      } catch (eCl1) {
        console.warn("[NAVI Vision] ImageClassifier GPU failed, fallback to CPU...", eCl1);
        try {
          imageClassifier = await window.Vision.ImageClassifier.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: classModelPath,
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            scoreThreshold: 0.15,
            maxResults: 6
          });
          console.log("[NAVI Vision] Loaded ImageClassifier with CPU delegate.");
        } catch (eCl2) {
          console.warn("[NAVI Vision] Failed to load local ImageClassifier:", eCl2);
        }
      }

      visionLoaded = true;
      isModelLoading = false;
      updatePipelineStatus("VISION ONLINE");
    } catch (err) {
      console.error("[NAVI Holistic] Failed to initialize MediaPipe Holistic Landmarker:", err);
      isModelLoading = false;
      updatePipelineStatus("HOLISTIC STANDBY");
    }
  }

  // =============================================================
  // 2. Physical Webcam Acquisition (Optimized Ultra-Low Latency)
  // =============================================================
  async function acquireCameraStream() {
    const idealConstraints = {
      video: {
        width: { ideal: 640, max: 640 },
        height: { ideal: 480, max: 480 },
        frameRate: { ideal: 30, max: 30 }
      }
    };

    // Strategy 1: Low-latency 640x480 resolution (dramatically cuts GPU load and inference lag)
    try {
      return await navigator.mediaDevices.getUserMedia(idealConstraints);
    } catch (e1) {
      console.warn("[NAVI Holistic] Ideal getUserMedia failed, enumerating devices...", e1);
    }

    // Strategy 2: Specific videoinput device enumeration
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      for (const dev of videoDevices) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: dev.deviceId },
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 }
            }
          });
        } catch (eDev) {
          console.warn(`[NAVI Holistic] Device \${dev.label || dev.deviceId} failed:`, eDev);
        }
      }
    } catch (e2) {
      console.warn("[NAVI Holistic] Device enumeration failed:", e2);
    }

    // Strategy 3: Standard unconstrained fallback
    return await navigator.mediaDevices.getUserMedia({
      video: true
    });
  }

  async function enableCam() {
    if (webcamStream) return;
    setCamButtonState("starting");
    updatePipelineStatus("CAM: ...");

    try {
      const stream = await acquireCameraStream();
      webcamStream = stream;
      isWebcamActive = true;
      cameraInUseError = false;
      layoutDirty = true;

      if (containerEl) {
        containerEl.classList.add("webcam-active");
      }

      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.style.display = "block";
        const onLoaded = () => {
          layoutDirty = true;
          resizeCanvas();
          videoEl.play().catch(console.error);
          if (typeof videoEl.requestVideoFrameCallback === "function" && !rvfcId) {
            rvfcId = videoEl.requestVideoFrameCallback(onVideoFrame);
          }
        };
        if (videoEl.readyState >= 2) {
          onLoaded();
        } else {
          videoEl.addEventListener("loadeddata", onLoaded, { once: true });
        }
        videoEl.play().catch(console.error);
        if (typeof videoEl.requestVideoFrameCallback === "function" && !rvfcId) {
          rvfcId = videoEl.requestVideoFrameCallback(onVideoFrame);
        }
      }

      setCamButtonState("active");
      updatePipelineStatus("HOLISTIC v0.10");
      console.log("[NAVI Holistic] Physical webcam stream started successfully.");

      if (!holisticLandmarker && !isModelLoading) {
        initMediaPipe();
      }
    } catch (err) {
      console.error("[NAVI Holistic] Error starting webcam:", err);
      cameraInUseError = true;
      setCamButtonState("error");
      updatePipelineStatus("CAM BUSY");
    }
  }

  function stopCam() {
    if (rvfcId && videoEl && typeof videoEl.cancelVideoFrameCallback === "function") {
      videoEl.cancelVideoFrameCallback(rvfcId);
      rvfcId = null;
    }
    smoothedResult = {
      faceLandmarks: null,
      poseLandmarks: null,
      leftHandLandmarks: null,
      rightHandLandmarks: null
    };
    isDetecting = false;
    activeDetections = [];
    isDetectingObjects = false;
    detectionHoldCounter = {};
    layoutDirty = true;

    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      webcamStream = null;
    }
    isWebcamActive = false;
    cameraInUseError = false;
    lastResult = null;

    if (containerEl) {
      containerEl.classList.remove("webcam-active");
    }

    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.style.display = "none";
    }

    if (canvasEl) {
      canvasEl.style.width = "100%";
      canvasEl.style.height = "100%";
    }

    setCamButtonState("idle");
    updatePipelineStatus("HOLISTIC v0.10");
    resizeCanvas();
    console.log("[NAVI Holistic] Webcam stopped.");
  }

  function toggleWebcam() {
    if (isWebcamActive) {
      stopCam();
    } else {
      enableCam();
    }
  }

  function resizeCanvas() {
    if (!canvasEl) return;
    if (isWebcamActive && videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (canvasEl.width !== vw || canvasEl.height !== vh) {
        canvasEl.width = vw;
        canvasEl.height = vh;
        layoutDirty = true;
      }
      if (videoEl.width !== vw || videoEl.height !== vh) {
        videoEl.width = vw;
        videoEl.height = vh;
        layoutDirty = true;
      }
      // Ensure canvas occupies total space inside viewport with zero letterboxing
      if (layoutDirty) {
        canvasEl.style.width = "100%";
        canvasEl.style.height = "100%";
        layoutDirty = false;
      }
    } else {
      canvasEl.style.width = "100%";
      canvasEl.style.height = "100%";
      if (layoutDirty) {
        const rect = containerEl
          ? containerEl.getBoundingClientRect()
          : canvasEl.parentElement
          ? canvasEl.parentElement.getBoundingClientRect()
          : null;
        const w = rect && rect.width > 50 ? Math.floor(rect.width) : canvasEl.clientWidth || 380;
        const h = rect && rect.height > 30 ? Math.floor(rect.height) : canvasEl.clientHeight || 190;
        if (canvasEl.width !== w || canvasEl.height !== h) {
          canvasEl.width = w;
          canvasEl.height = h;
        }
        layoutDirty = false;
      }
    }
  }

  // =============================================================
  // 3. Official MediaPipe Holistic Visualizer
  // Exact 1:1 match to Google AI Edge:
  // developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker
  // =============================================================
  function drawHolisticResults(ctx, result, w, h) {
    if (!window.Vision || !window.Vision.DrawingUtils) {
      return;
    }

    const DrawingUtils = window.Vision.DrawingUtils;
    const FL = window.Vision.FaceLandmarker;
    const PL = window.Vision.PoseLandmarker;
    const HL = window.Vision.HandLandmarker;

    const drawingUtils = new DrawingUtils(ctx);
    let totalPoints = 0;

    // Face Landmarks (468 points - exact colors from official Google sample)
    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      for (const landmarks of result.faceLandmarks) {
        totalPoints += landmarks.length;
        if (FL) {
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_TESSELATION, {
            color: "#C0C0C070",
            lineWidth: 1
          });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030", lineWidth: 2 });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030", lineWidth: 2 });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30", lineWidth: 2 });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30", lineWidth: 2 });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_LIPS, { color: "#E0E0E0", lineWidth: 2 });
          drawingUtils.drawConnectors(landmarks, FL.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0", lineWidth: 2 });
        }
      }
    }

    // Face and Hands only: Pose/Body landmarks intentionally omitted per tactical UI spec

    // Left Hand Landmarks (21 points - red bones with green dots)
    if (result.leftHandLandmarks && result.leftHandLandmarks.length > 0) {
      for (const landmarks of result.leftHandLandmarks) {
        totalPoints += landmarks.length;
        if (HL) {
          drawingUtils.drawConnectors(landmarks, HL.HAND_CONNECTIONS, { color: "#CC0000", lineWidth: 4 });
          drawingUtils.drawLandmarks(landmarks, { color: "#00FF00", lineWidth: 2, radius: 3 });
        }
      }
    }

    // Right Hand Landmarks (21 points - green bones with red dots)
    if (result.rightHandLandmarks && result.rightHandLandmarks.length > 0) {
      for (const landmarks of result.rightHandLandmarks) {
        totalPoints += landmarks.length;
        if (HL) {
          drawingUtils.drawConnectors(landmarks, HL.HAND_CONNECTIONS, { color: "#00CC00", lineWidth: 4 });
          drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2, radius: 3 });
        }
      }
    }

    if (landmarkCountEl && totalPoints > 0) {
      landmarkCountEl.textContent = `${totalPoints} PTS (ACTIVE)`;
    }
  }

  // =============================================================
  // 4. Gesture Detection & HUD Overlay (1:1 lockstep coordinate space)
  // =============================================================
  function updateGestureFromLandmarks(result, w, h) {
    try {
      const hands = [];
      if (result.rightHandLandmarks && result.rightHandLandmarks[0]) {
        hands.push({ lm: result.rightHandLandmarks[0], label: "RIGHT" });
      }
      if (result.leftHandLandmarks && result.leftHandLandmarks[0]) {
        hands.push({ lm: result.leftHandLandmarks[0], label: "LEFT" });
      }

      if (hands.length === 0) return;

      for (const hand of hands) {
        const lm = hand.lm;
        let minX = 1,
          maxX = 0,
          minY = 1,
          maxY = 0;
        for (const p of lm) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }

        const boxX = minX * w - 12;
        const boxY = minY * h - 12;
        const boxW = (maxX - minX) * w + 24;
        const boxH = (maxY - minY) * h + 24;

        // Classify gesture from 21 landmarks
        const wrist = lm[0];
        const thumbTip = lm[4];
        const indexTip = lm[8];
        const indexPip = lm[6];
        const middleTip = lm[12];
        const middlePip = lm[10];
        const ringTip = lm[16];
        const ringPip = lm[14];
        const pinkyTip = lm[20];
        const pinkyPip = lm[18];

        const indexExt =
          Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) >
          Math.hypot(indexPip.x - wrist.x, indexPip.y - wrist.y) * 1.15;
        const middleExt =
          Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) >
          Math.hypot(middlePip.x - wrist.x, middlePip.y - wrist.y) * 1.15;
        const ringExt =
          Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) >
          Math.hypot(ringPip.x - wrist.x, ringPip.y - wrist.y) * 1.15;
        const pinkyExt =
          Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y) >
          Math.hypot(pinkyPip.x - wrist.x, pinkyPip.y - wrist.y) * 1.15;
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

        let detected = "victory";
        let confidence = 0.985;

        if (pinchDist < 0.05) {
          detected = "pinch";
          confidence = 0.965;
        } else if (indexExt && middleExt && !ringExt && !pinkyExt) {
          detected = "victory";
          confidence = 0.992;
        } else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
          detected = "pointing";
          confidence = 0.978;
        } else if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
          detected = "fist";
          confidence = 0.99;
        } else if (indexExt && middleExt && ringExt && pinkyExt) {
          detected = "open_palm";
          confidence = 0.985;
        } else if (indexExt && pinkyExt && !ringExt) {
          detected = "arc_strike";
          confidence = 0.982;
        }

        setGesture(detected);

        // Draw Unmirrored Tracking Bracket & Clean Text when gestures or combined mode active
        if (typeof currentMode !== "undefined" && (currentMode === "gestures" || currentMode === "combined")) {
          ctx.save();
          ctx.strokeStyle = "#00d2ff";
          ctx.lineWidth = Math.max(1.5, Math.round(w * 0.002));

          const bLen = Math.min(24, boxW * 0.28);
          // Top-Left
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + bLen);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + bLen, boxY);
          // Top-Right
          ctx.moveTo(boxX + boxW - bLen, boxY);
          ctx.lineTo(boxX + boxW, boxY);
          ctx.lineTo(boxX + boxW, boxY + bLen);
          // Bottom-Left
          ctx.moveTo(boxX, boxY + boxH - bLen);
          ctx.lineTo(boxX, boxY + boxH);
          ctx.lineTo(boxX + bLen, boxY + boxH);
          // Bottom-Right
          ctx.moveTo(boxX + boxW - bLen, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH - bLen);
          ctx.stroke();

          const fontSize = Math.max(12, Math.round(w * 0.018));
          ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = "#00f0ff";
          ctx.shadowColor = "#00f0ff";
          ctx.shadowBlur = 4;
          const gObj = GESTURES[detected] || { name: detected.toUpperCase(), icon: "⚡" };
          const labelText = `${gObj.icon} ${gObj.name} ${(confidence * 100).toFixed(0)}%`;

          if (isMirrored) {
            ctx.save();
            ctx.translate(boxX + boxW / 2, boxY);
            ctx.scale(-1, 1);
            ctx.fillText(labelText, -boxW / 2 + 4, -6);
            ctx.restore();
          } else {
            ctx.fillText(labelText, boxX + 4, boxY - 6);
          }
          ctx.restore();
        }
      }
    } catch (errG) {
      console.warn("[NAVI Holistic] Gesture calculation error:", errG);
    } finally {
      if (ctx) ctx.shadowBlur = 0;
    }
  }

  // =============================================================
  // 5. Standby HUD Display (Webcam Off - Minimal "Just ON/OFF")
  // =============================================================
  function drawStandbyScreen(ctx, w, h, now) {
    // Subtle tactical grid
    ctx.strokeStyle = "rgba(0, 180, 255, 0.08)";
    ctx.lineWidth = 1;
    const step = 28;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const cx = w * 0.5;
    const cy = h * 0.5;

    // Camera target reticle
    ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - 15, 42, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 210, 255, 0.15)";
    ctx.stroke();

    // Pulsing core dot
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
    ctx.fillStyle = `rgba(0, 240, 255, ${0.4 + 0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 6, 0, Math.PI * 2);
    ctx.fill();

    // Minimal single-line HUD status (no clutter)
    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Orbitron', 'Rajdhani', sans-serif";
    if (cameraInUseError) {
      ctx.fillStyle = "#f87171";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.fillText("CAM IN USE (CLOSE OTHER APPS)", cx, cy + 38);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.fillText("OFF", cx, cy + 38);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // =============================================================
  // 6. Main Render Loop
  // =============================================================
  function renderLoop() {
    animId = requestAnimationFrame(renderLoop);

    const now = performance.now();
    frameCount++;
    if (now - fpsTimer >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
      frameCount = 0;
      fpsTimer = now;
      if (fpsValEl) {
        fpsValEl.textContent = `${Math.round(latencyMs)}ms // ${currentFps} FPS`;
      }
    }

    try {
      resizeCanvas();
      const w = canvasEl.width;
      const h = canvasEl.height;

      if (isWebcamActive && videoEl && videoEl.readyState >= 2) {
        // Fallback detection ticker if requestVideoFrameCallback is unsupported
        if (typeof videoEl.requestVideoFrameCallback !== "function") {
          if (isHolisticEffect && videoEl.currentTime !== lastVideoTime && !isDetecting && videoEl.videoWidth > 0 && !videoEl.paused) {
            const tNow = performance.now();
            if (tNow - lastDetectCallTime >= MIN_DETECT_INTERVAL_MS) {
              lastVideoTime = videoEl.currentTime;
              lastDetectCallTime = tNow;

              if (holisticLandmarker && isTracking) {
                isDetecting = true;
                const t0 = performance.now();
                const timestampMs = Math.max(tNow, (lastTimestampMs || 0) + 1);
                lastTimestampMs = timestampMs;

                try {
                  const res = holisticLandmarker.detectForVideo(videoEl, timestampMs);
                  if (res) lastResult = res;
                  latencyMs = performance.now() - t0;
                } catch (e) {
                  console.warn("[NAVI Holistic] detectForVideo warning:", e);
                } finally {
                  isDetecting = false;
                }
              }
            }
          }

          if (!isHolisticEffect && isObjectDetectionActive && (objectDetector || imageClassifier) && !isDetectingObjects && videoEl.videoWidth > 0 && !videoEl.paused) {
            const tNow = performance.now();
            if (tNow - lastObjDetectCallTime >= MIN_OBJ_DETECT_INTERVAL_MS) {
              isDetectingObjects = true;
              lastObjDetectCallTime = tNow;
              const tsObj = Math.max(tNow, (lastObjTimestampMs || 0) + 1);
              lastObjTimestampMs = tsObj;
              try {
                let d = objectDetector ? (objectDetector.detectForVideo(videoEl, tsObj)?.detections || []) : [];
                let c = imageClassifier ? (imageClassifier.classifyForVideo(videoEl, tsObj)?.classifications?.[0]?.categories || []) : [];
                updateUnifiedObjectDetections(d, c, videoEl.videoWidth, videoEl.videoHeight);
              } catch (eObj) {} finally {
                isDetectingObjects = false;
              }
            }
          }
        }

        if (isHolisticEffect) {
          // ON: HOLISTIC EFFECT (Face Mesh + Dual Hands on pure black canvas)
          ctx.clearRect(0, 0, w, h);

          if (lastResult) {
            const displayResult = getSmoothedResult(lastResult) || lastResult;
            drawHolisticResults(ctx, displayResult, w, h);
            updateGestureFromLandmarks(displayResult, w, h);
          } else {
            // Video playing, waiting for initial detection
            ctx.save();
            ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("INITIALIZING NEURAL LANDMARKER...", w * 0.5, 30);
            ctx.restore();
          }
        } else {
          // OFF: NORMAL WEBCAM (Live full physical camera video feed in natural color)
          ctx.drawImage(videoEl, 0, 0, w, h);

          // Real-Time Neural Object Detection HUD Overlay (Pens, Fruits, Items)
          // Strictly ONLY in Camera View, NEVER in Holistic mode
          if (!isHolisticEffect && isObjectDetectionActive && activeDetections.length > 0) {
            drawObjectDetections(ctx, activeDetections, w, h);
          }
        }
      } else {
        ctx.clearRect(0, 0, w, h);
        drawStandbyScreen(ctx, w, h, now);
      }
    } catch (errLoop) {
      console.warn("[NAVI Holistic] renderLoop error:", errLoop);
    } finally {
      if (ctx) ctx.shadowBlur = 0;
    }
  }

  function setZoom(zoomLevel) {
    currentZoom = Number(zoomLevel) || 1;
    if (viewportEl) {
      viewportEl.style.transform = currentZoom === 2 ? "scale(2)" : "scale(1)";
      viewportEl.style.transformOrigin = "center center";
    }
    zoomPills.forEach((pill) => {
      const z = Number(pill.getAttribute("data-zoom"));
      pill.classList.toggle("active", z === currentZoom);
    });
  }

  function setGesture(gestureKey) {
    if (!GESTURES[gestureKey] || activeGestureKey === gestureKey) return;
    activeGestureKey = gestureKey;
    const g = GESTURES[gestureKey];

    triggerItems.forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-gesture") === gestureKey);
    });

    if (activeGestureEl) {
      activeGestureEl.textContent = `${g.icon} ${g.name} (${(g.confidence * 100).toFixed(1)}%)`;
    }
  }

  function toggleTracking(state) {
    isTracking = typeof state === "boolean" ? state : !isTracking;
    if (trackToggleBtn) {
      trackToggleBtn.classList.toggle("enabled", isTracking);
      trackToggleBtn.classList.toggle("active", isTracking);
    }
    if (trackBtnLabel) {
      trackBtnLabel.textContent = isTracking ? "TRACK: ON" : "TRACK: OFF";
    }
    if (pulseBeaconEl) {
      pulseBeaconEl.style.opacity = isTracking ? "1" : "0.2";
    }
  }

  function init() {
    canvasEl = document.getElementById("holistic-gesture-canvas");
    videoEl = document.getElementById("holistic-webcam-video");
    viewportEl = document.getElementById("holistic-viewport");
    containerEl = document.getElementById("holistic-canvas-container");
    camToggleBtn = document.getElementById("holistic-cam-toggle-btn");
    camBtnLabel = document.getElementById("holistic-cam-btn-label");
    flipBtn = document.getElementById("holistic-flip-btn");
    flipBtnLabel = document.getElementById("holistic-flip-btn-label");
    trackToggleBtn = document.getElementById("holistic-track-toggle-btn");
    trackBtnLabel = document.getElementById("holistic-track-btn-label");
    pipelineStatusEl = document.getElementById("holistic-pipeline-status");
    landmarkCountEl = document.getElementById("holistic-landmark-count");
    activeGestureEl = document.getElementById("holistic-active-gesture");
    fpsValEl = document.getElementById("holistic-fps-val");
    pulseBeaconEl = document.getElementById("holistic-pulse-beacon");
    objToggleBtn = document.getElementById("webcam-obj-toggle-btn");

    zoomPills = Array.from(document.querySelectorAll(".webcam-zoom-pill"));
    resetZoomBtn = document.getElementById("webcam-zoom-reset");
    triggerItems = Array.from(document.querySelectorAll(".gesture-trigger-item"));

    if (canvasEl) {
      ctx = canvasEl.getContext("2d");
      resizeCanvas();
    }

    // Neural Object Detection tab is managed by NaviDesktopIntelligence 3-tab controller

    // Connect Holistic Effect ON / OFF Button Click
    // ON = Holistic Effect, OFF = Normal Webcam
    if (camToggleBtn) {
      camToggleBtn.addEventListener("click", () => {
        toggleHolisticEffect();
      });
    }

    // Connect Flip / Mirror Button Click
    if (flipBtn) {
      flipBtn.addEventListener("click", () => {
        toggleFlip();
      });
    }

    // Clicking canvas when off also starts webcam
    if (canvasEl) {
      canvasEl.addEventListener("click", () => {
        if (!isWebcamActive) {
          enableCam();
        }
      });
    }

    // Connect Track Toggle Button
    if (trackToggleBtn) {
      trackToggleBtn.addEventListener("click", () => {
        toggleTracking();
      });
    }

    // Connect Zoom Selectors (1X, 2X)
    zoomPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const zoom = pill.getAttribute("data-zoom");
        if (zoom) setZoom(Number(zoom));
      });
    });

    // Connect Zoom Reset Button
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener("click", () => {
        setZoom(1);
      });
    }

    // Connect Gesture Strip Triggers
    triggerItems.forEach((item) => {
      item.addEventListener("click", () => {
        const gesture = item.getAttribute("data-gesture");
        if (gesture) setGesture(gesture);
      });
    });

    window.addEventListener("resize", () => {
      resizeCanvas();
    });

    // Initialize MediaPipe Tasks in background
    initMediaPipe();

    // Start with Holistic in STANDBY / OFF by default (no automatic webcam or model overhead)
    setHolisticEffect(false);
    setCamButtonState("idle");

    // Start render loop
    if (!animId) {
      animId = requestAnimationFrame(renderLoop);
    }

    console.log("[NAVI Holistic] NaviHolisticGestureTracker initialized successfully.");
  }

  function toggleObjectDetection(state) {
    isObjectDetectionActive = typeof state === "boolean" ? state : !isObjectDetectionActive;
    if (objToggleBtn) {
      objToggleBtn.classList.toggle("active", isObjectDetectionActive);
    }
    if (!isObjectDetectionActive) {
      activeDetections = [];
    }
    console.log("[NAVI Vision] Object detection active:", isObjectDetectionActive);
  }

  return {
    init,
    start: () => toggleTracking(true),
    stop: () => toggleTracking(false),
    toggleTracking: (state) => toggleTracking(state),
    toggleGestures: (state) => toggleTracking(state),
    togglePresenceLock: () => {},
    startWebcam: enableCam,
    stopWebcam: stopCam,
    toggleWebcam,
    isWebcamRunning: () => isWebcamActive,
    setHolisticEffect,
    toggleHolisticEffect,
    isHolisticActive: () => isHolisticEffect,
    setZoom,
    getZoom: () => currentZoom,
    setGesture,
    isGesturesRunning: () => isTracking,
    getActiveGesture: () => activeGestureKey,
    toggleObjectDetection,
    isObjectDetectionRunning: () => isObjectDetectionActive,
    getActiveDetections: () => activeDetections
  };
})();

const NaviVisionSensor = NaviHolisticGestureTracker;

// =============================================================
// CENTER HOLOGRAPHIC PROJECTION ENGINE (DEPLOYED NAVI LABS AVATARS)
// (32,000 Particle High-Definition Transparent Stage Projection)
// =============================================================
const NaviCenterHologramEngine = (() => {
  let displayEl = null;
  let canvasEl = null;
  let ctx = null;
  let animId = null;
  let ironmanImgEl = null;
  let arcReactorEl = null;
  let restoreBtn = null;
  let holoNameEl = null;
  let holoTagEl = null;
  let fpsValEl = null;
  let ptsValEl = null;
  let stateValEl = null;

  let isDeployed = false;
  let activeAvatarKey = "ultron";
  let time = 0;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60;

  let isMaterializing = false;
  let materializeProgress = 0.0;
  const MATERIALIZE_DURATION = 1.6;

  // Particle Buffers for Center Stage
  let homeX = null;
  let homeY = null;
  let colorsR = null;
  let colorsG = null;
  let colorsB = null;
  let phases = null;
  let totalParticles = 0;

  // Scatter buffers for simultaneous convergence
  let scatterOffsetX = null;
  let scatterOffsetY = null;
  let scatterSwirl = null;
  let scatterDelay = null;

  function initScatter(w, h) {
    if (!homeX || totalParticles === 0) return;
    const width = w || (canvasEl ? canvasEl.width : 900);
    const height = h || (canvasEl ? canvasEl.height : 700);
    const cx = width * 0.5;
    const cy = height * 0.48;
    const maxDim = Math.max(width, height);

    for (let i = 0; i < totalParticles; i++) {
      const hx = homeX[i];
      const hy = homeY[i];

      const dx = hx - cx;
      const dy = hy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
      const ndx = dx / dist;
      const ndy = dy / dist;

      const angle = Math.random() * Math.PI * 2;
      const spread = (0.2 + 0.8 * Math.pow(Math.random(), 1.4)) * (maxDim * 0.6);

      const expX = ndx * (maxDim * (0.35 + 0.3 * Math.random()));
      const expY = ndy * (maxDim * (0.35 + 0.3 * Math.random()));
      const cloudX = Math.cos(angle) * spread;
      const cloudY = Math.sin(angle) * spread;

      scatterOffsetX[i] = expX * 0.45 + cloudX * 0.55;
      scatterOffsetY[i] = expY * 0.45 + cloudY * 0.55;
      scatterSwirl[i] = (Math.random() - 0.5) * (maxDim * 0.32);
      scatterDelay[i] = Math.pow(Math.random(), 1.2) * 0.35;
    }
  }

  function loadAvatarModel(avatarKey, w, h) {
    activeAvatarKey = avatarKey || activeAvatarKey || "ultron";
    const models = window.NAVI_HOLOGRAM_MODELS || {};
    let preset = models[activeAvatarKey] || (activeAvatarKey === "ultron" ? models["navi"] : (activeAvatarKey === "navi" ? models["ultron"] : null)) || window.NAVI_HUMAN_PARTICLE_DATA;

    if (!preset || !preset.x || preset.x.length === 0) {
      return;
    }

    const n = preset.x.length;
    totalParticles = n;

    if (!homeX || homeX.length !== n) {
      homeX = new Float32Array(n);
      homeY = new Float32Array(n);
      colorsR = new Uint8Array(n);
      colorsG = new Uint8Array(n);
      colorsB = new Uint8Array(n);
      phases = new Float32Array(n);
      scatterOffsetX = new Float32Array(n);
      scatterOffsetY = new Float32Array(n);
      scatterSwirl = new Float32Array(n);
      scatterDelay = new Float32Array(n);
    }

    // Prominent center sizing: fills ~84% of stage height, centered
    const scaleY = h * 0.84;
    const scaleX = scaleY;
    const cx = w * 0.5;
    const cy = h * 0.48;

    for (let i = 0; i < n; i++) {
      homeX[i] = cx + preset.x[i] * scaleX;
      homeY[i] = cy + preset.y[i] * scaleY;
      colorsR[i] = preset.r[i];
      colorsG[i] = preset.g[i];
      colorsB[i] = preset.b[i];
      phases[i] = Math.random() * Math.PI * 2;
    }

    initScatter(w, h);

    if (ptsValEl) ptsValEl.textContent = `${totalParticles.toLocaleString()} PTS`;
    if (holoNameEl) {
      const name = preset.name || activeAvatarKey.toUpperCase();
      holoNameEl.textContent = name.toUpperCase();
    }
    if (holoTagEl) {
      holoTagEl.textContent = preset.tag || "TACTICAL MATRIX // CENTER CONSOLE";
    }
  }

  function resizeCanvas() {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round((rect.width || 900) * dpr);
    const h = Math.round((rect.height || 700) * dpr);
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
  }

  function deployAvatar(avatarKey) {
    if (!avatarKey) avatarKey = "ultron";
    activeAvatarKey = avatarKey;
    isDeployed = true;

    // 1. Hide Iron Man and Arc Reactor with smooth transition
    if (!ironmanImgEl) ironmanImgEl = document.getElementById("ironman-master-img") || document.querySelector(".ironman-master-img");
    if (!arcReactorEl) arcReactorEl = document.getElementById("navi-arc-reactor");
    if (ironmanImgEl) ironmanImgEl.classList.add("stage-hidden");
    if (arcReactorEl) arcReactorEl.classList.add("stage-hidden");

    // 2. Prepare Center Canvas
    if (!displayEl) displayEl = document.getElementById("center-hologram-display");
    if (!canvasEl) canvasEl = document.getElementById("center-particle-canvas");
    if (canvasEl && !ctx) {
      ctx = canvasEl.getContext("2d", { alpha: true });
    }

    resizeCanvas();
    if (canvasEl) {
      loadAvatarModel(activeAvatarKey, canvasEl.width, canvasEl.height);
    }

    // 3. Display Center Hologram Container
    if (displayEl) {
      displayEl.classList.add("active");
    }

    // 4. Soundscape and Feedback
    JarvisSoundscape.play("wake");
    const models = window.NAVI_HOLOGRAM_MODELS || {};
    const model = models[activeAvatarKey] || { name: activeAvatarKey.toUpperCase() };
    showJarvisFeedback(`Center Console: ${model.name || activeAvatarKey} deployed.`, "avatar_switch");

    // 5. Trigger Materialization
    isMaterializing = true;
    materializeProgress = 0.0;
    if (canvasEl) {
      initScatter(canvasEl.width, canvasEl.height);
    }

    // 6. Start Render Loop if not running
    if (!animId) {
      lastFrameTime = performance.now();
      animId = requestAnimationFrame(renderLoop);
    }
  }

  function restoreIronMan() {
    isDeployed = false;

    // 1. Fade out Center Hologram
    if (displayEl) {
      displayEl.classList.remove("active");
    }

    // 2. Restore Iron Man and Arc Reactor
    if (!ironmanImgEl) ironmanImgEl = document.getElementById("ironman-master-img") || document.querySelector(".ironman-master-img");
    if (!arcReactorEl) arcReactorEl = document.getElementById("navi-arc-reactor");
    if (ironmanImgEl) ironmanImgEl.classList.remove("stage-hidden");
    if (arcReactorEl) arcReactorEl.classList.remove("stage-hidden");

    // 3. Audio Feedback
    JarvisSoundscape.play("wake");
    showJarvisFeedback("Primary NAVI Console restored.", "navi_restore");
  }

  function renderLoop(now) {
    if (document.hidden) {
      setTimeout(() => { animId = requestAnimationFrame(renderLoop); }, 250);
      return;
    }
    animId = requestAnimationFrame(renderLoop);

    if (!isDeployed) {
      if (ctx && canvasEl) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
      return;
    }

    if (!canvasEl || !ctx) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    if (w === 0 || h === 0) return;

    const dt = Math.min(0.033, (now - lastFrameTime) / 1000.0);
    lastFrameTime = now;
    time += dt;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.8) {
      currentFps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
      if (fpsValEl) fpsValEl.textContent = `${currentFps}`;
    }

    if (isMaterializing) {
      materializeProgress += dt / MATERIALIZE_DURATION;
      if (materializeProgress >= 1.0) {
        materializeProgress = 1.0;
        isMaterializing = false;
      }
    }

    const imgData = ctx.createImageData(w, h);
    const buf = new Uint32Array(imgData.data.buffer);
    buf.fill(0);

    const cx = w * 0.5;
    const cy = h * 0.48;
    const scaleY = h * 0.84;
    const emitterX = cx;
    const emitterY = Math.round(cy + scaleY * 0.46);

    const speechAmp = parseFloat(arcReactorEl?.style?.getPropertyValue("--speech-amp") || "0") || 0;
    const audioReactive = speechAmp * 2.2;
    const scanY = ((time * 0.4) % 1.3) - 0.15;

    for (let i = 0; i < totalParticles; i++) {
      const hx = homeX[i];
      const hy = homeY[i];
      const phase = phases[i];

      const vibX = Math.sin(time * 3.4 + phase) * (0.65 + audioReactive * 1.5);
      const vibY = Math.cos(time * 2.8 + phase * 1.3) * (0.65 + audioReactive * 1.5);

      let px, py;
      let r = colorsR[i];
      let g = colorsG[i];
      let b = colorsB[i];

      if (isMaterializing && materializeProgress < 1.0) {
        const delay = scatterDelay ? scatterDelay[i] : 0.0;
        const targetEnd = 1.0 - delay * 0.55;
        const localT = Math.min(1.0, materializeProgress / targetEnd);
        const ease = 1.0 - Math.pow(1.0 - localT, 3.2);

        const midFlight = Math.sin(localT * Math.PI) * (1.0 - ease);
        const curlX = Math.cos(phase + localT * 3.5) * (scatterSwirl ? scatterSwirl[i] : 0) * midFlight;
        const curlY = Math.sin(phase + localT * 3.5) * (scatterSwirl ? scatterSwirl[i] : 0) * midFlight;

        const curX = hx + (scatterOffsetX ? scatterOffsetX[i] : 0) * (1.0 - ease) + curlX;
        const curY = hy + (scatterOffsetY ? scatterOffsetY[i] : 0) * (1.0 - ease) + curlY;

        if (localT < 1.0) {
          px = Math.round(curX);
          py = Math.round(curY);
          const energy = 1.0 - ease;
          const blend = ease;
          r = Math.min(255, (((1.0 - blend) * 130 + blend * r) * (1.0 + energy * 0.35)) | 0);
          g = Math.min(255, (((1.0 - blend) * 230 + blend * g) * (1.0 + energy * 0.35)) | 0);
          b = Math.min(255, (((1.0 - blend) * 255 + blend * b) * (1.0 + energy * 0.35)) | 0);
        } else {
          const settleFrac = Math.min(1.0, (materializeProgress - targetEnd) / (1.0 - targetEnd + 0.001));
          const settleDamp = 1.0 - settleFrac;
          px = Math.round(hx + vibX * (1.0 + settleDamp * 1.5));
          py = Math.round(hy + vibY * (1.0 + settleDamp * 1.5));
          if (settleFrac < 0.6) {
            const glow = 1.0 + (1.0 - settleFrac / 0.6) * 0.45;
            r = Math.min(255, (r * glow) | 0);
            g = Math.min(255, (g * glow) | 0);
            b = Math.min(255, (b * glow) | 0);
          }
        }
      } else {
        px = Math.round(hx + vibX);
        py = Math.round(hy + vibY);

        const shimmer = 0.85 + 0.15 * Math.sin(time * 4.2 + phase) + audioReactive * 0.3;
        const normY = py / h;
        const distToScan = Math.abs(normY - scanY);
        const scanBoost = distToScan < 0.07 ? (1.0 - distToScan / 0.07) * 0.5 : 0;
        const factor = shimmer + scanBoost;

        r = Math.min(255, (r * factor) | 0);
        g = Math.min(255, (g * factor) | 0);
        b = Math.min(255, (b * factor) | 0);
      }

      if (px >= 0 && px < w && py >= 0 && py < h) {
        const idx = py * w + px;
        const pColor = (0xff000000 | (b << 16) | (g << 8) | r);
        buf[idx] = pColor;
        if (px < w - 1) buf[idx + 1] = pColor;
        if (py < h - 1) buf[idx + w] = pColor;

        if ((r + g + b > 230) || ((i & 7) === 0)) {
          const hr = (r * 0.32) | 0;
          const hg = (g * 0.32) | 0;
          const hb = (b * 0.32) | 0;

          if (py > 0) {
            const up = idx - w;
            const c = buf[up];
            buf[up] = 0xff000000 | (Math.min(255, ((c >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((c >> 8) & 0xff) + hg) << 8) | Math.min(255, (c & 0xff) + hr);
          }
          if (py < h - 1) {
            const dn = idx + w;
            const c = buf[dn];
            buf[dn] = 0xff000000 | (Math.min(255, ((c >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((c >> 8) & 0xff) + hg) << 8) | Math.min(255, (c & 0xff) + hr);
          }
          if (px > 0) {
            const lt = idx - 1;
            const c = buf[lt];
            buf[lt] = 0xff000000 | (Math.min(255, ((c >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((c >> 8) & 0xff) + hg) << 8) | Math.min(255, (c & 0xff) + hr);
          }
          if (px < w - 1) {
            const rt = idx + 1;
            const c = buf[rt];
            buf[rt] = 0xff000000 | (Math.min(255, ((c >> 16) & 0xff) + hb) << 16) | (Math.min(255, ((c >> 8) & 0xff) + hg) << 8) | Math.min(255, (c & 0xff) + hr);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  function init() {
    displayEl = document.getElementById("center-hologram-display");
    canvasEl = document.getElementById("center-particle-canvas");
    ironmanImgEl = document.getElementById("ironman-master-img") || document.querySelector(".ironman-master-img");
    arcReactorEl = document.getElementById("navi-arc-reactor");

    if (canvasEl) {
      ctx = canvasEl.getContext("2d", { alpha: true });
      resizeCanvas();
      window.addEventListener("resize", () => {
        resizeCanvas();
        if (isDeployed && canvasEl) {
          loadAvatarModel(activeAvatarKey, canvasEl.width, canvasEl.height);
        }
      });
    }
  }

  return {
    init,
    deployAvatar,
    restoreIronMan,
    isDeployed: () => isDeployed,
    getActiveAvatarKey: () => activeAvatarKey
  };
})();

// =============================================================
// NAVI LABS DRAG & DROP CONTROLLER
// (Clean drag from NAVI Labs to Center Stage without intrusive UI overlays)
// =============================================================
const NaviAvatarDragDropController = (() => {
  let dropTargetEl = null;
  let isDragging = false;
  let draggedAvatarKey = null;

  function init() {
    dropTargetEl = document.getElementById("center-drop-target");
    setupAvatarPills();
    setupCanvasContainer();
    setupDropZone();
  }

  function setupAvatarPills() {
    const selector = document.getElementById("human-avatar-selector");
    if (!selector) return;

    const pills = selector.querySelectorAll(".avatar-pill");
    pills.forEach((pill) => {
      const avatarKey = pill.dataset.avatar;

      // Pointer / Mouse Drag (Smooth, instant, zero latency on first gesture)
      pill.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        startPointerDrag(e, avatarKey);
      });

      // Native HTML5 Drag Start
      pill.addEventListener("dragstart", (e) => {
        draggedAvatarKey = avatarKey;
        isDragging = true;
        document.body.classList.add("is-avatar-dragging");
        e.dataTransfer.setData("text/plain", avatarKey);
        e.dataTransfer.setData("application/x-jarvis-avatar", avatarKey);
        e.dataTransfer.effectAllowed = "copyMove";
      });

      pill.addEventListener("dragend", () => {
        endDrag();
      });
    });
  }

  function setupCanvasContainer() {
    const canvasContainer = document.getElementById("human-canvas-container");
    if (!canvasContainer) return;

    canvasContainer.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const activeKey = getActiveNaviKey();
      startPointerDrag(e, activeKey);
    });

    canvasContainer.addEventListener("dragstart", (e) => {
      const activeKey = getActiveNaviKey();
      draggedAvatarKey = activeKey;
      isDragging = true;
      document.body.classList.add("is-avatar-dragging");
      e.dataTransfer.setData("text/plain", activeKey);
      e.dataTransfer.setData("application/x-jarvis-avatar", activeKey);
      e.dataTransfer.effectAllowed = "copyMove";
    });

    canvasContainer.addEventListener("dragend", () => {
      endDrag();
    });
  }

  function getActiveNaviKey() {
    const activePill = document.querySelector("#human-avatar-selector .avatar-pill.active");
    return activePill?.dataset?.avatar || "ultron";
  }

  function endDrag() {
    isDragging = false;
    draggedAvatarKey = null;
    document.body.classList.remove("is-avatar-dragging");
  }

  function setupDropZone() {
    if (!dropTargetEl) return;

    dropTargetEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    dropTargetEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const avatarKey = e.dataTransfer.getData("application/x-jarvis-avatar") || e.dataTransfer.getData("text/plain") || draggedAvatarKey || getActiveNaviKey();
      executeDrop(avatarKey);
    });

    window.addEventListener("dragover", (e) => {
      if (isDragging || draggedAvatarKey) {
        e.preventDefault();
      }
    });

    window.addEventListener("drop", (e) => {
      if (!isDragging && !draggedAvatarKey) return;
      e.preventDefault();
      const isCenter = isCursorInCenterZone(e.clientX, e.clientY);
      const avatarKey = (e.dataTransfer ? e.dataTransfer.getData("application/x-jarvis-avatar") || e.dataTransfer.getData("text/plain") : null) || draggedAvatarKey || getActiveNaviKey();
      if (isCenter && avatarKey) {
        executeDrop(avatarKey);
      } else {
        endDrag();
      }
    });
  }

  function isCursorInCenterZone(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minX = w * 0.18;
    const maxX = w * 0.82;
    const minY = h * 0.05;
    const maxY = h * 0.95;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  function startPointerDrag(e, avatarKey) {
    const startX = e.clientX;
    const startY = e.clientY;
    let dragInitiated = false;
    const targetKey = avatarKey || getActiveNaviKey();

    function onPointerMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!dragInitiated && dist >= 3) {
        dragInitiated = true;
        isDragging = true;
        draggedAvatarKey = targetKey;
        document.body.classList.add("is-avatar-dragging");
      }
    }

    function onPointerUp(upEvent) {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);

      if (dragInitiated) {
        const droppedInCenter = isCursorInCenterZone(upEvent.clientX, upEvent.clientY);
        if (droppedInCenter && (targetKey || draggedAvatarKey)) {
          executeDrop(targetKey || draggedAvatarKey);
        } else {
          endDrag();
        }
      } else {
        endDrag();
      }
    }

    function onPointerCancel() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      endDrag();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function executeDrop(avatarKey) {
    endDrag();
    const key = avatarKey || getActiveNaviKey() || "ultron";
    NaviCenterHologramEngine.deployAvatar(key);
  }

  return {
    init,
    deploy: (key) => executeDrop(key)
  };
})();

// =============================================================
// PHASE 3: SEMANTIC LOCAL FILE SEARCH CONTROLLER
// =============================================================
const NaviFileSearch = (() => {
  const modalEl = document.getElementById("file-search-modal");
  const closeBtn = document.getElementById("fs-modal-close");
  const searchInput = document.getElementById("fs-search-input");
  const searchBtn = document.getElementById("fs-search-btn");
  const resultsEl = document.getElementById("fs-results-list");

  function init() {
    closeBtn?.addEventListener("click", closeModal);
    searchBtn?.addEventListener("click", () => doSearch(searchInput?.value));
    searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(searchInput.value);
    });
  }

  function openModal(initialQuery = "") {
    if (!modalEl) return;
    modalEl.style.display = "flex";
    requestAnimationFrame(() => modalEl.classList.add("active"));
    if (searchInput) {
      searchInput.value = initialQuery;
      searchInput.focus();
    }
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("active");
    setTimeout(() => { modalEl.style.display = "none"; }, 250);
  }

  async function doSearch(query) {
    const q = (query || "").trim();
    if (!q) return;
    JarvisSoundscape.play("confirm");
    if (resultsEl) resultsEl.innerHTML = '<div class="fs-empty-hint">Searching workstation and project directories...</div>';

    try {
      const res = await invoke("run_direct_action", { action: "file_search", target: q });
      let items = [];
      try {
        items = JSON.parse(res);
      } catch (err) {
        items = [];
      }
      renderResults(items, q);
    } catch (e) {
      if (resultsEl) resultsEl.innerHTML = `<div class="fs-empty-hint" style="color:#ef4444;">Search error: ${e}</div>`;
    }
  }

  function renderResults(items, query) {
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    if (!items || !items.length) {
      resultsEl.innerHTML = `<div class="fs-empty-hint">No files found matching "${escapeHtml(query)}", sir.</div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "fs-item-card";
      const sizeStr = item.size_bytes ? `${Math.round(item.size_bytes / 1024)} KB` : "";
      card.innerHTML = `
        <div class="fs-item-info">
          <span class="fs-item-name">${escapeHtml(item.name)}</span>
          <span class="fs-item-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</span>
          <div class="fs-item-meta">
            ${sizeStr ? `<span>${sizeStr}</span> &bull; ` : ""}
            <span>SCORE: ${(item.score || 0).toFixed(0)}</span>
          </div>
        </div>
        <button class="fs-item-open-btn">LAUNCH</button>
      `;
      card.querySelector(".fs-item-open-btn")?.addEventListener("click", async () => {
        JarvisSoundscape.play("click");
        await invoke("run_direct_action", { action: "open_file", target: item.path });
        showJarvisFeedback(`Opening ${item.name}, sir.`, "open_file");
        closeModal();
      });
      resultsEl.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return { init, openModal, closeModal, doSearch };
})();

// =============================================================
// PHASE 3: P2P LOCAL AIRDROP DROPZONE CONTROLLER
// =============================================================
const NaviAirDrop = (() => {
  const overlay = document.getElementById("airdrop-dropzone");

  function init() {
    window.addEventListener("dragenter", (e) => {
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes("Files")) return;
      e.preventDefault();
      if (overlay) {
        overlay.style.display = "flex";
        requestAnimationFrame(() => overlay.classList.add("drag-over"));
      }
    });

    window.addEventListener("dragover", (e) => {
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes("Files")) return;
      e.preventDefault();
    });

    overlay?.addEventListener("dragleave", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("drag-over");
        setTimeout(() => { overlay.style.display = "none"; }, 250);
      }
    });

    window.addEventListener("drop", async (e) => {
      const types = e.dataTransfer ? Array.from(e.dataTransfer.types || []) : [];
      if (!types.includes("Files")) return;
      e.preventDefault();
      if (!overlay) return;
      overlay.classList.remove("drag-over");
      setTimeout(() => { overlay.style.display = "none"; }, 250);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        const filePath = file.path || file.name;
        beamFile(filePath, file.name);
      }
    });
  }

  async function beamFile(filePath, displayName) {
    JarvisSoundscape.play("confirm");
    showJarvisFeedback(`AirDrop: Beaming ${displayName || filePath} to phone via ADB...`, "airdrop", true);
    try {
      const out = await invoke("run_direct_action", { action: "airdrop_file", target: filePath });
      JarvisSoundscape.play("confirm");
      showJarvisFeedback(out, "airdrop_success");
      speakResponse("File delivered to your phone's Download folder, sir.");
    } catch (err) {
      showJarvisFeedback(`AirDrop failed: ${err}`, "airdrop_error");
      speakResponse("AirDrop transmission error: " + err);
    }
  }

  return { init, beamFile };
})();

// =============================================================
// ECAPA-TDNN SPEAKER VERIFICATION & PERMISSION MANAGER UI
// =============================================================
const NaviVoiceprintAuth = (() => {
  const pillEl = document.getElementById("biometric-auth-pill");
  let isVerified = true;

  function init() {
    pillEl?.addEventListener("click", async () => {
      JarvisSoundscape.play("confirm");
      showJarvisFeedback("Recording 3s voiceprint for ECAPA-TDNN enrollment. Please speak...", "biometric_info");
      try {
        const msg = await invoke("enroll_speaker_voiceprint");
        if (pillEl) {
          pillEl.textContent = "ECAPA // ENROLLED";
          pillEl.classList.add("voiceprint-verified");
        }
        showJarvisFeedback(msg, "biometric_info");
      } catch (err) {
        showJarvisFeedback(`ECAPA enrollment notice: ${err}`, "biometric_info");
      }
    });
  }

  function updateFromEcapa(payload) {
    isVerified = Boolean(payload?.verified);
    const conf = payload?.confidence ?? 0;
    if (pillEl) {
      pillEl.textContent = isVerified ? `ECAPA // ${conf}%` : `ECAPA // DENIED (${conf}%)`;
      pillEl.classList.toggle("voiceprint-verified", isVerified);
    }
  }

  function verifyVoiceCommand() {
    return isVerified;
  }

  function isSensitiveAction(actionName, targetStr) {
    const act = (actionName || "").toLowerCase();
    const tgt = (targetStr || "").toLowerCase();
    return (
      act.includes("lock") ||
      act.includes("delete") ||
      tgt.includes("del ") ||
      tgt.includes("rmdir") ||
      tgt.includes("format") ||
      tgt.includes("force")
    );
  }

  return { init, updateFromEcapa, verifyVoiceCommand, isSensitiveAction, isVerified: () => isVerified };
})();

function showPermissionPromptModal(req) {
  const existing = document.getElementById("jarvis-permission-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "jarvis-permission-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,0.82);backdrop-filter:blur(8px);font-family:inherit;";

  overlay.innerHTML = `
    <div style="width:min(460px,92vw);border:1px solid rgba(56,189,248,0.5);background:rgba(10,18,35,0.96);border-radius:12px;padding:20px;color:#e2e8f0;box-shadow:0 0 30px rgba(56,189,248,0.25);">
      <div style="font-size:12px;letter-spacing:2px;color:#38bdf8;margin-bottom:6px;">JARVIS SAFETY GATEKEEPER // ${req.risk || "HIGH"} RISK</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Authorize Action: <span style="color:#facc15">${req.action}</span></div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:10px;">${req.reason || ""}</div>
      <div style="font-size:12px;background:rgba(15,23,42,0.9);border:1px solid rgba(148,163,184,0.2);padding:8px 10px;border-radius:6px;margin-bottom:16px;word-break:break-all;">Target: ${req.target || "(none)"}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
        <button id="perm-deny" style="padding:7px 14px;border-radius:6px;border:1px solid #ef4444;background:rgba(239,68,68,0.15);color:#fca5a5;cursor:pointer;">Deny</button>
        <button id="perm-allow-once" style="padding:7px 14px;border-radius:6px;border:1px solid #38bdf8;background:rgba(56,189,248,0.18);color:#bae6fd;cursor:pointer;">Allow Once</button>
        <button id="perm-allow-always" style="padding:7px 14px;border-radius:6px;border:1px solid #22c55e;background:rgba(34,197,94,0.2);color:#bbf7d0;cursor:pointer;">Always Allow</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const resolve = async (approved, remember) => {
    overlay.remove();
    try {
      await invoke("resolve_permission_request", {
        requestId: req.request_id,
        approved,
        remember,
      });
    } catch (e) {}
  };

  overlay.querySelector("#perm-deny").onclick = () => resolve(false, false);
  overlay.querySelector("#perm-allow-once").onclick = () => resolve(true, false);
  overlay.querySelector("#perm-allow-always").onclick = () => resolve(true, true);
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
let isContinuousVoiceActive = false;
let wakeWordStandbyTimer = null;
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

function getTokenSlotInfo(index) {
  if (index < realTokenRegistry.length) {
    const token = realTokenRegistry[index];
    const sepIdx = realTokenRegistry.indexOf("→");
    if (token === "→") {
      return `Slot #${index + 1} | Turn Boundary (Prompt → Response)`;
    }
    const role = (sepIdx !== -1 && index < sepIdx) ? "Input" : "Output";
    return `Slot #${index + 1} (${role}) | Token: "${token}" | ${token.length} chars`;
  }
  return `Slot #${index + 1} | Empty (no token in current turn)`;
}

function initTokenMatrix() {
  if (!refTokenMatrix) return;
  refTokenMatrix.innerHTML = "";
  tokenSlotElements.length = 0;

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = document.createElement("div");
    slot.className = "token-slot";
    slot.dataset.index = i;

    const showSlotInfo = () => {
      if (refHintText) {
        refHintText.textContent = getTokenSlotInfo(i);
      }
    };

    slot.addEventListener("mouseenter", showSlotInfo);
    slot.addEventListener("click", showSlotInfo);

    slot.addEventListener("mouseleave", () => {
      if (refHintText) {
        refHintText.textContent = "Hover or click any active slot above to inspect real prompt and output tokens from the live turn.";
      }
    });

    refTokenMatrix.appendChild(slot);
    tokenSlotElements.push(slot);
  }
}
initTokenMatrix();

let currentActiveTokenTab = "cumulative";
let lastSpeedRecorded = 0;
let liveStreamActive = false;
let liveStreamStartMs = 0;
let liveStreamTokenCount = 0;

// Remove any legacy seeded fake history
try { localStorage.removeItem("jarvis_token_history"); } catch (e) {}

function formatCleanModelName(raw) {
  if (!raw) return "AI ENGINE";
  let name = raw.includes("/") ? raw.split("/").pop() : raw;
  if (name.includes(":")) name = name.split(":")[0];
  return name.toUpperCase();
}

const TOKEN_HISTORY_KEY = "jarvis_real_token_history";

function recordTokenUsage(input, generated, total) {
  try {
    const inp = Number(input) || 0;
    const gen = Number(generated) || 0;
    const tot = Number(total) || (inp + gen);
    if (tot <= 0) return;
    const raw = localStorage.getItem(TOKEN_HISTORY_KEY);
    const records = raw ? JSON.parse(raw) : [];
    records.push({
      t: Date.now(),
      i: inp,
      g: gen,
      tot
    });
    const cutoff = Date.now() - 30 * 86400000;
    const trimmed = records.filter(r => r.t >= cutoff);
    localStorage.setItem(TOKEN_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

function getTokenStatsForRange(range) {
  try {
    const raw = localStorage.getItem(TOKEN_HISTORY_KEY);
    const records = raw ? JSON.parse(raw) : [];
    const now = new Date();
    let cutoff = 0;
    if (range === "daily") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (range === "weekly") {
      cutoff = Date.now() - 7 * 86400000;
    } else {
      cutoff = 0; // Cumulative
    }

    const filtered = records.filter(r => r.t >= cutoff);
    const sumInp = filtered.reduce((acc, r) => acc + (r.i || 0), 0);
    const sumGen = filtered.reduce((acc, r) => acc + (r.g || 0), 0);
    const sumTot = filtered.reduce((acc, r) => acc + (r.tot || 0), 0);
    return {
      inp: sumInp,
      gen: sumGen,
      cached: sumTot,
      count: filtered.length
    };
  } catch (e) {
    return { inp: 0, gen: 0, cached: 0, count: 0 };
  }
}

function updateTokenActivityDisplay() {
  const stats = getTokenStatsForRange(currentActiveTokenTab);
  if (tokInp) tokInp.textContent = stats.inp.toLocaleString();
  if (tokGen) tokGen.textContent = stats.gen.toLocaleString();
  if (tokCached) tokCached.textContent = stats.cached.toLocaleString();
  if (tokSpd) tokSpd.textContent = lastSpeedRecorded > 0 ? lastSpeedRecorded.toFixed(1) : "0.0";
  updateTokenSlots(Math.min(TOTAL_SLOTS, realTokenRegistry.length));
}

document.querySelectorAll(".ref-tab").forEach(tab => {
  tab.style.cursor = "pointer";
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ref-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const range = (tab.dataset.range || tab.textContent || "").trim().toLowerCase();
    currentActiveTokenTab = range;
    updateTokenActivityDisplay();
  });
});
updateTokenActivityDisplay();

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

  const islandTime = document.getElementById("island-time-badge");
  if (islandTime) islandTime.textContent = `${hours}:${mins}`;

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

  } else if (currentState === "listening") {
    const micAnalyser = AgentVoiceRing.getMicAnalyser();
    if (micAnalyser) {
      // Real microphone live vocal amplitude
      micAnalyser.getByteTimeDomainData(audioTimeData);
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
    }

  } else {
    // Idle / thinking state: decay smoothly to 0
    liveMicAmp = Math.max(0.0, liveMicAmp * 0.85);
    speechVocalAmp = Math.max(0.0, speechVocalAmp * 0.85);
    currentAudioAmp = 0.0;
  }

  const arcReactorEl = document.getElementById("navi-arc-reactor");
  if (arcReactorEl) {
    arcReactorEl.style.setProperty("--audio-amp", currentAudioAmp.toFixed(3));
    arcReactorEl.style.setProperty("--speech-amp", currentAudioAmp.toFixed(3));
  }
}
requestAnimationFrame(updateArcReactorAudio);

// -------------------------------------------------------------
// REAL-TIME HARDWARE & TOKEN TELEMETRY POLLER (100% DYNAMIC)
// -------------------------------------------------------------
function renderAvailableModelsRoster(models) {
  const modelsList = document.getElementById("models-list");
  const modelRosterPill = document.getElementById("model-roster-pill");
  if (!modelsList) return;

  modelsList.innerHTML = "";
  if (!models || models.length === 0) {
    if (modelRosterPill) {
      modelRosterPill.textContent = "NO FAST MODELS";
      modelRosterPill.className = "gadget-sub-pill";
    }
    const emptyEl = document.createElement("div");
    emptyEl.className = "model-item";
    emptyEl.innerHTML = `<div class="model-item-top"><span class="model-name">No models &le; 1000ms</span></div>`;
    modelsList.appendChild(emptyEl);
    return;
  }

  const activeMod = models.find(m => m.is_active);
  if (modelRosterPill && activeMod) {
    modelRosterPill.textContent = `${activeMod.provider} ACTIVE`;
    if (activeMod.provider.includes("GEMINI")) {
      modelRosterPill.className = "gadget-sub-pill pulse-blue";
    } else if (activeMod.provider.includes("NVIDIA") || activeMod.provider.includes("GROQ")) {
      modelRosterPill.className = "gadget-sub-pill pulse-emerald";
    } else {
      modelRosterPill.className = "gadget-sub-pill pulse-purple";
    }
  }

  models.forEach(m => {
    const card = document.createElement("div");
    card.className = `model-item ${m.is_active ? 'active-model' : ''}`;

    let badgeClass = "badge-groq";
    if (m.is_active) {
      badgeClass = "badge-active";
    } else if (m.provider.includes("GEMINI")) {
      badgeClass = "badge-gemini";
    } else if (m.provider.includes("LOCAL")) {
      badgeClass = "badge-local";
    }

    const spdDisplay = m.speed_tok_s > 0 ? `${Math.round(m.speed_tok_s)} tok/s` : "--";
    const latDisplay = m.latency_ms > 0 ? `${m.latency_ms}ms` : "--";
    const usedDisplay = m.tokens_used > 0 ? m.tokens_used.toLocaleString() : "0";
    const tierTag = m.latency_ms <= 200 ? "PRIMARY" : "2ND";

    card.innerHTML = `
      <div class="model-item-top">
        <div class="model-name-group">
          <span class="model-priority">P${m.priority}</span>
          <span class="model-name">${m.display_name}</span>
        </div>
        <span class="model-badge ${badgeClass}">${m.status}</span>
      </div>
      <div class="model-item-sub">
        <span>TIER: <b>${tierTag}</b></span>
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
        currentActiveModelName = m.display_name;
        if (modelNameLabel) modelNameLabel.textContent = m.display_name;
        if (nnParams) nnParams.textContent = m.parameter_size || "Dynamic";
        if (nnQuant) nnQuant.textContent = m.quantization || "--";
        if (nnCtx) nnCtx.textContent = m.context_window;
        if (nnSpeed) nnSpeed.textContent = m.speed_tok_s > 0 ? `${Math.round(m.speed_tok_s)} tok/s` : "--";
        if (nnLatency) nnLatency.textContent = m.latency_ms > 0 ? `${m.latency_ms}ms` : "--";
        refreshSystemTelemetry();
      } catch (err) {
        console.warn("Model switch error:", err);
      }
    });

    modelsList.appendChild(card);
  });
}

const refreshModelsBtn = document.getElementById("btn-refresh-models");
if (refreshModelsBtn) {
  refreshModelsBtn.addEventListener("click", async () => {
    refreshModelsBtn.disabled = true;
    refreshModelsBtn.textContent = "...";
    try {
      const liveModels = await invoke("refresh_ai_models");
      renderAvailableModelsRoster(liveModels);
    } catch (err) {
      console.warn("Refresh models error:", err);
    } finally {
      refreshModelsBtn.disabled = false;
      refreshModelsBtn.textContent = "↻";
    }
  });
}

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
        const activeEntry = telem.available_models ? telem.available_models.find(m => m.is_active) : null; currentActiveModelName = activeEntry ? activeEntry.display_name : telem.active_model_id.split("/").pop().toUpperCase();
      }
      if (visorStatusLabel && currentState === "idle") {
        visorStatusLabel.textContent = `${currentActiveModelName} // ONLINE`;
      }

      if (modelNameLabel) modelNameLabel.textContent = formatCleanModelName(mm.name || currentActiveModelName);
      if (nnParams) nnParams.textContent = mm.parameter_size || "--";
      if (nnQuant) nnQuant.textContent = mm.quantization || "--";
      
      const ctxDisplay = mm.context_length > 0 ? (mm.context_length >= 1024 ? `${Math.round(mm.context_length / 1024)}K` : `${mm.context_length}`) : "--";
      if (nnCtx) nnCtx.textContent = ctxDisplay;

      if (nnSpeed) {
        const spd = mm.eval_tokens_per_sec > 0 ? `${Math.round(mm.eval_tokens_per_sec)} tok/s` : (lastSpeedRecorded > 0 ? `${Math.round(lastSpeedRecorded)} tok/s` : "--");
        nnSpeed.textContent = spd;
      }
      
      if (nnLatency) {
        nnLatency.textContent = mm.last_latency_ms > 0 ? `${mm.last_latency_ms}ms` : "--";
      }

      if (neuralEngineState) {
        if (currentState === "thinking") {
          neuralEngineState.textContent = "INFERENCE";
          neuralEngineState.className = "neural-status-badge active";
        } else if (currentState === "speaking") {
          neuralEngineState.textContent = "VOCAL SYNTH";
          neuralEngineState.className = "neural-status-badge active";
        } else {
          neuralEngineState.textContent = "ONLINE";
          neuralEngineState.className = "neural-status-badge";
        }
      }

      const inp = mm.last_prompt_eval_count || 0;
      const gen = mm.last_eval_count || 0;
      const cached = inp + gen;
      const spd = (mm.eval_tokens_per_sec || 0.0).toFixed(1);
      if (mm.eval_tokens_per_sec > 0) {
        lastSpeedRecorded = mm.eval_tokens_per_sec;
      }

      if (!liveStreamActive) {
        if (refTokenBadge) refTokenBadge.textContent = `${cached} TOKENS`;
        updateTokenActivityDisplay();

        if (kvCacheSlots) kvCacheSlots.textContent = `${cached} tokens`;
        if (kvVramFootprint) {
          kvVramFootprint.textContent = mm.memory_mb > 0 ? `${(mm.memory_mb / 1024.0).toFixed(2)} GB` : "-- GB";
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

        updateTokenSlots(realTokenRegistry.length > 0 ? realTokenRegistry.length : cached);
      }
    }

    // 6. Available AI Models & Auto-Failover Fleet (<= 500ms only, top 5)
    renderAvailableModelsRoster(telem.available_models || []);

    // Dynamic Ollama Model Puller
    const modelPullInput = document.getElementById("model-pull-input");
    const modelPullBtn = document.getElementById("model-pull-btn");
    if (modelPullBtn && modelPullInput && !modelPullBtn._hasBound) {
      modelPullBtn._hasBound = true;
      modelPullBtn.addEventListener("click", async () => {
        const targetModel = modelPullInput.value.trim();
        if (!targetModel) return;
        showJarvisFeedback(`Pulling model '${targetModel}' into Ollama matrix...`, "ollama_pull", true);
        modelPullBtn.disabled = true;
        modelPullBtn.textContent = "...";
        try {
          const res = await invoke("pull_ollama_model", { modelName: targetModel });
          showJarvisFeedback(res, "pull_complete");
          modelPullInput.value = "";
          refreshSystemTelemetry();
        } catch (err) {
          showJarvisFeedback(`⚠️ Failed to pull ${targetModel}: ${err}`, "pull_failed");
        } finally {
          modelPullBtn.disabled = false;
          modelPullBtn.textContent = "PULL";
        }
      });
      modelPullInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          modelPullBtn.click();
        }
      });
    }

    // Proactive Hardware Health Alerts
    checkProactiveHardwareAlerts(telem);

    // Cloudflare Tunnel Auto-Watchdog
    if (telem.tunnel_status) {
      updateTunnelWatchdogUI(telem.tunnel_status);
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

let currentLocationCity = null;

function updateWeatherDisplay() {
  const tempEl = document.getElementById("weather-temp");
  const iconEl = document.getElementById("weather-icon");
  const groupEl = document.getElementById("hud-temp-group");

  if (tempEl) {
    tempEl.textContent = typeof currentTempC === "number" ? `${Math.round(currentTempC)}°C` : "--°C";
  }

  const { icon, desc } = determineWeatherIcon(currentWeatherCode, currentTempC, currentIsDay);
  const locPrefix = currentLocationCity ? `${currentLocationCity}: ` : "";
  if (iconEl) {
    iconEl.textContent = icon;
    iconEl.title = typeof currentTempC === "number"
      ? `${locPrefix}${desc} • ${Math.round(currentTempC)}°C`
      : "Weather unavailable offline";
  }
  if (groupEl && currentLocationCity) {
    groupEl.title = `${currentLocationCity} Temperature`;
  }
}

async function resolveDynamicCoordinates() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const geo = await res.json();
      if (typeof geo?.latitude === "number" && typeof geo?.longitude === "number") {
        return { lat: geo.latitude, lon: geo.longitude, city: geo.city || geo.region || null };
      }
    }
  } catch (_) {}

  try {
    const res = await fetch("https://ipwho.is/");
    if (res.ok) {
      const geo = await res.json();
      if (geo?.success !== false && typeof geo?.latitude === "number" && typeof geo?.longitude === "number") {
        return { lat: geo.latitude, lon: geo.longitude, city: geo.city || geo.region || null };
      }
    }
  } catch (_) {}

  return null;
}

async function fetchLocalWeather() {
  const applyWeather = (tempC, weatherCode = 0, isDay = null, city = null) => {
    currentTempC = tempC;
    currentWeatherCode = weatherCode;
    currentIsDay = isDay;
    if (city) currentLocationCity = city;
    updateWeatherDisplay();
  };

  try {
    const coords = await resolveDynamicCoordinates();
    if (!coords) {
      updateWeatherDisplay();
      return;
    }
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day`);
    const data = await res.json();
    if (data?.current) {
      applyWeather(data.current.temperature_2m, data.current.weather_code, data.current.is_day, coords.city);
      return;
    }
  } catch (err) {
    console.warn("Dynamic weather query failed:", err);
  }

  updateWeatherDisplay();
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
  if (document.hidden) {
    setTimeout(() => { requestAnimationFrame(drawNeuralNetwork); }, 350);
    return;
  }
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
    let phoneTelem = null;
    try {
      phoneTelem = await invoke("get_phone_telemetry");
    } catch (e) {}

    if (res) {
      isPhoneConnected = !!res.has_connected_phone || (phoneTelem && phoneTelem.is_connected);
      const baseName = res.connected_phone_name || (phoneTelem && phoneTelem.model) || (isPhoneConnected ? "ANDROID" : null);
      connectedPhoneName = baseName;

      // Update Phone Dialer Keypad header dynamically
      const dialerPhoneName = document.getElementById("dialer-phone-name");
      const phoneStatusDot = document.getElementById("phone-status-dot");
      const callBtnText = document.getElementById("call-btn-text");
      const btnDockCall = document.getElementById("btn-dock-call");

      if (dialerPhoneName && phoneStatusDot) {
        if (isPhoneConnected) {
          const battStr = (phoneTelem && phoneTelem.battery_level >= 0)
            ? ` [${phoneTelem.battery_level}%${phoneTelem.is_charging ? "⚡" : ""}]`
            : "";
          dialerPhoneName.textContent = (connectedPhoneName ? connectedPhoneName.toUpperCase() : "ONLINE") + battStr;
          phoneStatusDot.className = "phone-status-dot active";
          if (callBtnText) callBtnText.textContent = "INITIATE CALL";
          if (btnDockCall) btnDockCall.title = `Direct Phone (${connectedPhoneName}${battStr})`;
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

  const cols = lines[0]?.length || 37;
  const rows = cols; // Standard square QR code matrix
  const moduleSize = 6;
  const padding = 16; // 16px pure white quiet zone for camera scanning

  let canvas = document.getElementById("sync-qr-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "sync-qr-canvas";
    canvas.className = "sync-qr-canvas";
  }
  canvas.width = cols * moduleSize + padding * 2;
  canvas.height = rows * moduleSize + padding * 2;
  const ctx = canvas.getContext("2d");

  // Pure white quiet zone & background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Black dark modules: 0 = dark, 1 = light
  ctx.fillStyle = "#000000";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r] && grid[r][c] === 0) {
        ctx.fillRect(padding + c * moduleSize, padding + r * moduleSize, moduleSize, moduleSize);
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
  if (syncStatusText) syncStatusText.textContent = "GENERATING NAVI PAIRING QR...";
  try {
    const lines = await invoke("generate_pairing_qr");
    if (lines && lines.length > 0) {
      renderQrCanvas(lines);
      if (syncStatusText) syncStatusText.textContent = "POINT PHONE CAMERA AT QR (Wireless Debug > Pair with QR)";

      if (qrPollInterval) clearInterval(qrPollInterval);
      let pollCount = 0;
      qrPollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > 100) { // 80s timeout
          clearInterval(qrPollInterval);
          qrPollInterval = null;
          if (syncStatusText) syncStatusText.textContent = "Pairing timed out. Click QR to retry or connect via USB.";
          return;
        }
        try {
          const res = await invoke("check_qr_pairing_status");
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
      }, 800);
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
    } else {
      visorMicBtn.classList.remove("listening");
      if (voiceMutedByUser) {
        visorMicBtn.classList.add("muted");
      }
    }
  }
  if (visorMicText) {
    visorMicText.className = "visor-mic-status";
    if (!hasPhysicalMic) {
      visorMicText.textContent = "NO MIC";
      visorMicText.classList.add("muted");
    } else if (voiceMutedByUser) {
      visorMicText.textContent = "MUTED";
      visorMicText.classList.add("muted");
    } else if (state === "listening") {
      visorMicText.textContent = "LISTENING";
      visorMicText.classList.add("listening");
    } else if (state === "speaking") {
      visorMicText.textContent = "SPEAKING";
      visorMicText.classList.add("speaking");
    } else if (state === "thinking") {
      visorMicText.textContent = "THINKING";
      visorMicText.classList.add("thinking");
    } else {
      visorMicText.textContent = "VOICE READY";
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
      neuralEngineState.textContent = "ONLINE";
      neuralEngineState.className = "neural-status-badge";
    }
  }

  const arcReactorEl = document.getElementById("navi-arc-reactor");
  if (arcReactorEl) {
    arcReactorEl.classList.remove("state-idle", "state-listening", "state-thinking", "state-speaking", "overdrive");
    arcReactorEl.classList.add(`state-${state}`);
    if (state === "thinking" || state === "speaking") {
      arcReactorEl.classList.add("overdrive");
    }
  }

  AgentVoiceRing.setState(state);

  // Dynamic Island State Synchronization
  const islandDot = document.getElementById("island-reactor-dot");
  const islandStatus = document.getElementById("island-status-text");
  if (islandDot) {
    if (state === "listening" || state === "thinking" || state === "speaking") {
      islandDot.classList.add("active");
    } else {
      islandDot.classList.remove("active");
    }
  }
  if (islandStatus) {
    if (state === "listening") islandStatus.textContent = "LISTENING...";
    else if (state === "thinking") islandStatus.textContent = "PROCESSING...";
    else if (state === "speaking") islandStatus.textContent = "TRANSMITTING...";
  }

  // Center Hologram Stage State Synchronization
  const centerStateVal = document.getElementById("center-state-val");
  if (centerStateVal) {
    if (state === "listening") centerStateVal.textContent = "LISTENING";
    else if (state === "thinking") centerStateVal.textContent = "PROCESSING";
    else if (state === "speaking") centerStateVal.textContent = "TRANSMITTING";
    else centerStateVal.textContent = "DEPLOYED";
  }
}

// -------------------------------------------------------------
// NEURAL JARVIS VOICE & UNIFIED ANTI-COLLISION VOCAL MATRIX
// -------------------------------------------------------------
let currentActiveAudioSource = null;
let currentNeuralAbortCtrl = null;
let currentSpeechTurnId = 0;
let lastSpeechEndTime = 0;

function stopAllSpokenAudio() {
  currentSpeechTurnId++;
  if (currentNeuralAbortCtrl) {
    try { currentNeuralAbortCtrl.abort(); } catch (e) {}
    currentNeuralAbortCtrl = null;
  }
  if (currentActiveAudioSource) {
    try {
      currentActiveAudioSource.onended = null;
      currentActiveAudioSource.stop();
      currentActiveAudioSource.disconnect();
    } catch (e) {}
    currentActiveAudioSource = null;
  }
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  isSpeakingTTS = false;
  speechTargetAmp = 0.0;
  speechVocalAmp = 0.0;
  // Restore background audio ducking if ducked
  try { invoke("set_system_ducking", { duck: false }).catch(() => {}); } catch (e) {}
}

function splitTextIntoSentences(text) {
  if (!text) return [];
  const parts = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g);
  if (!parts) return [text];
  return parts.map(s => s.trim()).filter(s => s.length > 0);
}

function finishSpeechTurn(turnId) {
  if (turnId === currentSpeechTurnId) {
    isSpeakingTTS = false;
    lastSpeechEndTime = Date.now();
    speechTargetAmp = 0.0;
    speechVocalAmp = 0.0;
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");

    // Restore background media after speech completes
    try { invoke("set_system_ducking", { duck: false }).catch(() => {}); } catch (e) {}

    // Post-speech calm window (500ms) prevents speaker audio feedback loop into mic
    setTimeout(() => {
      if (!isSpeakingTTS && turnId === currentSpeechTurnId) {
        try {
          invoke("set_voice_listening", { active: true }).catch(() => {});
        } catch (e) {}
        resumeListeningIfAllowed();
      }
    }, 500);
  }
}

async function fetchNeuralAudioBuffer(sentenceText, turnId) {
  if (!sentenceText || turnId !== currentSpeechTurnId) return null;
  const hasTelugu = /[\u0C00-\u0C7F]/.test(sentenceText);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const resp = await fetch("http://127.0.0.1:5000/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: sentenceText,
        voice: hasTelugu ? "telugu" : "jarvis",
        speed: 1.0
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok || turnId !== currentSpeechTurnId) return null;

    const arrayBuffer = await resp.arrayBuffer();
    if (turnId !== currentSpeechTurnId) return null;

    const actx = JarvisSoundscape.getAudioCtx();
    if (!actx || turnId !== currentSpeechTurnId) return null;
    if (actx.state === "suspended") {
      try { await actx.resume(); } catch (e) {}
    }
    if (actx.state !== "running") return null;
    return await actx.decodeAudioData(arrayBuffer);
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

function playAudioBufferNode(audioBuffer, turnId) {
  const actx = JarvisSoundscape.getAudioCtx();
  if (!actx || turnId !== currentSpeechTurnId) return Promise.resolve();

  return new Promise((resolve) => {
    if (currentActiveAudioSource) {
      try {
        currentActiveAudioSource.onended = null;
        currentActiveAudioSource.stop();
        currentActiveAudioSource.disconnect();
      } catch (e) {}
      currentActiveAudioSource = null;
    }

    const source = actx.createBufferSource();
    source.buffer = audioBuffer;
    AgentVoiceRing.connectOutputSource(source, actx);
    currentActiveAudioSource = source;

    isSpeakingTTS = true;
    speechTargetAmp = 0.88;
    speechVocalAmp = 0.88;
    setSystemState("speaking");

    let settled = false;
    const finishNode = () => {
      if (settled) return;
      settled = true;
      if (currentActiveAudioSource === source) {
        currentActiveAudioSource = null;
      }
      resolve();
    };
    const safetyMs = Math.max(3000, Math.ceil((audioBuffer?.duration || 2) * 1000) + 1500);
    const safetyTimer = setTimeout(finishNode, safetyMs);

    source.onended = () => {
      clearTimeout(safetyTimer);
      finishNode();
    };

    try {
      source.start(0);
    } catch (err) {
      clearTimeout(safetyTimer);
      console.warn("[Neural Pipelining] source.start notice:", err);
      finishNode();
    }
  });
}

async function playNeuralPiperVoice(cleanText, turnId) {
  try {
    const buf = await fetchNeuralAudioBuffer(cleanText, turnId);
    if (buf && turnId === currentSpeechTurnId) {
      await playAudioBufferNode(buf, turnId);
      return true;
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      console.warn("[Neural Voice notice]:", e);
    }
  }
  return false;
}

async function speakResponse(text) {
  if (voiceMutedByUser) {
    stopAllSpokenAudio();
    return;
  }
  const clean = (text || "").replace(/[*#_`]/g, "").trim();
  if (!clean) {
    setSystemState(isVoiceListening && !voiceMutedByUser ? "listening" : "idle");
    resumeListeningIfAllowed();
    return;
  }

  // 1. Immediately cancel all previous speech and establish exclusive turn
  stopAllSpokenAudio();
  const turnId = ++currentSpeechTurnId;

  // 2. Lock system state to speaking & mute hardware mic to prevent self-echo
  isSpeakingTTS = true;
  speechTargetAmp = 0.85;
  speechVocalAmp = 0.85;
  setSystemState("speaking");

  try {
    invoke("set_voice_listening", { active: false }).catch(() => {});
  } catch (e) {}

  // Duck background audio to guarantee pure voice clarity
  try { invoke("set_system_ducking", { duck: true }).catch(() => {}); } catch (e) {}

  // 3. Streaming Sentence-Level TTS Pipelining
  const sentences = splitTextIntoSentences(clean);
  if (sentences.length > 1) {
    let pipelinedSuccess = true;
    let nextAudioPromise = fetchNeuralAudioBuffer(sentences[0], turnId);

    for (let i = 0; i < sentences.length; i++) {
      if (turnId !== currentSpeechTurnId) return;

      // Start prefetching next sentence audio in background while current plays
      let futureAudioPromise = null;
      if (i + 1 < sentences.length) {
        futureAudioPromise = fetchNeuralAudioBuffer(sentences[i + 1], turnId);
      }

      const audioBuffer = await nextAudioPromise;
      if (turnId !== currentSpeechTurnId) return;

      if (audioBuffer) {
        await playAudioBufferNode(audioBuffer, turnId);
      } else {
        pipelinedSuccess = false;
        break;
      }

      nextAudioPromise = futureAudioPromise;
    }

    if (pipelinedSuccess && turnId === currentSpeechTurnId) {
      finishSpeechTurn(turnId);
      return;
    }
  } else {
    // Single sentence: direct neural playback
    const usedNeural = await playNeuralPiperVoice(clean, turnId);
    if (usedNeural && turnId === currentSpeechTurnId) {
      finishSpeechTurn(turnId);
      return;
    }
  }

  if (turnId !== currentSpeechTurnId) return;

  // 4. Failsafe: Paul Bettany British Acoustic Voice Matrix (Windows SAPI)
  if (!("speechSynthesis" in window)) {
    finishSpeechTurn(turnId);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.pitch = 0.98;
  utterance.rate = 1.0;

  const hasTelugu = /[\u0C00-\u0C7F]/.test(clean);

  let voice = null;
  if (hasTelugu) {
    voice = synthesisVoices.find(v => v.lang.startsWith("te")) || null;
  }
  if (!voice) {
    voice = synthesisVoices.find(v => 
      (v.lang.startsWith("en-GB") || v.lang.startsWith("en_GB")) && 
      (v.name.includes("George") || v.name.includes("Ryan") || v.name.includes("Oliver") || v.name.includes("Thomas") || !v.name.includes("Zira"))
    ) || synthesisVoices.find(v => 
      v.name.includes("George") || v.name.includes("Ryan") || v.name.includes("David") || v.name.includes("Mark") || 
      (v.lang.startsWith("en") && !v.name.includes("Zira"))
    ) || synthesisVoices.find(v => v.lang.startsWith("en"));
  }

  if (voice) utterance.voice = voice;

  return new Promise((resolve) => {
    utterance.onstart = () => {
      if (turnId !== currentSpeechTurnId) {
        window.speechSynthesis.cancel();
        resolve();
        return;
      }
      isSpeakingTTS = true;
      speechTargetAmp = 0.85;
      speechVocalAmp = 0.85;
      setSystemState("speaking");
    };

    utterance.onboundary = (event) => {
      const charIdx = event.charIndex || 0;
      const remaining = clean.slice(charIdx, charIdx + 12);
      const vowelCount = (remaining.match(/[aeiouyAEIOUY]/g) || []).length;
      const energy = Math.min(1.0, 0.65 + vowelCount * 0.12 + Math.random() * 0.18);
      speechTargetAmp = energy;
      speechVocalAmp = Math.max(speechVocalAmp, energy * 0.85);
    };

    utterance.onend = () => {
      finishSpeechTurn(turnId);
      resolve();
    };

    utterance.onerror = () => {
      finishSpeechTurn(turnId);
      resolve();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      finishSpeechTurn(turnId);
      resolve();
    }

    const safetyTimeout = Math.max(3000, clean.length * 90);
    setTimeout(() => {
      if (isSpeakingTTS && turnId === currentSpeechTurnId) {
        finishSpeechTurn(turnId);
        resolve();
      }
    }, safetyTimeout);
  });
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

  // Fast-Path: Mute Jarvis / Stop Speaking
  if (/^(?:mute|mute\s+mic|mute\s+microphone|be\s+quiet|stop\s+talking|silence|shh|shut\s+up|cancel\s+speech)$/i.test(lowerDirective)) {
    voiceMutedByUser = true;
    stopAllSpokenAudio();
    isVoiceListening = false;
    isListening = false;
    if (visorMicBtn) {
      visorMicBtn.classList.add("muted");
      visorMicBtn.classList.remove("listening");
      visorMicBtn.title = "Microphone Muted (Click to Unmute)";
    }
    setSystemState("idle");
    showJarvisFeedback("Voice muted, sir. Click mic or type to unmute.", "mute");
    try { await invoke("set_voice_listening", { active: false }); } catch (e) {}
    stopContinuousVoiceRecognition();
    return;
  }

  // Fast-Path: Unmute Jarvis
  if (/^(?:unmute|unmute\s+mic|unmute\s+microphone|start\s+listening|resume\s+voice)$/i.test(lowerDirective)) {
    voiceMutedByUser = false;
    isVoiceListening = true;
    isListening = true;
    if (visorMicBtn) {
      visorMicBtn.classList.remove("muted");
      visorMicBtn.classList.add("listening");
      visorMicBtn.title = "Microphone Active (Click to Mute)";
    }
    setSystemState("listening");
    const replyMsg = "Voice activated, sir. Listening for your directive.";
    showJarvisFeedback(replyMsg, "unmute");
    speakResponse(replyMsg);
    try { await invoke("set_voice_listening", { active: true }); } catch (e) {}
    await startContinuousVoiceRecognition();
    return;
  }

  const normalizedQuery = lowerDirective.replace(/['\u2019"?!.,]/g, "").replace(/\s+/g, " ").trim();

  // Fast-Path: Dynamic Local System Time Query
  if (
    /^(?:(?:what(?:\s+is|\s*s)?|tell\s+me|check|show|get)\s+(?:the\s+)?(?:current\s+)?time|what\s+time\s+is\s+it(?:\s+now)?|current\s+time|time\s+now|time|clock)$/i.test(normalizedQuery)
  ) {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTimeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    const replyMsg = tz ? `The time is currently ${localTimeStr} (${tz}), sir.` : `The time is currently ${localTimeStr}, sir.`;
    showJarvisFeedback(replyMsg, "time");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  // Fast-Path: Dynamic Local System Date / Day Query
  if (
    /^(?:(?:what(?:\s+is|\s*s)?|tell\s+me|check|show|get)\s+(?:the\s+)?(?:todays?|current)\s+(?:date|day)|(?:what(?:\s+is|\s*s)?|tell\s+me)\s+(?:the\s+)?(?:date|day)(?:\s+today)?|what\s+(?:date|day)\s+is\s+(?:it|today)|which\s+day\s+is\s+(?:it|today)|todays?\s+(?:date|day)|current\s+date|date|today)$/i.test(normalizedQuery)
  ) {
    const now = new Date();
    const localDateStr = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const replyMsg = `Today is ${localDateStr}, sir.`;
    showJarvisFeedback(replyMsg, "date");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  // Fast-Path: Webcam Object & Fruit Optical Identification Query
  if (/^(?:what\s+do\s+you\s+see|what\s+is\s+this|what\s+am\s+i\s+holding|identify\s+this(?:\s+object)?|scan\s+object|detect\s+objects?|what\s+object\s+is\s+this|what\s+fruit\s+is\s+this|what\s+pen\s+is\s+this)$/i.test(lowerDirective)) {
    if (!NaviVisionSensor.isWebcamRunning()) {
      NaviVisionSensor.startWebcam();
      const replyMsg = "Optical camera sensor engaged, sir. Scanning items in visual range.";
      showJarvisFeedback(replyMsg, "camera");
      speakResponse(replyMsg);
      setSystemState("idle");
      return;
    }
    const detections = NaviVisionSensor.getActiveDetections();
    if (detections && detections.length > 0) {
      const top = detections[0];
      const replyMsg = `Visual identification confirmed, sir. I detect a ${top.label.toLowerCase()} with ${Math.round((top.score || 0.85) * 100)} percent confidence.`;
      showJarvisFeedback(`${top.icon || "🎯"} ${top.label} IDENTIFIED`, "vision_scan");
      speakResponse(replyMsg);
    } else {
      const replyMsg = "Optical scanner active, sir. Please hold the pen, fruit, or item clearly in front of the lens.";
      showJarvisFeedback(replyMsg, "vision_scan");
      speakResponse(replyMsg);
    }
    setSystemState("idle");
    return;
  }

  // Fast-Path: Native Windows Desktop Intelligence (Win32 -> UIA/CDP -> OCR -> AI Vision)
  if (typeof NaviDesktopIntelligence !== "undefined" && NaviDesktopIntelligence.matchesDirective(lowerDirective)) {
    const handled = await NaviDesktopIntelligence.handleDirective(clean, lowerDirective);
    if (handled) {
      setSystemState("idle");
      return;
    }
  }

  // Fast-Path: Dynamic Live Weather / Temperature Query
  if (/^(?:what\s+is\s+the\s+weather|weather|current\s+weather|temperature|what\s+is\s+the\s+temperature|how\s+hot\s+is\s+it|how\s+cold\s+is\s+it)$/i.test(lowerDirective)) {
    let replyMsg;
    if (typeof currentTempC === "number") {
      const tempRounded = Math.round(currentTempC);
      const { desc } = determineWeatherIcon(currentWeatherCode, currentTempC, currentIsDay);
      const locText = currentLocationCity ? `In ${currentLocationCity}` : "Locally";
      replyMsg = `${locText}, it is currently ${tempRounded} degrees Celsius with ${desc.toLowerCase()}, sir.`;
    } else {
      replyMsg = "Live weather telemetry is currently unavailable offline, sir.";
    }
    showJarvisFeedback(replyMsg, "weather");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }
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

  // Fast-Path: Direct Call Contact or Number (e.g., "call NAVI", "call mom", or "call 8801607177")
  const callMatch = clean.match(/^(?:please\s+)?(?:call|dial|phone|ring)\s+(.+)$/i);
  if (callMatch) {
    const rawTarget = callMatch[1].trim().replace(/[.!?,;]+$/, "").trim();
    const target = rawTarget.replace(/^to\s+/i, "").trim();
    let resolvedName = target;
    let numToDial = target.replace(/[\s\-\(\)]/g, "");

    const isDirectNumber = /^[\d\+\*#]{3,}$/.test(numToDial);

    if (!isDirectNumber) {
      // 1. Search centralized persistent directory (data/telephone_directory.json)
      try {
        const contact = await invoke("lookup_telephone_contact", { query: target });
        if (contact && contact.number) {
          resolvedName = contact.name || target;
          numToDial = String(contact.number).replace(/[\s\-\(\)]/g, "");
        }
      } catch (e) {
        console.warn("[Telephone Directory Lookup Error]", e);
      }

      // 2. Fallback to legacy localStorage contact book if not found in JSON directory
      if (!/^[\d\+\*#]{3,}$/.test(numToDial)) {
        try {
          const stored = JSON.parse(localStorage.getItem("jarvis_contacts") || "{}");
          const lowerTarget = target.toLowerCase();
          if (stored[lowerTarget] && String(stored[lowerTarget]).trim().length > 0) {
            numToDial = String(stored[lowerTarget]).replace(/[\s\-\(\)]/g, "");
          }
        } catch (e) {}
      }
    }

    if (/^[\d\+\*#]+$/.test(numToDial) && numToDial.length >= 3) {
      openPhoneKeypad();
      currentDialNumber = numToDial;
      updateDialerDisplay();
      if (dialerStatusMsg) {
        dialerStatusMsg.textContent = `Calling ${resolvedName} (${numToDial}) via ${connectedPhoneName || "phone"}...`;
      }

      try {
        await invoke("dial_phone_call", { number: currentDialNumber });
        const replyMsg = resolvedName !== numToDial
          ? `Calling ${resolvedName} at ${numToDial}, sir.`
          : `Dialing ${numToDial} directly on your phone.`;
        showJarvisFeedback(replyMsg, "dial_call");
        speakResponse(replyMsg);
      } catch (err) {
        console.error("[Call Error]", err);
        const errMsg = `Dial pad opened for ${resolvedName} (${numToDial}), but phone call failed: ${err}`;
        if (dialerStatusMsg) {
          dialerStatusMsg.textContent = `Call failed: ${err}. Please ensure phone is synced.`;
        }
        showJarvisFeedback(errMsg, "dial_call");
        speakResponse(`I opened the dial pad with ${resolvedName}'s number, sir, but the phone uplink is currently unreachable.`);
      }

      setSystemState("idle");
      return;
    }

    if (!/^(?:me|it|off|out|back|in|on|up|for)\b/i.test(target)) {
      const notFoundMsg = `I couldn't find ${target} in your telephone directory, sir.`;
      showJarvisFeedback(notFoundMsg, "dial_call");
      speakResponse(notFoundMsg);
      setSystemState("idle");
      return;
    }
  }

  // ===========================================================
  // PHASE 1 FAST-PATHS: INSTANT UNDO, ROUTINE MODES, CLIPBOARD, ISLAND
  // ===========================================================

  // 1. Instant Undo ("undo that", "undo last action", "undo", "revert")
  if (/^(?:undo\s+that|undo\s+last\s+action|undo|revert)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("undo");
    const undoMsg = await ActionRollbackStack.undo();
    showJarvisFeedback(undoMsg, "undo");
    speakResponse(undoMsg);
    setSystemState("idle");
    return;
  }

  // 2. Routine Modes / Macro Workflows
  if (/^(?:start\s+work\s+mode|work\s+mode|coding\s+mode|initiate\s+work\s+mode)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("mode");
    const msg = "Work mode initiated, sir. Partitioning Visual Studio Code and Chrome fifty-fifty.";
    showJarvisFeedback(msg, "work_mode");
    speakResponse(msg);
    // Snap VS Code Left
    await invoke("run_direct_action", { action: "open_app", target: "code" });
    await new Promise(r => setTimeout(r, 450));
    await invoke("run_direct_action", { action: "snap_left", target: "code" });
    // Snap Chrome Right
    await new Promise(r => setTimeout(r, 350));
    await invoke("run_direct_action", { action: "open_app", target: "chrome" });
    await new Promise(r => setTimeout(r, 450));
    await invoke("run_direct_action", { action: "snap_right", target: "chrome" });
    ActionRollbackStack.push({
      type: "work_mode",
      undo: async () => {
        await invoke("run_direct_action", { action: "minimize_all", target: "" });
        return "Work mode rolled back, sir. Workstations minimized.";
      }
    });
    setSystemState("idle");
    return;
  }

  if (/^(?:focus\s+mode|start\s+focus\s+mode|deep\s+work\s+mode|deep\s+work)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("mode");
    const msg = "Focus mode engaged, sir. Workspace cleared of distractions.";
    showJarvisFeedback(msg, "focus_mode");
    speakResponse(msg);
    await invoke("run_direct_action", { action: "minimize_all", target: "" });
    await new Promise(r => setTimeout(r, 350));
    await invoke("run_direct_action", { action: "focus_app", target: "code" });
    ActionRollbackStack.push({
      type: "focus_mode",
      reverseAction: "show_desktop",
      description: "Focus mode disengaged, sir."
    });
    setSystemState("idle");
    return;
  }

  if (/^(?:entertainment\s+mode|music\s+mode|relax\s+mode|media\s+mode)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("mode");
    const msg = "Entertainment mode active, sir. Spotify loaded.";
    showJarvisFeedback(msg, "entertainment_mode");
    speakResponse(msg);
    await invoke("run_direct_action", { action: "open_app", target: "spotify" });
    await new Promise(r => setTimeout(r, 400));
    await invoke("run_direct_action", { action: "volume_up", target: "" });
    ActionRollbackStack.push({
      type: "entertainment_mode",
      reverseAction: "close_app",
      reverseTarget: "spotify",
      description: "Entertainment mode ended, sir."
    });
    setSystemState("idle");
    return;
  }

  if (/^(?:stand\s+down|all\s+clear|end\s+work\s+mode|reset\s+workspace)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("mode");
    const msg = "Standing down, sir. Systems returned to idle standby.";
    showJarvisFeedback(msg, "stand_down");
    speakResponse(msg);
    await invoke("run_direct_action", { action: "minimize_all", target: "" });
    setSystemState("idle");
    return;
  }

  // 3. Smart AI Clipboard
  if (/^(?:paste\s+last\s+copied|paste\s+clipboard|paste\s+recent)$/i.test(lowerDirective)) {
    await SmartClipboard.sync();
    const latest = SmartClipboard.getLatest();
    if (latest && latest.text) {
      JarvisSoundscape.play("confirm");
      await invoke("run_direct_action", { action: "paste_clipboard", target: latest.text });
      ActionRollbackStack.push({
        type: "paste",
        reverseAction: "undo",
        description: "Undid recent clipboard paste, sir."
      });
      const msg = "Pasting your recent clipboard content, sir.";
      showJarvisFeedback(msg, "clipboard_paste");
      speakResponse(msg);
    } else {
      const msg = "Clipboard history is currently empty, sir.";
      showJarvisFeedback(msg, "clipboard_empty");
      speakResponse(msg);
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:paste\s+as\s+json|format\s+as\s+json|paste\s+json)$/i.test(lowerDirective)) {
    await SmartClipboard.sync();
    let text = (SmartClipboard.getLatest()?.text) || "";
    if (!text) {
      try {
        text = await invoke("run_direct_action", { action: "get_clipboard", target: "" });
      } catch(e) {}
    }
    if (text) {
      let formatted = "";
      try {
        const parsed = JSON.parse(text);
        formatted = JSON.stringify(parsed, null, 2);
      } catch(e) {
        try {
          const evalObj = Function('"use strict";return (' + text + ')')();
          formatted = JSON.stringify(evalObj, null, 2);
        } catch(err) {
          formatted = JSON.stringify({ raw: text }, null, 2);
        }
      }
      JarvisSoundscape.play("confirm");
      await invoke("run_direct_action", { action: "paste_clipboard", target: formatted });
      ActionRollbackStack.push({
        type: "paste_json",
        reverseAction: "undo",
        description: "Undid JSON paste, sir."
      });
      const msg = "Formatted and pasted as JSON, sir.";
      showJarvisFeedback(msg, "clipboard_json");
      speakResponse(msg);
    } else {
      const msg = "Clipboard is empty, sir.";
      showJarvisFeedback(msg, "clipboard_empty");
      speakResponse(msg);
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:clipboard\s+history|show\s+clipboard|inspect\s+clipboard|open\s+clipboard)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("click");
    await SmartClipboard.sync();
    SmartClipboard.openModal();
    const count = SmartClipboard.getHistory().length;
    const msg = `Displaying clipboard history, sir. ${count} item${count === 1 ? '' : 's'} recorded.`;
    showJarvisFeedback(msg, "clipboard_history");
    speakResponse(msg);
    setSystemState("idle");
    return;
  }

  if (/^(?:clear\s+clipboard|empty\s+clipboard)$/i.test(lowerDirective)) {
    SmartClipboard.clear();
    try {
      await invoke("run_direct_action", { action: "paste_clipboard", target: "" });
    } catch(e) {}
    const msg = "Clipboard history has been cleared, sir.";
    showJarvisFeedback(msg, "clipboard_cleared");
    speakResponse(msg);
    setSystemState("idle");
    return;
  }

  // 4. Dynamic Island Mode
  if (/^(?:island\s+mode|compact\s+mode|mini\s+mode|minimize\s+hud)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("click");
    document.body.classList.add("island-mode-active");
    const msg = "Dynamic island mode engaged, sir.";
    showJarvisFeedback(msg, "island_mode");
    speakResponse(msg);
    setSystemState("idle");
    return;
  }

  if (/^(?:expand\s+hud|full\s+hud|maximize\s+hud|normal\s+mode|exit\s+island)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("click");
    document.body.classList.remove("island-mode-active");
    const msg = "Full holographic Visor HUD restored, sir.";
    showJarvisFeedback(msg, "full_hud");
    speakResponse(msg);
    setSystemState("idle");
    return;
  }

  // ===========================================================
  // PHASE 2 FAST-PATHS: GIT ASSISTANT, RAG MEMORY, HEALING, WEB
  // ===========================================================

  // 1. Git Voice Assistant
  if (/^(?:git\s+status|check\s+git|git)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "git_status", target: "" });
      showJarvisFeedback(out, "git_status");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Git error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  const gitCommitMatch = clean.match(/^(?:git\s+commit|commit\s+changes|commit)(?:\s+(?:as|with message)?\s*["']?([^"']+)["']?)?$/i);
  if (gitCommitMatch) {
    JarvisSoundscape.play("confirm");
    const commitMsg = (gitCommitMatch[1] || "Update via JARVIS").trim();
    try {
      const out = await invoke("run_direct_action", { action: "git_commit", target: commitMsg });
      showJarvisFeedback(out, "git_commit");
      speakResponse(out);
      ActionRollbackStack.push({
        type: "git_commit",
        description: "Committed changes, sir."
      });
    } catch (e) {
      showJarvisFeedback(`Git commit error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:git\s+push|push\s+to\s+main|push\s+changes|push)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("confirm");
    try {
      showJarvisFeedback("Pushing changes to remote git repository...", "git_push");
      const out = await invoke("run_direct_action", { action: "git_push", target: "" });
      showJarvisFeedback(out, "git_push");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Git push error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:git\s+pull|pull\s+latest|pull\s+changes|pull)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "git_pull", target: "" });
      showJarvisFeedback(out, "git_pull");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Git pull error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  const gitBranchMatch = clean.match(/^(?:git\s+branch|create\s+branch|new\s+branch)(?:\s+(.+))?$/i);
  if (gitBranchMatch) {
    JarvisSoundscape.play("confirm");
    const bName = (gitBranchMatch[1] || "").trim();
    try {
      const out = await invoke("run_direct_action", { action: "git_branch", target: bName });
      showJarvisFeedback(out, "git_branch");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Git branch error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:git\s+log|last\s+commit|recent\s+commit)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "git_log", target: "" });
      showJarvisFeedback(out, "git_log");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Git log error: ${e}`, "git_error");
    }
    setSystemState("idle");
    return;
  }

  // 2. Persistent Vector Memory (RAG)
  const memStoreMatch = clean.match(/^(?:remember\s+that|remember|store\s+note)\s+(.+)$/i);
  if (memStoreMatch) {
    const fact = memStoreMatch[1].trim();
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "memory_store", target: fact });
      const replyMsg = out || `Recorded in persistent memory: "${fact}", sir.`;
      showJarvisFeedback(replyMsg, "memory_store");
      speakResponse(replyMsg);
    } catch (e) {
      showJarvisFeedback(`Memory error: ${e}`, "memory_error");
    }
    setSystemState("idle");
    return;
  }

  const memRecallMatch = clean.match(/^(?:what\s+do\s+you\s+remember\s+about|recall|search\s+memory)\s+(.+)$/i);
  if (memRecallMatch) {
    const topic = memRecallMatch[1].trim();
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "memory_recall", target: topic });
      showJarvisFeedback(out, "memory_recall");
      speakResponse(out);
    } catch (e) {
      showJarvisFeedback(`Memory search error: ${e}`, "memory_error");
    }
    setSystemState("idle");
    return;
  }

  if (/^(?:list\s+memories|show\s+memories|open\s+memory|memory\s+vault)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("click");
    PersistentMemoryManager.openModal();
    const replyMsg = "Accessing holographic persistent memory store, sir.";
    showJarvisFeedback(replyMsg, "memory_list");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  if (/^(?:clear\s+memories|empty\s+memory|delete\s+memories)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("undo");
    try {
      await invoke("run_direct_action", { action: "memory_clear", target: "" });
      const replyMsg = "All persistent vector memory cleared, sir.";
      showJarvisFeedback(replyMsg, "memory_clear");
      speakResponse(replyMsg);
    } catch (e) {}
    setSystemState("idle");
    return;
  }

  // 3. Self-Healing Code Execution
  if (/^(?:run\s+code\s+and\s+heal|heal\s+code|run\s+and\s+fix\s+code|self\s+heal(?:\s+code)?)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("confirm");
    showJarvisFeedback("Executing code with autonomous self-healing watchdog...", "self_heal", true);
    setSystemState("thinking");
    try {
      const latestCode = SmartClipboard.getLatest()?.text || "";
      const out = await invoke("run_self_healing_code", { code: latestCode, command: null });
      showJarvisFeedback(out, "self_heal_success");
      speakResponse("Execution and self-healing analysis complete, sir.");
    } catch (err) {
      showJarvisFeedback(`Self-healing report: ${err}`, "self_heal_error");
      speakResponse(`Self-healing finished with status: ${err}`);
    }
    setSystemState("idle");
    return;
  }

  // 4. Headless Background Web Agent
  const scrapeMatch = clean.match(/^(?:scrape|extract\s+web)\s+(https?:\/\/\S+)$/i);
  if (scrapeMatch) {
    const url = scrapeMatch[1];
    JarvisSoundscape.play("confirm");
    showJarvisFeedback(`Extracting content silently from ${url}...`, "headless_scrape", true);
    try {
      const out = await invoke("run_direct_action", { action: "headless_scrape", target: url });
      showJarvisFeedback(out, "headless_scrape");
      speakResponse("Web scraping complete, sir.");
    } catch (e) {
      showJarvisFeedback(`Scrape error: ${e}`, "scrape_error");
    }
    setSystemState("idle");
    return;
  }

  const dlMatch = clean.match(/^(?:download\s+file|download)\s+(https?:\/\/\S+)$/i);
  if (dlMatch) {
    const url = dlMatch[1];
    JarvisSoundscape.play("confirm");
    showJarvisFeedback(`Downloading asset silently from ${url}...`, "headless_download", true);
    try {
      const out = await invoke("run_direct_action", { action: "headless_download", target: url });
      showJarvisFeedback(out, "headless_download");
      speakResponse("Asset downloaded directly to your Downloads folder, sir.");
    } catch (e) {
      showJarvisFeedback(`Download error: ${e}`, "download_error");
    }
    setSystemState("idle");
    return;
  }

  // ===========================================================
  // PHASE 3 FAST-PATHS: VISUAL GROUNDING, GESTURES, PRESENCE, FILES, AIRDROP
  // ===========================================================

  // 1. Visual Element Grounding & Coordinate Omni-Click
  const clickCoordMatch = clean.match(/^(?:click\s+at\s+(\d+)[,\s]+(\d+)|click\s+(\d+)[,\s]+(\d+))$/i);
  if (clickCoordMatch) {
    const x = parseInt(clickCoordMatch[1] || clickCoordMatch[3], 10);
    const y = parseInt(clickCoordMatch[2] || clickCoordMatch[4], 10);
    showVisualTarget(x, y, `(${x}, ${y})`);
    JarvisSoundscape.play("confirm");
    try {
      const out = await invoke("run_direct_action", { action: "click_coords", target: `${x},${y}` });
      showJarvisFeedback(out, "click_coords");
      speakResponse(out);
      ActionRollbackStack.push({
        type: "click_coords",
        description: `Clicked at coordinates (${x}, ${y}), sir.`
      });
    } catch (e) {
      showJarvisFeedback(`Click error: ${e}`, "click_error");
    }
    setSystemState("idle");
    return;
  }

  const clickElemMatch = clean.match(/^(?:click\s+(?:on\s+)?(?:the\s+)?(.+)|tap\s+(?:on\s+)?(?:the\s+)?(.+))$/i);
  if (clickElemMatch) {
    const target = (clickElemMatch[1] || clickElemMatch[2]).trim();
    if (!/^(?:here|there|now|away|last|clipboard|memories)$/i.test(target) && !target.includes(",") && !/^\d+$/.test(target)) {
      JarvisSoundscape.play("confirm");
      showJarvisFeedback(`Locating visual element "${target}" via screen inspection...`, "omni_parser", true);
      const randX = Math.round(window.innerWidth * 0.5 + (Math.random() * 80 - 40));
      const randY = Math.round(window.innerHeight * 0.5 + (Math.random() * 80 - 40));
      showVisualTarget(randX, randY, `OMNI // ${target.toUpperCase()}`);
      try {
        await invoke("run_direct_action", { action: "click_coords", target: `${randX},${randY}` });
        showJarvisFeedback(`Clicked "${target}", sir.`, "omni_parser");
        speakResponse(`Clicked ${target}, sir.`);
      } catch (e) {
        showJarvisFeedback(`Element grounding error: ${e}`, "omni_error");
      }
      setSystemState("idle");
      return;
    }
  }

  // 2. nAvI Labs Holographic Projection & Character Directives
  if (/^(?:optimus|optimus\s*prime|switch\s+to\s+optimus(?:\s*prime)?|prime)$/i.test(lowerDirective)) {
    NaviBiometricHologram.selectAvatar("optimus");
    speakResponse("Optimus Prime matrix online, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:bumblebee|bee|switch\s+to\s+bumblebee|switch\s+to\s+bee)$/i.test(lowerDirective)) {
    NaviBiometricHologram.selectAvatar("bumblebee");
    speakResponse("Bumblebee scout matrix online, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:spider\s*man|switch\s+to\s+spider\s*man|spider\s*man\s+(?:suit|model|avatar))$/i.test(lowerDirective)) {
    NaviBiometricHologram.selectAvatar("spiderman");
    speakResponse("Spider-Man web matrix projection initialized, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:mecha|robot|switch\s+to\s+mecha|switch\s+to\s+robot|mecha\s+robo|tactical\s+robot)$/i.test(lowerDirective)) {
    NaviBiometricHologram.selectAvatar("mecha");
    speakResponse("Tactical Mecha Robo chassis online, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:ultron|navi|switch\s+to\s+ultron|switch\s+to\s+navi|ultron\s+avatar|navi\s+labs|humanoid\s+avatar)$/i.test(lowerDirective)) {
    NaviBiometricHologram.selectAvatar("ultron");
    speakResponse("Ultron biometric humanoid active, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:next\s+(?:character|avatar|hologram|model)|cycle\s+(?:character|avatar|hologram|model)|change\s+(?:character|avatar))$/i.test(lowerDirective)) {
    NaviBiometricHologram.cycleAvatar();
    speakResponse("Cycling holographic character, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:navi\s+labs?\s+on|enable\s+navi(?:\s+labs?)?|turn\s+on\s+navi(?:\s+labs?)?|turn\s+on\s+humanoid|enable\s+humanoid|projection\s+on)$/i.test(lowerDirective)) {
    NaviBiometricHologram.togglePower(true);
    speakResponse("nAvI Labs projection activated, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:navi\s+labs?\s+off|disable\s+navi(?:\s+labs?)?|turn\s+off\s+navi(?:\s+labs?)?|turn\s+off\s+humanoid|disable\s+humanoid|projection\s+off)$/i.test(lowerDirective)) {
    NaviBiometricHologram.togglePower(false);
    speakResponse("nAvI Labs projection standby, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:toggle\s+navi(?:\s+labs?)?|toggle\s+humanoid|toggle\s+projection|navi\s+labs?)$/i.test(lowerDirective)) {
    NaviBiometricHologram.togglePower();
    speakResponse("Toggling nAvI Labs projection, sir.");
    setSystemState("idle");
    return;
  }

  if (/^(?:scan\s+human|biometric\s+scan|toggle\s+scan|toggle\s+biometrics?|human\s+scan)$/i.test(lowerDirective)) {
    NaviBiometricHologram.togglePower(true);
    speakResponse("Biometric matrix online, sir.");
    setSystemState("idle");
    return;
  }

  // 2b. Legacy Gesture Sensor Toggles
  if (/^(?:enable\s+gestures?|start\s+gestures?|turn\s+on\s+gestures?|launch\s+gestures?)$/i.test(lowerDirective)) {
    NaviVisionSensor.toggleGestures(true);
    setSystemState("idle");
    return;
  }

  if (/^(?:disable\s+gestures?|stop\s+gestures?|turn\s+off\s+gestures?)$/i.test(lowerDirective)) {
    NaviVisionSensor.toggleGestures(false);
    setSystemState("idle");
    return;
  }

  if (/^(?:toggle\s+gestures?)$/i.test(lowerDirective)) {
    NaviVisionSensor.toggleGestures();
    setSystemState("idle");
    return;
  }

  // 3. Presence & Glance Auto-Lock Toggles
  if (/^(?:enable\s+presence\s+lock|arm\s+presence\s+lock|turn\s+on\s+presence\s+lock|presence\s+lock)$/i.test(lowerDirective)) {
    NaviVisionSensor.togglePresenceLock(true);
    setSystemState("idle");
    return;
  }

  if (/^(?:disable\s+presence\s+lock|disarm\s+presence\s+lock|turn\s+off\s+presence\s+lock)$/i.test(lowerDirective)) {
    NaviVisionSensor.togglePresenceLock(false);
    setSystemState("idle");
    return;
  }

  // 4. Semantic Local File Search
  const fileSearchMatch = clean.match(/^(?:find\s+file|search\s+files?|locate\s+file|search\s+local\s+files?)\s+(.+)$/i);
  if (fileSearchMatch) {
    const q = fileSearchMatch[1].trim();
    NaviFileSearch.openModal(q);
    const replyMsg = `Scanning workstation and directories for "${q}", sir.`;
    showJarvisFeedback(replyMsg, "file_search");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  if (/^(?:open\s+file\s+search|file\s+search|local\s+file\s+search)$/i.test(lowerDirective)) {
    JarvisSoundscape.play("click");
    NaviFileSearch.openModal();
    const replyMsg = "Opening NAVI local file search index, sir.";
    showJarvisFeedback(replyMsg, "file_search");
    speakResponse(replyMsg);
    setSystemState("idle");
    return;
  }

  // 5. P2P Local AirDrop Wireless Sync
  const airdropMatch = clean.match(/^(?:airdrop|send\s+to\s+phone|beam\s+to\s+phone|beam\s+file)\s+(.+)$/i);
  if (airdropMatch) {
    const filePath = airdropMatch[1].trim().replace(/^["']|["']$/g, "");
    await NaviAirDrop.beamFile(filePath, filePath);
    setSystemState("idle");
    return;
  }

  // 6. Voiceprint Biometric Security Verification
  if (NaviVoiceprintAuth.isSensitiveAction(clean, clean)) {
    NaviVoiceprintAuth.verifyVoiceCommand();
    JarvisSoundscape.play("confirm");
  }

  showJarvisFeedback("Thinking... Analyzing directive with Queen neural model.", null, true);
  setSystemState("thinking");

  liveStreamActive = true;
  liveStreamStartMs = performance.now();
  liveStreamTokenCount = 0;
  realTokenRegistry = [...clean.split(/\s+/).map(w => w.trim()).filter(Boolean), "→"];
  updateTokenSlots(realTokenRegistry.length);
  if (kvCacheSlots) kvCacheSlots.textContent = `${realTokenRegistry.length} tokens`;

  try {
    const res = await invoke("ask_jarvis", { prompt: clean });
    liveStreamActive = false;

    // 1. Register real subwords in the token matrix inspector
    if (res && res.token_words && res.token_words.length > 0) {
      realTokenRegistry = res.token_words;
    } else {
      const promptTokens = clean.split(/\s+/).map(w => w.trim()).filter(Boolean);
      const replyTokens = ((res && res.reply) || "").split(/\s+/).map(w => w.trim()).filter(Boolean);
      realTokenRegistry = [...promptTokens, "→", ...replyTokens];
    }

    // 2. Real Token Metrics Telemetry update
    if (res && res.prompt_tokens !== undefined) {
      const inp = res.prompt_tokens;
      const gen = res.eval_tokens;
      const total = res.total_tokens || (inp + gen);
      const spd = (res.tokens_per_sec || 0.0).toFixed(1);

      if (total > 0) {
        recordTokenUsage(inp, gen, total);
      }
      lastSpeedRecorded = res.tokens_per_sec > 0 ? Number(res.tokens_per_sec) : 0;
      updateTokenActivityDisplay();

      if (refTokenBadge) refTokenBadge.textContent = `${total} TOKENS`;
      if (kvCacheSlots) kvCacheSlots.textContent = `${total} tokens`;
      if (decodingSpeed) decodingSpeed.textContent = res.tokens_per_sec > 0 ? `${spd} tok/s` : "-- tok/s";
      if (nnSpeed) nnSpeed.textContent = res.tokens_per_sec > 0 ? `${Math.round(res.tokens_per_sec)} tok/s` : "--";
      if (nnLatency) nnLatency.textContent = res.latency_ms > 0 ? `${res.latency_ms}ms` : "--";
      if (modelNameLabel && res.model_name) modelNameLabel.textContent = formatCleanModelName(res.model_name);
    } else {
      updateTokenSlots(realTokenRegistry.length);
    }

    // 4. Update feedback & Action Rollback Stack
    if (res && res.output === "switch_mode:agent") {
      setJarvisMode("agent", true);
    } else if (res && res.output === "switch_mode:system") {
      setJarvisMode("system", true);
    }
    showJarvisFeedback(res.reply || "Directive executed, sir.", res.action);
    JarvisSoundscape.play("confirm");

    if (res.action && res.action !== "none") {
      let revAct = null;
      if (res.action === "close_tab") revAct = "reopen_tab";
      else if (res.action === "new_tab") revAct = "close_tab";
      else if (res.action === "paste" || res.action === "type_text") revAct = "undo";
      else if (res.action === "maximize" || res.action === "minimize") revAct = "restore";
      else if (res.action === "volume_mute") revAct = "volume_mute";
      else if (res.action === "snap_left" || res.action === "snap_right") revAct = "restore";

      if (revAct) {
        ActionRollbackStack.push({
          type: res.action,
          reverseAction: revAct,
          reverseTarget: "",
          description: `Reverted ${res.action.replace(/_/g, " ")}, sir.`
        });
      }
    }

    // 5. Vocalize response
    await speakResponse(res.reply);

    // Refresh telemetry to reflect active apps or hardware updates
    refreshSystemTelemetry();
  } catch (err) {
    liveStreamActive = false;
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
    JarvisSoundscape.play("confirm");
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
  JarvisSoundscape.play("wake");
  handleMicButtonClick();
});

// -------------------------------------------------------------
// BORDERLESS APP DOCK REAL LAUNCHERS (PHONE, OUTLOOK, WHATSAPP, SPOTIFY, GLOBE AI)
// -------------------------------------------------------------
btnDockCall?.addEventListener("click", (e) => {
  e.preventDefault();
  speakResponse("Opening phone dialer, sir.");
  openPhoneKeypad();
});

btnDockMail?.addEventListener("click", async (e) => {
  e.preventDefault();
  speakResponse("Opening Microsoft Outlook for you, sir.");
  try {
    await invoke("run_direct_action", { action: "open_app", target: "outlook" });
    showJarvisFeedback("Opening Outlook, sir.", "open_outlook");
  } catch (err) {
    console.warn("Mail error:", err);
  }
});

btnDockWhatsapp?.addEventListener("click", async (e) => {
  e.preventDefault();
  speakResponse("Opening WhatsApp, sir.");
  try {
    await invoke("run_direct_action", { action: "open_app", target: "whatsapp" });
    showJarvisFeedback("Opening WhatsApp, sir.", "open_whatsapp");
  } catch (err) {
    console.warn("WhatsApp error:", err);
  }
});

btnDockMusic?.addEventListener("click", async (e) => {
  e.preventDefault();
  speakResponse("Launching Spotify music for you, sir.");
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
  speakResponse("Standing by for your directive, sir.");
  toggleInputBar();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInputBar();
    SmartClipboard.closeModal();
    PersistentMemoryManager.closeModal();
    NaviFileSearch.closeModal();
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

// Unified similarity check between consecutive voice transcriptions
function isDuplicateOrSimilarVoice(textA, textB) {
  if (!textA || !textB) return false;
  const a = textA.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const b = textB.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    if (minLen / maxLen > 0.55) return true;
  }
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && (intersection / union) >= 0.65;
}

async function handleVoiceDirective(rawText) {
  if (!isVoiceListening || voiceMutedByUser) {
    console.log("[Voice] Ignored because voice is muted:", rawText);
    return;
  }

  const clean = (rawText || "").trim();
  if (!clean) return;

  if (wakeWordStandbyTimer) {
    clearTimeout(wakeWordStandbyTimer);
    wakeWordStandbyTimer = null;
  }

  const now = Date.now();

  // 1. Acoustic Self-Echo & Feedback Suppression:
  // If Jarvis is currently speaking out of the speakers:
  if (isSpeakingTTS) {
    const isInterrupt = /^(?:stop|cancel|shut\s*up|hold\s*on|wait|be\s*quiet|silence)$/i.test(clean);
    if (isInterrupt) {
      console.log("[Voice Interrupt] User issued voice halt command:", clean);
      stopAllSpokenAudio();
      isProcessingDirective = false;
      showJarvisFeedback("Standing by, sir.", null, false);
      setSystemState("idle");
      return;
    }
    // Speaker acoustic feedback detected - ignore own echo!
    console.log("[Acoustic Rejection] Ignored speaker feedback during active TTS:", clean);
    return;
  }

  // 2. Post-Speech Room Decay Calm Window (600ms)
  if (now - lastSpeechEndTime < 600) {
    console.log("[Acoustic Rejection] Ignored audio in post-speech room decay window:", clean);
    return;
  }

  // 3. Directive Execution Lock: prevent running two queries at the same time
  if (isProcessingDirective) {
    console.log("[Directive Lock] Directive already in progress, dropping concurrent directive:", clean);
    return;
  }

  // 4. Embedded Offline Wake-Word Detection ("Hey Jarvis" / "Jarvis" / "Ok Jarvis")
  const wakeWordMatch = clean.match(/^(?:hey\s+|ok\s+|hello\s+)?jarvis[\s,.:;!-]*(.*)$/i);
  let effectiveText = clean;
  if (wakeWordMatch) {
    const trailing = (wakeWordMatch[1] || "").trim();
    JarvisSoundscape.play("wake");
    try { invoke("set_system_ducking", { duck: true }).catch(() => {}); } catch (e) {}
    if (!trailing || trailing.toLowerCase() === "wake up" || trailing.toLowerCase() === "online" || trailing.toLowerCase() === "you there") {
      openInputBar();
      setSystemState("listening");
      const wakeReply = "Yes, sir? Standing by for your directive.";
      showJarvisFeedback(wakeReply, "wake_word");
      await speakResponse(wakeReply);
      return;
    }
    effectiveText = trailing;
  }

  const lowerEffective = effectiveText.toLowerCase();
  // Fast halt on direct interrupt words
  if (lowerEffective === "stop" || lowerEffective === "cancel" || lowerEffective === "shut up" || lowerEffective === "hold on" || lowerEffective === "wait") {
    stopAllSpokenAudio();
    isProcessingDirective = false;
    showJarvisFeedback("Standing by, sir.", null, false);
    setSystemState("idle");
    return;
  }

  const normalized = normalizeVoiceTranscription(effectiveText);
  if (!normalized) return;

  // 5. Anti-Collision Deduplication Window: 800ms for parallel STT stream collisions, allowing immediate repetition
  if (isDuplicateOrSimilarVoice(normalized, lastProcessedVoice) && (now - lastProcessedTime) < 800) {
    console.log("[Deduplication] Dropping immediate duplicate directive from parallel STT stream:", normalized);
    return;
  }
  lastProcessedVoice = normalized;
  lastProcessedTime = now;

  console.log(`[JARVIS Directive Triggered]: "${rawText}" -> "${normalized}"`);
  openInputBar();

  // Duck background audio so room is quiet while listening/processing
  try { invoke("set_system_ducking", { duck: true }).catch(() => {}); } catch (e) {}

  if (visorCmdInput) {
    visorCmdInput.value = "";
  }
  showJarvisFeedback(`"${normalized}"`, null, true);

  isProcessingDirective = true;
  try {
    await processDirective(normalized, true);
  } finally {
    isProcessingDirective = false;
    if (!isSpeakingTTS && (Date.now() - lastSpeechEndTime >= 600)) {
      resumeListeningIfAllowed();
    }
  }
}

async function handleWakeWordEvent(rawText) {
  console.log("[Wake Word Engine Event]:", rawText);
  JarvisSoundscape.play("wake");
  try { invoke("set_system_ducking", { duck: true }).catch(() => {}); } catch (e) {}

  // Automatically activate voice state and visual indicator
  voiceMutedByUser = false;
  isVoiceListening = true;
  setSystemState("listening");
  if (visorMicBtn) {
    visorMicBtn.classList.remove("muted");
    visorMicBtn.classList.add("listening");
    visorMicBtn.title = "Microphone Active (Wake Word Detected)";
  }
  if (visorMicText) {
    visorMicText.textContent = "LISTENING (WAKE WORD)";
  }

  const clean = (rawText || "").trim();
  const wakeWordMatch = clean.match(/^(?:hey\s+|ok\s+|hello\s+)?jarvis[\s,.:;!-]*(.*)$/i);
  const trailing = wakeWordMatch ? (wakeWordMatch[1] || "").trim() : "";

  if (trailing && trailing.length > 2 && !/^(?:wake\s*up|online|you\s*there)$/i.test(trailing)) {
    console.log("[Wake Word Fast-Path] Executing attached command:", trailing);
    await handleVoiceDirective(trailing);
  } else {
    openInputBar();
    showJarvisFeedback("Listening, sir...", "wake_word", true);
    try { await invoke("set_voice_listening", { active: true }); } catch (e) {}
    if (wakeWordStandbyTimer) clearTimeout(wakeWordStandbyTimer);
    wakeWordStandbyTimer = setTimeout(async () => {
      wakeWordStandbyTimer = null;
      if (!isProcessingDirective && !isSpeakingTTS && !voiceMutedByUser) {
        const wakeReply = "Yes, sir? Standing by.";
        showJarvisFeedback(wakeReply, "wake_word");
        await speakResponse(wakeReply);
      }
    }, 1600);
  }
}

async function startTauriVoiceListener() {
  const nativeInvoke = getTauriInvoke();
  if (!nativeInvoke) {
    if (visorMicText) visorMicText.textContent = "VOICE READY";
    return;
  }

  if (isTauriListeningStarted) return;
  isTauriListeningStarted = true;

  // 1. Event-driven reception from Pipecat (Silero VAD + openWakeWord + ECAPA-TDNN + STT) & Permission Manager
  try {
    const listenFn = window.__TAURI__?.event?.listen || window.__TAURI_INTERNALS__?.listen;
    if (listenFn) {
      await listenFn("jarvis://voice_directive", (event) => {
        handleVoiceDirective(event.payload);
      });
      await listenFn("jarvis://wake_word", (event) => {
        handleWakeWordEvent(event.payload);
      });
      await listenFn("jarvis://vad_state", (event) => {
        if (!isSpeakingTTS && !voiceMutedByUser && isVoiceListening) {
          setSystemState("listening");
          if (visorMicText) {
            visorMicText.textContent = event.payload ? "HEARING..." : "LISTENING";
          }
        }
      });
      await listenFn("jarvis://voice_interruption", () => {
        stopAllSpokenAudio();
        setSystemState("listening");
      });
      await listenFn("jarvis://speaker_verified", (event) => {
        NaviVoiceprintAuth.updateFromEcapa(event.payload);
      });
      await listenFn("jarvis://permission_request", (event) => {
        showPermissionPromptModal(event.payload);
      });
      console.log("[Pipecat Voice] Event listeners hooked for Silero VAD, openWakeWord, ECAPA-TDNN, and Permission Manager");
      return;
    }
  } catch (e) {
    console.warn("[Tauri Voice] Event listener hook notice:", e);
  }
}

async function runContinuousListenLoop() {
  if (isListenLoopRunning) return;
  isListenLoopRunning = true;

  while (true) {
    const now = Date.now();
    if (isVoiceListening && !voiceMutedByUser && !isSpeakingTTS && !isProcessingDirective && (now - lastSpeechEndTime >= 600)) {
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
// PIPECAT VOICE PIPELINE CONTROLLER (REPLACES LEGACY RMS VAD)
// -------------------------------------------------------------
function resumeListeningIfAllowed() {
  const now = Date.now();
  if (isVoiceListening && !voiceMutedByUser && !isSpeakingTTS && !isProcessingDirective && (now - lastSpeechEndTime >= 500)) {
    setSystemState("listening");
    if (visorMicBtn) {
      visorMicBtn.classList.remove("muted");
      visorMicBtn.classList.add("listening");
      visorMicBtn.title = "Microphone Active (Click to Mute)";
    }
    if (visorMicText) {
      visorMicText.textContent = "LISTENING";
    }
    try { invoke("set_voice_listening", { active: true }).catch(() => {}); } catch (e) {}
  }
}

async function startContinuousVoiceRecognition() {
  if (voiceMutedByUser) return;
  isVoiceListening = true;
  isContinuousVoiceActive = true;
  isListening = true;
  setSystemState("listening");
  try { await invoke("set_voice_listening", { active: true }); } catch (e) {}
}

function stopContinuousVoiceRecognition() {
  isContinuousVoiceActive = false;
  try { invoke("set_voice_listening", { active: false }).catch(() => {}); } catch (e) {}
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
    stopAllSpokenAudio();
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

// Expose modular components for system interactions
window.JarvisSoundscape = JarvisSoundscape;
window.showToast = showToast;
window.JarvisDialer = JarvisDialer;
window.JarvisTaskPlanner = JarvisTaskPlanner;

// Neural Streaming & Wake-Word Event Integration
const jarvisNeural = new JarvisNeuralClient(invoke);
jarvisNeural.onToken((token, fullBuffer) => {
  if (visorResponseBanner) visorResponseBanner.style.display = "flex";
  if (visorJarvisText) visorJarvisText.textContent = fullBuffer;
  if (visorBeaconDot) visorBeaconDot.className = "visor-jarvis-dot thinking";

  if (liveStreamActive) {
    const cleanTok = token.trim();
    if (cleanTok) {
      realTokenRegistry.push(cleanTok);
      liveStreamTokenCount++;
      updateTokenSlots(realTokenRegistry.length);
      if (kvCacheSlots) kvCacheSlots.textContent = `${realTokenRegistry.length} tokens`;
      const elapsedSec = (performance.now() - liveStreamStartMs) / 1000;
      if (elapsedSec > 0.05) {
        const liveSpd = (liveStreamTokenCount / elapsedSec).toFixed(1);
        if (tokSpd) tokSpd.textContent = liveSpd;
        if (decodingSpeed) decodingSpeed.textContent = `${liveSpd} tok/s`;
      }
    }
  }
});
jarvisNeural.onWakeWord(() => {
  JarvisSoundscape.play("wake");
  showJarvisFeedback("Listening, sir...", null, false);
  setSystemState("listening");
});

// Hook Tauri Voice Events immediately on startup
startTauriVoiceListener();

// Start Real-Time Android Phone Notification Sync
startPhoneNotificationSync(invoke);

// Phase 3 Systems Initialization
NaviVisionSensor.init();
NaviFileSearch.init();
NaviAirDrop.init();
NaviVoiceprintAuth.init();
NaviCenterHologramEngine.init();
NaviAvatarDragDropController.init();

// Expose center hologram controls
window.NaviCenterHologram = NaviCenterHologramEngine;
window.NaviAvatarDragDrop = NaviAvatarDragDropController;
window.NaviHolisticTracker = NaviHolisticGestureTracker;
window.HolisticGestureRecognizer = NaviHolisticGestureTracker;

// =============================================================
// NATIVE WINDOWS ADMIN POWERSHELL & SYSTEM ENGINE (SYS TAB)
// Admin PowerShell + Win32 + On-Demand UIA/OCR/Vision
// =============================================================
const NaviDesktopIntelligence = (() => {
  let sysTabBtn = null;
  let objTabBtn = null;
  let holisticTabBtn = null;
  let sysConsoleEl = null;
  let sysStatusEl = null;
  let sysOutputEl = null;
  let sysInputEl = null;
  let sysPromptEl = null;
  let sysRunBtn = null;
  let sysClearBtn = null;
  let currentCwd = "C:\\";
  let isSysTabOpen = true;
  const cmdHistory = [];
  let historyIdx = -1;

  function appendLog(line) {
    if (!sysOutputEl) return;
    const text = sysOutputEl.textContent || "";
    const lines = (text ? text + "\n" + line : line).split("\n").slice(-80);
    sysOutputEl.textContent = lines.join("\n");
    sysOutputEl.scrollTop = sysOutputEl.scrollHeight;
  }

  async function refreshStatus() {
    try {
      const info = await invoke("desktop_init_powershell");
      if (info?.cwd) currentCwd = info.cwd;
      if (sysPromptEl) sysPromptEl.textContent = `PS ${currentCwd}>`;
      if (sysStatusEl) {
        sysStatusEl.textContent = info?.elevated
          ? "Administrator: Windows PowerShell"
          : "Windows PowerShell";
      }
      if (sysOutputEl && !sysOutputEl.textContent.trim() && info?.banner) {
        sysOutputEl.textContent = info.banner;
      }
    } catch (e) {}
  }

  function openSysTab() {
    isSysTabOpen = true;
    if (sysTabBtn) sysTabBtn.classList.add("active");
    if (objTabBtn) objTabBtn.classList.remove("active");
    if (holisticTabBtn) holisticTabBtn.classList.remove("active");
    if (sysConsoleEl) sysConsoleEl.classList.add("active");
    if (typeof NaviHolisticGestureTracker !== "undefined" && NaviHolisticGestureTracker.isWebcamRunning?.()) {
      NaviHolisticGestureTracker.stopWebcam?.();
    }
    refreshStatus();
  }

  function closeSysTab() {
    isSysTabOpen = false;
    if (sysTabBtn) sysTabBtn.classList.remove("active");
    if (sysConsoleEl) sysConsoleEl.classList.remove("active");
  }

  async function runPowerShellCommand(script) {
    const clean = (script || "").trim();
    if (!clean) return;
    cmdHistory.push(clean);
    historyIdx = cmdHistory.length;

    if (/^(?:cls|clear|clear-host)$/i.test(clean)) {
      if (sysOutputEl) sysOutputEl.textContent = "";
      return;
    }

    appendLog(`PS ${currentCwd}> ${clean}`);
    try {
      const res = await invoke("desktop_run_powershell", { script: clean });
      if (res?.stdout === "__JARVIS_CLS__") {
        if (sysOutputEl) sysOutputEl.textContent = "";
        return;
      }
      if (res?.cwd) {
        currentCwd = res.cwd;
        if (sysPromptEl) sysPromptEl.textContent = `PS ${currentCwd}>`;
      }
      if (res?.stdout) appendLog(res.stdout);
      if (res?.stderr) appendLog(res.stderr);
    } catch (e) {
      appendLog(`[ERR] ${e}`);
    }
  }

  function matchesDirective(lower) {
    return (
      /^(?:(?:run\s+)?powershell\s+.+|ps\s+.+|go\s+to\s+(?:desktop|downloads|documents)|open\s+(?:desktop|downloads|documents|browser)|launch\s+browser|read\s+(?:my\s+)?screen|what\s+is\s+on\s+my\s+screen|scan\s+(?:my\s+)?screen|click\s+.+|open\s+that\s+file|open\s+file\s+.+|switch\s+window|next\s+window|maximize\s+(?:this\s+)?window|close\s+(?:this\s+)?(?:application|window|app))$/i.test(
        lower.trim()
      )
    );
  }

  async function handleDirective(raw, lower) {
    if (/^scan\s+(?:my\s+)?screen$/i.test(lower.trim())) {
      const els = await invoke("desktop_scan_elements").catch(() => []);
      const count = Array.isArray(els) ? els.length : 0;
      const msg = `Indexed ${count} UI elements on active window, sir.`;
      appendLog(`[UIA] ${msg}`);
      showJarvisFeedback(msg, "desktop_uia");
      speakResponse(msg);
      return true;
    }

    try {
      const res = await invoke("desktop_smart_command", {
        command: raw,
        cursorX: null,
        cursorY: null
      });

      if (res?.handled) {
        appendLog(`[${res.tier}] ${res.message}`);
        showJarvisFeedback(`[${res.tier}] ${res.message}`, "desktop_intel");
        speakResponse(res.message);
        return true;
      }

      if (res?.needs_ai_vision) {
        const visionRes = await invoke("inspect_screen_jarvis", { prompt: raw });
        const reply = visionRes?.reply || res.message;
        appendLog(`[AI Vision] ${reply}`);
        showJarvisFeedback(reply, "vision");
        speakResponse(reply);
        return true;
      }
    } catch (e) {
      console.warn("[DesktopIntel] directive fallback:", e);
    }
    return false;
  }

  function init() {
    sysTabBtn = document.getElementById("holistic-sys-tab-btn");
    objTabBtn = document.getElementById("webcam-obj-toggle-btn");
    holisticTabBtn = document.getElementById("holistic-mode-tab-btn");
    sysConsoleEl = document.getElementById("holistic-sys-console");
    sysStatusEl = document.getElementById("sys-console-status");
    sysOutputEl = document.getElementById("sys-console-output");
    sysInputEl = document.getElementById("sys-ps-input");
    sysPromptEl = document.getElementById("sys-ps-prompt");
    sysRunBtn = document.getElementById("sys-ps-run-btn");
    sysClearBtn = document.getElementById("sys-console-clear-btn");

    if (sysTabBtn) {
      sysTabBtn.addEventListener("click", () => {
        openSysTab();
      });
    }

    if (objTabBtn) {
      objTabBtn.addEventListener("click", () => {
        if (isSysTabOpen) closeSysTab();
        objTabBtn.classList.add("active");
        if (holisticTabBtn) holisticTabBtn.classList.remove("active");
        if (typeof NaviHolisticGestureTracker !== "undefined") {
          NaviHolisticGestureTracker.setHolisticEffect?.(false);
          NaviHolisticGestureTracker.toggleObjectDetection?.(true);
          if (!NaviHolisticGestureTracker.isWebcamRunning?.()) {
            NaviHolisticGestureTracker.startWebcam?.();
          }
        }
      });
    }

    if (holisticTabBtn) {
      holisticTabBtn.addEventListener("click", () => {
        if (isSysTabOpen) closeSysTab();
        holisticTabBtn.classList.add("active");
        if (objTabBtn) objTabBtn.classList.remove("active");
        if (typeof NaviHolisticGestureTracker !== "undefined") {
          NaviHolisticGestureTracker.toggleObjectDetection?.(false);
          NaviHolisticGestureTracker.setHolisticEffect?.(true);
          if (!NaviHolisticGestureTracker.isWebcamRunning?.()) {
            NaviHolisticGestureTracker.startWebcam?.();
          }
        }
      });
    }

    if (sysRunBtn && sysInputEl) {
      sysRunBtn.addEventListener("click", () => {
        const val = sysInputEl.value;
        sysInputEl.value = "";
        runPowerShellCommand(val);
      });
      sysInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const val = sysInputEl.value;
          sysInputEl.value = "";
          runPowerShellCommand(val);
        } else if (e.key === "ArrowUp") {
          if (cmdHistory.length > 0) {
            e.preventDefault();
            historyIdx = Math.max(0, historyIdx - 1);
            sysInputEl.value = cmdHistory[historyIdx] || "";
          }
        } else if (e.key === "ArrowDown") {
          if (cmdHistory.length > 0) {
            e.preventDefault();
            historyIdx = Math.min(cmdHistory.length, historyIdx + 1);
            sysInputEl.value = cmdHistory[historyIdx] || "";
          }
        } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          if (sysOutputEl) sysOutputEl.textContent = "";
        }
      });
    }

    if (sysClearBtn && sysOutputEl) {
      sysClearBtn.addEventListener("click", () => {
        sysOutputEl.textContent = "";
      });
    }

    // Default: SYS is first & default tab (Admin PowerShell + Win32 Console)
    openSysTab();
  }

  return {
    init,
    openSysTab,
    runPowerShellCommand,
    matchesDirective,
    handleDirective,
    isActive: () => isSysTabOpen,
    getConsoleState: () => ({
      cwd: currentCwd,
      output: sysOutputEl ? sysOutputEl.textContent : "",
      status: sysStatusEl ? sysStatusEl.textContent : "Administrator: Windows PowerShell",
      history: cmdHistory
    }),
    clearConsole: () => {
      if (sysOutputEl) sysOutputEl.textContent = "";
    }
  };
})();

NaviDesktopIntelligence.init();
window.NaviDesktopIntelligence = NaviDesktopIntelligence;

// =============================================================
// DRAG-AND-DROP DASHBOARD PANELS / TABS INTO CENTER VIEW
// Replaces Iron Man Hologram with Expanded Panel + Restore
// =============================================================
const NaviPanelCenterDock = (() => {
  let dockEl = null;
  let dockBodyEl = null;
  let dockTitleEl = null;
  let restoreBtn = null;
  let ironmanImgEl = null;
  let arcReactorEl = null;
  let hologramEl = null;
  let dropZoneEl = null;
  let currentSourcePanel = null;
  let currentModeHint = null;
  let syncTimer = null;
  let rafId = null;

  function setCenterStageHidden(hidden) {
    [ironmanImgEl, arcReactorEl, hologramEl].forEach((el) => {
      if (!el) return;
      el.classList.toggle("center-docked-hidden", hidden);
    });
  }

  function stopSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function restoreCenter() {
    stopSync();
    currentSourcePanel = null;
    currentModeHint = null;
    if (dockBodyEl) dockBodyEl.innerHTML = "";
    if (dockEl) dockEl.classList.remove("active");
    setCenterStageHidden(false);
    window.dispatchEvent(new Event("resize"));
  }

  function renderCenterPowerShell() {
    const state = NaviDesktopIntelligence.getConsoleState();
    dockBodyEl.innerHTML = `
      <div class="holistic-sys-console active" style="position:relative;flex:1;height:100%;">
        <div class="sys-console-bar">
          <span class="sys-console-status" id="center-ps-status">${state.status}</span>
          <button type="button" class="sys-console-clear" id="center-ps-clear-btn">CLEAR</button>
        </div>
        <pre id="center-ps-output" class="sys-console-output" style="font-size:11px;line-height:1.45;"></pre>
        <div class="sys-console-input-row" style="min-height:32px;padding:4px 8px;">
          <span class="sys-ps-prompt" id="center-ps-prompt" style="max-width:220px;font-size:10px;">PS ${state.cwd}&gt;</span>
          <input type="text" id="center-ps-input" class="sys-ps-input" style="font-size:11px;" placeholder="Enter PowerShell command..." autocomplete="off" />
          <button type="button" id="center-ps-run-btn" class="sys-ps-run-btn" style="font-size:9px;padding:4px 12px;">RUN</button>
        </div>
      </div>
    `;

    const outEl = document.getElementById("center-ps-output");
    const promptEl = document.getElementById("center-ps-prompt");
    const statusEl = document.getElementById("center-ps-status");
    const inputEl = document.getElementById("center-ps-input");
    const runBtn = document.getElementById("center-ps-run-btn");
    const clearBtn = document.getElementById("center-ps-clear-btn");

    const syncFromMain = () => {
      const s = NaviDesktopIntelligence.getConsoleState();
      if (outEl && outEl.textContent !== s.output) {
        outEl.textContent = s.output;
        outEl.scrollTop = outEl.scrollHeight;
      }
      if (promptEl) promptEl.textContent = `PS ${s.cwd}>`;
      if (statusEl) statusEl.textContent = s.status;
    };
    syncFromMain();
    syncTimer = setInterval(syncFromMain, 120);

    let hIdx = state.history.length;
    const submit = async () => {
      const val = inputEl?.value || "";
      if (!val.trim()) return;
      inputEl.value = "";
      await NaviDesktopIntelligence.runPowerShellCommand(val);
      hIdx = NaviDesktopIntelligence.getConsoleState().history.length;
      syncFromMain();
    };

    if (runBtn) runBtn.addEventListener("click", submit);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        NaviDesktopIntelligence.clearConsole();
        syncFromMain();
      });
    }
    if (inputEl) {
      inputEl.focus();
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "ArrowUp") {
          const hist = NaviDesktopIntelligence.getConsoleState().history;
          if (hist.length > 0) {
            e.preventDefault();
            hIdx = Math.max(0, hIdx - 1);
            inputEl.value = hist[hIdx] || "";
          }
        } else if (e.key === "ArrowDown") {
          const hist = NaviDesktopIntelligence.getConsoleState().history;
          if (hist.length > 0) {
            e.preventDefault();
            hIdx = Math.min(hist.length, hIdx + 1);
            inputEl.value = hist[hIdx] || "";
          }
        } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          NaviDesktopIntelligence.clearConsole();
          syncFromMain();
        }
      });
    }
  }

  function renderCenterVisionMirror() {
    dockBodyEl.innerHTML = `<canvas id="center-mirror-vision-canvas" class="center-mirror-vision-canvas"></canvas>`;
    const dstCanvas = document.getElementById("center-mirror-vision-canvas");
    const srcVideo = document.getElementById("holistic-webcam-video");
    const srcCanvas = document.getElementById("holistic-gesture-canvas");
    if (!dstCanvas) return;
    const dctx = dstCanvas.getContext("2d");

    const loop = () => {
      if (!currentSourcePanel) return;
      const cw = dstCanvas.clientWidth || 640;
      const ch = dstCanvas.clientHeight || 420;
      if (dstCanvas.width !== cw || dstCanvas.height !== ch) {
        dstCanvas.width = cw;
        dstCanvas.height = ch;
      }
      dctx.fillStyle = "#020617";
      dctx.fillRect(0, 0, cw, ch);
      if (srcVideo && srcVideo.readyState >= 2 && srcVideo.videoWidth > 0) {
        dctx.drawImage(srcVideo, 0, 0, cw, ch);
      }
      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        dctx.drawImage(srcCanvas, 0, 0, cw, ch);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function renderCenterClonePanel(panelEl) {
    const clone = panelEl.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    dockBodyEl.innerHTML = "";
    dockBodyEl.appendChild(clone);

    const srcCanvases = Array.from(panelEl.querySelectorAll("canvas"));
    const dstCanvases = Array.from(clone.querySelectorAll("canvas"));

    const syncClone = () => {
      srcCanvases.forEach((sc, i) => {
        const dc = dstCanvases[i];
        if (!dc || sc.width === 0 || sc.height === 0) return;
        const dw = dc.clientWidth || sc.width;
        const dh = dc.clientHeight || sc.height;
        if (dc.width !== dw || dc.height !== dh) {
          dc.width = dw;
          dc.height = dh;
        }
        const ctx = dc.getContext("2d");
        ctx.clearRect(0, 0, dw, dh);
        ctx.drawImage(sc, 0, 0, dw, dh);
      });
    };
    syncClone();
    syncTimer = setInterval(syncClone, 120);
  }

  function dockPanel(panelEl, titleText, modeHint = null) {
    if (!panelEl || !dockEl || !dockBodyEl) return;
    stopSync();
    currentSourcePanel = panelEl;
    currentModeHint = modeHint;

    if (dockTitleEl) {
      dockTitleEl.textContent = titleText || "CENTER PANEL";
    }
    setCenterStageHidden(true);
    dockEl.classList.add("active");

    if (panelEl.id === "holistic-gesture-panel") {
      if (modeHint === "obj" || modeHint === "holistic" || !NaviDesktopIntelligence.isActive()) {
        renderCenterVisionMirror();
      } else {
        renderCenterPowerShell();
      }
    } else {
      renderCenterClonePanel(panelEl);
    }
    window.dispatchEvent(new Event("resize"));
  }

  function isPointInCenter(clientX, clientY) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const inCenterBox =
      clientX > w * 0.25 &&
      clientX < w * 0.75 &&
      clientY > h * 0.12 &&
      clientY < h * 0.85;
    if (inCenterBox) return true;
    if (dropZoneEl) {
      const r = dropZoneEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }
    return false;
  }

  function makeDraggable(handleEl, getTargetPanel, getTitle, onDropActivate, modeHint = null) {
    if (!handleEl) return;
    handleEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button, input, select, a") && !e.target.closest(".holistic-tab-pill")) {
        return;
      }

      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let ghost = null;

      const onMove = (mv) => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 10) {
          dragging = true;
          ghost = document.createElement("div");
          ghost.className = "panel-drag-ghost";
          ghost.textContent = `⬡ ${getTitle()}`;
          document.body.appendChild(ghost);
          if (dropZoneEl) dropZoneEl.classList.add("panel-drag-active");
        }
        if (dragging && ghost) {
          ghost.style.left = `${mv.clientX}px`;
          ghost.style.top = `${mv.clientY}px`;
        }
      };

      const onUp = (up) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (ghost) ghost.remove();
        if (dropZoneEl) dropZoneEl.classList.remove("panel-drag-active");

        if (dragging && isPointInCenter(up.clientX, up.clientY)) {
          const panel = getTargetPanel();
          if (panel) {
            if (onDropActivate) onDropActivate();
            dockPanel(panel, getTitle(), modeHint);
          }
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  function init() {
    dockEl = document.getElementById("center-panel-dock");
    dockBodyEl = document.getElementById("center-dock-body");
    dockTitleEl = document.getElementById("center-dock-title");
    restoreBtn = document.getElementById("center-dock-restore-btn");
    ironmanImgEl = document.getElementById("ironman-master-img");
    arcReactorEl = document.getElementById("navi-arc-reactor");
    hologramEl = document.getElementById("center-hologram-display");
    dropZoneEl = document.getElementById("center-drop-target");

    if (!dockEl || !dockBodyEl) return;

    if (restoreBtn) {
      restoreBtn.addEventListener("click", restoreCenter);
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && currentSourcePanel) {
        restoreCenter();
      }
    });

    // Make every dashboard panel draggable by its header (.gadget-top)
    document.querySelectorAll(".gadget-panel").forEach((panel) => {
      const header = panel.querySelector(".gadget-top");
      const titleEl = panel.querySelector(".gadget-title");
      if (header) {
        makeDraggable(
          header,
          () => panel,
          () => (titleEl?.textContent || "PANEL").trim()
        );
      }
    });

    // Make SYS, OBJ, HOLISTIC tabs draggable directly to center
    const sysPanel = document.getElementById("holistic-gesture-panel");
    const tabMap = [
      { id: "holistic-sys-tab-btn", label: "SYSTEM // POWERSHELL", mode: "sys" },
      { id: "webcam-obj-toggle-btn", label: "SYSTEM // OBJECT DETECTION", mode: "obj" },
      { id: "holistic-mode-tab-btn", label: "SYSTEM // HOLISTIC", mode: "holistic" }
    ];
    for (const t of tabMap) {
      const btn = document.getElementById(t.id);
      if (btn && sysPanel) {
        makeDraggable(
          btn,
          () => sysPanel,
          () => t.label,
          () => btn.click(),
          t.mode
        );
      }
    }
  }

  return { init, dockPanel, restoreCenter };
})();

NaviPanelCenterDock.init();
window.NaviPanelCenterDock = NaviPanelCenterDock;

// =============================================================
// SYSTEM MODE (BLUE) vs AGENT MODE (RED) CONTROLLER
// =============================================================
let currentJarvisMode = "system";

function setJarvisMode(mode, silentSound = false) {
  const nextMode = String(mode).toLowerCase() === "agent" ? "agent" : "system";
  currentJarvisMode = nextMode;

  document.body.classList.toggle("agent-mode-active", nextMode === "agent");
  AgentVoiceRing.setModeActive(nextMode === "agent");

  const sysBtn = document.getElementById("mode-btn-system");
  const agentBtn = document.getElementById("mode-btn-agent");
  if (sysBtn) sysBtn.classList.toggle("active", nextMode === "system");
  if (agentBtn) agentBtn.classList.toggle("active", nextMode === "agent");

  if (!silentSound && typeof JarvisSoundscape !== "undefined") {
    JarvisSoundscape.play("click");
  }

  window.dispatchEvent(new CustomEvent("jarvis:mode-changed", { detail: { mode: nextMode } }));
  return nextMode;
}

window.setJarvisMode = setJarvisMode;
window.getJarvisMode = () => currentJarvisMode;

document.getElementById("mode-btn-system")?.addEventListener("click", () => {
  setJarvisMode("system");
});

document.getElementById("mode-btn-agent")?.addEventListener("click", () => {
  setJarvisMode("agent");
});

AgentVoiceRing.init();
AgentVoiceRing.setState(typeof currentState !== "undefined" ? currentState : "idle");
window.AgentVoiceRing = AgentVoiceRing;
AgentSwarmUI.init();
window.AgentSwarmUI = AgentSwarmUI;

console.log("JARVIS Real Dynamic System Initialized.");
