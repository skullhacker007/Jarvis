# JARVIS

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue.svg)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-Llama%203.3%2070B%20Primary-76B900.svg)](https://build.nvidia.com/)
[![Gemini](https://img.shields.io/badge/Gemini-Flash%20Cloud%20Backup-4285F4.svg)](https://ai.google.dev/)
[![Ollama](https://img.shields.io/badge/Ollama-Offline%20Fallback-black.svg)](https://ollama.ai/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector%20(OCI%20Hyderabad)-336791.svg)](https://cloud.oracle.com/)
[![Kokoro-82M](https://img.shields.io/badge/TTS-Kokoro--82M%20ONNX-FF6F00.svg)](https://github.com/hexgrad/kokoro)
[![Windows](https://img.shields.io/badge/OS-Windows%2011%20%2F%2010-0078D6.svg)](https://microsoft.com/windows)

**JARVIS** (Just A Rather Very Intelligent System) is an autonomous, real-time AI desktop assistant for Windows. Engineered with a **Tauri v2 + Rust backend**, powered by a **Zero-Compromise 3-Tier Brain (NVIDIA Llama 3.3 70B Primary + Gemini Flash Cloud Backup + Local Ollama Fallback)**, persistent **OCI PostgreSQL + `pgvector`** memory, **LiveKit + Deepgram Flux + Cartesia Sonic / Kokoro-82M Neural ONNX** voice streaming, an Anti-Collision Vocal Matrix with acoustic feedback silencing, a holographic HUD Visor, and comprehensive multi-agent automation.

---

## ⚡ 1. Finalized Component Matrix

| Component | Primary (Online) | Fallback (Offline / Failover) | Technical Role |
| :--- | :--- | :--- | :--- |
| **Real-Time Engine** | **LiveKit Agents** | Local Audio Loop | Manages WebRTC audio streams, VAD, and bidirectional interruption handling. |
| **Speech-to-Text (STT)** | **Deepgram Flux** | **Faster-Whisper / Win32 SAPI** (Local) | Real-time streaming transcription with conversational boundary awareness. |
| **Turn Detection** | **Deepgram Flux Endpointing** *(Single Authority)* | Local VAD | Single master turn detector to avoid conflicting signals or false cutoffs. |
| **Text-to-Speech (TTS)** | **Cartesia Sonic** | **Kokoro-82M ONNX + Piper TTS** | Primary: ~90ms conversational audio. Fallback: studio-quality local neural synthesis. |
| **Core LLM** | **NVIDIA LLM API** (`llama-3.3-70b-instruct`) | **Ollama** (`llama3.2:3b` / `8b`) | Primary: high-speed 70B reasoning & debate. Fallback: local task execution. |
| **Database & Vectors** | **PostgreSQL + pgvector** *(OCI Hyderabad)* | Local Buffer + Dead-Letter Sync Queue | Enterprise hybrid search (Full-Text + Vector), relational memory, and citations. |
| **Long-Term Memory** | **Mem0** *(PostgreSQL Backend)* | Local JSONL Write-Ahead Log | Extracts facts, preferences, and user profile data across sessions with sync. |
| **RAG & Citations** | **LlamaIndex** *(Hybrid Engine)* | Local Document Cache | Vector similarity + SQL full-text search with strict page/document citations. |
| **Live Web Research** | **Tavily Search API** | DuckDuckGo | Real-time news and factual validation with cited URLs. |
| **Telemetry & Metrics** | **Custom Pipeline Profiler** | Built-in | Tracks live Time-To-First-Audio (TTFA) across STT, LLM, and TTS. |
| **Security & Secrets** | **Windows DPAPI Vault** (`crypt32.dll`) | Local Encrypted Buffer | Hardware-bound credential encryption at rest without plaintext `.env` risks. |

---

## 🧠 2. Core Architectural Pillars

### 1. 3-Tier Cognitive Hierarchy & Socratic Debate Engine
* **Tier 1 (Primary Online): NVIDIA NIM API (`meta/llama-3.3-70b-instruct`)**: Massive 70-billion-parameter open-weights reasoning. Uncensored, deeply intellectual, and configured for vigorous Socratic debate, counter-arguments, and logic analysis.
* **Tier 2 (Cloud Backup): Google Gemini Flash**: High-speed, high-availability secondary cloud backup that automatically takes over if NVIDIA hits rate limits or latency spikes.
* **Tier 3 (Local Fallback): Ollama (`llama3.2:3b` / `8b`)**: 100% private, offline fallback ensuring JARVIS never fails during internet outages.
* **Temporal Context Injector**: Dynamically injects live calendar date, day of week, local clock, timezone, and system metrics into every prompt so JARVIS always knows "now."

### 2. Zero-Compromise Real-Time Voice Engine & Anti-Collision Matrix
* **Unified Anti-Collision Voice Arbiter**: Prevents overlapping responses by wrapping speech synthesis in a Promise-based lock (`processDirective`), ensuring single-voice natural flow.
* **Background System Audio Ducking**: Automatically pauses or ducks other PC audio sessions (Spotify, YouTube, browser media) during listening or speaking so the microphone captures pure human voice and Jarvis speaks with crystal-clear output without background clash.
* **Hands-Free Local Wake-Word Engine**: Continuous streaming speech recognition engine with dedicated `WakeGrammar` detecting "Hey Jarvis", "Jarvis", "Ok Jarvis", and "Hello Jarvis" locally without pressing buttons.
* **Streaming Token-to-Audio TTS Pipelining**: Pre-fetches neural audio for subsequent sentences in parallel while the current sentence is actively playing via Web Audio API, reducing Time-To-First-Audio to ~250ms.
* **Instant Cancellation (`stopAllSpokenAudio`)**: Aborts in-flight Web Audio buffer nodes, cancels pending fetch requests, and clears browser SpeechSynthesis queues immediately when interrupted.
* **Acoustic Feedback Shield**: Enforces a 600ms acoustic calming window and mutes the hardware microphone capture (`set_voice_listening(false)`) during assistant speech to eliminate speaker-to-mic echo loops.
* **Snappy Phrase Repetition Support**: Responsive 800ms debounce allows immediate repetition or clarification without dropping user directives.
* **Kokoro-82M Local Neural Voice**: Local ONNX neural TTS service running on `localhost:5000` providing lifelike human-cadence voice synthesis offline.

### 3. Windows DPAPI Key Vault & Enterprise Security
* **Windows Credential Manager / DPAPI**: Directly interfaces with Windows `crypt32.dll` (`CryptProtectData` & `CryptUnprotectData`) to encrypt API keys at rest in `data/vault.enc`. Keys are mathematically bound to the current Windows user login, eliminating plaintext `.env` risks.
* **Cross-Language Decryption**: Seamlessly loaded and decrypted by both Rust native backend and Python intelligence runtime via standard Win32 crypt APIs.
* **Kernel Job Object Binding**: Binds all child worker processes (`speech_worker.ps1`, `neural_tts_service.py`) to Windows kernel Job Objects with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, ensuring zero orphan or zombie processes on app exit.

### 4. Long-Term Memory & Hybrid RAG (Oracle Cloud OCI)
* **OCI PostgreSQL + `pgvector` Cluster (Hyderabad)**: Unified relational storage for user profiles, ongoing tasks, conversation logs, and 1536-dim vector embeddings.
* **Mem0 Personal Memory Store**: Automatically tracks facts, user preferences, and habits across reboots.
* **LlamaIndex Hybrid RAG**: Vector similarity + full-text SQL search with strict citations (file, page, and excerpt quote).
* **Resilient Write-Ahead Buffer & Dead-Letter Queue**: Writes are locally buffered to `data/cache/offline_sync_queue.jsonl` during network outages, featuring exponential backoff, dead-letter queuing, and a native Tauri `sync_memory_cloud` sync command.

### 5. Hardware Telemetry & Token Activity Matrix
* **Hardware Telemetry (Sysinfo & Win32)**: Live CPU kernel utilization, RAM allocation, GPU performance counter sampling, and network adapter RX/TX transfer bandwidth.
* **Pipeline Telemetry Tracker**: Actively logs millisecond latencies from speech end to STT completion, LLM TTFT, and TTS TTFA.
* **Token Activity Matrix**: 256-slot dynamic grid visualizing prompt tokens, generated tokens, and decoding speed.
* **Page Visibility Frame Throttling**: Automatically throttles canvas rendering to ~5 FPS when the desktop window is hidden or minimized, dropping idle power draw to near zero.

### 6. Holographic HUD Visor & Phone Sync Radar
* **Semi-Transparent HUD Overlay**: Holographic notification toasts with slide-in animations.
* **High-Contrast Dynamic QR Pairing**: Generates standard 37x37 QR codes with quiet zone padding rendered directly to an HTML5 canvas for rapid smartphone scanning.
* **Multi-Channel ADB Device Radar**: Discovers mobile devices via mDNS services (`_adb._tcp`, `_adb-tls-connect._tcp`), active USB, or static Wi-Fi TCP port 5555. Automatically detects active device model strings (`Pixel 9 Pro`, `Samsung Galaxy`, etc.).

### 7. Multimodal Screen Vision & Tactical Visual Intelligence
* **Google Gemini Flash Vision Primary**: Real-time in-memory screen frame capture encoded to base64 and streamed directly to `gemini-2.5-flash` for instant visual understanding and code debugging.
* **Groq Vision & UI Accessibility Fallbacks**: Seamless failover to Groq LPU Vision and Win32 UI accessibility tree inspection if network conditions fluctuate.

### 8. Speculative Preemptive Generation & Draft Promotion
* **Speculative Turn Agent**: Initiates speculative response generation during natural user pauses (>350ms) before the turn commits.
* **Draft Promotion & Auto-Discard**: If the user speech continues with an alternate intent, the draft is silently aborted. If the turn matches prefix, the draft is promoted to the audio pipeline, slashing TTFA by 200-450ms.

### 9. Autonomous Task Planner & Chained Execution Engine
* **Compound Directive Decomposition**: Parses complex multi-step instructions (e.g. "open notepad and then search for quantum computing") into ordered atomic steps.
* **Compensatory Rollback Stack**: Executes chained tasks sequentially via `execute_task_pipeline` with status tracking and automatic rollback if a critical step fails.

### 10. Dynamic Skills & Plugins Registry
* **Runtime Macro Extensibility**: Discovers and hot-loads custom skill manifests from `skills/*.json` without requiring application rebuilds.
* **Custom Action Handlers**: Maps custom voice triggers directly to workstation actions, layouts, and system controls.

---

## 📁 Project Structure

```text
Jarvis/
├── Jarvis.exe                      # Production Windows executable (15 MB)
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
│   ├── llm_client.py               # 3-Tier Router (NVIDIA 70B -> Gemini -> Ollama)
│   ├── speculative.py              # Speculative draft & discard turn agent
│   ├── task_planner.py             # Autonomous multi-step compound action planner
│   ├── skills_registry.py          # Dynamic skill loader & macro registry
│   └── telemetry.py                # Millisecond TTFA & latency tracker
│
├── skills/                         # Dynamic user-extensible skill manifests & macros
│   ├── developer_workspace.json    # Dev layout macro (VS Code + Chrome split)
│   └── system_diagnostics.json     # Full hardware telemetry report macro
│
├── voice/                          # LiveKit Real-Time Audio Pipeline
│   ├── audio_device_binding.py     # Windows microphone & speaker hardware capture
│   ├── livekit_audio_bridge.py     # Full-duplex WebRTC audio bridge & hardware test
│   ├── livekit_worker.py           # LiveKit voice worker with Deepgram Flux & Cartesia
│   └── tts_piper.py                # Local offline Piper TTS failover
│
├── memory/                         # OCI Database & Memory Layer
│   ├── db_postgres.py              # PostgreSQL + pgvector connection pool
│   ├── mem0_store.py               # Mem0 long-term memory store (PostgreSQL)
│   ├── rag_engine.py               # LlamaIndex hybrid retrieval with citations
│   └── sync_queue.py               # Offline write-ahead queue & auto-sync engine
│
├── tools/                          # External Integrations & Tooling
│   ├── web_search.py               # Tavily real-time research with citations
│   ├── platform-tools/             # Android ADB binaries (adb.exe, AdbWinApi.dll, etc.)
│   └── pair_qr.bat                 # Wireless ADB pairing script
│
├── models/                         # Local Neural Models
│   └── kokoro/                     # Kokoro-82M ONNX model weights, voices & tokenizer
│
├── data/                           # Runtime State & Cache
│   └── cache/                      # Write-ahead offline sync buffer & dead-letter logs
│
├── scripts/                        # Automation & Native Workers
│   ├── speech_worker.ps1           # High-precision Win32 speech recognition worker
│   ├── neural_tts_service.py       # Kokoro-82M ONNX local HTTP synthesis daemon
│   ├── copy-exe.js                 # Production binary bundler
│   └── asset_generators/           # Benchmark audio and test file generation scripts
│
├── tests/                          # Automated Unit Test Suites
│   ├── test_context.py             # Temporal anchoring & hardware metrics verification
│   ├── test_persona.py             # Socratic persona & response formatting tests
│   ├── test_sync_queue.py          # Write-ahead queue & offline buffer tests
│   ├── test_telemetry.py           # Latency tracker and profiler tests
│   └── test_rag.py                 # Hybrid vector/text search citation tests
│
├── src/                            # Frontend Holographic UI (HTML5, CSS3, ES Modules)
│   ├── index.html                  # HUD layout, Visor, Blueprint, Matrix & Stage
│   ├── main.js                     # Master coordinator and lifecycle orchestration
│   ├── styles.css                  # Sci-fi holographic neon styling
│   ├── assets/                     # Sound assets & human_particles_preset.js
│   └── modules/                    # Focused ES Modules (ai, dialer, notifications, planner, soundscape, telemetry)
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
* `NVIDIA_API_KEY`: NVIDIA NIM API key (`meta/llama-3.3-70b-instruct`)
* `GEMINI_API_KEY`: Google Gemini API key (secondary cloud backup)
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
