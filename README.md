# J.A.R.V.I.S. // STARK AI SYSTEM CONTROLLER

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20Brain-black.svg)](https://ollama.ai/)
[![Windows](https://img.shields.io/badge/OS-Windows%2011%20%2F%2010-0078D6.svg)](https://microsoft.com/windows)

**J.A.R.V.I.S.** (Just A Rather Very Intelligent System) is an autonomous, real-time AI desktop assistant for Windows. Engineered with a **Tauri v2 + Rust backend** and powered locally by **Ollama (Qwen Neural Core)** as its primary brain, J.A.R.V.I.S. provides end-to-end voice and text command execution, live hardware telemetry, a real-time token decoding matrix, and an uncompressed Stark Industries holographic HUD.

---

## ⚡ Core Architectural Pillars

### 1. Local Neural "Queen Model" Brain
- **100% Private & Local**: Runs locally via Ollama with zero external API dependencies or cloud latency.
- **Model Architecture**: Optimized for `qwen3.5:2b` (and `qwen2.5:1.5b` / `qwen2.5:0.5b` for sub-second responses) with `keep_alive: 24h`, multi-threaded tensor evaluation, and zero temperature for deterministic instruction following.
- **Strict Single-Dispatch JSON Protocol**: The model outputs structured single-action JSON commands (`open_app`, `close_app`, `run_cmd`, `system_ctrl`, `none`) with zero markdown clutter, preventing duplicate process launches.
- **Fast-Path Engine**: Common system directives (e.g. `open notepad`, `open vs code`, `lock screen`) resolve instantly via sub-5ms heuristic dispatch while maintaining model thinking for natural queries.

### 2. Dual Voice & Text Directive Interface
- **Silent Windows Speech Engine**: Leverages Windows `System.Speech` Recognition Engine in a 100% silent background worker (`CREATE_NO_WINDOW`, `-WindowStyle Hidden`). No console or PowerShell windows ever pop up.
- **High-Accuracy Weighted Grammar**: Prioritizes common system verbs and application keywords (`Weight = 1.0`) over general vocabulary (`Weight = 0.3`), eliminating phonetic misrecognition of acronyms like "VS Code" or "Calc".
- **Visual Input Verification**: Captured voice commands immediately populate `#visor-cmd-input` and display on the visor dialogue line in real time so the user can verify the recognized directive.
- **Acoustic Phonetic Normalizer**: Maps common acoustic speech-to-text distortions (e.g., *"open not bad"* $\rightarrow$ *"open notepad"*, *"open west coast"* $\rightarrow$ *"open vs code"*).
- **Responsive Cutoff**: Configured with a 600ms silence timeout to eliminate lingering delays after speech concludes.

### 3. 100% Dynamic Telemetry & Token Activity
- **Hardware Telemetry (Sysinfo & Win32)**:
  - **Processor (CPU)**: Live kernel utilization percentage, processor model name (`Intel Core i7-8700B`), and physical/logical core counts.
  - **Memory (RAM)**: Live physical RAM usage and percentage of total capacity.
  - **Network I/O**: Real-time adapter RX/TX transfer bandwidth with rolling sparklines.
  - **Active Running Apps**: Live enumeration of taskbar windows via Win32 `EnumWindows`—clicking any app chip focuses or restores the window.
  - **Hardware Audio Detection**: Dynamic microphone polling via Win32 `waveInGetNumDevs`.
- **Token Activity Matrix**:
  - **256-Slot Dynamic Matrix**: Live 8×32 token grid visualizing prompt tokens, generated tokens, KV cache slots, and decoding speed (tokens/sec).
  - **Token Inspector**: Hovering over matrix slots inspects actual subwords, vocabulary IDs, and softmax probabilities.
- **Live Environmental Data**: Millisecond clock, localized timezone, and real-time live GPS/IP weather from Open-Meteo.

### 4. Stark Holographic HUD & Biometrics
- **Chest Arc Reactor**: Dynamic SVG rotor engine that shifts into blue-hot overdrive during model inference and vocal transmission.
- **Human Biometric Blueprint Panel**: Holographic male CAD wireframe, profile telemetry (Subject: NAVEEN, DOB: 10-05-1990), live vital stats (BPM, SpO2, BP), and neural ECG waveform.
- **Borderless App Dock**: Direct launchers for essential Windows communication and media tools (Phone Link, Outlook, WhatsApp, Spotify).

---

## 📁 Project Structure

```
Jarvis/
├── Jarvis.exe                      # Compiled standalone Windows executable (14.2 MB)
├── package.json                    # Project configuration and build scripts
├── README.md                       # Master system documentation
├── SKILLS.md                       # Action taxonomy, skill registry & tool definitions
├── AGENTS.md                       # Agent architecture, prompt rules & multi-agent roadmap
├── test_jarvis_brain.mjs           # Ollama brain latency benchmark suite
│
├── src/                            # Frontend Holographic UI (HTML5, CSS3, ES Modules)
│   ├── index.html                  # HUD layout, Visor, Blueprint, Matrix & Stage
│   ├── main.js                     # IPC client, speech controller, telemetry & matrix
│   ├── styles.css                  # Sci-fi holographic neon styling & animations
│   └── assets/                     # 4K uncompressed Iron Man plate & reactor layers
│
├── src-tauri/                      # Native Rust Core Backend
│   ├── Cargo.toml                  # Rust dependencies (Tauri, Sysinfo, Reqwest, Tokio, Windows)
│   ├── tauri.conf.json             # Tauri window, security & capability settings
│   └── src/
│       ├── main.rs                 # Tauri application entrypoint
│       └── lib.rs                  # Core backend: IPC commands, Win32 API, Ollama client & speech
│
└── scripts/
    └── copy-exe.js                 # Automated release binary extraction script
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

## 📋 Data Policy: Dynamic vs. Static Data

Per system specifications, all data across J.A.R.V.I.S. is strictly dynamic, with one explicit exception:

| Category | Status | Data Source |
| :--- | :--- | :--- |
| **Biometric Profile Block** | **Static / Fixed** *(Authorized)* | Subject Profile (`NAVEEN`, DOB `10-05-1990`), CAD Blueprint asset, target step baseline. |
| **CPU Telemetry** | **100% Dynamic** | Windows kernel query via `sysinfo::System`. |
| **RAM Telemetry** | **100% Dynamic** | Physical memory allocation from `sysinfo::System`. |
| **Network I/O** | **100% Dynamic** | Live interface packet counters from `sysinfo::Networks`. |
| **Model Telemetry** | **100% Dynamic** | Queried dynamically from Ollama `/api/ps` endpoint. |
| **Token Usage & Speed** | **100% Dynamic** | Live inference counters (`prompt_eval_count`, `eval_count`, tokens/sec). |
| **Active Running Apps** | **100% Dynamic** | Real-time Win32 `EnumWindows` scan of top-level taskbar processes. |
| **Microphone Hardware** | **100% Dynamic** | Windows Multimedia API `waveInGetNumDevs`. |
| **Weather & Time** | **100% Dynamic** | Open-Meteo GPS/IP weather API + system hardware clock. |

---

## 🖥️ System Requirements & Hardware Performance

| Component | Tested System | Recommended for < 200ms Voice Dialogue |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Enterprise (64-bit) | Windows 11 Pro / Enterprise |
| **Processor (CPU)** | Intel Core i7-8700B (6C / 12T) | Modern 8C / 16T CPU (Intel Core i7/i9 or Ryzen 7/9) |
| **Graphics (GPU)** | Intel UHD Graphics 630 (iGPU) | **NVIDIA RTX 3060 / 4060 or higher (8GB+ VRAM)** |
| **System RAM** | 64 GB DDR4 | 32 GB – 64 GB DDR4 / DDR5 |
| **Inference Latency** | ~2.5s (CPU AVX2 execution) | **< 200ms (CUDA GPU Tensor offloading)** |

> [!TIP]
> **Zero-Cost CPU Speedup**: If operating without a dedicated GPU, you can pull `qwen2.5:1.5b-instruct` (`ollama pull qwen2.5:1.5b`). This reduces token evaluation counts by over 40%, dropping voice response latency under 1 second entirely on CPU.

---

## 📄 License & Attribution

Designed and engineered for **Stark AI System Controller** environments.  
Built on [Tauri v2](https://tauri.app/), [Rust](https://www.rust-lang.org/), and [Ollama](https://ollama.ai/).
