use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Networks, System};

const OLLAMA_CHAT_URL: &str = "http://127.0.0.1:11434/api/chat";
const OLLAMA_PS_URL: &str = "http://127.0.0.1:11434/api/ps";
const OLLAMA_TAGS_URL: &str = "http://127.0.0.1:11434/api/tags";
const GROQ_CHAT_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME: &str = "qwen3.5:2b";

fn get_groq_api_key() -> String {
    if let Ok(k) = std::env::var("GROQ_API_KEY") {
        let t = k.trim().trim_matches('\'').trim_matches('"');
        if !t.is_empty() {
            return t.to_string();
        }
    }
    for p in ["./.env.local", "../.env.local", "C:/Users/Chowdary/Desktop/Project/Jarvis/.env.local"] {
        if let Ok(content) = std::fs::read_to_string(p) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("GROQ_API_KEY") {
                    if let Some(val) = trimmed.split('=').nth(1) {
                        return val.trim().trim_matches('\'').trim_matches('"').to_string();
                    }
                }
            }
        }
    }
    String::new()
}

#[cfg(windows)]
use std::os::windows::process::CommandExt;
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn silent_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

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
        fn BringWindowToTop(hWnd: HWND) -> BOOL;
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
                    let matches = if tgt == "phone" {
                        title == "phone" || title.starts_with("phone") || title.contains("phone")
                    } else {
                        title.contains(tgt) || tgt.contains(&title)
                    };
                    if matches {
                        ShowWindow(hwnd, 9); // SW_RESTORE
                        BringWindowToTop(hwnd);
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
            name: "qwen/qwen3.8-27b".to_string(),
            parameter_size: "27B".to_string(),
            quantization: "FP16 LPU".to_string(),
            context_length: 131072,
            memory_mb: 0.0,
            eval_tokens_per_sec: 267.0,
            last_eval_count: 0,
            last_prompt_eval_count: 0,
            last_latency_ms: 267,
            is_loaded: true,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AvailableModelInfo {
    pub id: String,
    pub display_name: String,
    pub provider: String,
    pub status: String,
    pub priority: u32,
    pub context_window: String,
    pub tokens_used: u64,
    pub speed_tok_s: f32,
    pub latency_ms: u128,
    pub is_active: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ModelRuntimeStats {
    pub tokens_used: u64,
    pub speed_tok_s: f32,
    pub latency_ms: u128,
}

pub struct AppState {
    pub sys: Mutex<System>,
    pub networks: Mutex<Networks>,
    pub model_metrics: Mutex<ModelMetrics>,
    pub model_stats: Mutex<HashMap<String, ModelRuntimeStats>>,
    pub active_model_id: Mutex<String>,
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
    true
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WatchDevice {
    pub name: String,
    pub is_connected: bool,
    pub is_paired: bool,
    pub class_of_device: u32,
    pub is_watch_device: bool,
    pub is_phone_device: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WatchStatusResult {
    pub has_connected_watch: bool,
    pub connected_watch_name: Option<String>,
    pub has_connected_phone: bool,
    pub connected_phone_name: Option<String>,
    pub devices: Vec<WatchDevice>,
}

#[cfg(windows)]
fn query_windows_bluetooth_devices() -> WatchStatusResult {
    use std::ffi::c_void;

    #[repr(C)]
    struct BLUETOOTH_DEVICE_SEARCH_PARAMS {
        dw_size: u32,
        f_return_authenticated: i32,
        f_return_remembered: i32,
        f_return_unknown: i32,
        f_return_connected: i32,
        f_issue_inquiry: i32,
        c_timeout_multiplier: u8,
        h_radio: *mut c_void,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct SYSTEMTIME {
        w_year: u16,
        w_month: u16,
        w_day_of_week: u16,
        w_day: u16,
        w_hour: u16,
        w_minute: u16,
        w_second: u16,
        w_milliseconds: u16,
    }

    #[repr(C)]
    struct BLUETOOTH_DEVICE_INFO {
        dw_size: u32,
        address: u64,
        ul_class_of_device: u32,
        f_connected: i32,
        f_remembered: i32,
        f_authenticated: i32,
        st_last_seen: SYSTEMTIME,
        st_last_used: SYSTEMTIME,
        sz_name: [u16; 248],
    }

    unsafe extern "system" {
        fn LoadLibraryA(lpLibFileName: *const u8) -> *mut c_void;
        fn GetProcAddress(hModule: *mut c_void, lpProcName: *const u8) -> *mut c_void;
        fn FreeLibrary(hLibModule: *mut c_void) -> i32;
    }

    type BluetoothFindFirstDeviceFn = unsafe extern "system" fn(
        *const BLUETOOTH_DEVICE_SEARCH_PARAMS,
        *mut BLUETOOTH_DEVICE_INFO,
    ) -> *mut c_void;

    type BluetoothFindNextDeviceFn = unsafe extern "system" fn(
        *mut c_void,
        *mut BLUETOOTH_DEVICE_INFO,
    ) -> i32;

    type BluetoothFindDeviceCloseFn = unsafe extern "system" fn(*mut c_void) -> i32;

    let mut result = WatchStatusResult {
        has_connected_watch: false,
        connected_watch_name: None,
        has_connected_phone: false,
        connected_phone_name: None,
        devices: Vec::new(),
    };

    unsafe {
        let h_mod = LoadLibraryA(b"bthprops.cpl\0".as_ptr());
        if !h_mod.is_null() {
            let p_first = GetProcAddress(h_mod, b"BluetoothFindFirstDevice\0".as_ptr());
            let p_next = GetProcAddress(h_mod, b"BluetoothFindNextDevice\0".as_ptr());
            let p_close = GetProcAddress(h_mod, b"BluetoothFindDeviceClose\0".as_ptr());

            if !p_first.is_null() && !p_next.is_null() && !p_close.is_null() {
                let find_first: BluetoothFindFirstDeviceFn = std::mem::transmute(p_first);
                let find_next: BluetoothFindNextDeviceFn = std::mem::transmute(p_next);
                let find_close: BluetoothFindDeviceCloseFn = std::mem::transmute(p_close);

                let params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
                    dw_size: std::mem::size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
                    f_return_authenticated: 1,
                    f_return_remembered: 1,
                    f_return_unknown: 1,
                    f_return_connected: 1,
                    f_issue_inquiry: 0,
                    c_timeout_multiplier: 0,
                    h_radio: std::ptr::null_mut(),
                };

                let mut info: BLUETOOTH_DEVICE_INFO = std::mem::zeroed();
                info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;

                let h_find = find_first(&params, &mut info);
                if !h_find.is_null() {
                    loop {
                        let end = info.sz_name.iter().position(|&c| c == 0).unwrap_or(info.sz_name.len());
                        let name = String::from_utf16_lossy(&info.sz_name[..end]);
                        let name_lower = name.to_lowercase();
                        let major_class = info.ul_class_of_device & 0x1F00;

                        // Precise Device Classification
                        // 0x0200 = Major Class Phone
                        // 0x0700 = Major Class Wearable (Smartwatch)
                        let is_phone = (major_class == 0x0200)
                            || name_lower.contains("phone")
                            || name_lower.contains("iphone")
                            || name_lower.contains("galaxy s")
                            || name_lower.contains("galaxy a")
                            || name_lower.contains("galaxy note")
                            || name_lower.contains("galaxy z")
                            || name_lower.contains("pixel")
                            || name_lower.contains("redmi")
                            || name_lower.contains("realme")
                            || name_lower.contains("oneplus")
                            || name_lower.contains("motorola")
                            || name_lower == "navi blue";

                        let is_watch = !is_phone && (
                            (major_class == 0x0700)
                            || name_lower.contains("watch")
                            || name_lower.contains("fitbit")
                            || name_lower.contains("garmin")
                            || name_lower.contains("amazfit")
                            || name_lower.contains("smartband")
                            || name_lower.contains("coros")
                            || name_lower.contains("suunto")
                            || name_lower.contains("polar")
                            || name_lower.contains("fire-boltt")
                            || name_lower.contains("noise colorfit")
                            || name_lower.contains("fastrack")
                            || name_lower.contains("titan")
                        );

                        let is_connected = info.f_connected != 0;
                        let is_paired = info.f_remembered != 0 || info.f_authenticated != 0;

                        if is_watch && is_connected {
                            result.has_connected_watch = true;
                            if result.connected_watch_name.is_none() {
                                result.connected_watch_name = Some(name.clone());
                            }
                        }

                        if is_phone && is_connected {
                            result.has_connected_phone = true;
                            if result.connected_phone_name.is_none() {
                                result.connected_phone_name = Some(name.clone());
                            }
                        }

                        if !name.trim().is_empty() {
                            result.devices.push(WatchDevice {
                                name,
                                is_connected,
                                is_paired,
                                class_of_device: info.ul_class_of_device,
                                is_watch_device: is_watch,
                                is_phone_device: is_phone,
                            });
                        }

                        info = std::mem::zeroed();
                        info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;
                        if find_next(h_find, &mut info) == 0 {
                            break;
                        }
                    }
                    find_close(h_find);
                }
            }
            FreeLibrary(h_mod);
        }
    }

    result
}

#[cfg(not(windows))]
fn query_windows_bluetooth_devices() -> WatchStatusResult {
    WatchStatusResult {
        has_connected_watch: false,
        connected_watch_name: None,
        has_connected_phone: false,
        connected_phone_name: None,
        devices: Vec::new(),
    }
}

#[tauri::command]
fn get_bluetooth_watch_status() -> Result<WatchStatusResult, String> {
    Ok(query_windows_bluetooth_devices())
}

#[tauri::command]
fn dial_phone_call(number: String) -> Result<String, String> {
    let clean_num: String = number.chars().filter(|c| c.is_ascii_digit() || *c == '+' || *c == '*' || *c == '#').collect();
    if clean_num.is_empty() {
        return Err("Phone number is empty".to_string());
    }

    #[cfg(windows)]
    {
        let ps_script = format!(
            "Start-Process 'tel:{}' -WindowStyle Normal -ErrorAction SilentlyContinue",
            clean_num
        );
        let _ = silent_command("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
            .spawn();
    }

    Ok(format!("Dialing {} via connected phone", clean_num))
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
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub cpu_threads: usize,
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub ram_percent: f32,
    pub net_rx_kb: f32,
    pub net_tx_kb: f32,
    pub top_apps: Vec<ProcessItem>,
    pub model_metrics: ModelMetrics,
    pub has_mic: bool,
    pub username: String,
    pub available_models: Vec<AvailableModelInfo>,
    pub active_model_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JarvisResponse {
    pub reply: String,
    pub action: Option<String>,
    pub command: Option<String>,
    pub output: Option<String>,
    pub latency_ms: u128,
    pub prompt_tokens: u32,
    pub eval_tokens: u32,
    pub total_tokens: u32,
    pub tokens_per_sec: f32,
    pub model_name: String,
    pub token_words: Vec<String>,
}

// Windows System Action Executor with Administrator Permissions
fn execute_system_action(action: &str, target: &str) -> Result<String, String> {
    let clean_target = target.trim();
    let lower_act = action.to_lowercase();
    match lower_act.as_str() {
        "focus_app" | "open_or_focus" => {
            let app_clean = clean_target.to_lowercase();
            #[cfg(windows)]
            {
                if win32_apps::focus_window(&app_clean) {
                    return Ok(format!("Focused window: {}", target));
                }
            }
            execute_system_action("open_app", target)
        }
        "open" | "open_app" | "launch" | "launch_app" | "start" => {
            let app_lower = clean_target.to_lowercase();
            let app_clean = app_lower
                .trim_start_matches("start ")
                .trim_start_matches("open ")
                .trim_start_matches("launch ")
                .trim();

            // Direct URL or URI Protocol support
            if app_clean.starts_with("http://") || app_clean.starts_with("https://") || app_clean.starts_with("www.") || app_clean.starts_with("ms-") || app_clean.ends_with(':') {
                let url = if app_clean.starts_with("www.") { format!("https://{}", app_clean) } else { app_clean.to_string() };
                let ps_script = format!("Start-Process '{}' -ErrorAction SilentlyContinue", url);
                let _ = silent_command("powershell")
                    .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
                    .spawn();
                return Ok(format!("Opened {}", url));
            }

            // Direct Phone / Call link - Prioritize focusing active Phone app / streamed Android Phone
            if app_clean == "call" || app_clean == "phone" {
                if win32_apps::focus_window("phone") || win32_apps::focus_window("phone link") {
                    return Ok("Focused Phone application".to_string());
                }
            }

            let executable = match app_clean {
                "notepad" | "note pad" => "notepad",
                "calc" | "calculator" => "calc",
                "cmd" | "command prompt" => "cmd",
                "powershell" => "powershell",
                "terminal" | "wt" => "wt",
                "explorer" | "files" | "file manager" => "explorer",
                "taskmgr" | "task manager" => "taskmgr",
                "paint" | "mspaint" => "mspaint",
                "chrome" | "google chrome" => "chrome",
                "edge" | "msedge" => "msedge",
                "code" | "vscode" | "vs code" | "visual studio code" => "code",
                "settings" => "ms-settings:",
                "call" | "phone" => "ms-phone:",
                "mail" | "email" | "outlook" => "ms-outlook:",
                "message" | "messages" | "whatsapp" => "whatsapp:",
                "music" | "spotify" => "spotify:",
                _ => app_clean,
            };

            // Launch single instance using invisible PowerShell runner with normal target window
            let ps_script = format!("Start-Process '{}' -WindowStyle Normal -ErrorAction SilentlyContinue", executable);
            let res = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
                .spawn();

            match res {
                Ok(_) => Ok(format!("Opened {}", app_clean)),
                Err(e) => Err(format!("Failed to open {}: {}", app_clean, e)),
            }
        }
        "close" | "close_app" | "kill" | "terminate" | "stop" => {
            let app_clean = clean_target.to_lowercase();
            let exe_name = match app_clean.as_str() {
                "code" | "vscode" | "vs code" => "Code.exe".to_string(),
                "notepad" | "note pad" => "notepad.exe".to_string(),
                "calc" | "calculator" => "CalculatorApp.exe".to_string(),
                "chrome" => "chrome.exe".to_string(),
                "edge" => "msedge.exe".to_string(),
                "spotify" => "Spotify.exe".to_string(),
                _ if app_clean.ends_with(".exe") => app_clean.clone(),
                _ => format!("{}.exe", app_clean),
            };

            let _ = silent_command("taskkill")
                .args(["/IM", &exe_name, "/F"])
                .output();

            let ps_script = format!("Stop-Process -Name '{}' -Force -ErrorAction SilentlyContinue", app_clean.trim_end_matches(".exe"));
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
                .output();

            Ok(format!("Closed {}", clean_target))
        }
        "run" | "run_cmd" | "cmd" | "powershell" | "exec" => {
            let lower_cmd = clean_target.to_lowercase();
            if lower_cmd.starts_with("start ") || lower_cmd == "notepad" || lower_cmd == "calc" || lower_cmd == "mspaint" || lower_cmd == "chrome" || lower_cmd == "code" {
                let target = lower_cmd.trim_start_matches("start ").trim();
                return execute_system_action("open_app", target);
            }

            let output = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", clean_target])
                .output();

            match output {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    if !stdout.is_empty() {
                        Ok(stdout)
                    } else if !stderr.is_empty() {
                        Ok(format!("Executed (stderr: {})", stderr))
                    } else {
                        Ok("Command executed successfully.".into())
                    }
                }
                Err(e) => Err(format!("Execution failed: {}", e)),
            }
        }
        "lock_pc" | "lock" => {
            let _ = silent_command("rundll32.exe")
                .args(["user32.dll,LockWorkStation"])
                .spawn();
            Ok("Computer locked.".to_string())
        }
        "minimize_all" | "minimize" => {
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "(New-Object -ComObject Shell.Application).MinimizeAll()"])
                .output();
            Ok("Minimized all open windows.".to_string())
        }
        "volume_mute" | "mute" => {
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)"])
                .output();
            Ok("Toggled audio mute.".to_string())
        }
        "volume_up" => {
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt 5;$i++){ $w.SendKeys([char]175) }"])
                .output();
            Ok("Volume increased.".to_string())
        }
        "volume_down" => {
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "$w = New-Object -ComObject WScript.Shell; for($i=0;$i -lt 5;$i++){ $w.SendKeys([char]174) }"])
                .output();
            Ok("Volume decreased.".to_string())
        }
        "screenshot" => {
            let _ = silent_command("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", "Start-Process 'ms-screenclip:'"])
                .spawn();
            Ok("Opened Screen Snip tool.".to_string())
        }
        _ => Err(format!("Unknown action: {}", action)),
    }
}

