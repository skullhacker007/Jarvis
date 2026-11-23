# JARVIS Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the JARVIS runtime.

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

## 🎯 2. Master Action Taxonomy

| Action ID | Description | Target Syntax | Example Directives |
| :--- | :--- | :--- | :--- |
| `open_app` | Launches a Windows application or executable. | Application slug, URI, or executable name. | *"open notepad"*, *"launch vs code"*, *"start chrome"* |
| `close_app` | Gracefully closes or terminates an active process. | Application name or process image name. | *"close notepad"*, *"terminate chrome"*, *"kill calculator"* |
| `focus_app` | Restores and brings an active taskbar window to the foreground. | Window title or process name substring. | *"focus code"*, *"switch to spotify"*, *"bring up terminal"* |
| `run_cmd` | Executes an administrative shell command or URL. | Shell command string or URL. | *"open youtube"*, *"run ipconfig"*, *"open downloads"* |
| `system_ctrl`| Modifies Windows workstation state or audio levels. | Specific system control verbs. | *"lock pc"*, *"mute audio"*, *"volume up"*, *"screenshot"* |
| `click_element` | Coordinate-free control click via UI Automation. | Control text, button label, or accessibility name. | *"click submit"*, *"click save button"*, *"press ok"* |
| `web_search` | Real-time web research with verified URL citations. | Search query. | *"search latest tech news"*, *"what is the stock price of NVDA"* |
| `memory_store` | Embeds and stores a fact in persistent OCI PostgreSQL + pgvector via Mem0. | Text note or fact statement. | *"remember that my phone is pixel 9"*, *"store note"* |
| `memory_recall` | Hybrid semantic vector search over PostgreSQL memory. | Search topic or query. | *"recall phone model"*, *"what did I say about..."* |
| `rag_query` | Queries local documents via LlamaIndex with page citations. | Question or research topic. | *"search knowledge base for quarterly report"* |
| `debate_mode` | Engages Socratic critical thinking, counter-arguments, and logic critique. | Topic or assertion. | *"let's debate AI consciousness"*, *"critique this startup idea"* |
| `airdrop_file` | Beams local file to Android device `/sdcard/Download/`. | Local file path. | *"airdrop invoice.pdf"*, drag-and-drop overlay |
| `file_search` | High-speed semantic local drive file search. | File name or search keywords. | *"find file report.docx"*, *"search documents"* |
| `select_avatar` | Switches holographic character matrix in nAvI Labs. | Character key (`navi`, `optimus`, `bumblebee`, `spiderman`, `mecha`). | *"optimus prime"*, *"switch to bumblebee"*, *"mecha robo"*, *"spider-man"* |
| `toggle_hologram` | Activates or powers down the holographic projector. | State (`true` / `false` / `toggle`). | *"turn on projection"*, *"turn off humanoid"*, *"navi labs on"* |
| `audio_test` | Initiates full-duplex mic and speaker loopback diagnostic. | Empty (`""`). | *"test microphone"*, *"audio diagnostic"* |
| `inspect_screen` | Multimodal visual inspection of active display and UI elements. | Query or instruction. | *"inspect screen"*, *"what is on my screen"*, *"debug this code"* |
| `task_pipeline` | Decomposes compound requests into ordered atomic execution steps. | Multi-action statement. | *"open notepad and then search for AI news"*, *"code mode"* |
| `sync_memory_cloud` | Synchronizes local vector buffer with OCI PostgreSQL + pgvector. | Empty (`""`). | *"sync memory"*, *"sync to cloud"* |
| `scan_skills` | Discovers and reloads user-defined custom skills from `skills/`. | Empty (`""`). | *"scan skills"*, *"reload plugins"* |
| `phone_pair_qr`| Generates standard 37x37 QR code on HUD canvas for Android Wi-Fi pairing. | Empty (`""`). | *"pair phone"*, *"show pairing qr"*, *"scan device"* |
| `phone_auto_detect`| Scans USB, mDNS (`_adb._tcp`), and TCP 5555 for connected Android phones. | Empty (`""`). | *"find devices"*, *"auto detect phone"*, *"scan wireless devices"* |
| `none` | Pure conversational or factual response; no action executed. | Empty (`""`). | *"what is your status"*, *"who made you"*, *"tell me a joke"* |

---

## 🛠️ 3. Specialized Capability Modules

### 1. Real-Time Temporal Anchoring & Context Compression
* **Module:** [`core/context.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/context.py)
* **Capability:** Dynamically injects calendar date, day of week, local clock, timezone, and CPU/RAM metrics into prompt context on every conversational turn. Incorporates sliding-window history compression to preserve key turn context without token overflow.
* **Impact:** Eliminates date/time hallucinations and provides continuous temporal awareness.

### 2. Socratic Debate & Persona Logic
* **Module:** [`core/persona.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/persona.py)
* **Capability:** Enforces critical thinking, logic flaw detection, and counter-argument generation without generic robotic boilerplate.
* **Cadence:** Keeps voice replies concise (1 to 3 sentences) for optimal audio conversation flow.

