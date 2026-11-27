# JARVIS Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the JARVIS runtime. All telemetry, location, device discovery, and skill manifests are resolved dynamically at runtime.

---

## ⚡ 1. Finalized Component Matrix

| Component | Primary (Online) | Fallback (Offline / Failover) | Technical Role |
| :--- | :--- | :--- | :--- |
| **Real-Time Voice Pipeline** | **Pipecat Voice Agent** (`voice/pipecat_voice_agent.py`) | Local Audio Loop | Manages full-duplex audio streams, VAD, and bidirectional interruption handling. |
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

## 🎯 2. Master Action Taxonomy

| Action ID | Description | Target Syntax | Example Directives |
| :--- | :--- | :--- | :--- |
| `open_app` | Launches a Windows application or executable. | Application slug, URI, or executable name. | *"open notepad"*, *"launch vs code"*, *"start chrome"* |
| `close_app` | Gracefully closes or terminates an active process. | Application name or process image name. | *"close notepad"*, *"terminate chrome"*, *"kill calculator"* |
| `focus_app` | Restores and brings an active taskbar window to the foreground. | Window title or process name substring. | *"focus code"*, *"switch to spotify"*, *"bring up terminal"* |
| `run_cmd` | Executes a shell command or opens a URL. | Shell command string or URL. | *"open youtube"*, *"run ipconfig"*, *"open downloads"* |
| `system_ctrl` | Modifies Windows workstation state or audio levels. | Specific system control verbs. | *"lock pc"*, *"mute audio"*, *"volume up"*, *"screenshot"* |
| `click_element` | Coordinate-free control click via UI Automation. | Control text, button label, or accessibility name. | *"click submit"*, *"click save button"*, *"press ok"* |
| `web_search` | Real-time web research with verified URL citations. | Search query. | *"search latest tech news"*, *"what is the stock price of NVDA"* |
| `memory_store` | Embeds and stores a fact in persistent OCI PostgreSQL + pgvector via Mem0. | Text note or fact statement. | *"remember that my phone is pixel 9"*, *"store note"* |
| `memory_recall` | Hybrid semantic vector search over PostgreSQL memory. | Search topic or query. | *"recall phone model"*, *"what did I say about..."* |
| `rag_query` | Queries local documents via LlamaIndex with page citations. | Question or research topic. | *"search knowledge base for quarterly report"* |
| `debate_mode` | Engages Socratic critical thinking, counter-arguments, and logic critique. | Topic or assertion. | *"let's debate AI consciousness"*, *"critique this startup idea"* |
| `airdrop_file` | Beams local file to Android device `/sdcard/Download/`. | Local file path. | *"airdrop invoice.pdf"*, drag-and-drop overlay |
| `file_search` | High-speed semantic local drive file search. | File name or search keywords. | *"find file report.docx"*, *"search documents"* |
| `select_avatar` | Switches holographic character matrix in nAvI Labs. | Character key (`ultron`, `optimus`, `bumblebee`, `spiderman`, `mecha`). | *"optimus prime"*, *"switch to bumblebee"*, *"mecha robo"*, *"spider-man"* |
| `toggle_hologram` | Activates or powers down the holographic projector. | State (`true` / `false` / `toggle`). | *"turn on projection"*, *"turn off humanoid"*, *"navi labs on"* |
| `audio_test` | Initiates full-duplex mic and speaker loopback diagnostic. | Empty (`""`). | *"test microphone"*, *"audio diagnostic"* |
| `inspect_screen` | Multimodal visual inspection of active display and UI elements. | Query or instruction. | *"inspect screen"*, *"what is on my screen"*, *"debug this code"* |
| `task_pipeline` | Decomposes compound requests into ordered atomic execution steps. | Multi-action statement. | *"open notepad and then search for AI news"*, *"code mode"* |
| `sync_memory_cloud` | Synchronizes local vector buffer with OCI PostgreSQL + pgvector. | Empty (`""`). | *"sync memory"*, *"sync to cloud"* |
| `scan_skills` | Discovers and reloads user-defined custom skills from `skills/`. | Empty (`""`). | *"scan skills"*, *"reload plugins"* |
| `phone_pair_qr` | Generates standard 37x37 QR code on HUD canvas for Android Wi-Fi pairing. | Empty (`""`). | *"pair phone"*, *"show pairing qr"*, *"scan device"* |
| `phone_auto_detect` | Scans USB, mDNS (`_adb._tcp`), and TCP 5555 for connected Android phones. | Empty (`""`). | *"find devices"*, *"auto detect phone"*, *"scan wireless devices"* |
| `dial_phone_call` | Places a call via connected ADB Android device or `data/telephone_directory.json`. | Phone number or contact name. | *"call Alice"*, *"dial 5550101010"* |
| `none` | Pure conversational or factual response; no action executed. | Empty (`""`). | *"what is your status"*, *"who made you"*, *"tell me a joke"* |

