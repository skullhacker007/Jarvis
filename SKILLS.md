# J.A.R.V.I.S. Skills & Capabilities Specification

This document details the complete functional skills, system actions, execution pathways, and expansion protocols supported by the J.A.R.V.I.S. runtime.

---

## 🎯 Action Taxonomy

J.A.R.V.I.S. interprets natural language and speech into discrete system actions. Directives dispatched by the local neural core or fast-path engine resolve to one of the following:

| Action ID | Description | Target Syntax | Example Directives |
| :--- | :--- | :--- | :--- |
| `open_app` | Launches a Windows application or executable. | Application slug, URI, or executable name. | *"open notepad"*, *"launch vs code"*, *"start chrome"* |
| `close_app` | Gracefully closes or terminates an active process. | Application name or process image name. | *"close notepad"*, *"terminate chrome"*, *"kill calculator"* |
| `focus_app` | Restores and brings an active taskbar window to the foreground. | Window title or process name substring. | *"focus code"*, *"switch to spotify"*, *"bring up terminal"* |
| `run_cmd` | Executes an administrative shell command or URL. | Shell command string or URL. | *"open youtube"*, *"run ipconfig"*, *"open downloads"* |
| `system_ctrl`| Modifies Windows workstation state or audio levels. | Specific system control verbs. | *"lock pc"*, *"mute audio"*, *"volume up"*, *"screenshot"* |
| `click_element` | Coordinate-free control click via UI Automation. | Control text, button label, or accessibility name. | *"click submit"*, *"click save button"*, *"press ok"* |
| `enable_auto_startup` | Registers app in Windows Registry Run key. | Empty (`""`). | *"enable auto startup"*, *"start with windows"* |
| `disable_auto_startup`| Removes app from Windows Registry Run key. | Empty (`""`). | *"disable auto startup"*, *"don't start with windows"* |
| `memory_store` | Embeds and stores a fact in persistent vector RAG memory. | Text note or fact statement. | *"remember that my phone is pixel 9"*, *"store note"* |
| `memory_recall` | Semantic search over vector memory with cosine similarity. | Search topic or query. | *"recall phone model"*, *"what did I say about..."* |
| `airdrop_file` | Beams local file to Android device `/sdcard/Download/`. | Local file path. | *"airdrop invoice.pdf"*, drag-and-drop overlay |
| `file_search` | High-speed semantic local drive file search. | File name or search keywords. | *"find file report.docx"*, *"search documents"* |
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
- **Phone Link / Calls**: Managed natively inside the HUD dialer

### 2. Process Termination (`close_app`)
Safely terminates targets using PowerShell `Stop-Process -Name <target> -Force`:
- Matches common names to their image names (e.g. `notepad`, `calc`, `chrome`, `code`, `spotify`).
- Verified zero zombie processes and confirmed exit status.

### 3. Window Focus & Switching (`focus_app`)
Uses Win32 `EnumWindows`, `ShowWindow(SW_RESTORE)`, and `SetForegroundWindow`:
- Scans open, visible top-level windows on the taskbar.
- Matches window titles or process identifiers.
- Clicking any active app chip in the **Active Running Apps** deck immediately brings that window to the foreground.

### 4. Windows UI Automation COM Engine (`click_element`)
Coordinate-free control targeting:
- Scans visible child controls in foreground window via Win32 `EnumChildWindows`.
- Matches child control window text or class name against the target.
- Queries `GetWindowRect`, computes control center coordinate `(center_x, center_y)`, and synthesizes a native Win32 left-click without user-specified coordinates.
- Triggered by directives: *"click Save"*, *"click Next"*, *"click OK"*, *"press submit"*.

### 5. Windows Auto-Startup (`enable_auto_startup` / `disable_auto_startup`)
Native Windows registry integration:
- **Registry Key**: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- **Value Name**: `Jarvis`
- **Value Data**: Quoted path to active `Jarvis.exe` binary.
- Triggered by voice or text: *"start with windows"*, *"enable auto startup"*, *"disable auto startup"*.

