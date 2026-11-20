# J.A.R.V.I.S. Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the J.A.R.V.I.S. runtime.

---

## 🎯 Action Taxonomy

J.A.R.V.I.S. interprets natural language and speech into five discrete system action types. Every directive dispatched by the local neural core or fast-path engine resolves to one of the following:

| Action ID | Description | Target Syntax | Example Directives |
| :--- | :--- | :--- | :--- |
| `open_app` | Launches a Windows application or executable. | Application slug, URI, or executable name. | *"open notepad"*, *"launch vs code"*, *"start chrome"* |
| `close_app` | Gracefully closes or terminates an active process. | Application name or process image name. | *"close notepad"*, *"terminate chrome"*, *"kill calculator"* |
| `focus_app` | Restores and brings an active taskbar window to the foreground. | Window title or process name substring. | *"focus code"*, *"switch to spotify"*, *"bring up terminal"* |
| `run_cmd` | Executes an administrative shell command or URL. | Shell command string or URL. | *"open youtube"*, *"run ipconfig"*, *"open downloads"* |
| `system_ctrl`| Modifies Windows workstation state or audio levels. | Specific system control verbs. | *"lock pc"*, *"mute audio"*, *"volume up"*, *"screenshot"* |
| `none` | Pure conversational or factual response; no action executed. | Empty (`""`). | *"what is your status"*, *"who made you"*, *"tell me a joke"* |

---

## 🛠️ Built-in Skill Registry

### 1. Application Management (`open_app`)
Handles process spawning via Windows PowerShell / Win32 `Start-Process` with silent flags:

- **Notepad**: `Start-Process 'notepad' -WindowStyle Normal`
- **Visual Studio Code**: `Start-Process 'code' -WindowStyle Normal`
- **Calculator**: `Start-Process 'calc' -WindowStyle Normal`
- **Google Chrome**: `Start-Process 'chrome' -WindowStyle Normal`
- **Windows Terminal**: `Start-Process 'wt' -WindowStyle Normal`
- **Task Manager**: `Start-Process 'taskmgr' -WindowStyle Normal`
- **Paint**: `Start-Process 'mspaint' -WindowStyle Normal`
- **Spotify**: `Start-Process 'spotify' -WindowStyle Normal`
- **WhatsApp**: `Start-Process 'whatsapp' -WindowStyle Normal`
- **Phone Link / Calls**: `Start-Process 'ms-phone:' -WindowStyle Normal`
- **Outlook Mail**: `Start-Process 'mailto:' -WindowStyle Normal`

### 2. Process Termination (`close_app`)
Safely terminates targets using PowerShell `Stop-Process -Name <target> -Force`:
- Matches common names to their image names (e.g. `notepad`, `calc`, `chrome`, `code`, `spotify`).
- Verified zero zombie processes and confirmed exit status.

### 3. Window Focus & Switching (`focus_app`)
Uses Win32 `EnumWindows`, `ShowWindow(SW_RESTORE)`, and `SetForegroundWindow`:
- Scans open, visible top-level windows on the taskbar.
- Matches window titles or process identifiers.
- Clicking any active app chip in the **Active Running Apps** deck immediately brings that window to the foreground.

### 4. Workstation Control (`system_ctrl`)
Administrative system state controls:
- **Lock Workstation**: `rundll32.exe user32.dll,LockWorkStation`
- **Audio Controls**: System volume up, volume down, and mute toggles via Windows virtual key codes (`0xAF`, `0xAE`, `0xAD`).
- **Screen Capture**: Dispatches Windows Snip & Sketch (`ms-screenclip:`).

### 5. Web & Direct Navigation (`run_cmd`)
Launches URLs directly in the user's default browser:
- `start https://youtube.com`
- `start https://google.com`
- `start https://github.com`

---

## ⚡ Execution Mechanics: Zero-Window Rule

All shell invocations originating from J.A.R.V.I.S. (via `silent_command` in `src-tauri/src/lib.rs`) enforce the **Zero-Window Rule**:
```rust
const CREATE_NO_WINDOW: u32 = 0x08000000;

let mut cmd = Command::new("powershell");
cmd.creation_flags(CREATE_NO_WINDOW);
cmd.args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script]);
```
- No flashing black console or PowerShell windows ever appear on the user's screen.
- Command execution is clean, instantaneous, and silent.

### 5. Holographic Screen Vision (`inspect_screen`)
Powered by the **Vision Agent** (`qwen/qwen3.8-27b`):
- Real-time Win32 foreground window and visible taskbar process inspection.
- Triggered by saying *"Jarvis, inspect my screen"*, *"what is on my screen"*, *"debug screen"*, or clicking the **👁️ Vision** icon in the dock.
- Provides concise tactical spoken analysis of active applications, open code, and screen context.

### 6. Live Web Research Agent (`web_search`)
Powered by real-time intelligence feeds (Google News RSS & Wikipedia APIs):
- Automatic live web grounding with real-time news, facts, and financial updates.
- Triggered by saying *"search for [query]"*, *"who is [name]"*, *"what is [topic]"*, *"latest news on [topic]"*, or clicking the **🌐 Web** icon in the dock.
- Summarizes live intelligence directly into a crisp spoken response without opening browser clutter.

### 7. Groq Whisper LPU Audio Engine (`whisper-large-v3-turbo`)
- Studio-grade cloud speech recognition operating at <200ms latency.
- Accessible via the Visor Microphone button (Push-to-Talk) alongside the silent offline Windows speech worker.

---

## 🔌 How to Add New Skills

To register a new skill or tool in J.A.R.V.I.S.:

1. **Add Target Mapping to the Queen Prompt** in [src-tauri/src/lib.rs](file:///c:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs):
   ```rust
   // Add target synonym to system_prompt rules:
   "- Target mapping: 'blender'->'blender', 'figma'->'figma'..."
   ```
2. **Add Execution Case in `execute_system_action`**:
   ```rust
   "open_app" => {
       match target.to_lowercase().as_str() {
           "blender" => silent_command("Start-Process 'blender' -WindowStyle Normal"),
           ...
       }
   }
   ```
3. **Register Speech Recognition Keywords** in `listen_mic`:
   ```powershell
   $targets.Add(@('blender', 'figma', 'discord', 'docker'))
   ```
4. **Compile and Verify**:
   ```powershell
   pnpm run build:exe
   ```