---

## 🧩 3. Installed Dynamic Skills (`skills/*.json`)

Hot-loaded by `core/skills_registry.py` without binary recompilation:

| Skill ID | Name | Description |
| :--- | :--- | :--- |
| `build_jarvis_exe` | Rebuild Jarvis Executable | Rebuilds `Jarvis.exe` via `npm run build:exe`. |
| `developer_workspace` | Developer Workspace Layout | Launches VS Code and Chrome developer layout. |
| `dev_terminal` | Developer Terminal | Opens Windows Terminal in the project root. |
| `git_status_check` | Git Repository Status | Checks git status and diff summary. |
| `run_tests_suite` | Run Project Test Suite | Executes the automated Python/Rust test suites. |
| `system_diagnostics` | Full Hardware Diagnostics | Runs a full CPU, RAM, GPU, and network telemetry report. |

---

## 🛠️ 4. Specialized Capability Modules

### 1. Dynamic Temporal & Geolocation Anchoring
* **Modules:** [`core/context.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/context.py), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Capability:** Dynamically injects the host's live local timezone, date, clock, and CPU/RAM metrics into every prompt. Weather telemetry resolves coordinates dynamically via IP geolocation (`ipapi.co` / `ipwho.is`) and queries Open-Meteo live—returning `--°C` when offline rather than fabricating estimates.

### 2. Socratic Debate & Persona Logic
* **Module:** [`core/persona.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/persona.py)
* **Capability:** Enforces critical thinking, logic flaw detection, and counter-argument generation without generic robotic boilerplate, keeping voice replies concise (1 to 3 sentences).

### 3. Unified Anti-Collision Voice Matrix & Audio Enhancement
* **Modules:** [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js), [`voice/pipecat_voice_agent.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/pipecat_voice_agent.py), [`voice/audio_enhancer.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/audio_enhancer.py), [`voice/ecapa_verifier.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/ecapa_verifier.py)
* **Capability:** Promise-wrapped turn execution (`processDirective`), `stopAllSpokenAudio()`, system audio ducking (`set_system_ducking`), WebRTC AEC3 (`pyaec`) echo cancellation, and ECAPA-TDNN speaker verification.

### 4. Neural Local Voice Synthesis (Kokoro-82M & Piper)
* **Modules:** [`scripts/neural_tts_service.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/neural_tts_service.py), [`voice/tts_piper.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/tts_piper.py)
* **Capability:** Local HTTP neural TTS daemon serving Kokoro-82M ONNX models on `localhost:5000`, with Piper TTS and in-process Kokoro fallbacks.

### 5. Windows DPAPI Key Vault & Permission Policies
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`src-tauri/src/permissions.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/permissions.rs), [`config.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/config.py)
* **Capability:** Encrypts API keys using `CryptProtectData` (`crypt32.dll`) into `data/vault.enc` and enforces `Allow` / `Ask` / `Deny` permissions on sensitive actions.

### 6. Resilient Cloud PostgreSQL + `pgvector`, Mem0 & Hybrid RAG
* **Modules:** [`memory/db_postgres.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/db_postgres.py), [`memory/mem0_store.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/mem0_store.py), [`memory/rag_engine.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/rag_engine.py), [`memory/sync_queue.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/sync_queue.py)
* **Capability:** OCI PostgreSQL + `pgvector` storage with offline write-ahead buffering (`data/cache/offline_sync_queue.jsonl`) and dead-letter recovery.

### 7. Desktop Intelligence, WGC Capture & Native OCR
* **Module:** [`src-tauri/src/desktop_intel.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/desktop_intel.rs)
* **Capability:** Multi-monitor enumeration, Windows Graphics Capture (WGC) with GDI fallback, Win32 UIA element inspection, and Windows Native OCR.

### 8. Dynamic Phone Sync Radar & Directory
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js), [`data/telephone_directory.json`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/data/telephone_directory.json)
* **Capability:** Generates 37x37 QR pairing codes, discovers Android devices via USB ADB and mDNS (`_adb._tcp`, `_adb-tls-connect._tcp`) without static device/IP fallbacks, and manages contacts dynamically.

### 9. Playwright Browser & Developer Diagnostics
* **Modules:** [`tools/playwright_browser.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/playwright_browser.py), [`tools/dev_tools.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/dev_tools.py), [`tools/web_search.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/web_search.py)
* **Capability:** Persistent Chromium automation on port `5006`, environment health diagnostics, and Tavily + DuckDuckGo live web search with TTL caching.

### 10. Speculative Generation, Task Planner & Kernel Job Objects
* **Modules:** [`core/speculative.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/speculative.py), [`core/task_planner.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/task_planner.py), [`src/modules/planner.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/modules/planner.js), [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:** Preemptive speculative turn drafting, compound directive decomposition with rollback tracking, and kernel `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` lifecycle management.