### 3. Unified Anti-Collision Voice Matrix & Pure Voice Shield
* **Modules:** [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js), [`scripts/speech_worker.ps1`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/speech_worker.ps1), [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:**
  * Locks the turn loop via Promise resolution (`processDirective`), ensuring multiple candidate streams never speak simultaneously.
  * `stopAllSpokenAudio()` immediately terminates in-flight audio buffers, cancels pending TTS fetches, and purges Web Speech synthesis queues.
  * Silences hardware input (`set_voice_listening(false)`) and enforces a 600ms acoustic calming window post-speech to prevent speaker loopback.
  * Tight 800ms deduplication window across parallel STT engines while allowing immediate user repetition without dropped directives.

### 4. Background System Audio Ducking & Media Isolation
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Capability:** Automatically ducks (pauses/mutes) background media (Spotify, YouTube, browser audio) via `set_system_ducking` when JARVIS starts listening or speaking, and smoothly restores playback when dialogue concludes. This eliminates background music bleeding into the microphone and prevents audio clashing.

### 5. Local "Hey Jarvis" Wake-Word Engine
* **Modules:** [`scripts/speech_worker.ps1`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/speech_worker.ps1), [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:** Continuous non-blocking streaming via dedicated `WakeGrammar` in the background speech engine. Detects "Hey Jarvis", "Jarvis", "Ok Jarvis", and "Hello Jarvis" with zero button clicks, triggering immediate wake chime, media ducking, and attached command execution.

### 6. Streaming Token-to-Audio TTS Pipelining
* **Modules:** [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js), [`scripts/neural_tts_service.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/neural_tts_service.py)
* **Capability:** Splits incoming LLM response streams into sentence segments. Starts pre-fetching sentence `i+1` audio in parallel while sentence `i` is actively playing via the Web Audio API, slashing TTFA from 1800ms down to ~250ms with continuous seamless playback.

### 7. Windows DPAPI Key Vault & Credential Security
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`config.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/config.py)
* **Capability:** Encrypts sensitive cloud API keys (`NVIDIA_API_KEY`, `GEMINI_API_KEY`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `TAVILY_API_KEY`, `PG_*`) using the Windows Data Protection API (`CryptProtectData` in `crypt32.dll`) tied directly to the logged-in Windows user account. Synchronizes encrypted secrets into `data/vault.enc`.

### 8. Neural Local Voice Synthesis (Kokoro-82M & Piper)
* **Modules:** [`scripts/neural_tts_service.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/neural_tts_service.py), [`voice/tts_piper.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/tts_piper.py)
* **Capability:** Local HTTP neural TTS daemon serving Kokoro-82M ONNX models on `localhost:5000`, with Piper TTS as a lightweight ultra-fast fallback.

### 9. Resilient Cloud PostgreSQL + `pgvector` & Dead-Letter Queue
* **Modules:** [`memory/db_postgres.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/db_postgres.py), [`memory/sync_queue.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/sync_queue.py)
* **Capability:** Connects to OCI PostgreSQL in Hyderabad for relational user memory, conversation logs, and document vector embeddings.
* **Offline Resilience:** Queues memory writes to `data/cache/offline_sync_queue.jsonl` during outages with exponential backoff and transfers unrecoverable failed records to a dead-letter log.

### 10. Mem0 Long-Term Memory Store
* **Module:** [`memory/mem0_store.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/mem0_store.py)
* **Capability:** Automated extraction and semantic search of user facts, preferences, habits, and ongoing tasks backed by PostgreSQL vector storage.

### 11. LlamaIndex Hybrid RAG with Citations
* **Module:** [`memory/rag_engine.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/rag_engine.py)
* **Capability:** Ingests local files/PDFs, generates embeddings into PostgreSQL, and performs hybrid search returning exact file, page number, and source quote citations.

### 12. Wireless Phone Sync & Dynamic Device Radar
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Capability:**
  * Generates standard 37x37 QR codes with high-contrast borders and quiet zones for Android camera pairing.
  * Multi-vector discovery: monitors connected USB devices, triggers TCP port 5555 configuration, and performs mDNS discovery (`_adb._tcp` and `_adb-tls-connect._tcp`).
  * Continuous health and status polling capturing dynamic device names and connection states.

### 13. Verified Web Research Engine
* **Module:** [`tools/web_search.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/web_search.py)
* **Capability:** Real-time factual web search via Tavily API with source URLs attached to every claim.

### 14. Pipeline Latency Profiler (TTFA)
* **Module:** [`core/telemetry.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/telemetry.py)
* **Capability:** Actively logs millisecond latencies from speech end to STT completion, LLM TTFT, and TTS TTFA.

### 15. Multimodal Vision Pipeline
* **Modules:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:** Real-time RAM bitmap capture sent directly to Google Gemini Flash (`gemini-2.5-flash`) multimodal vision API, with Groq Vision and UI Automation text structure fallbacks.

### 16. Speculative Preemptive Generation Agent
* **Modules:** [`core/speculative.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/speculative.py), [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:** Drafts response tokens during natural prosodic user speech pauses (>350ms). Discards drafts seamlessly if user speech continues with an alternate token stream; instantly promotes matching drafts to slash TTFA by 200-450ms.

### 17. Autonomous Multi-Step Task Planner
* **Modules:** [`core/task_planner.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/task_planner.py), [`src/modules/planner.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/modules/planner.js)
* **Capability:** Deconstructs compound directives (e.g. "open notepad and search for AI news") into structured atomic execution graphs with status reporting and rollback tracking.

### 18. Dynamic Skills & Plugins Registry
* **Modules:** [`core/skills_registry.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/skills_registry.py), [`skills/`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/skills/)
* **Capability:** Hot-loads custom JSON macros and skill definitions from the `skills/` directory without needing binary recompilation.

### 19. Windows Job Object Process Lifecycle Manager
* **Module:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Capability:** Enforces kernel-level `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` on all spawned background worker processes (`speech_worker.ps1`, `neural_tts_service.py`), eliminating zombie/orphan processes on application exit.

### 20. Page Visibility Frame Throttling
* **Module:** [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Capability:** Automatically throttles the 32,000 holographic particle canvas to 4-5 FPS when the desktop window is hidden or minimized, dropping background GPU/CPU power consumption to near zero.
