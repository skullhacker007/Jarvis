use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Networks, System};

static ACTIVE_QR_PID: AtomicU32 = AtomicU32::new(0);
static QR_CODE_CACHE: Mutex<Option<Vec<String>>> = Mutex::new(None);
static QR_PAIR_STATUS: Mutex<Option<PhoneSyncStatus>> = Mutex::new(None);
static LATEST_VOICE_TRANSCRIPTION: Mutex<Option<String>> = Mutex::new(None);
static VOICE_NOTIFY: tokio::sync::Notify = tokio::sync::Notify::const_new();
static SPEECH_LISTENER_ACTIVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);
static ACTIVE_SPEECH_WORKER_PID: AtomicU32 = AtomicU32::new(0);

const OLLAMA_CHAT_URL: &str = "http://127.0.0.1:11434/api/chat";
const OLLAMA_PS_URL: &str = "http://127.0.0.1:11434/api/ps";
const GROQ_CHAT_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME: &str = "qwen3.5:2b";

// Compile-time embedded configurations for 100% standalone single-binary portability
const EMBEDDED_ENV: &str = include_str!("../../.env.local");
const EMBEDDED_PHONE_CONFIG: &str = include_str!("../../phone_config.json");
const EMBEDDED_SPEECH_WORKER: &str = include_str!("../../scripts/speech_worker.ps1");

fn parse_key_from_env_str(content: &str, key_name: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(key_name) {
            if let Some(val) = trimmed.split('=').nth(1) {
                let res = val.trim().trim_matches('\'').trim_matches('"').to_string();
                if !res.is_empty() {
                    return Some(res);
                }
            }
        }
    }
    None
}

fn get_groq_api_key() -> String {
    if let Ok(k) = std::env::var("GROQ_API_KEY") {
        let t = k.trim().trim_matches('\'').trim_matches('"');
        if !t.is_empty() {
            return t.to_string();
        }
    }
    for p in ["./.env.local", "../.env.local", "C:/Users/Chowdary/Desktop/Project/Jarvis/.env.local"] {
        if let Ok(content) = std::fs::read_to_string(p) {
            if let Some(val) = parse_key_from_env_str(&content, "GROQ_API_KEY") {
                return val;
            }
        }
    }
    if let Some(val) = parse_key_from_env_str(EMBEDDED_ENV, "GROQ_API_KEY") {
        return val;
    }
    String::new()
}

fn get_phone_config_path() -> String {
    for p in [
        "phone_config.json",
        "./phone_config.json",
        "../phone_config.json",
        "C:/Users/Chowdary/Desktop/Project/Jarvis/phone_config.json",
    ] {
        if std::path::Path::new(p).exists() {
            return p.to_string();
        }
    }
    "phone_config.json".to_string()
}

fn get_phone_config_content() -> String {
    if let Ok(content) = std::fs::read_to_string(get_phone_config_path()) {
        if !content.trim().is_empty() {
            return content;
        }
    }
    EMBEDDED_PHONE_CONFIG.to_string()
}

fn save_phone_endpoint(endpoint: &str, model: &str) {
    let json = serde_json::json!({
        "endpoint": endpoint,
        "model": model
    });
    let _ = std::fs::write(get_phone_config_path(), json.to_string());
}

fn get_phone_model_name() -> String {
    let content = get_phone_config_content();
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        if let Some(m) = val.get("model").and_then(|v| v.as_str()) {
            let t = m.trim();
            if !t.is_empty() && !t.contains("UNKNOWN") && !t.contains("DISCONNECTED") {
                return t.to_string();
            }
        }
    }
    "CPH2661".to_string()
}

