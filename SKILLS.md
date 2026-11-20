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
Powered by the **Vision Agent** (`llama-3.2-11b-vision-preview` on Groq LPU with `qwen/qwen3.8-27b` failsafe):
- In-memory Win32 GDI screen capture directly to RAM bytes (zero disk file writes).
- Real-time UI element hierarchy inspection via `EnumChildWindows` (buttons, inputs, edit boxes, labels).
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

### 8. Developer Agent (`write_code_jarvis`)
Powered by `qwen/qwen3.8-27b` on Groq LPU with local `qwen3.5:2b` failsafe:
- Generates complete, modern, production-grade source code (React, Python, JavaScript, HTML, algorithms, etc.).
- Automatically detects target editor, focusing or launching **Notepad** (or **VS Code**).
- Injects clean code directly into the active editor using native Win32 clipboard paste (`Ctrl+V`) with verified focus restoration and zero dropped characters.
- Triggered by voice or text:
  - *"open notepad and write code"*
  - *"open notepad and write a react code"*
  - *"write a react code"*
  - *"write python script in vs code"*
  - *"type hello world in notepad"*

### 9. System Agent: Complete Desktop, Media, Mouse, Keyboard & Form Automation
Provides full hands-free voice control across Windows without touching keyboard or mouse:
- **Window Focus Manager & Verification**: Continuous background tracking of external foreground window (`LAST_EXTERNAL_HWND`). Automatically breaks foreground lock via Win32 `AttachThreadInput` and verifies focus before executing input actions.
- **Browser & Tabs**: New tab (`Ctrl+T`), close tab (`Ctrl+W`), reopen tab (`Ctrl+Shift+T`), switch tabs (`Ctrl+Tab`), refresh (`F5`), back/forward (`Alt+Left`/`Alt+Right`). Naturally understands *"open new tab in chrome"*, *"new tab in edge"*, *"open new tab while I opened Chrome"*.
- **Voice Form Filler**: Hands-free web form entry: *"type [text]"*, *"next field"* (`VK_TAB`), *"previous field"* (`Shift+Tab`), *"clear field"* (`Ctrl+A` + Backspace), *"submit form"* (`VK_RETURN`).
- **Safety Guardrail**: Automatically halts sensitive transactions (payments, purchases, checkout, data wipe) and demands explicit voice confirmation (*"Confirm submission"*).
- **Voice Barge-In**: Instant audio interruption — speaking a new command or saying *"stop"* / *"cancel"* cancels TTS immediately without disabling the microphone.
- **Media Controller**: Global play/pause, next track, previous track, stop (`play`, `pause`, `resume`, `play music`, `next song`, `previous song`, `stop music`).
- **Mouse & Scrolling**: Real-time wheel scrolling (`scroll down`, `scroll up`, `scroll to top`, `scroll to bottom`), left click, right click, double click.
- **Keyboard Shortcuts**: Save (`Ctrl+S`), copy (`Ctrl+C`), paste (`Ctrl+V`), select all (`Ctrl+A`), undo (`Ctrl+Z`), redo (`Ctrl+Y`), enter, escape, backspace, tab.
- **Window Management**: Maximize, minimize, restore, snap left (`Win+Left`), snap right (`Win+Right`), switch window (`Alt+Tab`), close window (`Alt+F4`).
- **Direct Typing**: Dictates and pastes text into any active field (`type [text]`, `enter [text]`).
- **App Switching**: Focus any running window (`focus [app]`, `switch to [app]`).

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
