# J.A.R.V.I.S. Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the J.A.R.V.I.S. runtime.

---

## 🎯 Master Action Taxonomy

J.A.R.V.I.S. interprets natural language and speech into discrete system actions. Directives dispatched by the primary brain or fast-path engine resolve to one of the following:

| Action ID | Description | Target Syntax | Example Directives |
| :--- | :--- | :--- | :--- |
| `open_app` | Launches a Windows application or executable. | Application slug, URI, or executable name. | *"open notepad"*, *"launch vs code"*, *"start chrome"* |
| `close_app` | Gracefully closes or terminates an active process. | Application name or process image name. | *"close notepad"*, *"terminate chrome"*, *"kill calculator"* |
| `focus_app` | Restores and brings an active taskbar window to the foreground. | Window title or process name substring. | *"focus code"*, *"switch to spotify"*, *"bring up terminal"* |
| `run_cmd` | Executes an administrative shell command or URL. | Shell command string or URL. | *"open youtube"*, *"run ipconfig"*, *"open downloads"* |
| `system_ctrl`| Modifies Windows workstation state or audio levels. | Specific system control verbs. | *"lock pc"*, *"mute audio"*, *"volume up"*, *"screenshot"* |
| `click_element` | Coordinate-free control click via UI Automation. | Control text, button label, or accessibility name. | *"click submit"*, *"click save button"*, *"press ok"* |
| `web_search` | Real-time web research with verified URL citations. | Search query. | *"search latest tech news"*, *"what is the stock price of NVDA"* |
| `memory_store` | Embeds and stores a fact in persistent OCI PostgreSQL + pgvector. | Text note or fact statement. | *"remember that my phone is pixel 9"*, *"store note"* |
| `memory_recall` | Hybrid semantic vector search over PostgreSQL memory. | Search topic or query. | *"recall phone model"*, *"what did I say about..."* |
| `debate_mode` | Engages Socratic critical thinking, counter-arguments, and logic critique. | Topic or assertion. | *"let's debate AI consciousness"*, *"critique this startup idea"* |
| `airdrop_file` | Beams local file to Android device `/sdcard/Download/`. | Local file path. | *"airdrop invoice.pdf"*, drag-and-drop overlay |
| `file_search` | High-speed semantic local drive file search. | File name or search keywords. | *"find file report.docx"*, *"search documents"* |
| `select_avatar` | Switches holographic character matrix in nAvI Labs. | Character key (`navi`, `optimus`, `bumblebee`, `spiderman`, `mecha`). | *"optimus prime"*, *"switch to bumblebee"*, *"mecha robo"*, *"spider-man"* |
| `toggle_hologram` | Activates or powers down the holographic projector. | State (`true` / `false` / `toggle`). | *"turn on projection"*, *"turn off humanoid"*, *"navi labs on"* |
| `audio_test` | Initiates full-duplex mic and speaker loopback diagnostic. | Empty (`""`). | *"test microphone"*, *"audio diagnostic"* |
| `none` | Pure conversational or factual response; no action executed. | Empty (`""`). | *"what is your status"*, *"who made you"*, *"tell me a joke"* |

---

## 🛠️ Specialized Capability Modules

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

### 5. Verified Web Research Engine
* **Module:** [`tools/web_search.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/web_search.py)
* **Capability:** Real-time factual web search via Tavily API with source URLs attached to every claim.

### 6. Pipeline Latency Profiler (TTFA)
* **Module:** [`core/telemetry.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/telemetry.py)
* **Capability:** Actively logs millisecond latencies from speech end to STT completion, LLM TTFT, and TTS TTFA.