fn get_phone_adb_endpoint() -> String {
    let content = get_phone_config_content();
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        if let Some(ep) = val.get("endpoint").and_then(|v| v.as_str()) {
            if !ep.trim().is_empty() {
                return ep.trim().to_string();
            }
        }
    }
    if let Ok(k) = std::env::var("PHONE_ADB_ENDPOINT") {
        let t = k.trim().trim_matches('\'').trim_matches('"');
        if !t.is_empty() {
            return t.to_string();
        }
    }
    for p in ["./.env.local", "../.env.local", "C:/Users/Chowdary/Desktop/Project/Jarvis/.env.local"] {
        if let Ok(content) = std::fs::read_to_string(p) {
            if let Some(val) = parse_key_from_env_str(&content, "PHONE_ADB_ENDPOINT") {
                return val;
            }
        }
    }
    if let Some(val) = parse_key_from_env_str(EMBEDDED_ENV, "PHONE_ADB_ENDPOINT") {
        return val;
    }
    "192.168.1.7:5555".to_string()
}

fn get_adb_path() -> String {
    for p in [
        "tools/platform-tools/adb.exe",
        "./tools/platform-tools/adb.exe",
        "../tools/platform-tools/adb.exe",
        "C:/Users/Chowdary/Desktop/Project/Jarvis/tools/platform-tools/adb.exe",
    ] {
        if std::path::Path::new(p).exists() {
            return p.to_string();
        }
    }
    "adb".to_string()
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
    let mut status = query_windows_bluetooth_devices();
    if !status.has_connected_phone {
        let adb_path = get_adb_path();
        let endpoint = get_phone_adb_endpoint();
        if let Ok(out) = silent_command(&adb_path).args(["devices", "-l"]).output() {
            let str_out = String::from_utf8_lossy(&out.stdout);
            if str_out.contains(&endpoint) && str_out.contains("device") {
                status.has_connected_phone = true;
                if status.connected_phone_name.is_none() {
                    let mut model_found = get_phone_model_name();
                    for line in str_out.lines() {
                        if line.contains(&endpoint) && line.contains("model:") {
                            for part in line.split_whitespace() {
                                if part.starts_with("model:") {
                                    model_found = part.replace("model:", "").replace('_', " ");
                                }
                            }
                        }
                    }
                    status.connected_phone_name = Some(model_found);
                }
            }
        }
    }
    Ok(status)
}

#[tauri::command]
fn dial_phone_call(number: String) -> Result<String, String> {
    let clean_num: String = number.chars().filter(|c| c.is_ascii_digit() || *c == '+' || *c == '*' || *c == '#').collect();
    if clean_num.is_empty() {
        return Err("Phone number is empty".to_string());
    }

    let adb_path = get_adb_path();
    let endpoint = get_phone_adb_endpoint();

    // 1. Ensure ADB connects to phone over Wi-Fi
    let _ = silent_command(&adb_path)
        .args(["connect", &endpoint])
        .output();

    // 2. Trigger direct call via ADB intent on the phone
    let call_res = silent_command(&adb_path)
        .args([
            "-s",
            &endpoint,
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.CALL",
            "-d",
            &format!("tel:{}", clean_num),
        ])
        .output();

    let mut direct_success = false;
    if let Ok(out) = call_res {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let stderr = String::from_utf8_lossy(&out.stderr);
        if out.status.success() && !stdout.contains("Error") && !stderr.contains("Error") {
            direct_success = true;
        }
    }

    if !direct_success {
        // Attempt fast auto-reconnect before reporting status
        let _ = auto_sync_phone();
        let retry_endpoint = get_phone_adb_endpoint();
        let retry_res = silent_command(&adb_path)
            .args([
                "-s",
                &retry_endpoint,
                "shell",
                "am",
                "start",
                "-a",
                "android.intent.action.CALL",
                "-d",
                &format!("tel:{}", clean_num),
            ])
            .output();
        if let Ok(out) = retry_res {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            if out.status.success() && !stdout.contains("Error") && !stderr.contains("Error") {
                direct_success = true;
            }
        }
    }

    if direct_success {
        Ok(format!("Directly dialing {} on phone via Wi-Fi", clean_num))
    } else {
        Err(format!("Direct phone uplink unreachable. Please tap SYNC PHONE to link your device."))
    }
}

