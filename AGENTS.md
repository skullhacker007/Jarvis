# J.A.R.V.I.S. Agent Architecture & Multi-Agent Roadmap

This document outlines the cognitive architecture of J.A.R.V.I.S., the rules governing its 3-tier brain (NVIDIA Llama 3.3 70B Primary + Gemini Flash Cloud Backup + Ollama Local Fallback), and the multi-agent orchestration roadmap.

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

---

## 🧠 2. Cognitive 3-Tier Brain Hierarchy

J.A.R.V.I.S. utilizes a **3-Tier Cognitive Architecture** to ensure zero latency, deep reasoning, and 100% offline uptime:

```mermaid
flowchart TD
    User([User Voice / Text]) --> VoiceEngine[LiveKit Voice Engine / Deepgram Flux]
    VoiceEngine --> ContextInjector[Temporal & Environment Context Injector]
    ContextInjector --> BrainRouter{Cloud Available?}
    
    BrainRouter -- Tier 1 (Online) --> NvidiaPrimary[NVIDIA LLM API\nmeta/llama-3.3-70b-instruct]
    BrainRouter -- Tier 2 (Backup) --> GeminiBackup[Google Gemini Flash\ngoogle.genai SDK]
    BrainRouter -- Tier 3 (Offline) --> OllamaFallback[Ollama Local Engine\nllama3.2:3b / qwen]

    NvidiaPrimary --> Dispatcher[Multi-Agent Action Dispatcher]
    GeminiBackup --> Dispatcher
    OllamaFallback --> Dispatcher

    Dispatcher --> FastPath[Win32 Fast-Path Execution]
    Dispatcher --> Subagents[Specialized Subagents]
    Dispatcher --> AudioStream[Cartesia Sonic / Kokoro-82M / Piper]
```

### 1. Tier 1 (Primary Online): NVIDIA NIM API (`meta/llama-3.3-70b-instruct`)
* **Endpoint:** `https://integrate.api.nvidia.com/v1`
* **Role:** High-speed 70-billion-parameter reasoning, Socratic debate logic, live tool calling, and document synthesis.
* **Debate Mode:** Deeply intellectual, challenges logical fallacies, and defends counter-arguments without generic disclaimers.

### 2. Tier 2 (Cloud Backup): Google Gemini Flash
* **SDK:** Modern official `google.genai` SDK.
* **Role:** High-speed cloud failover (~150-250ms TTFT) if NVIDIA hits rate limits or latency spikes.

### 3. Tier 3 (Offline Fallback): Ollama (`llama3.2:3b` / `8b`)
* **Endpoint:** `http://127.0.0.1:11434`.
* **Role:** Instant local failover if internet connectivity is completely lost. 100% offline guarantee.

---

## 🤖 3. Multi-Agent Orchestration Roster

```mermaid
flowchart LR
    Dispatcher[J.A.R.V.I.S. Dispatcher] --> Agent1[Voice Agent\nLiveKit + Anti-Collision Matrix]
    Dispatcher --> Agent2[Speculative Turn Agent\nDraft & Discard Engine]
    Dispatcher --> Agent3[Memory & RAG Agent\nOCI PostgreSQL + Mem0 + Sync Queue]
    Dispatcher --> Agent4[Web Research Agent\nTavily Live Search & Citations]
    Dispatcher --> Agent5[UIA Agent\nZero-Coord Win32 Accessibility]
    Dispatcher --> Agent6[Phone Sync Radar Agent\nADB QR & mDNS Auto-Detect]
    Dispatcher --> Agent7[Sentinel Agent\nHardware & Latency Profiler]
```

### Agent 1: LiveKit Voice Agent & Anti-Collision Arbiter
* **Locations:** [`voice/livekit_worker.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/livekit_worker.py), [`voice/audio_device_binding.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/voice/audio_device_binding.py), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Responsibility:** Real-time WebRTC audio pipeline, streaming STT, and streaming TTS.
* **Single Turn Authority & Barge-In:** Deepgram Flux conversational endpointing acts as the master detector. Interruption halts ongoing audio within 10ms.
* **Anti-Collision Vocal Shield:**
  * Promise-wrapped turn execution (`processDirective`) prevents multiple parallel threads from speaking simultaneously.
  * `stopAllSpokenAudio()` immediately cancels active Web Audio buffers, aborts TTS fetches, and clears synth queues.
  * Silences microphone input (`set_voice_listening(false)`) during playback with a 600ms acoustic calming window post-speech to prevent echo loopback.
  * 3.5-second mutual exclusion debounce across parallel speech recognition providers.

### Agent 2: Speculative Preemptive Generation Agent
* **Responsibility:** Begins speculative draft generation during conversational pauses before the user's turn is 100% closed.
* **Conflict Resolution:** If the user resumes speaking, the speculative draft is discarded with zero disruption to the dialogue.

### Agent 3: Memory Persistence & RAG Agent
* **Locations:** [`memory/mem0_store.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/mem0_store.py), [`memory/rag_engine.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/rag_engine.py), [`memory/sync_queue.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/memory/sync_queue.py)
* **Responsibility:** Manages Mem0 user profile extraction, LlamaIndex hybrid RAG citations, and OCI PostgreSQL synchronization with local write-ahead buffering and dead-letter queue resilience.

### Agent 4: Web Research Agent
* **Location:** [`tools/web_search.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/tools/web_search.py)
* **Responsibility:** Executes real-time web searches via Tavily, returning verified facts and source URLs.

### Agent 5: UIA & Desktop Automation Agent
* **Responsibility:** Inspects foreground windows via Win32 `EnumChildWindows`, computing bounding rectangles to target controls by name without pixel coordinates.

### Agent 6: Phone Sync & Device Radar Agent
* **Locations:** [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs), [`src/main.js`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src/main.js)
* **Responsibility:** 
  * Generates high-contrast 37x37 QR pairing codes with quiet-zone padding for immediate smartphone camera detection.
  * Actively polls active ADB connections, discovers wireless targets via mDNS (`_adb._tcp` and `_adb-tls-connect._tcp`), and auto-configures connected USB devices to TCP port 5555.
  * Mirrors notifications and phone status directly to the holographic Visor.

### Agent 7: Sentinel Hardware & Telemetry Agent
* **Locations:** [`core/telemetry.py`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/core/telemetry.py), [`src-tauri/src/lib.rs`](file:///C:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs)
* **Responsibility:** Continuously samples CPU kernel utilization, RAM allocation, GPU counters, and network bandwidth, while measuring millisecond TTFA (STT -> LLM TTFT -> TTS TTFA).
