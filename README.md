# JARVIS

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![Groq](https://img.shields.io/badge/Groq-LPU%20Primary-F55036.svg)](https://groq.com/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-Llama%203.3%2070B%20Optional-76B900.svg)](https://build.nvidia.com/)
[![Gemini](https://img.shields.io/badge/Gemini-Flash%20Cloud%20Backup-4285F4.svg)](https://ai.google.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Offline%20Fallback-black.svg)](https://ollama.ai/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector%20(OCI%20Hyderabad)-336791.svg)](https://cloud.oracle.com/)
[![Kokoro-82M](https://img.shields.io/badge/TTS-Kokoro--82M%20ONNX-FF6F00.svg)](https://github.com/hexgrad/kokoro)
[![Windows](https://img.shields.io/badge/OS-Windows%2011%20%2F%2010-0078D6.svg)](https://microsoft.com/windows)

**JARVIS** (Just A Rather Very Intelligent System) is an autonomous, real-time AI desktop assistant for Windows. Engineered with a **Tauri v2 + Rust backend**, powered by a **Zero-Compromise Multi-Tier Brain (Groq LPU / NVIDIA NIM Primary + Google Gemini Flash Cloud Backup + Local Ollama Fallback)**, persistent **OCI PostgreSQL + `pgvector`** memory, **Pipecat + Deepgram + Cartesia Sonic / Kokoro-82M Neural ONNX** voice streaming, **ECAPA-TDNN** speaker verification, **WebRTC AEC + RNNoise** audio enhancement, **Playwright** browser automation, and **100% dynamic runtime telemetry** with zero static or hardcoded data.

---

## ⚡ 1. Finalized Component Matrix

| Component | Primary (Online) | Fallback (Offline / Failover) | Technical Role |
| :--- | :--- | :--- | :--- |
| **Real-Time Voice Pipeline** | **Pipecat Voice Agent** (`voice/pipecat_voice_agent.py`) | Local Audio Loop | Manages full-duplex audio streams, VAD, barge-in, and turn handling. |
| **Audio Enhancement** | **WebRTC AEC3 (`pyaec`) + RNNoise** (`voice/audio_enhancer.py`) | Direct PCM Pass-Through | Acoustic echo cancellation and noise suppression on 16 kHz mono PCM. |
| **Speaker Verification** | **ECAPA-TDNN** (`voice/ecapa_verifier.py`) | Open Access (Unenrolled) | 192-d SpeechBrain speaker embeddings with anti-spoofing liveness checks. |
| **Speech-to-Text (STT)** | **Deepgram Flux** | **Faster-Whisper / Web Speech** (Local) | Real-time streaming transcription with conversational boundary awareness. |
| **Text-to-Speech (TTS)** | **Cartesia Sonic** | **Kokoro-82M ONNX + Piper TTS** | Primary: ~90ms conversational audio. Fallback: studio-quality local neural synthesis. |
| **Core LLM** | **Groq LPU** (`qwen/qwen3.8-27b`) / **NVIDIA NIM** (`llama-3.3-70b-instruct`) | **Gemini Flash** → **Ollama** (`llama3.2:3b`) | Multi-tier reasoning, Socratic debate, and local offline execution. |
| **Database & Vectors** | **PostgreSQL + pgvector** *(OCI Hyderabad)* | Local Buffer + Dead-Letter Sync Queue | Enterprise hybrid search (Full-Text + Vector), relational memory, and citations. |
| **Long-Term Memory** | **Mem0** *(PostgreSQL Backend)* | Local JSONL Write-Ahead Log | Extracts facts, preferences, and user profile data across sessions with sync. |
| **RAG & Citations** | **LlamaIndex** *(Hybrid Engine)* | Local Document Cache | Vector similarity + SQL full-text search with strict page/document citations. |
| **Live Web Research** | **Tavily Search API** (`tools/web_search.py`) | DuckDuckGo | Real-time news and factual validation with cited URLs and TTL caching. |
| **Browser Automation** | **Playwright Controller** (`tools/playwright_browser.py`) | Default System Browser | Persistent Chromium automation via local HTTP control on port `5006`. |
| **Telemetry & Metrics** | **Custom Pipeline Profiler** (`core/telemetry.py`) | Built-in | Tracks live Time-To-First-Audio (TTFA) and probes local service health. |
| **Security & Secrets** | **Windows DPAPI Vault** (`crypt32.dll`) | `.env.local` / `.env` | Hardware-bound credential encryption at rest without plaintext secrets. |

---

## 🧠 2. Core Architectural Pillars

### 1. Multi-Tier Cognitive Hierarchy & Socratic Debate Engine
* **Tier 1 (Primary Online): Groq LPU (`qwen/qwen3.8-27b`) & Optional NVIDIA NIM (`meta/llama-3.3-70b-instruct`)**: Ultra-low-latency reasoning, Socratic debate, counter-arguments, and structured action dispatch with circuit breakers and cooldown jitter.
* **Tier 2 (Cloud Backup): Google Gemini Flash (`gemini-3.5-flash-lite`)**: High-speed secondary cloud backup that takes over automatically on rate limits or latency spikes.
* **Tier 3 (Local Fallback): Ollama (`llama3.2:3b`)**: 100% private, offline fallback ensuring JARVIS never fails during internet outages.
* **Dynamic Temporal & Weather Context**: `TemporalContext` (`core/context.py`) dynamically reads the host's live system timezone and CPU/RAM metrics, while the HUD weather engine (`src/main.js`) resolves coordinates dynamically via IP geolocation (`ipapi.co` / `ipwho.is`) and fetches live Open-Meteo telemetry without hardcoded locations or fabricated offline estimates.

### 2. Real-Time Voice Engine, Audio Enhancement & ECAPA-TDNN
* **Unified Anti-Collision Voice Arbiter**: Prevents overlapping responses by wrapping speech synthesis in a Promise-based lock (`processDirective`), ensuring single-voice natural flow.
* **Background System Audio Ducking**: Automatically pauses or ducks other PC audio sessions via `set_system_ducking` when listening or speaking.
* **Acoustic Echo Cancellation & Voiceprint Verification**: `AudioEnhancer` (`voice/audio_enhancer.py`) cancels far-end TTS playback echoes, while `EcapaSpeakerVerifier` (`voice/ecapa_verifier.py`) authenticates sensitive commands using 192-d speaker embeddings.
* **Kokoro-82M Local Neural Voice**: Local ONNX neural TTS service (`scripts/neural_tts_service.py`) running on `localhost:5000` with `voice/tts_piper.py` fallback.

### 3. Windows DPAPI Key Vault & Kernel Process Lifecycle
* **Windows Credential Manager / DPAPI**: Directly interfaces with `crypt32.dll` (`CryptProtectData` & `CryptUnprotectData`) to encrypt API keys at rest in `data/vault.enc`.
* **Kernel Job Object Binding**: Binds all child worker processes (`pipecat_voice_agent.py`, `neural_tts_service.py`, `playwright_browser.py`, `llm_client.py`) to Windows kernel Job Objects with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, ensuring zero orphan processes on exit.
* **Dynamic Permission Policies**: `src-tauri/src/permissions.rs` enforces configurable `Allow` / `Ask` / `Deny` rules across system actions.

### 4. Long-Term Memory & Hybrid RAG (Oracle Cloud OCI)
* **OCI PostgreSQL + `pgvector` Cluster**: Unified relational storage for user profiles, ongoing tasks, conversation logs, and vector embeddings.
* **Mem0 Personal Memory Store & LlamaIndex Hybrid RAG**: Tracks facts and ingests local documents with strict citations.
* **Resilient Write-Ahead Buffer & Dead-Letter Queue**: Writes are locally buffered to `data/cache/offline_sync_queue.jsonl` during network outages with exponential backoff and `sync_memory_cloud`.

### 5. Desktop Intelligence, WGC Capture & Holographic HUD
* **Desktop Intelligence (`src-tauri/src/desktop_intel.rs`)**: Multi-monitor enumeration, Windows Graphics Capture (WGC) with GDI fallback, Win32 UI Automation (`EnumChildWindows`), and Windows Native OCR.
* **Dynamic Phone Sync Radar & Directory**: Discovers Android devices dynamically via USB ADB and mDNS (`_adb._tcp`, `_adb-tls-connect._tcp`) without static IPs or embedded device configs, paired with a user-managed `data/telephone_directory.json`.
* **Hardware Telemetry & Token Activity Matrix**: Live CPU, RAM, GPU, and network RX/TX counters via `sysinfo` + Win32, plus a 256-slot Token Activity Matrix and Page Visibility frame throttling.
* **Real-Time MediaPipe Vision & Object Detection**: On-device `efficientdet_lite0.tflite`, `efficientnet_lite0.tflite`, and `holistic_landmarker.task` running via WebAssembly/WebGL.

---

## 📁 Project Structure

```text
Jarvis/
├── Jarvis.exe                      # Production Windows executable
├── package.json                    # Project configuration and Tauri build scripts
├── README.md                       # Master system documentation
├── SKILLS.md                       # Action taxonomy, skill registry & tool definitions
├── AGENTS.md                       # Agent architecture & multi-agent orchestration
├── requirements.txt                # Python dependencies for neural voice & memory engines
├── config.py                       # Central configuration, DPAPI vault & env loader
├── .env.example                    # Template for cloud API keys and OCI PostgreSQL
│
├── core/                           # Python Intelligence & Context Engines
│   ├── context.py                  # Dynamic live timezone & hardware context injector
│   ├── persona.py                  # Socratic debate & conversational persona
│   ├── llm_client.py               # Multi-Tier Router (Groq/NVIDIA -> Gemini -> Ollama)
│   ├── speculative.py              # Speculative draft & discard turn agent
│   ├── task_planner.py             # Autonomous multi-step compound action planner
│   ├── skills_registry.py          # Dynamic skill loader & macro registry
│   └── telemetry.py                # Millisecond TTFA & component health diagnostics
│
├── skills/                         # Dynamic user-extensible skill manifests & macros
│   ├── build_jarvis_exe.json       # Rebuild Jarvis Windows executable
│   ├── developer_workspace.json    # Dev layout macro (VS Code + Chrome split)
│   ├── dev_terminal.json           # Open Windows Terminal in project root
│   ├── git_status_check.json       # Inspect git status & diff summary
│   ├── run_tests_suite.json        # Run automated unit tests
│   └── system_diagnostics.json     # Full hardware telemetry report macro
│
├── voice/                          # Real-Time Audio & Speaker Verification Pipeline
│   ├── audio_device_binding.py     # Windows microphone & speaker hardware capture
│   ├── audio_enhancer.py           # WebRTC AEC3 (pyaec) & RNNoise enhancement
│   ├── ecapa_verifier.py           # SpeechBrain ECAPA-TDNN speaker verification
│   ├── pipecat_voice_agent.py      # Pipecat full-duplex voice agent
│   └── tts_piper.py                # Local offline Piper / Kokoro TTS failover
│
├── memory/                         # OCI Database & Memory Layer
│   ├── db_postgres.py              # PostgreSQL + pgvector connection pool
│   ├── mem0_store.py               # Mem0 long-term memory store (PostgreSQL)
│   ├── rag_engine.py               # LlamaIndex hybrid retrieval with citations
│   └── sync_queue.py               # Offline write-ahead queue & auto-sync engine
│
├── tools/                          # External Integrations & Tooling
│   ├── web_search.py               # Tavily real-time research with DuckDuckGo fallback
│   ├── dev_tools.py                # Git, venv/uv/Node/Cargo doctor & test runner
│   ├── playwright_browser.py       # Persistent Chromium Playwright controller (port 5006)
│   ├── platform-tools/             # Android ADB binaries (adb.exe, AdbWinApi.dll, etc.)
│   └── pair_qr.bat                 # Wireless ADB pairing script
│
├── models/                         # Local Neural Models
│   └── kokoro/                     # Kokoro-82M ONNX model weights, voices & tokenizer
│
├── data/                           # Runtime State & Cache
│   ├── telephone_directory.json    # Dynamic user-managed contact directory
│   └── cache/                      # Write-ahead offline sync buffer & dead-letter logs
│
├── scripts/                        # Automation & Native Workers
│   ├── neural_tts_service.py       # Kokoro-82M ONNX local HTTP synthesis daemon (port 5000)
│   ├── setup-env.js                # Environment setup script
│   ├── copy-exe.js                 # Production binary bundler
│   └── asset_generators/           # Offline hologram asset generation utilities
│
├── tests/                          # Automated Test Suites
│   ├── test_core.py                # Core context, LLM router, speculative, planner & skills tests
│   ├── test_memory.py              # Offline sync queue & BM25 RAG tests
│   ├── test_tools.py               # Web search, DevTools & skills loading tests
│   └── test_jarvis_brain.mjs       # End-to-end JS brain & action dispatch test
│
├── src/                            # Frontend Holographic UI (HTML5, CSS3, ES Modules)
│   ├── index.html                  # HUD layout, Visor, Matrix & Stage
│   ├── main.js                     # Master coordinator and lifecycle orchestration
│   ├── styles.css                  # Sci-fi holographic neon styling
│   ├── assets/                     # Visual assets & human_particles_preset.js
│   ├── vendor/mediapipe/           # Local MediaPipe Tasks Vision WASM & TFLite models
│   └── modules/                    # Focused ES Modules (ai, dialer, notifications, planner, soundscape, telemetry)
│
└── src-tauri/                      # Native Rust Core Backend
    ├── Cargo.toml                  # Rust dependencies (Tauri, Sysinfo, Reqwest, Tokio, Windows)
    ├── tauri.conf.json             # Tauri window, security & capability settings
    └── src/
        ├── main.rs                 # Tauri application entrypoint
        ├── lib.rs                  # Core backend: IPC commands, Win32 API, LLM & ADB
        ├── desktop_intel.rs        # WGC/GDI screen capture, UIA tree & Windows Native OCR
        └── permissions.rs          # Dynamic tool & action permission policy manager
```

---

## 🚀 Quickstart Guide

### 1. Python Neural Backend Setup
```powershell
cd C:\Users\Chowdary\Desktop\Project\Jarvis
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and add your keys:
* `GROQ_API_KEY`: Groq LPU API key (Primary low-latency LLM)
* `NVIDIA_API_KEY`: NVIDIA NIM API key (`meta/llama-3.3-70b-instruct`, optional)
* `GEMINI_API_KEY`: Google Gemini API key (Cloud backup & multimodal vision)
* `DEEPGRAM_API_KEY`: Deepgram conversational speech API key
* `CARTESIA_API_KEY`: Cartesia Sonic voice API key
* `TAVILY_API_KEY`: Tavily web search API key
* `PG_HOST`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`: OCI PostgreSQL credentials

### 3. Run Automated Tests
```powershell
# Python test suite
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

# Rust backend library tests
cargo test --manifest-path src-tauri\Cargo.toml --lib
```

### 4. Build & Run Desktop Application
```powershell
npm run build:exe
.\Run_Jarvis.bat
```