#[tauri::command]
fn end_phone_call() -> Result<String, String> {
    let adb_path = get_adb_path();
    let endpoint = get_phone_adb_endpoint();
    let _ = silent_command(&adb_path)
        .args(["-s", &endpoint, "shell", "input", "keyevent", "KEYCODE_ENDCALL"])
        .output();
    Ok("Call ended successfully".to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PhoneSyncStatus {
    pub is_connected: bool,
    pub model: String,
    pub endpoint: String,
    pub message: String,
}

fn kill_active_qr_session() {
    let pid = ACTIVE_QR_PID.swap(0, Ordering::SeqCst);
    if pid > 0 {
        #[cfg(windows)]
        {
            let _ = silent_command("taskkill").args(["/F", "/T", "/PID", &pid.to_string()]).output();
        }
    }
}

fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut in_escape = false;
    for ch in s.chars() {
        if ch == '\x1b' {
            in_escape = true;
        } else if in_escape {
            if ch == 'm' {
                in_escape = false;
            }
        } else {
            result.push(ch);
        }
    }
    result
}

fn sync_paired_device(ep: &str) -> PhoneSyncStatus {
    let adb_path = get_adb_path();

    std::thread::sleep(Duration::from_millis(800));

    // Query adb mdns services to discover the wireless debugging port
    if let Ok(mdns_out) = silent_command(&adb_path).args(["mdns", "services"]).output() {
        let mdns_text = String::from_utf8_lossy(&mdns_out.stdout);
        for line in mdns_text.lines() {
            if line.contains("_adb._tcp") {
                if let Some(service_ep) = line.split_whitespace().last() {
                    if service_ep.contains(':') {
                        let _ = silent_command(&adb_path).args(["connect", service_ep]).output();
                    }
                }
            }
        }
    }

    if !ep.is_empty() {
        if let Some(ip) = ep.split(':').next() {
            let static_ep = format!("{}:5555", ip);
            let _ = silent_command(&adb_path).args(["connect", &static_ep]).output();
        }
        let _ = silent_command(&adb_path).args(["connect", ep]).output();
        std::thread::sleep(Duration::from_millis(400));
    }

    if let Ok(res) = auto_sync_phone() {
        if res.is_connected {
            return res;
        }
    }

    auto_sync_phone().unwrap_or_else(|_| PhoneSyncStatus {
        is_connected: false,
        model: "DISCONNECTED".to_string(),
        endpoint: ep.to_string(),
        message: "Pairing completed, waiting for device handshake".to_string(),
    })
}

#[tauri::command]
fn start_qr_pair_window() -> Result<String, String> {
    // Pure in-app scanner active - no external cmd window spawned
    Ok("QR pairing gateway active in UI".to_string())
}

#[tauri::command]
fn generate_pairing_qr() -> Result<Vec<String>, String> {
    kill_active_qr_session();

    if let Ok(mut cache) = QR_CODE_CACHE.lock() {
        *cache = None;
    }
    if let Ok(mut status) = QR_PAIR_STATUS.lock() {
        *status = None;
    }

    let adb_path = get_adb_path();
    let mut cmd = silent_command(&adb_path);
    cmd.args(["pair", "--qr"])
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn adb pair: {}", e))?;
    let pid = child.id();
    ACTIVE_QR_PID.store(pid, Ordering::SeqCst);

    let stdout = child.stdout.take().ok_or("Failed to capture adb stdout")?;

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut qr_lines = Vec::new();
        let mut reading_qr = false;

        for line_res in reader.lines() {
            if let Ok(line) = line_res {
                let clean_line = strip_ansi(&line);

                if clean_line.contains('█') || clean_line.contains('▄') || clean_line.contains('▀') {
                    reading_qr = true;
                    qr_lines.push(clean_line.clone());
                } else if reading_qr && clean_line.contains("Waiting for device to scan QR code") {
                    if let Ok(mut cache) = QR_CODE_CACHE.lock() {
                        *cache = Some(qr_lines.clone());
                    }
                }

                if clean_line.to_lowercase().contains("successfully paired") {
                    let parts: Vec<&str> = clean_line.split_whitespace().collect();
                    let mut ep = String::new();
                    for (i, p) in parts.iter().enumerate() {
                        if (*p == "to" || *p == "to:") && i + 1 < parts.len() {
                            ep = parts[i + 1].trim().trim_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != ':').to_string();
                            break;
                        }
                    }

                    std::thread::sleep(Duration::from_millis(500));
                    let sync_res = sync_paired_device(&ep);
                    if let Ok(mut status) = QR_PAIR_STATUS.lock() {
                        *status = Some(sync_res);
                    }
                    break;
                }
            } else {
                break;
            }
        }
        let _ = child.wait();
    });

    let start = Instant::now();
    while start.elapsed() < Duration::from_millis(3000) {
        if let Ok(cache) = QR_CODE_CACHE.lock() {
            if let Some(ref lines) = *cache {
                if !lines.is_empty() {
                    return Ok(lines.clone());
                }
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    Err("Timeout waiting for adb pair QR generation".to_string())
}

#[tauri::command]
fn check_qr_pairing_status() -> Result<Option<PhoneSyncStatus>, String> {
    if let Ok(status) = QR_PAIR_STATUS.lock() {
        Ok(status.clone())
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn cancel_qr_pairing() -> Result<String, String> {
    kill_active_qr_session();
    Ok("QR pairing session cancelled".to_string())
}

#[tauri::command]
fn auto_sync_phone() -> Result<PhoneSyncStatus, String> {
    let adb_path = get_adb_path();
    let current_ep = get_phone_adb_endpoint();

    // 1. Try connecting to stored endpoint first
    let _ = silent_command(&adb_path).args(["connect", &current_ep]).output();

    // 2. Query adb devices
    if let Ok(out) = silent_command(&adb_path).args(["devices", "-l"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.contains("device") && !trimmed.starts_with("List of") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if let Some(id) = parts.first() {
                    let mut model_name = "ANDROID PHONE".to_string();
                    for part in &parts {
                        if part.starts_with("model:") {
                            model_name = part.replace("model:", "").replace('_', " ");
                        }
                    }

                    // If connected via USB or temporary port, switch to Wi-Fi TCP mode 5555
                    if !id.contains(":5555") {
                        let _ = silent_command(&adb_path).args(["-s", id, "tcpip", "5555"]).output();
                        if let Ok(ip_out) = silent_command(&adb_path)
                            .args(["-s", id, "shell", "ip -f inet addr show wlan0"])
                            .output()
                        {
                            let ip_text = String::from_utf8_lossy(&ip_out.stdout);
                            for ip_line in ip_text.lines() {
                                let l = ip_line.trim();
                                if l.starts_with("inet ") {
                                    if let Some(ip_chunk) = l.split_whitespace().nth(1) {
                                        let clean_ip = ip_chunk.split('/').next().unwrap_or("").trim();
                                        if !clean_ip.is_empty() {
                                            let new_ep = format!("{}:5555", clean_ip);
                                            let _ = silent_command(&adb_path).args(["connect", &new_ep]).output();
                                            save_phone_endpoint(&new_ep, &model_name);
                                            return Ok(PhoneSyncStatus {
                                                is_connected: true,
                                                model: model_name,
                                                endpoint: new_ep,
                                                message: "Phone synced and locked to Wi-Fi static port 5555".to_string(),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    save_phone_endpoint(id, &model_name);
                    return Ok(PhoneSyncStatus {
                        is_connected: true,
                        model: model_name,
                        endpoint: id.to_string(),
                        message: "Direct phone connection established".to_string(),
                    });
                }
            }
        }
    }

    Ok(PhoneSyncStatus {
        is_connected: false,
        model: "DISCONNECTED".to_string(),
        endpoint: current_ep,
        message: "No device detected. Click Generate Pairing QR or connect USB.".to_string(),
    })
}

#[tauri::command]
fn pair_phone_manual(endpoint: String, code: String) -> Result<String, String> {
    let adb_path = get_adb_path();
    let pair_res = silent_command(&adb_path)
        .args(["pair", endpoint.trim(), code.trim()])
        .output();

    if let Ok(out) = pair_res {
        let stdout = String::from_utf8_lossy(&out.stdout);
        if out.status.success() && stdout.contains("Successfully paired") {
            let _ = auto_sync_phone();
            return Ok("Pairing successful! Phone connected.".to_string());
        } else {
            return Err(format!("Pairing failed: {}", stdout));
        }
    }
    Err("Failed to execute ADB pair command".to_string())
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

            // Direct Phone / Call - strictly HUD managed, never launch Windows Phone Link
            if app_clean == "call" || app_clean == "phone" {
                return Ok("Phone call matrix active in HUD".to_string());
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

#[cfg(windows)]
fn get_foreground_window_title() -> String {
    use std::ffi::c_void;
    type HWND = *mut c_void;
    unsafe extern "system" {
        fn GetForegroundWindow() -> HWND;
        fn GetWindowTextW(hWnd: HWND, lpString: *mut u16, nMaxCount: i32) -> i32;
    }
    unsafe {
        let hwnd = GetForegroundWindow();
        if !hwnd.is_null() {
            let mut buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), 512);
            if len > 0 {
                let title = String::from_utf16_lossy(&buf[..len as usize]);
                let trimmed = title.trim();
                if !trimmed.is_empty() {
                    return trimmed.to_string();
                }
            }
        }
    }
    "Desktop".to_string()
}
#[cfg(not(windows))]
fn get_foreground_window_title() -> String {
    "Desktop".to_string()
}

async fn fetch_web_intelligence(query: &str) -> String {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(3500))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut snippets = Vec::new();
    let clean_query = query
        .trim()
        .trim_start_matches("search for")
        .trim_start_matches("search")
        .trim_start_matches("google")
        .trim_start_matches("who is")
        .trim_start_matches("who was")
        .trim_start_matches("what is")
        .trim_start_matches("what was")
        .trim_start_matches("tell me about")
        .trim();

    // 1. Google News RSS for live/current events
    let encoded_query = clean_query.replace(' ', "+");
    let news_url = format!("https://news.google.com/rss/search?q={}", encoded_query);
    if let Ok(res) = client.get(&news_url).send().await {
        if let Ok(text) = res.text().await {
            for item in text.split("<item>").skip(1).take(3) {
                if let Some(start) = item.find("<title>") {
                    if let Some(end) = item.find("</title>") {
                        let title = &item[start + 7..end];
                        let clean_title = title.replace("&quot;", "\"").replace("&amp;", "&");
                        snippets.push(format!("• {}", clean_title));
                    }
                }
            }
        }
    }

    // 2. Wikipedia Summary API
    let wiki_topic = clean_query.replace(' ', "_");
    let wiki_url = format!("https://en.wikipedia.org/api/rest_v1/page/summary/{}", wiki_topic);
    if let Ok(res) = client.get(&wiki_url).send().await {
        if let Ok(json_val) = res.json::<serde_json::Value>().await {
            if let Some(extract) = json_val.get("extract").and_then(|v| v.as_str()) {
                if !extract.is_empty() {
                    let short_extract = if extract.len() > 300 { &extract[..300] } else { extract };
                    snippets.push(format!("Wikipedia Overview: {}", short_extract));
                }
            }
        }
    }

    snippets.join("\n")
}

async fn handle_web_search(
    query: &str,
    _state: &tauri::State<'_, AppState>,
    start_time: Instant,
) -> Result<JarvisResponse, String> {
    let clean_query = query
        .trim()
        .trim_start_matches("search for")
        .trim_start_matches("search")
        .trim_start_matches("google")
        .trim();

    let intelligence = fetch_web_intelligence(clean_query).await;
    let groq_key = get_groq_api_key();
    let client = reqwest::Client::new();

    let search_system_prompt = "You are J.A.R.V.I.S. Web Research Agent. Based on the provided live web intelligence, concisely answer the user's query in under 20 spoken words. Be precise, authoritative, and direct like Tony Stark's AI. Do not use markdown.";

    let user_msg = if intelligence.is_empty() {
        format!("Answer this query based on your knowledge: {}", clean_query)
    } else {
        format!("Live Web Context:\n{}\n\nUser Question: {}", intelligence, clean_query)
    };

    let payload = serde_json::json!({
        "model": "qwen/qwen3.8-27b",
        "messages": [
            { "role": "system", "content": search_system_prompt },
            { "role": "user", "content": user_msg }
        ],
        "temperature": 0.2,
        "max_tokens": 65
    });

    let mut reply = format!("Retrieved web results for {}.", clean_query);
    let mut eval_tokens = 20u32;
    let mut prompt_tokens = 60u32;

    if !groq_key.is_empty() {
        if let Ok(res) = client
            .post(GROQ_CHAT_URL)
            .header("Authorization", format!("Bearer {}", groq_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_millis(4500))
            .json(&payload)
            .send()
            .await
        {
            if let Ok(json_val) = res.json::<serde_json::Value>().await {
                if let Some(content) = json_val["choices"][0]["message"]["content"].as_str() {
                    let cleaned = content.trim().replace('"', "").replace('*', "");
                    if !cleaned.is_empty() {
                        reply = cleaned;
                    }
                }
                prompt_tokens = json_val["usage"]["prompt_tokens"].as_u64().unwrap_or(60) as u32;
                eval_tokens = json_val["usage"]["completion_tokens"].as_u64().unwrap_or(20) as u32;
            }
        }
    }

    let latency_ms = start_time.elapsed().as_millis();
    let total_tokens = prompt_tokens + eval_tokens;
    let tokens_per_sec = (eval_tokens as f32) / (latency_ms.max(1) as f32 / 1000.0);

    let words = vec!["Search".into(), "→".into(), clean_query.to_string()];

    Ok(JarvisResponse {
        reply: reply.clone(),
        action: Some(format!("🌐 Search: {}", clean_query)),
        command: Some(format!("Web Intelligence: {}", clean_query)),
        output: Some(if intelligence.is_empty() { "No external snippets retrieved.".into() } else { intelligence }),
        latency_ms,
        prompt_tokens,
        eval_tokens,
        total_tokens,
        tokens_per_sec,
        model_name: "qwen/qwen3.8-27b (Web Intelligence)".to_string(),
        token_words: words,
    })
}

async fn handle_screen_vision(
    prompt: &str,
    _state: &tauri::State<'_, AppState>,
    start_time: Instant,
) -> Result<JarvisResponse, String> {
    let fg_window = get_foreground_window_title();
    #[cfg(windows)]
    let active_windows = win32_apps::get_taskbar_windows();
    #[cfg(not(windows))]
    let active_windows: Vec<(u32, String)> = Vec::new();
    let sample_apps: Vec<String> = active_windows.iter().take(5).map(|(_, title)| title.clone()).collect();

    let groq_key = get_groq_api_key();
    let client = reqwest::Client::new();

    let vision_context = format!(
        "Active Foreground Window: \"{}\". Other visible taskbar windows: {}. User request: \"{}\"",
        fg_window,
        sample_apps.join(", "),
        prompt
    );

    let vision_system_prompt = "You are J.A.R.V.I.S. Holographic Screen Vision Agent. You analyze the user's active display and windows. Provide a concise, highly intelligent, spoken tactical analysis under 20 words as Tony Stark's assistant. Do not use markdown.";

    let payload = serde_json::json!({
        "model": "qwen/qwen3.8-27b",
        "messages": [
            { "role": "system", "content": vision_system_prompt },
            { "role": "user", "content": vision_context }
        ],
        "temperature": 0.2,
        "max_tokens": 60
    });

    let mut reply = format!("Active on screen: {}.", fg_window);
    let mut eval_tokens = 15u32;
    let mut prompt_tokens = 40u32;

    if !groq_key.is_empty() {
        if let Ok(res) = client
            .post(GROQ_CHAT_URL)
            .header("Authorization", format!("Bearer {}", groq_key))
            .header("Content-Type", "application/json")
            .timeout(Duration::from_millis(4500))
            .json(&payload)
            .send()
            .await
        {
            if let Ok(json_val) = res.json::<serde_json::Value>().await {
                if let Some(content) = json_val["choices"][0]["message"]["content"].as_str() {
                    let cleaned = content.trim().replace('"', "").replace('*', "");
                    if !cleaned.is_empty() {
                        reply = cleaned;
                    }
                }
                prompt_tokens = json_val["usage"]["prompt_tokens"].as_u64().unwrap_or(40) as u32;
                eval_tokens = json_val["usage"]["completion_tokens"].as_u64().unwrap_or(15) as u32;
            }
        }
    }

    let latency_ms = start_time.elapsed().as_millis();
    let total_tokens = prompt_tokens + eval_tokens;
    let tokens_per_sec = (eval_tokens as f32) / (latency_ms.max(1) as f32 / 1000.0);

    let words = vec!["Vision".into(), "→".into(), fg_window.clone()];

    Ok(JarvisResponse {
        reply: reply.clone(),
        action: Some(format!("👁️ Screen Vision: {}", fg_window)),
        command: Some(format!("Active Focus: {}", fg_window)),
        output: Some(format!("Inspected window: {}", fg_window)),
        latency_ms,
        prompt_tokens,
        eval_tokens,
        total_tokens,
        tokens_per_sec,
        model_name: "qwen/qwen3.8-27b (Vision)".to_string(),
        token_words: words,
    })
}

#[tauri::command]
async fn transcribe_audio_groq(audio_base64: String, mime_type: Option<String>) -> Result<String, String> {
    use base64::Engine;
    let clean_b64 = audio_base64.trim();
    let data_str = if let Some(idx) = clean_b64.find("base64,") {
        &clean_b64[(idx + 7)..]
    } else {
        clean_b64
    };

    let audio_bytes = base64::engine::general_purpose::STANDARD
        .decode(data_str)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    let groq_key = get_groq_api_key();
    if groq_key.is_empty() {
        return Err("GROQ_API_KEY is not configured".to_string());
    }

    let mime = mime_type.unwrap_or_else(|| "audio/webm".to_string());
    let filename = if mime.contains("wav") { "audio.wav" } else { "audio.webm" };

    let part = reqwest::multipart::Part::bytes(audio_bytes)
        .file_name(filename)
        .mime_str(&mime)
        .map_err(|e| format!("Mime format error: {}", e))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", "whisper-large-v3-turbo")
        .text("response_format", "json")
        .text("temperature", "0.0");

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", groq_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Whisper request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Whisper API error: {}", err_text));
    }

    let json_val = res.json::<serde_json::Value>().await
        .map_err(|e| format!("Parse Whisper response failed: {}", e))?;

    let text = json_val["text"].as_str().unwrap_or("").trim().to_string();
    Ok(text)
}

#[tauri::command]
async fn web_search_jarvis(query: String, state: tauri::State<'_, AppState>) -> Result<JarvisResponse, String> {
    handle_web_search(&query, &state, Instant::now()).await
}

#[tauri::command]
async fn inspect_screen_jarvis(prompt: Option<String>, state: tauri::State<'_, AppState>) -> Result<JarvisResponse, String> {
    let p = prompt.unwrap_or_else(|| "inspect screen".to_string());
    handle_screen_vision(&p, &state, Instant::now()).await
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

    let lower_prompt = prompt_clean.to_lowercase();

    // 1. Vision Agent: Screen inspection directives
    if lower_prompt.contains("screen") && (
        lower_prompt.contains("inspect") ||
        lower_prompt.contains("what is on") ||
        lower_prompt.contains("what's on") ||
        lower_prompt.contains("analyze") ||
        lower_prompt.contains("read") ||
        lower_prompt.contains("look at") ||
        lower_prompt.contains("explain") ||
        lower_prompt.contains("debug")
    ) {
        return handle_screen_vision(prompt_clean, &state, start_time).await;
    }

    // 2. Web Research Agent: Live search and news directives
    if lower_prompt.starts_with("search ") ||
       lower_prompt.starts_with("search for ") ||
       lower_prompt.starts_with("google ") ||
       lower_prompt.starts_with("who is ") ||
       lower_prompt.starts_with("who was ") ||
       lower_prompt.starts_with("what is ") ||
       lower_prompt.starts_with("what was ") ||
       lower_prompt.starts_with("tell me about ") ||
       lower_prompt.starts_with("latest news") ||
       lower_prompt.starts_with("stock price") {
        return handle_web_search(prompt_clean, &state, start_time).await;
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

fn get_speech_worker_path() -> String {
    for p in [
        "scripts/speech_worker.ps1",
        "./scripts/speech_worker.ps1",
        "../scripts/speech_worker.ps1",
        "C:/Users/Chowdary/Desktop/Project/Jarvis/scripts/speech_worker.ps1",
    ] {
        if std::path::Path::new(p).exists() {
            return p.to_string();
        }
    }
    let temp_file = std::env::temp_dir().join("jarvis_speech_worker.ps1");
    let _ = std::fs::write(&temp_file, EMBEDDED_SPEECH_WORKER);
    temp_file.to_string_lossy().to_string()
}

fn start_speech_listener_worker(app_handle: tauri::AppHandle) {
    use tauri::Emitter;
    loop {
        let script_path = get_speech_worker_path();
        if !std::path::Path::new(&script_path).exists() {
            std::thread::sleep(Duration::from_secs(2));
            continue;
        }

        let mut cmd = silent_command("powershell");
        cmd.args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_path,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

        if let Ok(mut child) = cmd.spawn() {
            ACTIVE_SPEECH_WORKER_PID.store(child.id(), Ordering::SeqCst);
            if let Some(stdout) = child.stdout.take() {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(l) = line {
                        let trimmed = l.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                            if let Some(evt) = val.get("event").and_then(|v| v.as_str()) {
                                if evt == "speech" {
                                    if let Some(text) = val.get("text").and_then(|v| v.as_str()) {
                                        let clean_text = text.trim();
                                        if !clean_text.is_empty() && SPEECH_LISTENER_ACTIVE.load(Ordering::SeqCst) {
                                            println!("[Speech Engine Recognized]: {}", clean_text);
                                            if let Ok(mut cache) = LATEST_VOICE_TRANSCRIPTION.lock() {
                                                *cache = Some(clean_text.to_string());
                                            }
                                            VOICE_NOTIFY.notify_waiters();
                                            let _ = app_handle.emit("jarvis://voice_directive", clean_text.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            let _ = child.wait();
        }

        std::thread::sleep(Duration::from_secs(1));
    }
}

// Native Windows Speech Recognition Engine (Continuous Real-Time Voice Uplink)
#[tauri::command]
async fn listen_mic() -> Result<String, String> {
    SPEECH_LISTENER_ACTIVE.store(true, Ordering::SeqCst);
    let res = tokio::time::timeout(Duration::from_secs(5), async {
        loop {
            VOICE_NOTIFY.notified().await;
            if let Ok(mut lock) = LATEST_VOICE_TRANSCRIPTION.lock() {
                if let Some(t) = lock.take() {
                    return t;
                }
            }
        }
    })
    .await;

    match res {
        Ok(t) => Ok(t),
        Err(_) => Ok("".to_string()),
    }
}

#[tauri::command]
fn set_voice_listening(active: bool) -> Result<bool, String> {
    SPEECH_LISTENER_ACTIVE.store(active, Ordering::SeqCst);
    Ok(active)
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
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let pid = ACTIVE_SPEECH_WORKER_PID.load(Ordering::SeqCst);
                if pid > 0 {
                    let mut k = silent_command("taskkill");
                    let _ = k.args(["/F", "/T", "/PID", &pid.to_string()]).output();
                }
            }
        })
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
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

            // Spawn continuous background voice speech worker
            let speech_app_handle = app.handle().clone();
            std::thread::spawn(move || {
                start_speech_listener_worker(speech_app_handle);
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
            end_phone_call,
            start_qr_pair_window,
            generate_pairing_qr,
            check_qr_pairing_status,
            cancel_qr_pairing,
            auto_sync_phone,
            pair_phone_manual,
            listen_mic,
            set_voice_listening,
            transcribe_audio_groq,
            web_search_jarvis,
            inspect_screen_jarvis
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
