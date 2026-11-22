# J.A.R.V.I.S. Agent Architecture & Multi-Agent Roadmap

This document outlines the cognitive architecture of J.A.R.V.I.S., the rules governing its local neural brain (the **Queen Model**), and the roadmap for multi-agent delegation.

---

## 🧠 The Queen Model (Primary Orchestrator)

The core brain of J.A.R.V.I.S. is the **Queen Model**, hosted locally on Ollama at `http://127.0.0.1:11434`.

### 1. Role Definition
- **Identity**: Stark Industries AI Desktop Controller for Windows.
- **Authority**: Full administrator privileges on the local workstation.
- **Objective**: Rapidly parse user directives (voice or text), formulate execution plans, trigger the appropriate system action, and provide a concise, spoken status reply.
- **Token Streaming (SSE / IPC Channel)**: Emits `jarvis://stream_token` word-by-word into the holographic Visor HUD in real time, eliminating conversational latency before full response completion.

### 2. Behavioral Constraints & Guardrails
- **Strict Single-Dispatch**: The model MUST execute ONLY the single specific task requested. It never chains unrelated tasks or opens multiple instances of the same tool.
- **Pure JSON Output**:
  ```json
  {
    "action": "open_app" | "close_app" | "run_cmd" | "system_ctrl" | "click_element" | "none",
    "target": "<app, executable, UI element name, or shell command>",
    "reply": "<spoken response under 12 words>"
  }
  ```
- **Zero Markdown Clutter**: No markdown blocks (````json ... ````), conversational preamble, or thought traces outside the raw JSON object.
- **Deterministic Inference**: Set with `temperature: 0.0` and `num_predict: 45` to minimize generation latency while guaranteeing reliable JSON parsing.

---

## 🤖 Multi-Agent Expansion Roadmap

```mermaid
flowchart TD
    User([User Voice / Text]) --> Visor[Holographic Visor & Speech Engine]
    Visor --> Queen[Queen Model Orchestrator\nqwen3.5:2b / Ollama]
    
    Queen -->|Direct PC Action| FastPath[Fast-Path & Win32 Core]
    Queen -->|Complex Workflow| SubagentRouter[Subagent Dispatcher]
    
    SubagentRouter --> Agent1[Sentinel Agent\nHardware & Telemetry Monitor]
    SubagentRouter --> Agent2[Vision Agent\nScreen & Window Inspector]
    SubagentRouter --> Agent3[Developer Agent\nTerminal, Git & Code Automation]
    SubagentRouter --> Agent4[Web Research Agent\nLive Search & Data Retrieval]
    SubagentRouter --> Agent5[UIA Agent\nZero-Coord Accessibility Engine]
    SubagentRouter --> Agent6[Phone Sync Agent\nADB Mirroring & HUD Toasts]
    SubagentRouter --> Agent7[Memory Agent\nVector RAG & Cosine Store]

    FastPath --> WindowsOS[Windows 11 Kernel & Desktop]
    Agent1 --> WindowsOS
    Agent2 --> WindowsOS
    Agent3 --> WindowsOS
    Agent4 --> WindowsOS
    Agent5 --> WindowsOS
    Agent6 --> WindowsOS
    Agent7 --> WindowsOS
```

### Subagent Implementation Status

1. **Vision Agent (In-Memory Holographic Screen Inspection)** - **ACTIVE**:
   - *Role*: Live Win32 GDI desktop pixel capture in RAM (zero disk writes), child UI element hierarchy inspection (`EnumChildWindows`), active window OCR, and multimodal visual analysis (`llama-3.2-11b-vision-preview` on Groq LPU with `qwen/qwen3.8-27b` fallback).
   - *Model*: `llama-3.2-11b-vision-preview` / `qwen/qwen3.8-27b` on Groq LPU.
   - *Trigger*: *"Jarvis, inspect my screen"*, *"what is on my screen"*, or dock icon `👁️`.

2. **Web Research Agent (Online Ingestion & Synthesis)** - **ACTIVE**:
   - *Role*: Queries real-time Google News RSS & Wikipedia APIs, aggregates live data, and speaks concise syntheses without browser clutter.
   - *Model*: `qwen/qwen3.8-27b` on Groq LPU.
   - *Trigger*: *"search [topic]"*, *"who is [name]"*, *"latest news on [topic]"*, or dock icon `🌐`.

3. **Sentinel Agent (System Telemetry & Security)** - **ACTIVE**:
   - *Role*: Continuous background monitoring of hardware health (CPU, RAM, GPU utilization engine, Network I/O, physical WinMM microphone polling).

4. **Developer Agent (Code Generation & Automatic Editor Typing)** - **ACTIVE**:
   - *Role*: Live code synthesis (React, Python, JavaScript, HTML, algorithms) and direct injection into target editors (Notepad, VS Code) via native Win32 clipboard paste with verified focus restoration.
   - *Model*: `qwen/qwen3.8-27b` on Groq LPU (with local `qwen3.5:2b` failsafe).
   - *Trigger*: *"open notepad and write code"*, *"open notepad and write a react code"*, *"write react code"*, *"write python script in vs code"*.