### 6. Persistent Hybrid Vector Memory (`memory_store` / `memory_recall`)
- Embeds incoming facts into 128-dimensional L2-normalized vectors.
- Ranks stored memories using cosine similarity against query vectors.
- Persists records across restarts in local JSON storage (`~/.jarvis/memory.json`).
- Triggered by directives: *"remember that [fact]"*, *"recall [topic]"*.

### 7. Holographic Phone Mirroring & Notifications (`get_phone_notifications`)
- Background ADB engine queries `dumpsys notification --noredact` every 4.5 seconds.
- Automatically mirrors incoming WhatsApp, Telegram, Slack, Mail, SMS, and Phone notifications into cyber glass HUD toasts.
- Displays app name, sender title, message snippet, and timestamp with alert chime.

### 8. Wireless P2P AirDrop (`airdrop_file`)
- Direct high-speed push of dropped or selected files directly to Android `/sdcard/Download/` via ADB.
- Visual holographic dropzone overlay activates on file drag-over.

### 9. Semantic Local File Search (`file_search`)
- Traverses user document, code, and download directories.
- Returns ranked matches with file name, file size in KB, extension, and modification date.
- Modal interface supports instant one-click file opening via Windows shell.

### 10. Developer Agent (`write_code_jarvis`)
- Synthesizes modern production code (React, Python, JavaScript, HTML, algorithms) via Groq LPU (`qwen/qwen3.8-27b`) with local Queen failsafe.
- Injects clean code directly into active editor (Notepad, VS Code) using native Win32 clipboard paste with verified focus restoration.

### 11. Hands-Free Desktop & Form Automation
- **Browser & Tabs**: New tab (`Ctrl+T`), close tab (`Ctrl+W`), reopen tab (`Ctrl+Shift+T`), switch tabs (`Ctrl+Tab`), refresh (`F5`), back/forward (`Alt+Left`/`Alt+Right`).
- **Voice Form Filler**: Hands-free web form entry: *"type [text]"*, *"next field"* (`Tab`), *"previous field"* (`Shift+Tab`), *"clear field"* (`Ctrl+A` + Backspace), *"submit form"* (`Enter`).
- **Safety Guardrail**: Automatically halts sensitive transactions (payments, purchases, checkout, data wipe) and demands explicit voice confirmation (*"Confirm submission"*).
- **Voice Barge-In**: Instant audio interruption — speaking a new command or saying *"stop"* / *"cancel"* cancels TTS immediately without disabling the microphone.
- **Media Controller**: Global play/pause, next track, previous track, stop (`play`, `pause`, `resume`, `next song`, `stop music`).
- **Mouse & Scrolling**: Real-time wheel scrolling (`scroll down`, `scroll up`, `scroll to top`, `scroll to bottom`), left click, right click, double click.
- **Keyboard Shortcuts**: Save (`Ctrl+S`), copy (`Ctrl+C`), paste (`Ctrl+V`), select all (`Ctrl+A`), undo (`Ctrl+Z`), redo (`Ctrl+Y`), enter, escape, backspace, tab.

---

## ⚡ Execution Mechanics: Zero-Window Rule

All shell invocations originating from J.A.R.V.I.S. enforce the **Zero-Window Rule**:
```rust
const CREATE_NO_WINDOW: u32 = 0x08000000;

let mut cmd = Command::new("powershell");
cmd.creation_flags(CREATE_NO_WINDOW);
cmd.args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script]);
```
- No flashing black console or PowerShell windows ever appear on the user's screen.
- Command execution is clean, instantaneous, and silent.

---

## 🔌 How to Add New Skills

To register a new skill or tool in J.A.R.V.I.S.:

1. **Add Target Mapping to Queen Prompt Rules** in [src-tauri/src/lib.rs](file:///c:/Users/Chowdary/Desktop/Project/Jarvis/src-tauri/src/lib.rs).
2. **Add Execution Case in `run_direct_action`**:
   ```rust
   "my_new_action" => {
       // Perform action logic
       Ok("Action completed, sir.".to_string())
   }
   ```
3. **Register Fast-Path Matcher in `check_fast_path`** for instant sub-5ms heuristic dispatch.
4. **Compile and Verify**:
   ```powershell
   npm run build:exe
   ```
