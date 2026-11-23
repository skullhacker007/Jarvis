# J.A.R.V.I.S. Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the J.A.R.V.I.S. runtime.

---

## ⚡ 1. Finalized Component Matrix

| Component | Primary (Online) | Fallback (Offline / Failover) | Technical Role |
| :--- | :--- | :--- | :--- |
| **Real-Time Engine** | **LiveKit Agents** | Local Audio Loop | Manages WebRTC audio streams, VAD, and bidirectional interruption handling. |
| **Speech-to-Text (STT)** | **Deepgram Flux** | **Faster-Whisper** (Local) | Real-time streaming transcription with conversational boundary awareness. |
| **Turn Detection** | **Deepgram Flux Endpointing** *(Single Authority)* | Local VAD | Single master turn detector to avoid conflicting signals or false cutoffs. |
| **Text-to-Speech (TTS)** | **Cartesia Sonic** | **Piper TTS** (Local ONNX) | Primary: ~90ms natural conversational audio. Fallback: lightweight local synthesis. |
| **Core LLM** | **NVIDIA LLM API** (`llama-3.3-70b-instruct`) | **Ollama** (`llama3.2:3b` / `8b`) | Primary: high-speed 70B reasoning & debate. Fallback: local task execution. |
| **Database & Vectors** | **PostgreSQL + pgvector** *(OCI Hyderabad)* | Local Offline Buffer + Sync Queue | Enterprise hybrid search (Full-Text + Vector), relational memory, and citations. |
| **Long-Term Memory** | **Mem0** *(PostgreSQL Backend)* | Local JSONL Write-Ahead Log | Extracts facts, preferences, and user profile data across sessions with sync. |
| **RAG & Citations** | **LlamaIndex** *(Hybrid Engine)* | Local Document Cache | Vector similarity + SQL full-text search with strict page/document citations. |
| **Live Web Research** | **Tavily Search API** | DuckDuckGo | Real-time news and factual validation with cited URLs. |
| **Telemetry & Metrics** | **Custom Pipeline Profiler** | Built-in | Tracks live Time-To-First-Audio (TTFA) across STT, LLM, and TTS. |

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
| `none` | Pure conversational or factual response; no action executed. | Empty (`""`). | *"what is your status"*, *"who made you"*, *"tell me a joke"* |

---

## 🛠️ 3. Specialized Capability Modules

### 1. Real-Time Temporal Anchoring
* **Module:** [`core/context.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/context.py)
* **Capability:** Dynamically injects calendar date, day of week, local clock, timezone, and CPU/RAM metrics into prompt context on every conversational turn.
* **Impact:** Eliminates date/time hallucinations and provides situational awareness.

### 2. Socratic Debate & Persona Logic
* **Module:** [`core/persona.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/persona.py)
* **Capability:** Enforces critical thinking, logic flaw detection, and counter-argument generation without generic robotic boilerplate.
* **Cadence:** Keeps voice replies concise (1 to 3 sentences) for optimal audio conversation flow.

### 3. Full-Duplex Audio Device Binding
* **Modules:** [`voice/audio_device_binding.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/audio_device_binding.py), [`voice/livekit_audio_bridge.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/livekit_audio_bridge.py)
* **Capability:** Direct Windows audio hardware interfacing via `sounddevice` and `numpy`.
* **Hardware Binding:** Bridges physical microphones and speakers directly into LiveKit WebRTC audio tracks with instant barge-in support.

### 4. Cloud PostgreSQL + `pgvector` & Offline Sync Queue
* **Modules:** [`memory/db_postgres.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/db_postgres.py), [`memory/sync_queue.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/sync_queue.py)
* **Capability:** Connects to OCI PostgreSQL in Hyderabad for relational user memory, conversation logs, and document vector embeddings.
* **Offline Resilience:** Queues memory writes to a local write-ahead log (`data/cache/offline_sync_queue.jsonl`) during disconnects and automatically flushes to PostgreSQL on reconnection.

### 5. Mem0 Long-Term Memory Store
* **Module:** [`memory/mem0_store.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/mem0_store.py)
* **Capability:** Automated extraction and semantic search of user facts, preferences, habits, and ongoing tasks backed by PostgreSQL vector storage.

### 6. LlamaIndex Hybrid RAG with Citations
* **Module:** [`memory/rag_engine.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/rag_engine.py)
* **Capability:** Ingests local files/PDFs, generates embeddings into PostgreSQL, and performs hybrid search returning exact file, page number, and source quote citations.

### 7. Verified Web Research Engine
* **Module:** [`tools/web_search.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/web_search.py)
* **Capability:** Real-time factual web search via Tavily API with source URLs attached to every claim.

### 8. Pipeline Latency Profiler (TTFA)
* **Module:** [`core/telemetry.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/telemetry.py)
* **Capability:** Actively logs millisecond latencies from speech end to STT completion, LLM TTFT, and TTS TTFA.