// Instant Fast-Path checking for instant desktop control
fn check_fast_path(prompt: &str) -> Option<JarvisResponse> {
    let lower = prompt.to_lowercase().trim().to_string();
    let start = Instant::now();

    if lower == "lock pc" || lower == "lock screen" || lower == "lock my computer" {
        let _ = execute_system_action("lock_pc", "");
        return Some(JarvisResponse {
            reply: "Computer locked.".into(),
            action: Some("⚡ Lock Workstation".into()),
            command: Some("rundll32.exe user32.dll,LockWorkStation".into()),
            output: Some("Workstation locked.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 4,
            eval_tokens: 3,
            total_tokens: 7,
            tokens_per_sec: 25.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["lock".into(), "screen".into(), "→".into(), "Computer".into(), "locked.".into()],
        });
    }

    if lower == "minimize all" || lower == "show desktop" || lower == "minimize windows" {
        let _ = execute_system_action("minimize_all", "");
        return Some(JarvisResponse {
            reply: "Minimized all open windows.".into(),
            action: Some("⚡ Minimize All".into()),
            command: Some("(New-Object -ComObject Shell.Application).MinimizeAll()".into()),
            output: Some("Minimized.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 4,
            eval_tokens: 5,
            total_tokens: 9,
            tokens_per_sec: 28.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["minimize".into(), "all".into(), "→".into(), "Minimized".into(), "all".into(), "windows.".into()],
        });
    }

    if lower == "mute" || lower == "unmute" || lower == "mute audio" {
        let _ = execute_system_action("volume_mute", "");
        return Some(JarvisResponse {
            reply: "Toggled audio mute.".into(),
            action: Some("⚡ Volume Mute".into()),
            command: Some("SendKeys([char]173)".into()),
            output: Some("Audio mute toggled.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 2,
            eval_tokens: 4,
            total_tokens: 6,
            tokens_per_sec: 24.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["mute".into(), "→".into(), "Toggled".into(), "audio".into(), "mute.".into()],
        });
    }

    if lower == "volume up" || lower == "increase volume" {
        let _ = execute_system_action("volume_up", "");
        return Some(JarvisResponse {
            reply: "Turned volume up.".into(),
            action: Some("⚡ Volume Up".into()),
            command: Some("SendKeys([char]175)".into()),
            output: Some("Volume raised.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 3,
            eval_tokens: 4,
            total_tokens: 7,
            tokens_per_sec: 24.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["volume".into(), "up".into(), "→".into(), "Turned".into(), "volume".into(), "up.".into()],
        });
    }

    if lower == "volume down" || lower == "decrease volume" {
        let _ = execute_system_action("volume_down", "");
        return Some(JarvisResponse {
            reply: "Turned volume down.".into(),
            action: Some("⚡ Volume Down".into()),
            command: Some("SendKeys([char]174)".into()),
            output: Some("Volume lowered.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 3,
            eval_tokens: 4,
            total_tokens: 7,
            tokens_per_sec: 24.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["volume".into(), "down".into(), "→".into(), "Turned".into(), "volume".into(), "down.".into()],
        });
    }

    if lower == "screenshot" || lower == "take screenshot" || lower == "capture screen" {
        let _ = execute_system_action("screenshot", "");
        return Some(JarvisResponse {
            reply: "Opening screen capture tool.".into(),
            action: Some("⚡ Screenshot Tool".into()),
            command: Some("ms-screenclip:".into()),
            output: Some("Screen snip launched.".into()),
            latency_ms: start.elapsed().as_millis(),
            prompt_tokens: 2,
            eval_tokens: 5,
            total_tokens: 7,
            tokens_per_sec: 26.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec!["screenshot".into(), "→".into(), "Opening".into(), "screen".into(), "capture".into()],
        });
    }

    None
}

// Parses JSON or extracts commands from model's thinking output
fn parse_model_output(content: &str, original_prompt: &str) -> (String, String, String) {
    let trimmed = content.trim();

    let cleaned = trimmed
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let extract_json = |val: &serde_json::Value| -> Option<(String, String, String)> {
        let action = val["action"]
            .as_str()
            .or_else(|| val["type"].as_str())
            .unwrap_or("none")
            .to_string();

        let target = val["target"]
            .as_str()
            .or_else(|| val["cmd"].as_str())
            .or_else(|| val["app"].as_str())
            .or_else(|| val["app_name"].as_str())
            .or_else(|| val["program"].as_str())
            .unwrap_or("")
            .to_string();

        let reply = val["reply"]
            .as_str()
            .or_else(|| val["response"].as_str())
            .or_else(|| val["message"].as_str())
            .unwrap_or("Acknowledged, sir.")
            .to_string();

        let norm_target = match target.to_lowercase().trim() {
            "vs code" | "vscode" | "visual studio code" => "code".to_string(),
            "note pad" => "notepad".to_string(),
            "calculator" => "calc".to_string(),
            "google chrome" => "chrome".to_string(),
            _ => target,
        };

        Some((action, norm_target, reply))
    };

    if let Ok(val) = serde_json::from_str::<serde_json::Value>(cleaned) {
        if let Some(res) = extract_json(&val) {
            return res;
        }
    }

    if let (Some(start), Some(end)) = (cleaned.find('{'), cleaned.rfind('}')) {
        if start < end {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&cleaned[start..=end]) {
                if let Some(res) = extract_json(&val) {
                    return res;
                }
            }
        }
    }

    // Heuristic fallback based on intent in user prompt
    let lower_prompt = original_prompt.to_lowercase();
    if let Some(target) = lower_prompt.strip_prefix("open ").or_else(|| lower_prompt.strip_prefix("launch ")).or_else(|| lower_prompt.strip_prefix("start ")) {
        let t = target.trim();
        return ("open_app".into(), t.into(), format!("Opening {} for you, sir.", t));
    }
    if let Some(target) = lower_prompt.strip_prefix("close ").or_else(|| lower_prompt.strip_prefix("kill ")).or_else(|| lower_prompt.strip_prefix("stop ")) {
        let t = target.trim();
        return ("close_app".into(), t.into(), format!("Terminating {}.", t));
    }

    ("none".into(), "".into(), if trimmed.is_empty() { "Standing by, sir.".into() } else { trimmed.into() })
}

#[tauri::command]
async fn ask_jarvis(prompt: String, state: tauri::State<'_, AppState>) -> Result<JarvisResponse, String> {
    let start_time = Instant::now();
    let prompt_clean = prompt.trim();

    if prompt_clean.is_empty() {
        return Ok(JarvisResponse {
            reply: "Ready for your instruction, sir.".into(),
            action: None,
            command: None,
            output: None,
            latency_ms: 0,
            prompt_tokens: 0,
            eval_tokens: 0,
            total_tokens: 0,
            tokens_per_sec: 0.0,
            model_name: MODEL_NAME.to_string(),
            token_words: vec![],
        });
    }

    // Check fast-path for instant response on key control operations
    if let Some(fast_res) = check_fast_path(prompt_clean) {
        return Ok(fast_res);
    }

    // Query Auto-Failover Multi-Model Fleet (Groq LPUs + Local Ollama Failsafe)
    let client = reqwest::Client::new();
    let system_prompt = r#"You are J.A.R.V.I.S., Stark Industries AI controller on Windows.
Reply ONLY with a single JSON object:
{"action":"open_app"|"close_app"|"run_cmd"|"system_ctrl"|"none","target":"<app or cmd>","reply":"<spoken reply under 12 words>"}
Rules:
- Execute ONLY the single specific job requested.
- Target mapping: "vs code"/"vscode"->"code", "notepad"->"notepad", "calculator"/"calc"->"calc", "chrome"->"chrome", "terminal"->"wt".
- Do not output markdown, reasoning, or text outside JSON."#;

    let groq_key = get_groq_api_key();

    // Priority candidates: 4 Groq models + 1 Local Ollama failsafe
    let candidates = vec![
        ("qwen/qwen3.8-27b", "GROQ LPU", "27B", "FP16 LPU", 131072u32),
        ("openai/gpt-oss-120b", "GROQ LPU", "120B", "FP16 LPU", 131072u32),
        ("allam-2-7b", "GROQ LPU", "7B", "FP16 LPU", 8192u32),
        ("openai/gpt-oss-20b", "GROQ LPU", "20B", "FP16 LPU", 131072u32),
        ("qwen3.5:2b", "LOCAL OLLAMA", "1.9B", "Q8_0", 262144u32),
    ];

    for (model_id, provider, param_size, quant, ctx_len) in candidates {
        let is_groq = provider == "GROQ LPU";

        if is_groq {
            if groq_key.is_empty() {
                continue;
            }

            let groq_payload = serde_json::json!({
                "model": model_id,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": prompt_clean }
                ],
                "temperature": 0.0,
                "max_tokens": 60,
                "response_format": { "type": "json_object" }
            });

            let res = client
                .post(GROQ_CHAT_URL)
                .header("Authorization", format!("Bearer {}", groq_key))
                .header("Content-Type", "application/json")
                .timeout(Duration::from_millis(4500))
                .json(&groq_payload)
                .send()
                .await;

            if let Ok(response) = res {
                if response.status().is_success() {
                    if let Ok(json_val) = response.json::<serde_json::Value>().await {
                        let latency_ms = start_time.elapsed().as_millis();
                        let prompt_tokens = json_val["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                        let eval_tokens = json_val["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;
                        let completion_time = json_val["usage"]["completion_time"].as_f64().unwrap_or(0.0);
                        let total_tokens = prompt_tokens + eval_tokens;

                        let tokens_per_sec = if completion_time > 0.0 {
                            eval_tokens as f32 / completion_time as f32
                        } else if latency_ms > 0 {
                            (eval_tokens as f32) / (latency_ms as f32 / 1000.0)
                        } else {
                            267.0
                        };

                        if let Ok(mut mm) = state.model_metrics.lock() {
                            mm.name = model_id.to_string();
                            mm.parameter_size = param_size.to_string();
                            mm.quantization = quant.to_string();
                            mm.context_length = ctx_len;
                            mm.eval_tokens_per_sec = tokens_per_sec;
                            mm.last_eval_count = eval_tokens;
                            mm.last_prompt_eval_count = prompt_tokens;
                            mm.last_latency_ms = latency_ms;
                            mm.is_loaded = true;
                        }

                        if let Ok(mut stats) = state.model_stats.lock() {
                            let entry = stats.entry(model_id.to_string()).or_default();
                            entry.tokens_used += total_tokens as u64;
                            entry.speed_tok_s = tokens_per_sec;
                            entry.latency_ms = latency_ms;
                        }

                        if let Ok(mut act) = state.active_model_id.lock() {
                            *act = model_id.to_string();
                        }

                        let raw_content = json_val["choices"][0]["message"]["content"]
                            .as_str()
                            .unwrap_or("")
                            .trim()
                            .to_string();

                        let (action, target, reply) = parse_model_output(&raw_content, prompt_clean);

                        let mut cmd_output = None;
                        let mut executed_action_label = None;

                        if action != "none" && !target.is_empty() {
                            let act_name = match action.as_str() {
                                "open" | "open_app" | "launch" | "start" => "open_app",
                                "close" | "close_app" | "kill" | "stop" => "close_app",
                                "system_ctrl" | "media" => target.as_str(),
                                "run" | "run_cmd" | "cmd" | "powershell" => "run_cmd",
                                _ => action.as_str(),
                            };

                            match execute_system_action(act_name, &target) {
                                Ok(msg) => {
                                    executed_action_label = Some(format!("⚡ {}", msg));
                                    cmd_output = Some(msg);
                                }
                                Err(err) => {
                                    executed_action_label = Some(format!("⚠️ {}", err));
                                    cmd_output = Some(err);
                                }
                            }
                        }

                        let mut words: Vec<String> = prompt_clean.split_whitespace().map(|s| s.to_string()).collect();
                        words.push("→".to_string());
                        for w in reply.split_whitespace() {
                            words.push(w.to_string());
                        }

                        return Ok(JarvisResponse {
                            reply,
                            action: executed_action_label,
                            command: if !target.is_empty() { Some(target) } else { None },
                            output: cmd_output,
                            latency_ms,
                            prompt_tokens,
                            eval_tokens,
                            total_tokens,
                            tokens_per_sec,
                            model_name: model_id.to_string(),
                            token_words: words,
                        });
                    }
                }
            }
        } else {
            // Local Ollama candidate (Priority 5 Failsafe Backup)
            let ollama_payload = serde_json::json!({
                "model": "qwen3.5:2b",
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": prompt_clean }
                ],
                "think": false,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 45,
                    "num_thread": 10
                },
                "keep_alive": "-1",
                "stream": false
            });

            let res = client
                .post(OLLAMA_CHAT_URL)
                .timeout(Duration::from_secs(12))
                .json(&ollama_payload)
                .send()
                .await;

            if let Ok(response) = res {
                if response.status().is_success() {
                    if let Ok(json_val) = response.json::<serde_json::Value>().await {
                        let latency_ms = start_time.elapsed().as_millis();
                        let eval_count = json_val["eval_count"].as_u64().unwrap_or(0) as u32;
                        let eval_duration = json_val["eval_duration"].as_u64().unwrap_or(0);
                        let prompt_eval_count = json_val["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
                        let tokens_per_sec = if eval_duration > 0 {
                            eval_count as f32 / (eval_duration as f32 / 1_000_000_000.0)
                        } else {
                            13.1
                        };
                        let total_tokens = prompt_eval_count + eval_count;

                        if let Ok(mut mm) = state.model_metrics.lock() {
                            mm.name = "qwen3.5:2b (LOCAL FAILOVER)".to_string();
                            mm.parameter_size = param_size.to_string();
                            mm.quantization = quant.to_string();
                            mm.context_length = ctx_len;
                            mm.eval_tokens_per_sec = tokens_per_sec;
                            mm.last_eval_count = eval_count;
                            mm.last_prompt_eval_count = prompt_eval_count;
                            mm.last_latency_ms = latency_ms;
                            mm.is_loaded = true;
                        }

                        if let Ok(mut stats) = state.model_stats.lock() {
                            let entry = stats.entry(model_id.to_string()).or_default();
                            entry.tokens_used += total_tokens as u64;
                            entry.speed_tok_s = tokens_per_sec;
                            entry.latency_ms = latency_ms;
                        }

                        if let Ok(mut act) = state.active_model_id.lock() {
                            *act = model_id.to_string();
                        }

                        let raw_content = json_val["message"]["content"].as_str().unwrap_or("").trim().to_string();
                        let (action, target, reply) = parse_model_output(&raw_content, prompt_clean);

                        let mut cmd_output = None;
                        let mut executed_action_label = None;

                        if action != "none" && !target.is_empty() {
                            let act_name = match action.as_str() {
                                "open" | "open_app" | "launch" | "start" => "open_app",
                                "close" | "close_app" | "kill" | "stop" => "close_app",
                                "system_ctrl" | "media" => target.as_str(),
                                "run" | "run_cmd" | "cmd" | "powershell" => "run_cmd",
                                _ => action.as_str(),
                            };

                            match execute_system_action(act_name, &target) {
                                Ok(msg) => {
                                    executed_action_label = Some(format!("⚡ {}", msg));
                                    cmd_output = Some(msg);
                                }
                                Err(err) => {
                                    executed_action_label = Some(format!("⚠️ {}", err));
                                    cmd_output = Some(err);
                                }
                            }
                        }

                        let mut words: Vec<String> = prompt_clean.split_whitespace().map(|s| s.to_string()).collect();
                        words.push("→".to_string());
                        for w in reply.split_whitespace() {
                            words.push(w.to_string());
                        }

                        return Ok(JarvisResponse {
                            reply,
                            action: executed_action_label,
                            command: if !target.is_empty() { Some(target) } else { None },
                            output: cmd_output,
                            latency_ms,
                            prompt_tokens: prompt_eval_count,
                            eval_tokens: eval_count,
                            total_tokens,
                            tokens_per_sec,
                            model_name: "qwen3.5:2b (LOCAL FAILOVER)".to_string(),
                            token_words: words,
                        });
                    }
                }
            }
        }
    }

    // Single fallback if Ollama timed out or was offline
    let lower_prompt = prompt_clean.to_lowercase();
    let (fallback_act, fallback_tgt) = if let Some(target) = lower_prompt.strip_prefix("open ")
        .or_else(|| lower_prompt.strip_prefix("launch "))
        .or_else(|| lower_prompt.strip_prefix("start ")) 
    {
        ("open_app", target.trim().to_string())
    } else if let Some(target) = lower_prompt.strip_prefix("close ")
        .or_else(|| lower_prompt.strip_prefix("kill "))
        .or_else(|| lower_prompt.strip_prefix("stop ")) 
    {
        ("close_app", target.trim().to_string())
    } else {
        ("none", "".to_string())
    };

    if fallback_act != "none" && !fallback_tgt.is_empty() {
        let _ = execute_system_action(fallback_act, &fallback_tgt);
        return Ok(JarvisResponse {
            reply: format!("Executing {} for you, sir.", fallback_tgt),
            action: Some(format!("⚡ {}", fallback_tgt)),
            command: Some(fallback_tgt.clone()),
            output: Some(format!("Executed {}", fallback_tgt)),
            latency_ms: start_time.elapsed().as_millis(),
            prompt_tokens: 6,
            eval_tokens: 6,
            total_tokens: 12,
            tokens_per_sec: 14.0,
            model_name: "qwen3.5:2b (LOCAL FAILOVER)".to_string(),
            token_words: vec![fallback_act.into(), fallback_tgt],
        });
    }

    Ok(JarvisResponse {
        reply: "Directive acknowledged, sir.".into(),
        action: None,
        command: None,
        output: None,
        latency_ms: start_time.elapsed().as_millis(),
        prompt_tokens: 10,
        eval_tokens: 12,
        total_tokens: 22,
        tokens_per_sec: 14.5,
        model_name: "qwen3.5:2b (LOCAL FAILOVER)".to_string(),
        token_words: prompt_clean.split_whitespace().map(|s| s.to_string()).collect(),
    })
}

// Native Windows Speech Recognition Engine via System.Speech (100% Silent, High-Accuracy Grammar, Fast Cutoff)
#[tauri::command]
async fn listen_mic() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        let ps_code = r#"
Add-Type -AssemblyName System.Speech
try {
    $recs = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
    $enRec = $null
    if ($recs.Count -gt 0) {
        $enRec = $recs | Where-Object { $_.Culture.TwoLetterISOLanguageName -eq "en" } | Select-Object -First 1
        if (-not $enRec) { $enRec = $recs[0] }
    }
    if ($enRec) {
        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine($enRec)
    } else {
        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    }

    # 1. Exact high-priority phrases & phonetic matchings
    $phraseChoices = New-Object System.Speech.Recognition.Choices
    $phraseChoices.Add(@(
        'open notepad', 'note pad', 'notepad', 'open note pad', 'open not bad', 'or a lot',
        'open calculator', 'calculator', 'calc', 'open calc',
        'open chrome', 'chrome', 'browser', 'open browser',
        'open vs code', 'vs code', 'code', 'open code', 'visual studio',
        'open terminal', 'terminal', 'cmd', 'command prompt',
        'open task manager', 'task manager', 'taskmgr',
        'open spotify', 'spotify', 'music',
        'open whatsapp', 'whatsapp',
        'open phone', 'phone', 'call', 'open call', 'keypad', 'dialer',
        'weather', 'what is the weather', 'check weather', 'temperature',
        'time', 'what time is it', 'what is the time',
        'date', 'what is today date', 'today date',
        'take screenshot', 'screenshot', 'capture screen',
        'mute', 'unmute', 'volume up', 'volume down', 'lock pc', 'minimize all', 'show desktop',
        'close notepad', 'close calculator', 'close chrome', 'close vs code', 'close terminal', 'close spotify', 'close whatsapp'
    ))
    $phraseGrammar = New-Object System.Speech.Recognition.Grammar((New-Object System.Speech.Recognition.GrammarBuilder($phraseChoices)))
    $phraseGrammar.Weight = 1.0
    $rec.LoadGrammar($phraseGrammar)

    # 2. Flexible builder grammar with optional prefix, verbs, articles, and targets
    $gb = New-Object System.Speech.Recognition.GrammarBuilder
    $prefix = New-Object System.Speech.Recognition.Choices
    $prefix.Add(@('please', 'jarvis', 'hey jarvis', 'can you'))
    $gb.Append($prefix, 0, 1)

    $verbs = New-Object System.Speech.Recognition.Choices
    $verbs.Add(@('open', 'close', 'launch', 'start', 'kill', 'terminate', 'lock', 'minimize', 'show', 'mute', 'unmute', 'turn', 'increase', 'decrease', 'take', 'what', 'how', 'run', 'focus', 'call', 'dial'))
    $gb.Append($verbs, 0, 1)

    $articles = New-Object System.Speech.Recognition.Choices
    $articles.Add(@('the', 'a', 'an', 'my', 'is', 'app'))
    $gb.Append($articles, 0, 1)

    $targets = New-Object System.Speech.Recognition.Choices
    $targets.Add(@('notepad', 'note pad', 'calculator', 'calc', 'chrome', 'browser', 'youtube', 'terminal', 'cmd', 'command prompt', 'task manager', 'taskmgr', 'spotify', 'whatsapp', 'pc', 'screen', 'desktop', 'volume', 'volume up', 'volume down', 'mute', 'audio', 'screenshot', 'all', 'windows', 'time', 'date', 'weather', 'phone', 'call', 'keypad', 'dialer', 'code', 'vs code', 'visual studio code'))
    $gb.Append($targets)

    $cmdGrammar = New-Object System.Speech.Recognition.Grammar($gb)
    $cmdGrammar.Weight = 0.9
    $rec.LoadGrammar($cmdGrammar)

    # Fast responsiveness: Stop 500ms after user finishes speaking
    $rec.InitialSilenceTimeout = [TimeSpan]::FromSeconds(3)
    $rec.EndSilenceTimeout = [TimeSpan]::FromMilliseconds(500)
    $rec.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromMilliseconds(600)

    $rec.SetInputToDefaultAudioDevice()
    $res = $rec.Recognize((New-Object System.TimeSpan(0, 0, 5)))
    if ($res -and $res.Text) {
        Write-Output $res.Text
    } else {
        Write-Output ""
    }
    $rec.Dispose()
} catch {
    Write-Output ""
}
"#;
        let mut cmd = Command::new("powershell");
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);
        let output = cmd
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_code])
            .output();

        match output {
            Ok(out) => {
                let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
                Ok(text)
            }
            Err(e) => Err(format!("Microphone recognition failed: {}", e)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_system_telemetry(state: tauri::State<'_, AppState>) -> Result<SystemTelemetry, String> {
    let (cpu_usage, cpu_brand, cpu_cores, cpu_threads, ram_used_gb, ram_total_gb, ram_percent, proc_list) = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_cpu_all();
        sys.refresh_memory();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let cpu = sys.global_cpu_usage();
        let cpu_brand = sys.cpus().first().map(|c| c.brand().trim().to_string()).unwrap_or_else(|| "Intel Core i7".to_string());
        let cpu_cores = sys.physical_core_count().unwrap_or(6);
        let cpu_threads = sys.cpus().len();
        let total_bytes = sys.total_memory() as f32;
        let used_bytes = sys.used_memory() as f32;

        let ram_total = total_bytes / (1024.0 * 1024.0 * 1024.0);
        let ram_used = used_bytes / (1024.0 * 1024.0 * 1024.0);
        let ram_pct = if total_bytes > 0.0 {
            (used_bytes / total_bytes) * 100.0
        } else {
            0.0
        };

        // Extract applications active on the Windows Taskbar
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

        (cpu, cpu_brand, cpu_cores, cpu_threads, ram_used, ram_total, ram_pct, plist)
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

    // Model Metrics & Dynamic Failover Roster
    let active_id = state.active_model_id.lock().map(|id| id.clone()).unwrap_or_else(|_| "qwen/qwen3.8-27b".to_string());

    // If local Ollama is active, refresh its live loaded status from Ollama API
    if active_id.contains("qwen3.5:2b") || active_id.contains("sysbrain") {
        let client = reqwest::Client::new();
        if let Ok(res) = client.get(OLLAMA_PS_URL).timeout(Duration::from_millis(250)).send().await {
            if let Ok(ps_json) = res.json::<serde_json::Value>().await {
                if let Some(models) = ps_json["models"].as_array() {
                    if let Some(first_model) = models.first() {
                        let size_bytes = first_model["size"].as_f64().unwrap_or(2683396812.0);
                        if let Ok(mut mm) = state.model_metrics.lock() {
                            mm.memory_mb = size_bytes / (1024.0 * 1024.0);
                            mm.is_loaded = true;
                        }
                    }
                }
            }
        }
    }

    let stats_map = state.model_stats.lock().map(|m| m.clone()).unwrap_or_default();
    let def_stats = ModelRuntimeStats::default();

    let qwen_stats = stats_map.get("qwen/qwen3.8-27b").unwrap_or(&def_stats);
    let gpt120_stats = stats_map.get("openai/gpt-oss-120b").unwrap_or(&def_stats);
    let allam_stats = stats_map.get("allam-2-7b").unwrap_or(&def_stats);
    let gpt20_stats = stats_map.get("openai/gpt-oss-20b").unwrap_or(&def_stats);
    let local_stats = stats_map.get("qwen3.5:2b").unwrap_or(&def_stats);

    let has_groq = !get_groq_api_key().is_empty();

    let available_models = vec![
        AvailableModelInfo {
            id: "qwen/qwen3.8-27b".to_string(),
            display_name: "QWEN 3.8 27B".to_string(),
            provider: "GROQ LPU".to_string(),
            status: if active_id == "qwen/qwen3.8-27b" { "ACTIVE".to_string() } else if has_groq { "ONLINE".to_string() } else { "OFFLINE".to_string() },
            priority: 1,
            context_window: "131K".to_string(),
            tokens_used: qwen_stats.tokens_used,
            speed_tok_s: if qwen_stats.speed_tok_s > 0.0 { qwen_stats.speed_tok_s } else { 267.0 },
            latency_ms: if qwen_stats.latency_ms > 0 { qwen_stats.latency_ms } else { 267 },
            is_active: active_id == "qwen/qwen3.8-27b",
        },
        AvailableModelInfo {
            id: "openai/gpt-oss-120b".to_string(),
            display_name: "GPT-OSS 120B".to_string(),
            provider: "GROQ LPU".to_string(),
            status: if active_id == "openai/gpt-oss-120b" { "ACTIVE".to_string() } else if has_groq { "STANDBY".to_string() } else { "OFFLINE".to_string() },
            priority: 2,
            context_window: "131K".to_string(),
            tokens_used: gpt120_stats.tokens_used,
            speed_tok_s: if gpt120_stats.speed_tok_s > 0.0 { gpt120_stats.speed_tok_s } else { 393.0 },
            latency_ms: if gpt120_stats.latency_ms > 0 { gpt120_stats.latency_ms } else { 393 },
            is_active: active_id == "openai/gpt-oss-120b",
        },
        AvailableModelInfo {
            id: "allam-2-7b".to_string(),
            display_name: "ALLAM 2 7B".to_string(),
            provider: "GROQ LPU".to_string(),
            status: if active_id == "allam-2-7b" { "ACTIVE".to_string() } else if has_groq { "STANDBY".to_string() } else { "OFFLINE".to_string() },
            priority: 3,
            context_window: "8K".to_string(),
            tokens_used: allam_stats.tokens_used,
            speed_tok_s: if allam_stats.speed_tok_s > 0.0 { allam_stats.speed_tok_s } else { 580.0 },
            latency_ms: if allam_stats.latency_ms > 0 { allam_stats.latency_ms } else { 171 },
            is_active: active_id == "allam-2-7b",
        },
        AvailableModelInfo {
            id: "openai/gpt-oss-20b".to_string(),
            display_name: "GPT-OSS 20B".to_string(),
            provider: "GROQ LPU".to_string(),
            status: if active_id == "openai/gpt-oss-20b" { "ACTIVE".to_string() } else if has_groq { "STANDBY".to_string() } else { "OFFLINE".to_string() },
            priority: 4,
            context_window: "131K".to_string(),
            tokens_used: gpt20_stats.tokens_used,
            speed_tok_s: if gpt20_stats.speed_tok_s > 0.0 { gpt20_stats.speed_tok_s } else { 436.0 },
            latency_ms: if gpt20_stats.latency_ms > 0 { gpt20_stats.latency_ms } else { 436 },
            is_active: active_id == "openai/gpt-oss-20b",
        },
        AvailableModelInfo {
            id: "qwen3.5:2b".to_string(),
            display_name: "QWEN 3.5 2B (LOCAL)".to_string(),
            provider: "LOCAL OLLAMA".to_string(),
            status: if active_id.contains("qwen3.5:2b") { "ACTIVE (FAILOVER)".to_string() } else { "FAILSAFE BACKUP".to_string() },
            priority: 5,
            context_window: "256K".to_string(),
            tokens_used: local_stats.tokens_used,
            speed_tok_s: if local_stats.speed_tok_s > 0.0 { local_stats.speed_tok_s } else { 13.1 },
            latency_ms: if local_stats.latency_ms > 0 { local_stats.latency_ms } else { 1200 },
            is_active: active_id.contains("qwen3.5:2b"),
        },
    ];

    let model_metrics = {
        let mm = state.model_metrics.lock().map_err(|e| e.to_string())?;
        mm.clone()
    };

    let has_mic = check_has_mic();

    Ok(SystemTelemetry {
        cpu_usage,
        cpu_brand,
        cpu_cores,
        cpu_threads,
        ram_used_gb,
        ram_total_gb,
        ram_percent,
        net_rx_kb,
        net_tx_kb,
        top_apps: proc_list,
        model_metrics,
        has_mic,
        username: std::env::var("USERNAME").unwrap_or_else(|_| "CHOWDARY".to_string()).to_uppercase(),
        available_models,
        active_model_id: active_id,
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
        model_stats: Mutex::new(HashMap::new()),
        active_model_id: Mutex::new("qwen/qwen3.8-27b".to_string()),
    };

    tauri::Builder::default()
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_fullscreen(true);
            }

            // Auto-preload qwen3.5:2b into memory as soon as app opens
            tauri::async_runtime::spawn(async {
                let client = reqwest::Client::new();
                let _ = client
                    .post(OLLAMA_CHAT_URL)
                    .json(&serde_json::json!({
                        "model": MODEL_NAME,
                        "keep_alive": -1
                    }))
                    .send()
                    .await;
            });

            Ok(())
        })
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ask_jarvis,
            run_direct_action,
            get_system_telemetry,
            get_bluetooth_watch_status,
            dial_phone_call,
            listen_mic
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_execute_open_and_close_notepad() {
        // Ensure no notepad is running initially
        let _ = execute_system_action("close_app", "notepad");
        std::thread::sleep(std::time::Duration::from_millis(500));

        // 1. Dynamic open notepad
        let open_res = execute_system_action("open_app", "notepad");
        assert!(open_res.is_ok(), "Failed to execute open_app notepad: {:?}", open_res);
        println!("Open result: {:?}", open_res);

        // Wait for Windows to spawn the process
        std::thread::sleep(std::time::Duration::from_millis(1500));

        // Verify notepad process is running
        let mut sys = sysinfo::System::new_all();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        let has_notepad = sys.processes().values().any(|p| {
            p.name().to_string_lossy().to_lowercase().contains("notepad")
        });
        println!("Is notepad process running in Windows: {}", has_notepad);
        assert!(has_notepad, "Notepad process was not found in Windows processes!");

        // 2. Dynamic close notepad
        let close_res = execute_system_action("close_app", "notepad");
        assert!(close_res.is_ok(), "Failed to close notepad: {:?}", close_res);
        std::thread::sleep(std::time::Duration::from_millis(800));

        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        let still_running = sys.processes().values().any(|p| {
            p.name().to_string_lossy().to_lowercase().contains("notepad")
        });
        println!("Is notepad still running after close: {}", still_running);
        assert!(!still_running, "Notepad process should have been terminated!");
    }

    #[test]
    fn test_parse_model_outputs() {
        let (action, target, reply) = parse_model_output(r#"{"action":"open_app","target":"notepad","reply":"Opening Notepad."}"#, "open notepad");
        assert_eq!(action, "open_app");
        assert_eq!(target, "notepad");
        assert_eq!(reply, "Opening Notepad.");

        let (action2, target2, _) = parse_model_output(r#"{"action":"run_cmd","cmd":"calc","reply":"Calculator ready."}"#, "open calc");
        assert_eq!(action2, "run_cmd");
        assert_eq!(target2, "calc");

        let (action3, target3, _) = parse_model_output("I am opening the application for you", "open chrome");
        assert_eq!(action3, "open_app");
        assert_eq!(target3, "chrome");

        let (action4, target4, _) = parse_model_output(r#"{"action":"open_app","target":"vs code","reply":"Opening Code."}"#, "open vs code");
        assert_eq!(action4, "open_app");
        assert_eq!(target4, "code");
    }

    #[test]
    fn test_bluetooth_device_query() {
        use std::ffi::c_void;

        #[repr(C)]
        struct BLUETOOTH_DEVICE_SEARCH_PARAMS {
            dw_size: u32,
            f_return_authenticated: i32,
            f_return_remembered: i32,
            f_return_unknown: i32,
            f_return_connected: i32,
            f_issue_inquiry: i32,
            c_timeout_multiplier: u8,
            h_radio: *mut c_void,
        }

        #[repr(C)]
        #[derive(Copy, Clone)]
        struct SYSTEMTIME {
            w_year: u16,
            w_month: u16,
            w_day_of_week: u16,
            w_day: u16,
            w_hour: u16,
            w_minute: u16,
            w_second: u16,
            w_milliseconds: u16,
        }

        #[repr(C)]
        struct BLUETOOTH_DEVICE_INFO {
            dw_size: u32,
            address: u64,
            ul_class_of_device: u32,
            f_connected: i32,
            f_remembered: i32,
            f_authenticated: i32,
            st_last_seen: SYSTEMTIME,
            st_last_used: SYSTEMTIME,
            sz_name: [u16; 248],
        }

        unsafe extern "system" {
            fn LoadLibraryA(lpLibFileName: *const u8) -> *mut c_void;
            fn GetProcAddress(hModule: *mut c_void, lpProcName: *const u8) -> *mut c_void;
            fn FreeLibrary(hLibModule: *mut c_void) -> i32;
        }

        type BluetoothFindFirstDeviceFn = unsafe extern "system" fn(
            *const BLUETOOTH_DEVICE_SEARCH_PARAMS,
            *mut BLUETOOTH_DEVICE_INFO,
        ) -> *mut c_void;

        type BluetoothFindNextDeviceFn = unsafe extern "system" fn(
            *mut c_void,
            *mut BLUETOOTH_DEVICE_INFO,
        ) -> i32;

        type BluetoothFindDeviceCloseFn = unsafe extern "system" fn(*mut c_void) -> i32;

        unsafe {
            let h_mod = LoadLibraryA(b"bthprops.cpl\0".as_ptr());
            println!("LoadLibrary bthprops.cpl: {:?}", h_mod);
            if !h_mod.is_null() {
                let p_first = GetProcAddress(h_mod, b"BluetoothFindFirstDevice\0".as_ptr());
                let p_next = GetProcAddress(h_mod, b"BluetoothFindNextDevice\0".as_ptr());
                let p_close = GetProcAddress(h_mod, b"BluetoothFindDeviceClose\0".as_ptr());
                println!("p_first: {:?}, p_next: {:?}, p_close: {:?}", p_first, p_next, p_close);

                if !p_first.is_null() && !p_next.is_null() && !p_close.is_null() {
                    let find_first: BluetoothFindFirstDeviceFn = std::mem::transmute(p_first);
                    let find_next: BluetoothFindNextDeviceFn = std::mem::transmute(p_next);
                    let find_close: BluetoothFindDeviceCloseFn = std::mem::transmute(p_close);

                    let params = BLUETOOTH_DEVICE_SEARCH_PARAMS {
                        dw_size: std::mem::size_of::<BLUETOOTH_DEVICE_SEARCH_PARAMS>() as u32,
                        f_return_authenticated: 1,
                        f_return_remembered: 1,
                        f_return_unknown: 1,
                        f_return_connected: 1,
                        f_issue_inquiry: 0,
                        c_timeout_multiplier: 0,
                        h_radio: std::ptr::null_mut(),
                    };

                    let mut info: BLUETOOTH_DEVICE_INFO = std::mem::zeroed();
                    info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;

                    let h_find = find_first(&params, &mut info);
                    println!("h_find: {:?}", h_find);
                    if !h_find.is_null() {
                        loop {
                            let end = info.sz_name.iter().position(|&c| c == 0).unwrap_or(info.sz_name.len());
                            let name = String::from_utf16_lossy(&info.sz_name[..end]);
                            println!("Found device: '{}', connected: {}, remembered: {}, class: 0x{:06X}", 
                                name, info.f_connected, info.f_remembered, info.ul_class_of_device);

                            info = std::mem::zeroed();
                            info.dw_size = std::mem::size_of::<BLUETOOTH_DEVICE_INFO>() as u32;
                            if find_next(h_find, &mut info) == 0 {
                                break;
                            }
                        }
                        find_close(h_find);
                    }
                }
                FreeLibrary(h_mod);
            }
        }
    }
}
