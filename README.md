# J.A.R.V.I.S. // STARK AI SYSTEM CONTROLLER

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-Flash%20Primary-4285F4.svg)](https://ai.google.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20Brain-black.svg)](https://ollama.ai/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector%20(OCI)-336791.svg)](https://cloud.oracle.com/)
[![Windows](https://img.shields.io/badge/OS-Windows%2011%20%2F%2010-0078D6.svg)](https://microsoft.com/windows)

**J.A.R.V.I.S.** (Just A Rather Very Intelligent System) is an autonomous, real-time AI desktop assistant for Windows. Engineered with a **Tauri v2 + Rust backend**, powered by a **Zero-Compromise Dual Brain (Google Gemini Flash Primary + Local Ollama Fallback)**, persistent **OCI PostgreSQL + `pgvector`** memory, **LiveKit + Deepgram Flux + Cartesia Sonic** real-time voice streaming, a holographic HUD Visor, and comprehensive multi-agent automation.

---

## ⚡ Core Architectural Pillars

### 1. Dual Intelligence Brain & Socratic Debate Engine
* **Primary Cloud Brain (Gemini Flash via `google.genai`)**: Blistering Time-to-First-Token (~150–250ms) and 100+ tokens/sec streaming throughput.
* **Offline Local Brain (Ollama Qwen / Llama 3.2)**: 100% private, local fallback when offline. Zero crash guarantee.
* **Socratic Debate Mode**: Critical thinking engine that identifies logical flaws, formulates robust counter-arguments, and engages in natural back-and-forth debate without generic disclaimers.
* **Temporal Context Injector**: Dynamically injects live calendar date, day of week, millisecond local clock, timezone, and system metrics on every turn so J.A.R.V.I.S. always knows "now."

### 2. Zero-Compromise Real-Time Voice Engine
* **Voice Streaming Framework (LiveKit Agents)**: Sub-second WebRTC audio pipeline with dynamic turn detection and full barge-in interruption.
* **Speech-to-Text (Deepgram Flux)**: Conversational endpointing acting as the single turn authority (eliminates competing VAD jitter).
* **Text-to-Speech (Cartesia Sonic)**: Ultra-realistic conversational human voice (~90ms latency) with natural inflection and pacing.
* **Offline TTS Fallback (Piper ONNX)**: Local neural voice synthesis ensuring J.A.R.V.I.S. is never muted if internet drops.
* **Hardware Audio Binding**: Direct full-duplex Windows microphone and speaker stream integration via `sounddevice`.

### 3. Long-Term Memory & Hybrid RAG (Oracle Cloud OCI)
* **PostgreSQL + `pgvector` Cluster**: Hosted on your Oracle Cloud Infrastructure (OCI Hyderabad) instance. Unifies relational user memory, conversation logs, and document vector embeddings.
* **Mem0 Personal Memory Layer**: Automatically extracts user facts, preferences, habits, and ongoing tasks across sessions.
* **Offline Write-Ahead Buffer**: When disconnected from OCI, new memories append to a local queue (`data/cache/offline_sync_queue.jsonl`) and automatically flush to PostgreSQL upon reconnecting.
* **Live Web Research (Tavily AI)**: Real-time web fact retrieval with verified source URL citations.

### 4. 100% Dynamic Telemetry & Token Activity Matrix
* **Hardware Telemetry (Sysinfo & Win32)**:
  * **Processor (CPU)**: Live kernel utilization percentage, processor model name, and physical/logical core counts.
  * **Memory (RAM)**: Live physical RAM allocation and percentage of total capacity.
  * **Graphics (GPU)**: Dynamic Windows Performance Counter sampling for live engine utilization.
  * **Network I/O**: Real-time adapter RX/TX transfer bandwidth with rolling sparklines.
  * **Active Running Apps**: Live enumeration of taskbar windows via Win32 `EnumWindows`.
  * **Pipeline Telemetry**: Active millisecond TTFA profiler tracking STT latency, LLM TTFT, and TTS TTFA.
* **Token Activity Matrix**: 256-slot dynamic grid visualizing prompt tokens, generated tokens, and decoding speed.

### 5. Holographic Notification Toasts & Android ADB Mirroring
* **Notification Overlay**: Semi-transparent cyber glass notification toasts with slide-in animations.
* **ADB Phone Mirroring**: Automatically polls Android notification buffer (`dumpsys notification`) to mirror WhatsApp, Telegram, Slack, Mail, and Phone calls directly to the HUD.
* **Live Phone Telemetry**: Battery percentage, charging state, and temperature monitoring.

### 6. Windows UI Automation (UIA) & nAvI Labs Particle Matrix
* **Zero-Coordinate Element Clicking**: Inspects visible controls in foreground windows via Win32 `EnumChildWindows`, computing bounding rectangles to target controls by name.
* **32,000 True-Color Point Cloud**: Direct canvas pixel-buffer rendering at sustained 60 FPS with micro-quantum particle shimmer.
* **5 High-Definition Holographic Avatars**: nAvI Labs (`navi`), Optimus Prime (`optimus`), Bumblebee (`bumblebee`), Spider-Man (`spiderman`), and Tactical Mecha Robo (`mecha`).

---

## 📁 Project Structure

```text
Jarvis/
├── Jarvis.exe                      # Standalone Windows executable (15 MB)
├── package.json                    # Project configuration and build scripts
├── README.md                       # Master system documentation
├── SKILLS.md                       # Action taxonomy, skill registry & tool definitions
├── AGENTS.md                       # Agent architecture & multi-agent orchestration
├── requirements.txt                # Python dependencies for neural voice & memory engines
├── config.py                       # Central configuration & environment loader
├── .env.example                    # Template for cloud API keys and OCI PostgreSQL
│
├── core/                           # Python Intelligence & Context Engines
│   ├── context.py                  # Dynamic real-time date/time/hardware context
│   ├── persona.py                  # Socratic debate & conversational persona
│   ├── llm_client.py               # Gemini Flash streaming (google.genai) + Ollama fallback
│   └── telemetry.py                # Millisecond TTFA & latency tracker
│
├── voice/                          # LiveKit Real-Time Audio Pipeline
│   ├── audio_device_binding.py     # Windows microphone & speaker hardware capture
│   ├── livekit_audio_bridge.py     # Full-duplex WebRTC audio bridge & hardware test
│   ├── livekit_worker.py           # LiveKit voice worker with Deepgram Flux & Cartesia
│   └── tts_piper.py                # Local offline Piper TTS failover
│
├── memory/                         # OCI Database & Memory Layer
│   ├── db_postgres.py              # PostgreSQL + pgvector connection pool
│   └── sync_queue.py               # Offline write-ahead queue & auto-sync engine
│
├── tools/                          # External Integrations & Tooling
│   ├── web_search.py               # Tavily real-time research with citations
│   ├── platform-tools/             # Android ADB binaries
│   └── pair_qr.bat                 # Wireless ADB pairing script
│
├── src/                            # Frontend Holographic UI (HTML5, CSS3, ES Modules)
│   ├── index.html                  # HUD layout, Visor, Blueprint, Matrix & Stage
│   ├── main.js                     # Master coordinator and lifecycle orchestration
│   ├── styles.css                  # Sci-fi holographic neon styling
│   ├── assets/                     # Sound assets & human_particles_preset.js
│   └── modules/                    # Focused ES Modules (ai, dialer, notifications, soundscape, telemetry)
│
└── src-tauri/                      # Native Rust Core Backend
    ├── Cargo.toml                  # Rust dependencies (Tauri, Sysinfo, Reqwest, Tokio, Windows)
    ├── tauri.conf.json             # Tauri window, security & capability settings
    └── src/
        ├── main.rs                 # Tauri application entrypoint
        └── lib.rs                  # Core backend: IPC commands, Win32 API, Ollama client & UIA
```

---

## 🚀 Quickstart Guide

### 1. Python Neural Backend Setup
```powershell
# Navigate to Jarvis project
cd C:\Users\Chowdary\Desktop\Project\Jarvis

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and add your keys:
* `GEMINI_API_KEY`: Google Gemini API key
* `DEEPGRAM_API_KEY`: Deepgram conversational speech API key
* `CARTESIA_API_KEY`: Cartesia Sonic voice API key
* `TAVILY_API_KEY`: Tavily web search API key
* `PG_HOST`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`: OCI PostgreSQL credentials

### 3. Verify Audio Hardware
```powershell
.\.venv\Scripts\python.exe voice/livekit_audio_bridge.py
```

### 4. Run Desktop Application
```powershell
# Run the pre-compiled binary
.\Jarvis.exe

# Or run development mode with live reload
pnpm tauri dev
```
