use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Networks, System};

const OLLAMA_CHAT_URL: &str = "http://127.0.0.1:11434/api/chat";
const OLLAMA_PS_URL: &str = "http://127.0.0.1:11434/api/ps";
const MODEL_NAME: &str = "qwen3.5:2b";

#[cfg(windows)]
mod win32_apps {
    use std::ffi::c_void;

    type HWND = *mut c_void;
    type BOOL = i32;
    type LPARAM = isize;
    type DWORD = u32;

    unsafe extern "system" {
        fn EnumWindows(lpEnumFunc: extern "system" fn(HWND, LPARAM) -> BOOL, lParam: LPARAM) -> BOOL;
        fn IsWindowVisible(hWnd: HWND) -> BOOL;
        fn GetWindowTextLengthW(hWnd: HWND) -> i32;
        fn GetWindowTextW(hWnd: HWND, lpString: *mut u16, nMaxCount: i32) -> i32;
        fn GetWindowThreadProcessId(hWnd: HWND, lpdwProcessId: *mut DWORD) -> DWORD;
        fn GetWindowLongW(hWnd: HWND, nIndex: i32) -> i32;
        fn GetWindow(hWnd: HWND, uCmd: u32) -> HWND;
        fn SetForegroundWindow(hWnd: HWND) -> BOOL;
        fn ShowWindow(hWnd: HWND, nCmdShow: i32) -> BOOL;
    }

    const GW_OWNER: u32 = 4;
    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TOOLWINDOW: i32 = 0x00000080;
    const WS_EX_APPWINDOW: i32 = 0x00040000;

    extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            if IsWindowVisible(hwnd) != 0 && GetWindowTextLengthW(hwnd) > 0 {
                let owner = GetWindow(hwnd, GW_OWNER);
                let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                let is_tool = (ex_style & WS_EX_TOOLWINDOW) != 0;
                let is_app = (ex_style & WS_EX_APPWINDOW) != 0;

                if (owner.is_null() && !is_tool) || is_app {
                    let mut buf = [0u16; 512];
                    let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), 512);
                    if len > 0 {
                        let title = String::from_utf16_lossy(&buf[..len as usize]).trim().to_string();
                        if !title.is_empty() 
                            && title != "Program Manager" 
                            && title != "Settings" 
                            && title != "Windows Input Experience"
                            && !title.contains("STARK HOLOGRAPHIC CONSOLE")
                            && !title.contains("J.A.R.V.I.S.")
                        {
                            let mut pid: DWORD = 0;
                            GetWindowThreadProcessId(hwnd, &mut pid);
                            let list = &mut *(lparam as *mut Vec<(u32, String)>);
                            list.push((pid, title));
                        }
                    }
                }
            }
            1
        }
    }

    pub fn get_taskbar_windows() -> Vec<(u32, String)> {
        let mut list: Vec<(u32, String)> = Vec::new();
        unsafe {
            EnumWindows(enum_proc, &mut list as *mut _ as LPARAM);
        }
        list
    }

    struct FocusTarget {
        target: String,
        found: bool,
    }

    extern "system" fn focus_enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            if IsWindowVisible(hwnd) != 0 && GetWindowTextLengthW(hwnd) > 0 {
                let mut buf = [0u16; 512];
                let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), 512);
                if len > 0 {
                    let title = String::from_utf16_lossy(&buf[..len as usize]).to_lowercase();
                    let ft = &mut *(lparam as *mut FocusTarget);
                    let tgt = &ft.target;
                    if title.contains(tgt) || tgt.contains(&title) {
                        ShowWindow(hwnd, 9); // SW_RESTORE
                        SetForegroundWindow(hwnd);
                        ft.found = true;
                        return 0; // stop enumeration
                    }
                }
            }
            1
        }
    }

    pub fn focus_window(target: &str) -> bool {
        let mut ft = FocusTarget {
            target: target.to_lowercase(),
            found: false,
        };
        unsafe {
            EnumWindows(focus_enum_proc, &mut ft as *mut _ as LPARAM);
        }
        ft.found
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelMetrics {
    pub name: String,
    pub parameter_size: String,
    pub quantization: String,
    pub context_length: u32,
    pub memory_mb: f64,
    pub eval_tokens_per_sec: f32,
    pub last_eval_count: u32,
    pub last_prompt_eval_count: u32,
    pub last_latency_ms: u128,
    pub is_loaded: bool,
}

impl Default for ModelMetrics {
    fn default() -> Self {
        Self {
            name: "qwen3.5:2b".to_string(),
            parameter_size: "1.9B".to_string(),
            quantization: "Q8_0".to_string(),
            context_length: 4096,
            memory_mb: 2260.0,
            eval_tokens_per_sec: 12.0,
            last_eval_count: 10,
            last_prompt_eval_count: 13,
            last_latency_ms: 830,
            is_loaded: true,
        }
    }
}

pub struct AppState {
    pub sys: Mutex<System>,
    pub networks: Mutex<Networks>,
    pub model_metrics: Mutex<ModelMetrics>,
}

#[cfg(windows)]
fn check_has_mic() -> bool {
    #[link(name = "winmm")]
    unsafe extern "system" {
        fn waveInGetNumDevs() -> u32;
    }
    unsafe { waveInGetNumDevs() > 0 }
}

#[cfg(not(windows))]
fn check_has_mic() -> bool {
    false
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProcessItem {
    pub name: String,
    pub title: String,
    pub cpu_usage: f32,
    pub memory_mb: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemTelemetry {
    pub cpu_usage: f32,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub ram_percent: f32,
    pub net_rx_kb: f32,
    pub net_tx_kb: f32,
    pub top_apps: Vec<ProcessItem>,
    pub model_metrics: ModelMetrics,
    pub has_mic: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JarvisResponse {
    pub reply: String,
    pub action: Option<String>,
    pub latency_ms: u128,
}

// Windows System Action Executor
fn execute_system_action(action: &str, target: &str) -> Result<String, String> {
    match action {
        "focus_app" | "open_or_focus" => {
            let app_clean = target.to_lowercase().trim().to_string();
            #[cfg(windows)]
            {
                if win32_apps::focus_window(&app_clean) {
                    return Ok(format!("Focused {}", target));
                }
            }
            execute_system_action("open_app", target)
        }
        "open_app" => {
            let app_clean = target.to_lowercase().trim().to_string();
            let executable = match app_clean.as_str() {
                "notepad" => "notepad.exe",
                "calc" | "calculator" => "calc.exe",
                "cmd" | "command prompt" => "cmd.exe",
                "powershell" => "powershell.exe",
                "terminal" => "wt.exe",
                "explorer" | "files" | "file manager" => "explorer.exe",
                "taskmgr" | "task manager" => "taskmgr.exe",
                "paint" | "mspaint" => "mspaint.exe",
                "chrome" => "chrome.exe",
                "edge" => "msedge.exe",
                "code" | "vscode" => "code.cmd",
                "settings" => "ms-settings:",
                "call" | "phone" => "ms-phone:",
                "mail" | "email" | "outlook" => "ms-outlook:",
                "message" | "messages" | "whatsapp" => "whatsapp:",
                "music" | "spotify" => "spotify:",
                _ => &app_clean,
            };

            let res = Command::new("cmd")
                .args(["/C", "start", "", executable])
                .spawn();

            match res {
                Ok(_) => Ok(format!("Opened {}", target)),
                Err(e) => Err(format!("Failed to open {}: {}", target, e)),
            }
        }
        "close_app" => {
            let app_clean = target.to_lowercase().trim().to_string();
            let exe_name = if app_clean.ends_with(".exe") {
                app_clean
            } else {
                format!("{}.exe", app_clean)
            };

            let res = Command::new("taskkill")
                .args(["/IM", &exe_name, "/F"])
                .output();

            match res {
                Ok(_) => Ok(format!("Closed {}", target)),
                Err(e) => Err(format!("Failed to close {}: {}", target, e)),
            }
        }
        "lock_pc" => {
            let _ = Command::new("rundll32.exe")
                .args(["user32.dll,LockWorkStation"])
                .spawn();
            Ok("Computer locked.".to_string())
        }
        "minimize_all" => {
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", "(New-Object -ComObject Shell.Application).MinimizeAll()"])
                .output();
            Ok("Minimized all windows.".to_string())
        }
        "volume_mute" => {
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)"])
                .output();
            Ok("Toggled audio mute.".to_string())
        }
        "volume_up" => {
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", "$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt 5;$i++){ $w.SendKeys([char]175) }"])
                .output();
            Ok("Volume increased.".to_string())
        }
        "volume_down" => {
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-Command", "$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt 5;$i++){ $w.SendKeys([char]174) }"])
                .output();
            Ok("Volume decreased.".to_string())
        }
        "screenshot" => {
            let _ = Command::new("cmd")
                .args(["/C", "start", "ms-screenclip:"])
                .spawn();
            Ok("Opened Screen Snip tool.".to_string())
        }
        _ => Err(format!("Unknown action: {}", action)),
    }
}

// Instant Fast-Path checking (0.002s execution)
fn check_fast_path(prompt: &str) -> Option<JarvisResponse> {
    let lower = prompt.to_lowercase().trim().to_string();
    let start = Instant::now();

    if lower == "lock pc" || lower == "lock screen" || lower == "lock my computer" {
        let _ = execute_system_action("lock_pc", "");
        return Some(JarvisResponse {
            reply: "Computer locked.".into(),
            action: Some("Lock Workstation".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "minimize all" || lower == "show desktop" || lower == "minimize windows" {
        let _ = execute_system_action("minimize_all", "");
        return Some(JarvisResponse {
            reply: "Minimized all open windows.".into(),
            action: Some("Minimize Windows".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "mute" || lower == "unmute" || lower == "mute audio" {
        let _ = execute_system_action("volume_mute", "");
        return Some(JarvisResponse {
            reply: "Toggled audio mute.".into(),
            action: Some("Volume Mute".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "volume up" || lower == "increase volume" {
        let _ = execute_system_action("volume_up", "");
        return Some(JarvisResponse {
            reply: "Turned volume up.".into(),
            action: Some("Volume Up".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "volume down" || lower == "decrease volume" {
        let _ = execute_system_action("volume_down", "");
        return Some(JarvisResponse {
            reply: "Turned volume down.".into(),
            action: Some("Volume Down".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "screenshot" || lower == "take screenshot" || lower == "capture screen" {
        let _ = execute_system_action("screenshot", "");
        return Some(JarvisResponse {
            reply: "Opening screen capture tool.".into(),
            action: Some("Screenshot".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    // Direct app launchers
    if lower == "call" || lower == "phone" || lower == "make a call" || lower == "open call" || lower == "phone link" {
        let _ = execute_system_action("open_app", "call");
        return Some(JarvisResponse {
            reply: "Connecting to Phone Link / Call.".into(),
            action: Some("Call".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "mail" || lower == "email" || lower == "open mail" || lower == "outlook" || lower == "open outlook" {
        let _ = execute_system_action("open_app", "outlook");
        return Some(JarvisResponse {
            reply: "Opening Microsoft Outlook.".into(),
            action: Some("Outlook".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "message" || lower == "messages" || lower == "whatsapp" || lower == "open whatsapp" || lower == "send message" {
        let _ = execute_system_action("open_app", "whatsapp");
        return Some(JarvisResponse {
            reply: "Opening WhatsApp.".into(),
            action: Some("WhatsApp".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if lower == "music" || lower == "play music" || lower == "spotify" || lower == "open music" || lower == "open spotify" {
        let _ = execute_system_action("open_app", "music");
        return Some(JarvisResponse {
            reply: "Opening Spotify music.".into(),
            action: Some("Spotify".into()),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    if let Some(target) = lower.strip_prefix("open ").or_else(|| lower.strip_prefix("launch ")) {
        let clean_target = target.trim();
        if matches!(
            clean_target,
            "notepad" | "calc" | "calculator" | "cmd" | "powershell" | "terminal" | "explorer" | "task manager" | "taskmgr" | "paint" | "chrome" | "edge" | "settings" | "call" | "mail" | "music" | "spotify"
        ) {
            let res = execute_system_action("open_app", clean_target).unwrap_or_else(|e| e);
            return Some(JarvisResponse {
                reply: res.clone(),
                action: Some(format!("Launch {}", clean_target)),
                latency_ms: start.elapsed().as_millis(),
            });
        }
    }

    if let Some(target) = lower.strip_prefix("close ").or_else(|| lower.strip_prefix("kill ")) {
        let clean_target = target.trim();
        let res = execute_system_action("close_app", clean_target).unwrap_or_else(|e| e);
        return Some(JarvisResponse {
            reply: res.clone(),
            action: Some(format!("Close {}", clean_target)),
            latency_ms: start.elapsed().as_millis(),
        });
    }

    None
}

#[tauri::command]
async fn ask_jarvis(prompt: String, state: tauri::State<'_, AppState>) -> Result<JarvisResponse, String> {
    let start_time = Instant::now();

    if let Some(fast_res) = check_fast_path(&prompt) {
        return Ok(fast_res);
    }

    let client = reqwest::Client::new();

    let tools = serde_json::json!([
        {
            "type": "function",
            "function": {
                "name": "open_app",
                "description": "Open or launch a Windows application or tool (notepad, calc, cmd, explorer, chrome, edge, paint, taskmgr, settings, call, mail, music)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "app_name": {
                            "type": "string",
                            "description": "Name of the app to launch"
                        }
                    },
                    "required": ["app_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "close_app",
                "description": "Close or terminate a running Windows application",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "app_name": {
                            "type": "string",
                            "description": "Name of the app to close"
                        }
                    },
                    "required": ["app_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "lock_pc",
                "description": "Lock the Windows workstation screen",
                "parameters": { "type": "object", "properties": {} }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "minimize_all",
                "description": "Minimize all active open windows and show the desktop",
                "parameters": { "type": "object", "properties": {} }
            }
        }
    ]);

    let payload = serde_json::json!({
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": "You are J.A.R.V.I.S., a direct Windows system assistant. Respond in 1-2 short sentences. When asked to open or close any program, use the provided tools."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "tools": tools,
        "stream": false,
        "think": false,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
            "num_ctx": 4096
        }
    });

    let res = client
        .post(OLLAMA_CHAT_URL)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}. Is Ollama running?", e))?;

    let json_val: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let latency_ms = start_time.elapsed().as_millis();
    let eval_count = json_val["eval_count"].as_u64().unwrap_or(0) as u32;
    let eval_duration = json_val["eval_duration"].as_u64().unwrap_or(0);
    let prompt_eval_count = json_val["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
    let tokens_per_sec = if eval_duration > 0 {
        eval_count as f32 / (eval_duration as f32 / 1_000_000_000.0)
    } else {
        0.0
    };

    if let Ok(mut mm) = state.model_metrics.lock() {
        if tokens_per_sec > 0.0 {
            mm.eval_tokens_per_sec = tokens_per_sec;
        }
        mm.last_eval_count = eval_count;
        mm.last_prompt_eval_count = prompt_eval_count;
        mm.last_latency_ms = latency_ms;
    }

    let message = &json_val["message"];
    let content = message["content"].as_str().unwrap_or("").trim().to_string();

    if let Some(tool_calls) = message["tool_calls"].as_array() {
        for call in tool_calls {
            let fn_name = call["function"]["name"].as_str().unwrap_or("");
            let args = &call["function"]["arguments"];

            if fn_name == "open_app" {
                let app_name = args["app_name"].as_str().unwrap_or("notepad");
                let action_res = execute_system_action("open_app", app_name).unwrap_or_else(|e| e);
                return Ok(JarvisResponse {
                    reply: format!("Acknowledged. {}", action_res),
                    action: Some(format!("Opened {}", app_name)),
                    latency_ms,
                });
            } else if fn_name == "close_app" {
                let app_name = args["app_name"].as_str().unwrap_or("");
                let action_res = execute_system_action("close_app", app_name).unwrap_or_else(|e| e);
                return Ok(JarvisResponse {
                    reply: format!("Done. {}", action_res),
                    action: Some(format!("Closed {}", app_name)),
                    latency_ms,
                });
            } else if fn_name == "lock_pc" {
                let _ = execute_system_action("lock_pc", "");
                return Ok(JarvisResponse {
                    reply: "Locking workstation now.".into(),
                    action: Some("Lock PC".into()),
                    latency_ms,
                });
            } else if fn_name == "minimize_all" {
                let _ = execute_system_action("minimize_all", "");
                return Ok(JarvisResponse {
                    reply: "Minimizing all active windows.".into(),
                    action: Some("Minimize All".into()),
                    latency_ms,
                });
            }
        }
    }

    Ok(JarvisResponse {
        reply: if content.is_empty() {
            "Ready for your command, sir.".to_string()
        } else {
            content
        },
        action: None,
        latency_ms,
    })
}

#[tauri::command]
async fn get_system_telemetry(state: tauri::State<'_, AppState>) -> Result<SystemTelemetry, String> {
    let (cpu_usage, ram_used_gb, ram_total_gb, ram_percent, proc_list) = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_cpu_all();
        sys.refresh_memory();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let cpu = sys.global_cpu_usage();
        let total_bytes = sys.total_memory() as f32;
        let used_bytes = sys.used_memory() as f32;

        let ram_total = total_bytes / (1024.0 * 1024.0 * 1024.0);
        let ram_used = used_bytes / (1024.0 * 1024.0 * 1024.0);
        let ram_pct = if total_bytes > 0.0 {
            (used_bytes / total_bytes) * 100.0
        } else {
            0.0
        };

        // Extract ONLY applications active on the Windows Taskbar
        let mut plist: Vec<ProcessItem> = Vec::new();

        #[cfg(windows)]
        {
            let taskbar_wins = win32_apps::get_taskbar_windows();
            for (pid, title) in taskbar_wins {
                let sys_pid = sysinfo::Pid::from_u32(pid);
                if let Some(proc) = sys.process(sys_pid) {
                    let mut name_clean = proc.name().to_string_lossy().to_string();
                    if name_clean.to_lowercase().ends_with(".exe") {
                        name_clean.truncate(name_clean.len() - 4);
                    }
                    let mem_mb = (proc.memory() as f64) / (1024.0 * 1024.0);
                    let proc_cpu = proc.cpu_usage();

                    if let Some(existing) = plist.iter_mut().find(|p| p.name.eq_ignore_ascii_case(&name_clean)) {
                        existing.memory_mb += mem_mb;
                        existing.cpu_usage += proc_cpu;
                    } else {
                        plist.push(ProcessItem {
                            name: name_clean.to_uppercase(),
                            title,
                            cpu_usage: proc_cpu,
                            memory_mb: mem_mb,
                        });
                    }
                } else {
                    let short_name = title.split(" - ").last().unwrap_or(&title).trim().to_uppercase();
                    let clean_short = if short_name.len() > 16 { short_name[..16].to_string() } else { short_name };
                    if !plist.iter().any(|p| p.name == clean_short) {
                        plist.push(ProcessItem {
                            name: clean_short,
                            title,
                            cpu_usage: 0.5,
                            memory_mb: 180.0,
                        });
                    }
                }
            }
        }

        // Fallback: If no taskbar windows enumerated, populate from active non-system apps
        if plist.is_empty() {
            for (_, proc) in sys.processes() {
                let mut name_clean = proc.name().to_string_lossy().to_string();
                if name_clean.to_lowercase().ends_with(".exe") {
                    name_clean.truncate(name_clean.len() - 4);
                }
                let lower_name = name_clean.to_lowercase();
                if matches!(
                    lower_name.as_str(),
                    "system" | "svchost" | "csrss" | "smss" | "services" | "lsass" | "wininit" | "winlogon" | "fontdrvhost" | "dwm" | "registry" | "memory compression" | "conhost"
                ) {
                    continue;
                }
                let mem_mb = (proc.memory() as f64) / (1024.0 * 1024.0);
                if mem_mb < 30.0 {
                    continue;
                }
                let proc_cpu = proc.cpu_usage();
                if let Some(existing) = plist.iter_mut().find(|p| p.name.eq_ignore_ascii_case(&name_clean)) {
                    existing.memory_mb += mem_mb;
                    existing.cpu_usage += proc_cpu;
                } else {
                    plist.push(ProcessItem {
                        name: name_clean.to_uppercase(),
                        title: name_clean.clone(),
                        cpu_usage: proc_cpu,
                        memory_mb: mem_mb,
                    });
                }
            }
        }

        plist.sort_by(|a, b| b.memory_mb.partial_cmp(&a.memory_mb).unwrap_or(std::cmp::Ordering::Equal));
        plist.truncate(6);

        (cpu, ram_used, ram_total, ram_pct, plist)
    };

    let (net_rx_kb, net_tx_kb) = {
        let mut networks = state.networks.lock().map_err(|e| e.to_string())?;
        networks.refresh(true);
        let mut rx = 0.0;
        let mut tx = 0.0;
        for (_, data) in networks.iter() {
            rx += (data.received() as f32) / 1024.0;
            tx += (data.transmitted() as f32) / 1024.0;
        }
        (rx, tx)
    };

    // Query Ollama /api/ps for real loaded model information
    let client = reqwest::Client::new();
    if let Ok(res) = client.get(OLLAMA_PS_URL).timeout(Duration::from_millis(300)).send().await {
        if let Ok(ps_json) = res.json::<serde_json::Value>().await {
            if let Some(models) = ps_json["models"].as_array() {
                if let Some(first_model) = models.first() {
                    let name = first_model["name"].as_str().unwrap_or(MODEL_NAME).to_string();
                    let param_size = first_model["details"]["parameter_size"].as_str().unwrap_or("1.9B").to_string();
                    let quant = first_model["details"]["quantization_level"].as_str().unwrap_or("Q8_0").to_string();
                    let ctx_len = first_model["context_length"].as_u64().unwrap_or(4096) as u32;
                    let size_bytes = first_model["size"].as_f64().unwrap_or(2369666414.0);
                    let mem_mb = size_bytes / (1024.0 * 1024.0);

                    if let Ok(mut mm) = state.model_metrics.lock() {
                        mm.name = name;
                        mm.parameter_size = param_size;
                        mm.quantization = quant;
                        mm.context_length = ctx_len;
                        mm.memory_mb = mem_mb;
                        mm.is_loaded = true;
                    }
                }
            }
        }
    }

    let model_metrics = {
        let mm = state.model_metrics.lock().map_err(|e| e.to_string())?;
        mm.clone()
    };

    let has_mic = check_has_mic();

    Ok(SystemTelemetry {
        cpu_usage,
        ram_used_gb,
        ram_total_gb,
        ram_percent,
        net_rx_kb,
        net_tx_kb,
        top_apps: proc_list,
        model_metrics,
        has_mic,
    })
}

#[tauri::command]
fn run_direct_action(action: String, target: String) -> Result<String, String> {
    execute_system_action(&action, &target)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut sys = System::new_all();
    sys.refresh_all();
    let networks = Networks::new_with_refreshed_list();

    let state = AppState {
        sys: Mutex::new(sys),
        networks: Mutex::new(networks),
        model_metrics: Mutex::new(ModelMetrics::default()),
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ask_jarvis,
            run_direct_action,
            get_system_telemetry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
