# J.A.R.V.I.S. // STARK AI SYSTEM CONTROLLER

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20Brain-black.svg)](https://ollama.ai/)
[![Windows](https://img.shields.io/badge/OS-Windows%2011%20%2F%2010-0078D6.svg)](https://microsoft.com/windows)

**J.A.R.V.I.S.** (Just A Rather Very Intelligent System) is an autonomous, real-time AI desktop assistant for Windows. Engineered with a **Tauri v2 + Rust backend** and powered locally by **Ollama (Qwen Neural Core)** as its primary brain, J.A.R.V.I.S. provides end-to-end voice and text command execution, live hardware telemetry, a real-time token decoding matrix, an uncompressed Stark Industries holographic HUD, and comprehensive multi-agent automation.

---

## ⚡ Core Architectural Pillars

### 1. Local Neural "Queen Model" Brain & Token Streaming
- **100% Private & Local**: Runs locally via Ollama with zero external API dependencies or cloud latency.
- **Model Architecture**: Optimized for `qwen3.5:2b` (and `qwen2.5:1.5b` / `qwen2.5:0.5b` for sub-second responses) with `keep_alive: 24h`, multi-threaded tensor evaluation, and zero temperature for deterministic instruction following.
- **Word-by-Word Token Streaming**: Emits live `jarvis://stream_token` events into the HUD visor display via Tauri event channels, eliminating perceived generation delays.
- **Strict Single-Dispatch Protocol**: Structured single-action JSON commands (`open_app`, `close_app`, `run_cmd`, `system_ctrl`, `click_element`, `none`) with zero markdown clutter, preventing duplicate process launches.
- **Sub-5ms Fast-Path Engine**: Common system directives (e.g. `open notepad`, `open vs code`, `lock screen`, `start with windows`) resolve instantly via heuristic dispatch.

### 2. Dual Voice Engine & Offline Wake-Word Spotting
- **Silent Windows Speech Engine**: Leverages Windows `System.Speech` Recognition Engine in a 100% silent background worker (`CREATE_NO_WINDOW`, `-WindowStyle Hidden`).
- **Offline Wake-Word Detection**: Continuous background spotting for "Hey Jarvis" / "Jarvis" emitting `jarvis://wake_word` events without cloud dependencies.
- **Dual Speech Delivery (TTS)**: Local offline neural Piper TTS model (`localhost:5000`) with Paul Bettany British acoustic voice matrix fallback (`en-GB`, pitch 0.92, rate 1.02).
- **Voice Barge-In**: Instant audio interruption — speaking a new command or saying *"stop"* / *"cancel"* halts speech immediately without disabling the microphone.
- **Acoustic Phonetic Normalizer**: Maps common acoustic speech-to-text distortions (e.g., *"open not bad"* $\rightarrow$ *"open notepad"*).

### 3. 100% Dynamic Telemetry & Token Activity
- **Hardware Telemetry (Sysinfo & Win32)**:
  - **Processor (CPU)**: Live kernel utilization percentage, processor model name (`Intel Core i7-8700B`), and physical/logical core counts.
  - **Memory (RAM)**: Live physical RAM allocation and percentage of total capacity.
  - **Graphics (GPU)**: Dynamic Windows Performance Counter sampling for live engine utilization.
  - **Network I/O**: Real-time adapter RX/TX transfer bandwidth with rolling sparklines.
  - **Active Running Apps**: Live enumeration of taskbar windows via Win32 `EnumWindows`—clicking any app chip focuses or restores the window.
  - **Microphone Hardware**: Real-time Win32 `waveInGetNumDevs` device polling.
- **Token Activity Matrix**:
  - **256-Slot Dynamic Matrix**: Live 8×32 token grid visualizing prompt tokens, generated tokens, KV cache slots, and decoding speed (tokens/sec).
  - **Token Inspector**: Hovering over matrix slots inspects actual subwords, vocabulary IDs, and softmax probabilities.
- **Live Environmental Data**: Millisecond clock, localized timezone, and real-time live GPS/IP weather from Open-Meteo.

### 4. Holographic Notification Toasts & Android Mirroring
- **Holographic Notification Overlay**: Semi-transparent cyber glass notification toasts with slide-in animations and audio chimes.
- **ADB Phone Mirroring**: Automatically polls Android notification buffer (`dumpsys notification`) to mirror WhatsApp, Telegram, Slack, Mail, and Phone calls directly to the HUD.
- **Live Battery & Temp Telemetry**: Queries connected phone battery percentage, charging state, and battery temperature.

### 5. Windows UI Automation (UIA Engine) & Auto-Startup
- **Zero-Coordinate Element Clicking**: Inspects visible child controls in foreground windows via Win32 `EnumChildWindows`, computing bounding rectangles to target and click controls by name without user-provided pixel coordinates.
- **Windows Auto-Startup**: Native Windows Registry Run key automation (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`), toggled via voice directives (*"enable auto startup"*, *"start with windows"*).

---

## 📁 Project Structure

```
Jarvis/
├── Jarvis.exe                      # Compiled standalone Windows executable (14.86 MB)
├── package.json                    # Project configuration and build scripts
├── README.md                       # Master system documentation
├── SKILLS.md                       # Action taxonomy, skill registry & tool definitions
├── AGENTS.md                       # Agent architecture, prompt rules & multi-agent roadmap
├── phone_config.json               # Android ADB endpoint and wireless configuration
│
├── src/                            # Frontend Holographic UI (HTML5, CSS3, ES Modules)
│   ├── index.html                  # HUD layout, Visor, Blueprint, Matrix, Toasts & Stage
│   ├── main.js                     # Master coordinator and lifecycle orchestration
│   ├── styles.css                  # Sci-fi holographic neon styling & toast animations
│   ├── assets/                     # 4K Iron Man plate & rotating Arc Reactor layers
│   │
│   └── modules/                    # Focused ES Modules
│       ├── soundscape.js           # Pure Web Audio procedural sci-fi synthesizer
│       ├── notifications.js        # HUD holographic notification toasts & ADB mirroring
│       ├── dialer.js               # Holographic phone dial pad & call state manager
│       ├── telemetry.js            # Live hardware and phone telemetry fetchers
│       └── ai.js                   # Queen neural streaming client & model puller
│
├── src-tauri/                      # Native Rust Core Backend
│   ├── Cargo.toml                  # Rust dependencies (Tauri, Sysinfo, Reqwest, Tokio, Windows)
│   ├── tauri.conf.json             # Tauri window, security & capability settings
│   └── src/
│       ├── main.rs                 # Tauri application entrypoint
│       └── lib.rs                  # Core backend: IPC commands, Win32 API, Ollama client & UIA
│
└── scripts/
    ├── copy-exe.js                 # Automated release binary extraction script
    └── speech_worker.ps1           # Silent background speech recognition & wake-word worker
```

---

## 🚀 Getting Started

### Prerequisites
- **Windows 10 / 11 (64-bit)**
- **Ollama**: Installed and running locally at `http://127.0.0.1:11434`
  ```powershell
  ollama pull qwen3.5:2b
  ```
- **Node.js**: v18+ & **pnpm** (or npm)
- **Rust Toolchain**: `rustc` and `cargo`

### Quick Launch
To run the pre-compiled high-performance binary:
```powershell
.\Jarvis.exe
```

### Development Mode
To run the application with live hot-reloading:
```powershell
pnpm install
pnpm run tauri dev
```

### Production Build
To compile the release binary and bundle it directly to `./Jarvis.exe`:
```powershell
pnpm run build:exe
```

---

## 📋 Data Policy: 100% Dynamic

All telemetry and data across J.A.R.V.I.S. is strictly dynamic:

| Category | Status | Data Source |
| :--- | :--- | :--- |
| **CPU Telemetry** | **100% Dynamic** | Windows kernel query via `sysinfo::System`. |
| **RAM Telemetry** | **100% Dynamic** | Physical memory allocation from `sysinfo::System`. |
| **GPU Telemetry** | **100% Dynamic** | Windows Performance Counter `\GPU Engine(*)\Utilization Percentage`. |
| **Network I/O** | **100% Dynamic** | Live interface packet counters from `sysinfo::Networks`. |
| **Phone Telemetry** | **100% Dynamic** | Live ADB queries (`dumpsys battery`, `dumpsys notification`). |
| **Model Telemetry** | **100% Dynamic** | Queried dynamically from Ollama `/api/ps` endpoint. |
| **Token Usage & Speed** | **100% Dynamic** | Live inference counters (`prompt_eval_count`, `eval_count`, tokens/sec). |
| **Active Running Apps** | **100% Dynamic** | Real-time Win32 `EnumWindows` scan of top-level taskbar processes. |
| **Microphone Hardware** | **100% Dynamic** | Windows Multimedia API `waveInGetNumDevs`. |
| **Weather & Time** | **100% Dynamic** | Open-Meteo GPS/IP weather API + system hardware clock. |

---

## 📄 License & Attribution

Designed and engineered for **Stark AI System Controller** environments.  
Built on [Tauri v2](https://tauri.app/), [Rust](https://www.rust-lang.org/), and [Ollama](https://ollama.ai/).