5. **System Agent (Complete Windows, Media, Mouse, Keyboard & Form Automation)** - **ACTIVE**:
   - *Role*: End-to-end hands-free desktop control without touching mouse or keyboard:
     - **Window Manager & Verified Focus**: Continuous background tracking of external foreground window (`LAST_EXTERNAL_HWND`). Automatically breaks foreground lock via Win32 `AttachThreadInput` and verifies focus before executing input actions.
     - **Browser & Tabs Controller**: *"open new tab in chrome"*, *"new tab"*, *"close tab"*, *"reopen tab"*, *"next tab"*, *"previous tab"*, *"refresh"*, *"go back"*, *"go forward"*.
     - **Voice Form Filler**: Hands-free web form entry: *"type [text]"*, *"next field"* (Tab), *"previous field"* (Shift+Tab), *"clear field"* (Ctrl+A + Backspace), *"submit form"* (Enter).
     - **Safety Guardrail**: Automatically halts sensitive transactions (payments, purchases, checkout, data wipe) and demands explicit voice confirmation (*"Confirm submission"*).
     - **Voice Barge-In**: Instant audio interruption — speaking a new command or saying *"stop"* / *"cancel"* cancels TTS immediately without disabling the microphone.
     - **Media Controller**: Global play/pause, next track, previous track, stop (`VK_MEDIA_PLAY_PAUSE`, `VK_MEDIA_NEXT_TRACK`, `VK_MEDIA_PREV_TRACK`).
     - **Scroll & Mouse Controller**: Real-time wheel scrolling (up/down/top/bottom), left click, right click, double click.
     - **Keyboard & Shortcuts**: Ctrl+S (Save), Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+A (Select All), Ctrl+Z (Undo), Ctrl+Y (Redo), Enter, Escape, Backspace, Tab.
     - **Window Management**: Maximize, minimize, restore, snap left, snap right, switch window (Alt+Tab), close window (Alt+F4).
     - **Direct Typing**: Voice dictation typing into any active window or text field.

6. **Windows UI Automation (UIA) Engine** - **ACTIVE**:
   - *Role*: Zero-coordinate accessibility-tree element interaction. Searches visible child controls in foreground window by text or class name, computes bounding `RECT`, and targets control center coordinates without manual pixel inputs (`win32_system_agent::click_element_by_name`).
   - *Trigger*: *"click [button name]"*, *"press [control name]"*, action `click_element` or `uia_click`.

7. **Phone Mirroring & Holographic Toast Agent** - **ACTIVE**:
   - *Role*: ADB background notification mirroring (`get_phone_notifications`), real-time battery and temperature telemetry (`get_phone_telemetry`), high-speed P2P AirDrop (`airdrop_file`), and holographic glass HUD toasts for incoming Android notifications (WhatsApp, Telegram, Slack, Mail, Calls).
   - *Trigger*: Automatic background polling (4.5s) or voice command *"airdrop [file]"*.

8. **Persistent Hybrid Vector Memory Agent (RAG Store)** - **ACTIVE**:
   - *Role*: 128-dimensional L2-normalized vector embeddings with cosine similarity ranking and persistent JSON store for long-term fact retention.
   - *Trigger*: *"remember [fact]"*, *"recall [topic]"*, or IPC endpoints `save_memory_item` / `get_memory_items`.

9. **Ultra-Realistic Studio Neural TTS (Kokoro-82M & Multilingual Matrix)** - **ACTIVE**:
   - *Role*: Ultra-high-fidelity local neural speech generation powered by **Kokoro-82M** (`kokoro-v0_19.onnx` + `voices.bin`) running via ONNX Runtime at `http://127.0.0.1:5000/v1/audio/speech`. Default voice is **`am_adam`** (expressive American Male), with British options (`bm_george` / `bm_lewis`) available offline. Seamlessly auto-detects Telugu Unicode (`\u0c00-\u0c7f`) to route to `te-IN-MohanNeural` and preserves Edge-TTS as cloud fallback.

10. **Windows Auto-Startup Manager** - **ACTIVE**:
    - *Role*: Native Windows Registry Run key automation (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`), enabling or disabling auto-launch on Windows login.
    - *Trigger*: *"start with windows"*, *"enable auto startup"*, *"disable auto startup"*, or IPC endpoint `set_auto_startup`.

11. **Stark High-Density Human Particles Engine (Python Particle Wind Technique)** - **ACTIVE**:
    - *Role*: Ultra-high-density 32,000+ particle human point cloud with real-time dynamic wind gusts, thermal aura streamers, and interactive mouse blast physics. Based on the viral Python particles wind technique (`scripts/particle_wind.py` with Pygame & NumPy), features 32,000 fine phosphor particles mapped with authentic anatomical shading, 2,200 swirling energy aura particles (cyan, electric blue, and gold), Hooke's Law spring-damping restoration, and interactive cursor wind dispersal.
    - *Trigger*: *"burst particles"*, *"reset particles"*, *"wind on"*, *"wind off"*, *"toggle wind"*, UI buttons `RESET`, `BURST`, `WIND`, or running `python scripts/particle_wind.py`.

---

## ⚙️ Model Selection Guidelines

Different tasks and hardware configurations benefit from targeted model selection:

| Model | Size | Quant | Inference Speed (CPU) | Best Used For |
| :--- | :--- | :--- | :--- | :--- |
| **`qwen3.5:2b`** *(Default)* | 1.9B | Q8_0 | ~14 tokens/s (2.5s) | Default balance: High accuracy instruction parsing with low memory footprint. |
| **`qwen2.5:1.5b`** | 1.5B | Q4_K_M | ~22 tokens/s (1.1s) | **Ultra-Low Latency Mode**: Recommended for near-instant voice dialogues on CPU. |
| **`qwen2.5:0.5b`** | 0.5B | Q4_K_M | ~40 tokens/s (0.4s) | **Lightning Mode**: Instant PC control on low-resource machines. |
| **`qwen2.5:7b`** | 7.6B | Q4_K_M | ~4 tokens/s (GPU req.) | Deep reasoning, script generation, and multi-step complex automation (requires NVIDIA GPU). |

### In-App Dynamic Model Management
Models can be pulled dynamically in the HUD UI via the Ollama Model Puller row or via IPC:
```javascript
await invoke("pull_ollama_model", { modelName: "qwen2.5:1.5b" });
```
