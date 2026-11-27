//! JARVIS Native Windows Interaction Engine (HOLISTIC)
//! 4-Tier Escalation:
//!   Tier 1: Win32 & Shell (Known Folders, SendInput, Window Focus, WDA_EXCLUDEFROMCAPTURE)
//!   Tier 2: Event-Driven Windows UI Automation (IUIAutomation + SetWinEventHook) & Browser CDP
//!   Tier 3: Windows Native OCR (Windows.Media.Ocr)
//!   Tier 4: AI Vision escalation flag (handled only when Tiers 1-3 cannot resolve)

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use image::{ImageEncoder, codecs::jpeg::JpegEncoder};
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::sync::{
    Arc, Mutex, OnceLock,
    atomic::{AtomicBool, AtomicUsize, Ordering},
};
use tauri::{AppHandle, Emitter, Manager};

use windows::Win32::Foundation::{BOOL, HWND, LPARAM, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Direct3D::D3D_DRIVER_TYPE_HARDWARE;
use windows::Win32::Graphics::Direct3D11::{
    D3D11_CPU_ACCESS_READ, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_MAP_READ, D3D11_SDK_VERSION,
    D3D11_TEXTURE2D_DESC, D3D11_USAGE_STAGING, D3D11CreateDevice, ID3D11Device,
    ID3D11DeviceContext, ID3D11Texture2D,
};
use windows::Win32::Graphics::Dxgi::IDXGIDevice;
use windows::Win32::Graphics::Gdi::{
    BI_RGB, BITMAPINFO, BITMAPINFOHEADER, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC,
    DIB_RGB_COLORS, DeleteDC, DeleteObject, EnumDisplayMonitors, GetDC, GetDIBits,
    GetMonitorInfoW, HDC, HMONITOR, MONITORINFO, MONITOR_DEFAULTTOPRIMARY,
    MonitorFromPoint, ReleaseDC, SRCCOPY, SelectObject,
};
use windows::Win32::Security::{
    GetTokenInformation, TOKEN_ELEVATION, TOKEN_QUERY, TokenElevation,
};
use windows::Win32::System::Com::{
    CLSCTX_ALL, COINIT_APARTMENTTHREADED, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
    CoTaskMemFree, CoUninitialize,
};
use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
use windows::Win32::System::WinRT::Direct3D11::{
    CreateDirect3D11DeviceFromDXGIDevice, IDirect3DDxgiInterfaceAccess,
};
use windows::Win32::System::WinRT::Graphics::Capture::IGraphicsCaptureItemInterop;
use windows::Win32::UI::Accessibility::{
    CUIAutomation, HWINEVENTHOOK, IUIAutomation, IUIAutomationElement, IUIAutomationInvokePattern,
    SetWinEventHook, TreeScope_Subtree, UIA_InvokePatternId, UnhookWinEvent,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE,
    MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MOVE,
    MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT, SendInput,
};
use windows::Win32::UI::Shell::{
    FOLDERID_Desktop, FOLDERID_Documents, FOLDERID_Downloads, KF_FLAG_DEFAULT,
    SHGetKnownFolderPath, ShellExecuteW,
};
use windows::Win32::UI::WindowsAndMessaging::{
    DispatchMessageW, EVENT_OBJECT_FOCUS, EVENT_SYSTEM_FOREGROUND, GetForegroundWindow,
    GetSystemMetrics, GetWindowTextW, IsZoomed, MSG, PM_REMOVE, PeekMessageW, PostMessageW,
    SM_CXSCREEN, SM_CYSCREEN, SW_MAXIMIZE, SW_SHOWNORMAL, SetCursorPos, SetWindowDisplayAffinity,
    ShowWindow, TranslateMessage, WDA_EXCLUDEFROMCAPTURE, WINEVENT_OUTOFCONTEXT, WM_CLOSE,
};
use windows::core::{Interface, PCWSTR};

use windows::Graphics::Capture::{Direct3D11CaptureFramePool, GraphicsCaptureItem};
use windows::Graphics::DirectX::DirectXPixelFormat;
use windows::Graphics::DirectX::Direct3D11::IDirect3DDevice;
use windows::Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap};
use windows::Media::Ocr::OcrEngine;
use windows::Storage::Streams::DataWriter;

// ============================================================================
// SHARED DATA TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenRect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopElement {
    pub id: usize,
    pub name: String,
    pub control_type: String,
    pub source: String, // "uia" | "ocr" | "cdp"
    pub rect: ScreenRect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub title: String,
    pub hwnd: isize,
    pub screen_w: i32,
    pub screen_h: i32,
    pub elevated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub index: usize,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopFramePayload {
    pub jpeg_b64: String,
    pub width: u32,
    pub height: u32,
    pub origin_x: i32,
    pub origin_y: i32,
    pub screen_w: i32,
    pub screen_h: i32,
    pub monitor_index: usize,
    pub capture_mode: String, // "wgc" | "gdi"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartCommandResult {
    pub handled: bool,
    pub tier: String,
    pub message: String,
    pub elements: Vec<DesktopElement>,
    pub needs_ai_vision: bool,
    pub screen_summary: String,
    pub frame_b64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpTabInfo {
    pub title: String,
    pub url: String,
    pub tab_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerShellResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub elevated: bool,
    pub cwd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerShellInitInfo {
    pub banner: String,
    pub cwd: String,
    pub elevated: bool,
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

static MIRROR_RUNNING: AtomicBool = AtomicBool::new(false);
static EVENT_HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
static SELECTED_MONITOR_INDEX: AtomicUsize = AtomicUsize::new(0);
static LATEST_ELEMENTS: OnceLock<Arc<Mutex<Vec<DesktopElement>>>> = OnceLock::new();
static LATEST_FRAME_B64: OnceLock<Arc<Mutex<Option<String>>>> = OnceLock::new();
static EVENT_APP_HANDLE: OnceLock<Mutex<Option<AppHandle>>> = OnceLock::new();
static PS_CWD: OnceLock<Mutex<String>> = OnceLock::new();

fn ps_cwd_store() -> &'static Mutex<String> {
    PS_CWD.get_or_init(|| {
        let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
        Mutex::new(home)
    })
}

fn elements_store() -> &'static Arc<Mutex<Vec<DesktopElement>>> {
    LATEST_ELEMENTS.get_or_init(|| Arc::new(Mutex::new(Vec::new())))
}

fn frame_store() -> &'static Arc<Mutex<Option<String>>> {
    LATEST_FRAME_B64.get_or_init(|| Arc::new(Mutex::new(None)))
}

fn to_wide(s: &str) -> Vec<u16> {
    std::ffi::OsStr::new(s)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

fn get_screen_size() -> (i32, i32) {
    unsafe {
        let w = GetSystemMetrics(SM_CXSCREEN).max(1);
        let h = GetSystemMetrics(SM_CYSCREEN).max(1);
        (w, h)
    }
}

pub fn enumerate_monitors() -> Vec<(HMONITOR, MonitorInfo)> {
    unsafe extern "system" fn enum_mon_proc(
        hmon: HMONITOR,
        _hdc: HDC,
        _rc: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let vec_ptr = lparam.0 as *mut Vec<(HMONITOR, MonitorInfo)>;
        if let Some(list) = unsafe { vec_ptr.as_mut() } {
            let mut mi = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            if unsafe { GetMonitorInfoW(hmon, &mut mi).as_bool() } {
                let r = mi.rcMonitor;
                let idx = list.len();
                list.push((
                    hmon,
                    MonitorInfo {
                        index: idx,
                        x: r.left,
                        y: r.top,
                        w: (r.right - r.left).max(1),
                        h: (r.bottom - r.top).max(1),
                        is_primary: (mi.dwFlags & 1) != 0,
                    },
                ));
            }
        }
        BOOL(1)
    }

    let mut list: Vec<(HMONITOR, MonitorInfo)> = Vec::new();
    unsafe {
        let _ = EnumDisplayMonitors(
            None,
            None,
            Some(enum_mon_proc),
            LPARAM(&mut list as *mut _ as isize),
        );
    }
    if list.is_empty() {
        let (w, h) = get_screen_size();
        let hmon = unsafe { MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY) };
        list.push((
            hmon,
            MonitorInfo {
                index: 0,
                x: 0,
                y: 0,
                w,
                h,
                is_primary: true,
            },
        ));
    }
    list
}

fn get_selected_monitor() -> (HMONITOR, MonitorInfo) {
    let list = enumerate_monitors();
    let idx = SELECTED_MONITOR_INDEX.load(Ordering::Relaxed);
    list.get(idx).cloned().unwrap_or_else(|| list[0].clone())
}

pub fn check_is_elevated() -> bool {
    unsafe {
        let mut token = windows::Win32::Foundation::HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION::default();
        let mut ret_len = 0u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut std::ffi::c_void),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_len,
        )
        .is_ok();
        let _ = windows::Win32::Foundation::CloseHandle(token);
        ok && elevation.TokenIsElevated != 0
    }
}

// ============================================================================
// TIER 1: WIN32 WINDOW AFFINITY, KNOWN FOLDERS, & INPUT CONTROL
// ============================================================================

pub fn apply_capture_exclusion(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if let Ok(hwnd) = win.hwnd() {
            unsafe {
                let _ = SetWindowDisplayAffinity(HWND(hwnd.0 as _), WDA_EXCLUDEFROMCAPTURE);
            }
        }
    }
}

pub fn get_known_folder_path(folder: &str) -> Result<String, String> {
    let folder_id = match folder.to_lowercase().as_str() {
        "desktop" => &FOLDERID_Desktop,
        "downloads" => &FOLDERID_Downloads,
        "documents" => &FOLDERID_Documents,
        _ => return Err(format!("Unknown folder: {}", folder)),
    };
    unsafe {
        let pwstr = SHGetKnownFolderPath(folder_id, KF_FLAG_DEFAULT, None)
            .map_err(|e| format!("SHGetKnownFolderPath failed: {}", e))?;
        let len = (0..).take_while(|&i| *pwstr.0.add(i) != 0).count();
        let slice = std::slice::from_raw_parts(pwstr.0, len);
        let path = OsString::from_wide(slice).to_string_lossy().into_owned();
        CoTaskMemFree(Some(pwstr.0 as *const std::ffi::c_void));
        Ok(path)
    }
}

pub fn shell_open(target: &str) -> Result<(), String> {
    unsafe {
        let wide_op = to_wide("open");
        let wide_target = to_wide(target);
        let res = ShellExecuteW(
            None,
            PCWSTR(wide_op.as_ptr()),
            PCWSTR(wide_target.as_ptr()),
            None,
            None,
            SW_SHOWNORMAL,
        );
        if (res.0 as isize) <= 32 {
            Err(format!("ShellExecuteW failed with code {:?}", res.0))
        } else {
            Ok(())
        }
    }
}

pub fn send_mouse_click_at(x: i32, y: i32, button: &str, double_click: bool) -> Result<(), String> {
    let (sw, sh) = get_screen_size();
    let norm_x = ((x.clamp(0, sw) as i64 * 65535) / sw as i64) as i32;
    let norm_y = ((y.clamp(0, sh) as i64 * 65535) / sh as i64) as i32;

    let (down_flag, up_flag) = if button.eq_ignore_ascii_case("right") {
        (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP)
    } else {
        (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP)
    };

    let make_mouse = |flags, dx, dy| INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx,
                dy,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let mut inputs = vec![
        make_mouse(MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE, norm_x, norm_y),
        make_mouse(down_flag, 0, 0),
        make_mouse(up_flag, 0, 0),
    ];
    if double_click {
        inputs.push(make_mouse(down_flag, 0, 0));
        inputs.push(make_mouse(up_flag, 0, 0));
    }

    unsafe {
        let _ = SetCursorPos(x, y);
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent == 0 {
            return Err("SendInput failed (target window may be elevated)".to_string());
        }
    }
    Ok(())
}

pub fn send_mouse_scroll_at(x: i32, y: i32, delta: i32) -> Result<(), String> {
    let _ = unsafe { SetCursorPos(x, y) };
    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: delta as u32,
                dwFlags: MOUSEEVENTF_WHEEL,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
    Ok(())
}

pub fn send_unicode_text(text: &str) -> Result<(), String> {
    let mut inputs = Vec::with_capacity(text.len() * 2);
    for ch in text.encode_utf16() {
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: Default::default(),
                    wScan: ch,
                    dwFlags: KEYEVENTF_UNICODE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });
        inputs.push(INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: Default::default(),
                    wScan: ch,
                    dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });
    }
    unsafe {
        if SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) == 0 && !inputs.is_empty() {
            return Err("SendInput text failed".to_string());
        }
    }
    Ok(())
}

// ============================================================================
// TIER 2: EVENT-DRIVEN WINDOWS UI AUTOMATION (UIA) + FOREGROUND HOOK
// ============================================================================

pub fn get_active_window_details() -> ActiveWindowInfo {
    let (screen_w, screen_h) = get_screen_size();
    unsafe {
        let hwnd = GetForegroundWindow();
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buf);
        let title = if len > 0 {
            String::from_utf16_lossy(&buf[..len as usize])
        } else {
            String::new()
        };
        ActiveWindowInfo {
            title,
            hwnd: hwnd.0 as isize,
            screen_w,
            screen_h,
            elevated: check_is_elevated(),
        }
    }
}

unsafe extern "system" fn win_event_proc(
    _h_win_event_hook: HWINEVENTHOOK,
    _event: u32,
    hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _dwms_event_time: u32,
) {
    if let Some(lock) = EVENT_APP_HANDLE.get() {
        if let Ok(guard) = lock.lock() {
            if let Some(app) = guard.as_ref() {
                let mut buf = [0u16; 256];
                let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
                let title = if len > 0 {
                    String::from_utf16_lossy(&buf[..len as usize])
                } else {
                    String::new()
                };
                if !title.is_empty() && !title.eq_ignore_ascii_case("JARVIS") {
                    let (sw, sh) = get_screen_size();
                    let _ = app.emit(
                        "desktop-window-changed",
                        ActiveWindowInfo {
                            title,
                            hwnd: hwnd.0 as isize,
                            screen_w: sw,
                            screen_h: sh,
                            elevated: check_is_elevated(),
                        },
                    );
                }
            }
        }
    }
}

pub fn start_event_driven_monitor(app: AppHandle) {
    if EVENT_HOOK_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let cell = EVENT_APP_HANDLE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = cell.lock() {
        *guard = Some(app);
    }

    std::thread::spawn(|| unsafe {
        let hook_fg = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );
        let hook_focus = SetWinEventHook(
            EVENT_OBJECT_FOCUS,
            EVENT_OBJECT_FOCUS,
            None,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );

        let mut msg = MSG::default();
        while EVENT_HOOK_RUNNING.load(Ordering::Relaxed) {
            while PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        if !hook_fg.is_invalid() {
            let _ = UnhookWinEvent(hook_fg);
        }
        if !hook_focus.is_invalid() {
            let _ = UnhookWinEvent(hook_focus);
        }
    });
}

fn control_type_label(ct: i32) -> &'static str {
    match ct {
        50000 => "Button",
        50002 => "CheckBox",
        50003 => "ComboBox",
        50004 => "Edit",
        50005 => "Hyperlink",
        50007 => "ListItem",
        50008 => "List",
        50009 => "Menu",
        50011 => "MenuItem",
        50019 => "TabItem",
        50020 => "Text",
        50024 => "TreeItem",
        50025 => "Custom",
        50032 => "Window",
        _ => "Element",
    }
}

/// Event-driven UIA scan of the current foreground window (never called per-frame).
pub fn scan_foreground_uia(max_elements: usize) -> Result<Vec<DesktopElement>, String> {
    unsafe {
        let com_ok = CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_ok();
        let result = (|| -> Result<Vec<DesktopElement>, String> {
            let uia: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_ALL)
                .map_err(|e| format!("CoCreateInstance CUIAutomation failed: {}", e))?;

            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return Ok(Vec::new());
            }
            let root: IUIAutomationElement = uia
                .ElementFromHandle(hwnd)
                .map_err(|e| format!("ElementFromHandle failed: {}", e))?;

            let true_cond = uia
                .CreateTrueCondition()
                .map_err(|e| format!("CreateTrueCondition failed: {}", e))?;

            let arr = root
                .FindAll(TreeScope_Subtree, &true_cond)
                .map_err(|e| format!("FindAll failed: {}", e))?;

            let count = arr.Length().unwrap_or(0).min(450);
            let mut items = Vec::new();
            let mut next_id = 1usize;

            for i in 0..count {
                if items.len() >= max_elements {
                    break;
                }
                let Ok(el) = arr.GetElement(i) else { continue };
                let offscreen = el.CurrentIsOffscreen().map(|b| b.as_bool()).unwrap_or(true);
                if offscreen {
                    continue;
                }
                let Ok(rect) = el.CurrentBoundingRectangle() else {
                    continue;
                };
                let w = rect.right - rect.left;
                let h = rect.bottom - rect.top;
                if w < 8 || h < 8 || rect.left < -10 || rect.top < -10 {
                    continue;
                }

                let ct = el.CurrentControlType().map(|c| c.0).unwrap_or(0);
                // Focus on interactive / meaningful elements
                let interesting = matches!(
                    ct,
                    50000 | 50002 | 50003 | 50004 | 50005 | 50007 | 50011 | 50019 | 50024 | 50020
                );
                if !interesting {
                    continue;
                }

                let name = el
                    .CurrentName()
                    .map(|b| b.to_string())
                    .unwrap_or_default()
                    .trim()
                    .to_string();
                if name.is_empty() {
                    continue;
                }

                items.push(DesktopElement {
                    id: next_id,
                    name,
                    control_type: control_type_label(ct).to_string(),
                    source: "uia".to_string(),
                    rect: ScreenRect {
                        x: rect.left,
                        y: rect.top,
                        w,
                        h,
                    },
                });
                next_id += 1;
            }
            Ok(items)
        })();
        if com_ok {
            CoUninitialize();
        }

        if let Ok(ref list) = result {
            if let Ok(mut guard) = elements_store().lock() {
                *guard = list.clone();
            }
        }
        result
    }
}

/// Try native UIA InvokePattern by name, otherwise click bounding rect center.
pub fn click_element_by_query(query: &str, double_click: bool) -> Result<String, String> {
    let q_lower = query.trim().to_lowercase();
    let num_id = q_lower.trim_start_matches('#').parse::<usize>().ok();

    let cached = elements_store()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default();

    let list = if cached.is_empty() {
        scan_foreground_uia(60).unwrap_or_default()
    } else {
        cached
    };

    let matched = if let Some(id) = num_id {
        list.iter().find(|e| e.id == id).cloned()
    } else {
        list.iter()
            .find(|e| e.name.to_lowercase() == q_lower)
            .or_else(|| list.iter().find(|e| e.name.to_lowercase().contains(&q_lower)))
            .cloned()
    };

    if let Some(el) = matched {
        let cx = el.rect.x + el.rect.w / 2;
        let cy = el.rect.y + el.rect.h / 2;

        // Try native UIA InvokePattern first for single-click UIA buttons/items
        if !double_click && el.source == "uia" {
            if try_uia_invoke(&el.name).unwrap_or(false) {
                return Ok(format!("Invoked '{}' (#{}) via UIA.", el.name, el.id));
            }
        }

        send_mouse_click_at(cx, cy, "left", double_click)?;
        return Ok(format!(
            "{} '{}' (#{}) at ({}, {}).",
            if double_click { "Opened" } else { "Clicked" },
            el.name,
            el.id,
            cx,
            cy
        ));
    }

    Err(format!("No matching UIA/OCR element found for '{}'.", query))
}

fn try_uia_invoke(target_name: &str) -> Result<bool, String> {
    unsafe {
        let com_ok = CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_ok();
        let ok = (|| -> Result<bool, String> {
            let uia: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_ALL)
                .map_err(|e| e.to_string())?;
            let hwnd = GetForegroundWindow();
            let root = uia.ElementFromHandle(hwnd).map_err(|e| e.to_string())?;
            let cond = uia.CreateTrueCondition().map_err(|e| e.to_string())?;
            let arr = root
                .FindAll(TreeScope_Subtree, &cond)
                .map_err(|e| e.to_string())?;
            let count = arr.Length().unwrap_or(0).min(300);
            for i in 0..count {
                if let Ok(el) = arr.GetElement(i) {
                    let name = el.CurrentName().map(|b| b.to_string()).unwrap_or_default();
                    if name.eq_ignore_ascii_case(target_name) {
                        if let Ok(pat) = el.GetCurrentPattern(UIA_InvokePatternId) {
                            if let Ok(invoke) = pat.cast::<IUIAutomationInvokePattern>() {
                                if invoke.Invoke().is_ok() {
                                    return Ok(true);
                                }
                            }
                        }
                    }
                }
            }
            Ok(false)
        })();
        if com_ok {
            CoUninitialize();
        }
        ok
    }
}

// ============================================================================
// TIER 2B: BROWSER DOM / CDP BRIDGE (PORT 9222)
// ============================================================================

pub async fn query_browser_cdp() -> Result<Vec<CdpTabInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(600))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("http://127.0.0.1:9222/json/list")
        .send()
        .await
        .map_err(|_| "CDP not active on port 9222".to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let mut tabs = Vec::new();
    if let Some(arr) = json.as_array() {
        for item in arr {
            let tab_type = item
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if tab_type == "page" {
                tabs.push(CdpTabInfo {
                    title: item
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    url: item
                        .get("url")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    tab_type,
                });
            }
        }
    }
    Ok(tabs)
}

// ============================================================================
// TIER 3: WINDOWS NATIVE OCR (Windows.Media.Ocr)
// ============================================================================

fn capture_screen_bgra_gdi() -> Result<(Vec<u8>, i32, i32), String> {
    unsafe {
        let (w, h) = get_screen_size();
        let hdc_screen = GetDC(None);
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        let hbm = CreateCompatibleBitmap(hdc_screen, w, h);
        let old = SelectObject(hdc_mem, hbm);

        let blt_ok = BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, 0, 0, SRCCOPY).is_ok();

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: w,
                biHeight: -h, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [Default::default()],
        };

        let mut buf = vec![0u8; (w * h * 4) as usize];
        if blt_ok {
            GetDIBits(
                hdc_mem,
                hbm,
                0,
                h as u32,
                Some(buf.as_mut_ptr() as *mut std::ffi::c_void),
                &mut bmi,
                DIB_RGB_COLORS,
            );
        }

        SelectObject(hdc_mem, old);
        let _ = DeleteObject(hbm);
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(None, hdc_screen);

        if !blt_ok {
            return Err("GDI BitBlt screen capture failed".to_string());
        }
        Ok((buf, w, h))
    }
}

fn capture_screen_bgra_wgc_once() -> Result<(Vec<u8>, i32, i32), String> {
    let (dev, ctx, pool, session, _w, _h) = try_create_wgc_session()?;
    let mut staging: Option<ID3D11Texture2D> = None;
    let deadline = std::time::Instant::now() + std::time::Duration::from_millis(500);
    let mut captured = None;
    while std::time::Instant::now() < deadline {
        if let Ok(frame) = pool.TryGetNextFrame() {
            if let Some((buf, fw, fh)) = read_wgc_frame_bgra(&dev, &ctx, &frame, &mut staging) {
                captured = Some((buf, fw as i32, fh as i32));
                break;
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }
    let _ = session.Close();
    let _ = pool.Close();
    captured.ok_or_else(|| "WGC single-frame timeout".to_string())
}

fn capture_screen_bgra() -> Result<(Vec<u8>, i32, i32), String> {
    if let Ok(wgc) = capture_screen_bgra_wgc_once() {
        return Ok(wgc);
    }
    capture_screen_bgra_gdi()
}

pub fn run_native_ocr_on_screen() -> Result<(String, Vec<DesktopElement>), String> {
    let (bgra, w, h) = capture_screen_bgra()?;

    let engine = OcrEngine::TryCreateFromUserProfileLanguages()
        .map_err(|e| format!("OcrEngine init failed: {}", e))?;

    let writer = DataWriter::new().map_err(|e| e.to_string())?;
    writer.WriteBytes(&bgra).map_err(|e| e.to_string())?;
    let ibuf = writer.DetachBuffer().map_err(|e| e.to_string())?;

    let bitmap = SoftwareBitmap::CreateCopyFromBuffer(
        &ibuf,
        BitmapPixelFormat::Bgra8,
        w,
        h,
    )
    .map_err(|e| format!("SoftwareBitmap failed: {}", e))?;

    let ocr_res = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    let full_text = ocr_res.Text().map(|t| t.to_string()).unwrap_or_default();
    let mut elements = Vec::new();
    let mut next_id = 1usize;

    if let Ok(lines) = ocr_res.Lines() {
        let line_count = lines.Size().unwrap_or(0).min(80);
        for i in 0..line_count {
            if let Ok(line) = lines.GetAt(i) {
                let text = line.Text().map(|t| t.to_string()).unwrap_or_default();
                if text.trim().is_empty() {
                    continue;
                }
                // Compute line bounding rect from words
                let mut min_x = i32::MAX;
                let mut min_y = i32::MAX;
                let mut max_x = 0i32;
                let mut max_y = 0i32;
                if let Ok(words) = line.Words() {
                    let wc = words.Size().unwrap_or(0);
                    for wi in 0..wc {
                        if let Ok(word) = words.GetAt(wi) {
                            if let Ok(r) = word.BoundingRect() {
                                min_x = min_x.min(r.X as i32);
                                min_y = min_y.min(r.Y as i32);
                                max_x = max_x.max((r.X + r.Width) as i32);
                                max_y = max_y.max((r.Y + r.Height) as i32);
                            }
                        }
                    }
                }
                if min_x < max_x && min_y < max_y {
                    elements.push(DesktopElement {
                        id: next_id,
                        name: text.trim().to_string(),
                        control_type: "OCRText".to_string(),
                        source: "ocr".to_string(),
                        rect: ScreenRect {
                            x: min_x,
                            y: min_y,
                            w: max_x - min_x,
                            h: max_y - min_y,
                        },
                    });
                    next_id += 1;
                }
            }
        }
    }

    Ok((full_text, elements))
}

// ============================================================================
// WINDOWS GRAPHICS CAPTURE (WGC) LIVE DESKTOP MIRRORING + GDI FALLBACK
// ============================================================================

fn encode_bgra_downscaled_jpeg(
    bgra: &[u8],
    src_w: u32,
    src_h: u32,
    max_w: u32,
    quality: u8,
) -> Option<(String, u32, u32)> {
    if src_w == 0 || src_h == 0 || bgra.len() < (src_w * src_h * 4) as usize {
        return None;
    }
    let scale = if src_w > max_w {
        max_w as f32 / src_w as f32
    } else {
        1.0
    };
    let dst_w = ((src_w as f32 * scale) as u32).max(1);
    let dst_h = ((src_h as f32 * scale) as u32).max(1);

    let mut rgb = Vec::with_capacity((dst_w * dst_h * 3) as usize);
    for dy in 0..dst_h {
        let sy = ((dy as f32 / scale) as u32).min(src_h - 1);
        let row_off = (sy * src_w * 4) as usize;
        for dx in 0..dst_w {
            let sx = ((dx as f32 / scale) as u32).min(src_w - 1);
            let idx = row_off + (sx * 4) as usize;
            // BGRA -> RGB
            rgb.push(bgra[idx + 2]);
            rgb.push(bgra[idx + 1]);
            rgb.push(bgra[idx]);
        }
    }

    let mut jpeg_bytes = Vec::with_capacity(32 * 1024);
    let encoder = JpegEncoder::new_with_quality(&mut jpeg_bytes, quality);
    if encoder
        .write_image(&rgb, dst_w, dst_h, image::ExtendedColorType::Rgb8)
        .is_ok()
    {
        Some((BASE64.encode(&jpeg_bytes), dst_w, dst_h))
    } else {
        None
    }
}

fn try_create_wgc_session_for_monitor(hmon: HMONITOR) -> Result<
    (
        ID3D11Device,
        ID3D11DeviceContext,
        Direct3D11CaptureFramePool,
        windows::Graphics::Capture::GraphicsCaptureSession,
        i32,
        i32,
    ),
    String,
> {
    unsafe {
        let mut d3d_device: Option<ID3D11Device> = None;
        let mut d3d_ctx: Option<ID3D11DeviceContext> = None;
        D3D11CreateDevice(
            None,
            D3D_DRIVER_TYPE_HARDWARE,
            None,
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            None,
            D3D11_SDK_VERSION,
            Some(&mut d3d_device),
            None,
            Some(&mut d3d_ctx),
        )
        .map_err(|e| format!("D3D11CreateDevice failed: {}", e))?;

        let d3d_device = d3d_device.ok_or("No D3D11 device")?;
        let d3d_ctx = d3d_ctx.ok_or("No D3D11 context")?;
        let dxgi_device: IDXGIDevice = d3d_device.cast().map_err(|e| e.to_string())?;
        let inspectable = CreateDirect3D11DeviceFromDXGIDevice(&dxgi_device)
            .map_err(|e| format!("CreateDirect3D11DeviceFromDXGIDevice failed: {}", e))?;
        let winrt_device: IDirect3DDevice = inspectable.cast().map_err(|e| e.to_string())?;

        let interop = windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>()
            .map_err(|e| format!("IGraphicsCaptureItemInterop failed: {}", e))?;
        let item: GraphicsCaptureItem = interop
            .CreateForMonitor(hmon)
            .map_err(|e| format!("CreateForMonitor failed: {}", e))?;

        let size = item.Size().map_err(|e| e.to_string())?;
        let pool = Direct3D11CaptureFramePool::CreateFreeThreaded(
            &winrt_device,
            DirectXPixelFormat::B8G8R8A8UIntNormalized,
            2,
            size,
        )
        .map_err(|e| format!("CreateFreeThreaded failed: {}", e))?;

        let session = pool
            .CreateCaptureSession(&item)
            .map_err(|e| format!("CreateCaptureSession failed: {}", e))?;
        let _ = session.SetIsBorderRequired(false);
        session
            .StartCapture()
            .map_err(|e| format!("StartCapture failed: {}", e))?;

        Ok((d3d_device, d3d_ctx, pool, session, size.Width, size.Height))
    }
}

fn try_create_wgc_session() -> Result<
    (
        ID3D11Device,
        ID3D11DeviceContext,
        Direct3D11CaptureFramePool,
        windows::Graphics::Capture::GraphicsCaptureSession,
        i32,
        i32,
    ),
    String,
> {
    let (hmon, _) = get_selected_monitor();
    try_create_wgc_session_for_monitor(hmon)
}

fn read_wgc_frame_bgra(
    d3d_device: &ID3D11Device,
    d3d_ctx: &ID3D11DeviceContext,
    frame: &windows::Graphics::Capture::Direct3D11CaptureFrame,
    staging: &mut Option<ID3D11Texture2D>,
) -> Option<(Vec<u8>, u32, u32)> {
    unsafe {
        let surface = frame.Surface().ok()?;
        let access: IDirect3DDxgiInterfaceAccess = surface.cast().ok()?;
        let tex: ID3D11Texture2D = access.GetInterface().ok()?;
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        tex.GetDesc(&mut desc);

        let needs_new = match staging {
            Some(s) => {
                let mut sdesc = D3D11_TEXTURE2D_DESC::default();
                s.GetDesc(&mut sdesc);
                sdesc.Width != desc.Width || sdesc.Height != desc.Height
            }
            None => true,
        };
        if needs_new {
            let mut st_desc = desc;
            st_desc.Usage = D3D11_USAGE_STAGING;
            st_desc.BindFlags = 0;
            st_desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ.0 as u32;
            st_desc.MiscFlags = 0;
            let mut new_st: Option<ID3D11Texture2D> = None;
            d3d_device
                .CreateTexture2D(&st_desc, None, Some(&mut new_st))
                .ok()?;
            *staging = new_st;
        }

        let st = staging.as_ref()?;
        d3d_ctx.CopyResource(st, &tex);

        let mut mapped = Default::default();
        d3d_ctx
            .Map(st, 0, D3D11_MAP_READ, 0, Some(&mut mapped))
            .ok()?;

        let w = desc.Width;
        let h = desc.Height;
        let row_bytes = (w * 4) as usize;
        let src_ptr = mapped.pData as *const u8;
        if src_ptr.is_null() {
            d3d_ctx.Unmap(st, 0);
            return None;
        }
        let mut out = vec![0u8; row_bytes * h as usize];
        let pitch = mapped.RowPitch as usize;

        for y in 0..h as usize {
            std::ptr::copy_nonoverlapping(
                src_ptr.add(y * pitch),
                out.as_mut_ptr().add(y * row_bytes),
                row_bytes,
            );
        }
        d3d_ctx.Unmap(st, 0);
        Some((out, w, h))
    }
}

pub fn start_mirror_loop(app: AppHandle) {
    if MIRROR_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    apply_capture_exclusion(&app);
    start_event_driven_monitor(app.clone());

    std::thread::spawn(move || {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let mut active_mon_idx = SELECTED_MONITOR_INDEX.load(Ordering::Relaxed);
        let (init_hmon, mut mon_info) = get_selected_monitor();
        let mut wgc_setup = try_create_wgc_session_for_monitor(init_hmon);
        let mut staging: Option<ID3D11Texture2D> = None;
        let target_interval = std::time::Duration::from_millis(45); // ~22 FPS smooth, low CPU

        while MIRROR_RUNNING.load(Ordering::Relaxed) {
            let t0 = std::time::Instant::now();
            let wanted_idx = SELECTED_MONITOR_INDEX.load(Ordering::Relaxed);
            if wanted_idx != active_mon_idx {
                if let Ok((_, _, old_pool, old_session, _, _)) = wgc_setup {
                    let _ = old_session.Close();
                    let _ = old_pool.Close();
                }
                active_mon_idx = wanted_idx;
                let (new_hmon, new_info) = get_selected_monitor();
                mon_info = new_info;
                staging = None;
                wgc_setup = try_create_wgc_session_for_monitor(new_hmon);
            }

            let frame_opt = if let Ok((_, _, ref pool, _, _, _)) = wgc_setup {
                // Drain pool to keep only the latest frame (drop-old-frame queue)
                let mut latest = None;
                while let Ok(f) = pool.TryGetNextFrame() {
                    latest = Some(f);
                }
                if let (Some(f), Ok((dev, ctx, _, _, _, _))) = (latest, &wgc_setup) {
                    read_wgc_frame_bgra(dev, ctx, &f, &mut staging)
                        .map(|(buf, w, h)| (buf, w, h, "wgc"))
                } else {
                    None
                }
            } else {
                capture_screen_bgra_gdi()
                    .ok()
                    .map(|(buf, w, h)| (buf, w as u32, h as u32, "gdi"))
            };

            if let Some((bgra, w, h, mode)) = frame_opt {
                if let Some((jpeg_b64, enc_w, enc_h)) =
                    encode_bgra_downscaled_jpeg(&bgra, w, h, 960, 68)
                {
                    if let Ok(mut guard) = frame_store().lock() {
                        *guard = Some(jpeg_b64.clone());
                    }
                    let _ = app.emit(
                        "desktop-frame",
                        DesktopFramePayload {
                            jpeg_b64,
                            width: enc_w,
                            height: enc_h,
                            origin_x: mon_info.x,
                            origin_y: mon_info.y,
                            screen_w: mon_info.w,
                            screen_h: mon_info.h,
                            monitor_index: mon_info.index,
                            capture_mode: mode.to_string(),
                        },
                    );
                }
            }

            let elapsed = t0.elapsed();
            if elapsed < target_interval {
                std::thread::sleep(target_interval - elapsed);
            }
        }

        if let Ok((_, _, pool, session, _, _)) = wgc_setup {
            let _ = session.Close();
            let _ = pool.Close();
        }
        unsafe {
            CoUninitialize();
        }
    });
}

pub fn stop_mirror_loop() {
    MIRROR_RUNNING.store(false, Ordering::SeqCst);
}

// ============================================================================
// TAURI COMMANDS EXPOSED TO FRONTEND
// ============================================================================

#[tauri::command]
pub fn desktop_init_powershell() -> PowerShellInitInfo {
    let cwd = ps_cwd_store()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_else(|_| "C:\\".to_string());
    PowerShellInitInfo {
        banner: "Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.".to_string(),
        cwd,
        elevated: check_is_elevated(),
    }
}

#[tauri::command]
pub fn desktop_run_powershell(script: String) -> Result<PowerShellResult, String> {
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let current_cwd = ps_cwd_store()
        .lock()
        .map(|g| g.clone())
        .unwrap_or_else(|_| "C:\\".to_string());

    let trimmed_cmd = script.trim();
    if trimmed_cmd.eq_ignore_ascii_case("cls")
        || trimmed_cmd.eq_ignore_ascii_case("clear")
        || trimmed_cmd.eq_ignore_ascii_case("clear-host")
    {
        return Ok(PowerShellResult {
            ok: true,
            stdout: "__JARVIS_CLS__".to_string(),
            stderr: String::new(),
            exit_code: 0,
            elevated: check_is_elevated(),
            cwd: current_cwd,
        });
    }

    let wrapped = format!(
        "$ProgressPreference = 'SilentlyContinue'; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;\n{}\nWrite-Output \"__JARVIS_CWD__=$((Get-Location).Path)\"",
        script
    );

    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &wrapped,
    ])
    .creation_flags(CREATE_NO_WINDOW);

    if std::path::Path::new(&current_cwd).exists() {
        cmd.current_dir(&current_cwd);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to spawn PowerShell: {}", e))?;

    let raw_stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut new_cwd = current_cwd.clone();
    let mut kept_lines = Vec::new();
    for line in raw_stdout.lines() {
        if let Some(rest) = line.strip_prefix("__JARVIS_CWD__=") {
            let trimmed = rest.trim();
            if !trimmed.is_empty() {
                new_cwd = trimmed.to_string();
            }
        } else {
            kept_lines.push(line);
        }
    }
    if let Ok(mut guard) = ps_cwd_store().lock() {
        *guard = new_cwd.clone();
    }

    let stdout = kept_lines.join("\n").trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);
    Ok(PowerShellResult {
        ok: output.status.success(),
        stdout,
        stderr,
        exit_code,
        elevated: check_is_elevated(),
        cwd: new_cwd,
    })
}

#[tauri::command]
pub fn desktop_list_monitors() -> Vec<MonitorInfo> {
    enumerate_monitors().into_iter().map(|(_, m)| m).collect()
}

#[tauri::command]
pub fn desktop_set_monitor(index: usize) -> MonitorInfo {
    let list = enumerate_monitors();
    let clamped = index.min(list.len().saturating_sub(1));
    SELECTED_MONITOR_INDEX.store(clamped, Ordering::Relaxed);
    list[clamped].1.clone()
}

#[tauri::command]
pub fn start_desktop_mirror(app: AppHandle) -> Result<ActiveWindowInfo, String> {
    start_mirror_loop(app);
    Ok(get_active_window_details())
}

#[tauri::command]
pub fn stop_desktop_mirror() -> Result<(), String> {
    stop_mirror_loop();
    Ok(())
}

#[tauri::command]
pub fn desktop_get_active_window() -> ActiveWindowInfo {
    get_active_window_details()
}

#[tauri::command]
pub fn desktop_scan_elements() -> Result<Vec<DesktopElement>, String> {
    scan_foreground_uia(60)
}

#[tauri::command]
pub fn desktop_click_at(x: i32, y: i32, button: Option<String>, double_click: Option<bool>) -> Result<(), String> {
    send_mouse_click_at(
        x,
        y,
        button.as_deref().unwrap_or("left"),
        double_click.unwrap_or(false),
    )
}

#[tauri::command]
pub fn desktop_scroll_at(x: i32, y: i32, delta: i32) -> Result<(), String> {
    send_mouse_scroll_at(x, y, delta)
}

#[tauri::command]
pub fn desktop_type_text(text: String) -> Result<(), String> {
    send_unicode_text(&text)
}

#[tauri::command]
pub fn desktop_navigate_target(target: String) -> Result<String, String> {
    let lower = target.trim().to_lowercase();
    if lower.contains("desktop") {
        let path = get_known_folder_path("desktop")?;
        shell_open(&path)?;
        return Ok(format!("Opened Desktop ({})", path));
    }
    if lower.contains("downloads") || lower.contains("download") {
        let path = get_known_folder_path("downloads")?;
        shell_open(&path)?;
        return Ok(format!("Opened Downloads ({})", path));
    }
    if lower.contains("documents") || lower.contains("document") {
        let path = get_known_folder_path("documents")?;
        shell_open(&path)?;
        return Ok(format!("Opened Documents ({})", path));
    }
    if lower.contains("browser") || lower.contains("chrome") || lower.contains("edge") {
        // Prefer msedge or default https://
        if shell_open("msedge.exe").is_err() {
            shell_open("https://www.google.com")?;
        }
        return Ok("Launched browser.".to_string());
    }
    shell_open(&target)?;
    Ok(format!("Opened {}", target))
}

#[tauri::command]
pub async fn desktop_smart_command(
    command: String,
    cursor_x: Option<i32>,
    cursor_y: Option<i32>,
) -> Result<SmartCommandResult, String> {
    let cmd = command.trim().to_string();
    let lower = cmd.to_lowercase();

    // TIER 1: Direct Admin PowerShell Execution
    if lower.starts_with("run powershell ")
        || lower.starts_with("powershell ")
        || lower.starts_with("ps ")
    {
        let script = if lower.starts_with("run powershell ") {
            cmd[15..].trim()
        } else if lower.starts_with("powershell ") {
            cmd[11..].trim()
        } else {
            cmd[3..].trim()
        };
        let res = desktop_run_powershell(script.to_string())?;
        let msg = if res.ok {
            if res.stdout.is_empty() {
                "PowerShell command executed successfully.".to_string()
            } else {
                res.stdout.chars().take(400).collect()
            }
        } else {
            format!("PowerShell error (exit {}): {}", res.exit_code, res.stderr)
        };
        return Ok(SmartCommandResult {
            handled: res.ok,
            tier: if res.elevated {
                "Tier 1 (Admin PowerShell)".to_string()
            } else {
                "Tier 1 (PowerShell)".to_string()
            },
            message: msg,
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: res.stdout,
            frame_b64: None,
        });
    }

    // TIER 1: Direct Win32 / Shell Navigation
    if lower.contains("go to desktop") || lower == "desktop" || lower == "open desktop" {
        let msg = desktop_navigate_target("desktop".to_string())?;
        return Ok(SmartCommandResult {
            handled: true,
            tier: "Tier 1 (Win32 Shell)".to_string(),
            message: msg,
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    if lower.contains("go to downloads") || lower.contains("open downloads") || lower == "downloads" {
        let msg = desktop_navigate_target("downloads".to_string())?;
        return Ok(SmartCommandResult {
            handled: true,
            tier: "Tier 1 (Win32 Shell)".to_string(),
            message: msg,
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    if lower.contains("go to documents") || lower.contains("open documents") {
        let msg = desktop_navigate_target("documents".to_string())?;
        return Ok(SmartCommandResult {
            handled: true,
            tier: "Tier 1 (Win32 Shell)".to_string(),
            message: msg,
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    if lower.contains("open browser") || lower.contains("launch browser") {
        let msg = desktop_navigate_target("browser".to_string())?;
        return Ok(SmartCommandResult {
            handled: true,
            tier: "Tier 1 (Win32 Shell)".to_string(),
            message: msg,
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    // Tier 1: Window Management ("Switch window", "Maximize this window", "Close this application")
    if lower.contains("switch window") || lower.contains("next window") {
        let windows_list = crate::win32_apps::get_taskbar_windows();
        let active = get_active_window_details();
        let next_win = windows_list
            .iter()
            .find(|(_, title)| !title.eq_ignore_ascii_case(&active.title) && !title.eq_ignore_ascii_case("JARVIS"));
        if let Some((_, target_title)) = next_win {
            let ok = crate::win32_apps::focus_window(target_title);
            return Ok(SmartCommandResult {
                handled: ok,
                tier: "Tier 1 (Win32 Window)".to_string(),
                message: if ok {
                    format!("Switched focus to '{}'.", target_title)
                } else {
                    format!("Could not focus '{}' (window may be elevated).", target_title)
                },
                elements: Vec::new(),
                needs_ai_vision: false,
                screen_summary: String::new(),
                frame_b64: None,
            });
        }
        return Ok(SmartCommandResult {
            handled: false,
            tier: "Tier 1 (Win32 Window)".to_string(),
            message: "No other open windows found to switch to.".to_string(),
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    if lower.contains("maximize this window") || lower == "maximize window" || lower == "maximize" {
        let mut info = get_active_window_details();
        if info.title.eq_ignore_ascii_case("JARVIS") || info.hwnd == 0 {
            let _ = crate::win32_system_agent::restore_external_focus(None);
            std::thread::sleep(std::time::Duration::from_millis(80));
            info = get_active_window_details();
        }
        if info.hwnd != 0 && !info.title.eq_ignore_ascii_case("JARVIS") {
            let hwnd = HWND(info.hwnd as _);
            unsafe {
                let _ = ShowWindow(hwnd, SW_MAXIMIZE);
            }
            let verified = unsafe { IsZoomed(hwnd).as_bool() };
            return Ok(SmartCommandResult {
                handled: true,
                tier: "Tier 1 (Win32 Window)".to_string(),
                message: if verified {
                    format!("Maximized '{}'.", info.title)
                } else {
                    format!("Sent maximize to '{}'.", info.title)
                },
                elements: Vec::new(),
                needs_ai_vision: false,
                screen_summary: String::new(),
                frame_b64: None,
            });
        }
        return Ok(SmartCommandResult {
            handled: false,
            tier: "Tier 1 (Win32 Window)".to_string(),
            message: "No external window active to maximize.".to_string(),
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    if lower.contains("close this application") || lower.contains("close this window") || lower == "close app" {
        let mut info = get_active_window_details();
        if info.title.eq_ignore_ascii_case("JARVIS") || info.hwnd == 0 {
            let _ = crate::win32_system_agent::restore_external_focus(None);
            std::thread::sleep(std::time::Duration::from_millis(80));
            info = get_active_window_details();
        }
        if info.hwnd != 0 && !info.title.eq_ignore_ascii_case("JARVIS") {
            let hwnd = HWND(info.hwnd as _);
            let posted = unsafe { PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0)).is_ok() };
            return Ok(SmartCommandResult {
                handled: posted,
                tier: "Tier 1 (Win32 Window)".to_string(),
                message: if posted {
                    format!("Closed '{}'.", info.title)
                } else {
                    format!("Failed to close '{}' (may require elevation).", info.title)
                },
                elements: Vec::new(),
                needs_ai_vision: false,
                screen_summary: String::new(),
                frame_b64: None,
            });
        }
        return Ok(SmartCommandResult {
            handled: false,
            tier: "Tier 1 (Win32 Window)".to_string(),
            message: "No external application active to close.".to_string(),
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    // "Click that" with HOLISTIC cursor coordinates
    if (lower == "click that" || lower == "click here" || lower == "tap that")
        && cursor_x.is_some()
        && cursor_y.is_some()
    {
        let x = cursor_x.unwrap();
        let y = cursor_y.unwrap();
        send_mouse_click_at(x, y, "left", false)?;
        return Ok(SmartCommandResult {
            handled: true,
            tier: "Tier 1 (Win32 Cursor)".to_string(),
            message: format!("Clicked at screen ({}, {}).", x, y),
            elements: Vec::new(),
            needs_ai_vision: false,
            screen_summary: String::new(),
            frame_b64: None,
        });
    }

    // TIER 2: UIA Element Scan + CDP Check for "read my screen"
    if lower.contains("read my screen") || lower.contains("what is on my screen") || lower.contains("read screen") {
        let win = get_active_window_details();
        let uia_els = scan_foreground_uia(50).unwrap_or_default();
        let cdp_tabs = query_browser_cdp().await.unwrap_or_default();

        if !uia_els.is_empty() || !cdp_tabs.is_empty() {
            let mut summary_parts = Vec::new();
            if !win.title.is_empty() {
                summary_parts.push(format!("Active Window: {}", win.title));
            }
            if !cdp_tabs.is_empty() {
                let tab_titles: Vec<String> = cdp_tabs
                    .iter()
                    .take(3)
                    .map(|t| format!("{} ({})", t.title, t.url))
                    .collect();
                summary_parts.push(format!("Browser Tabs: {}", tab_titles.join("; ")));
            }
            if !uia_els.is_empty() {
                let names: Vec<String> = uia_els
                    .iter()
                    .take(12)
                    .map(|e| format!("[#{}] {}", e.id, e.name))
                    .collect();
                summary_parts.push(format!("Visible Elements: {}", names.join(", ")));
            }
            return Ok(SmartCommandResult {
                handled: true,
                tier: if !cdp_tabs.is_empty() {
                    "Tier 2 (UIA + CDP)".to_string()
                } else {
                    "Tier 2 (Windows UIA)".to_string()
                },
                message: summary_parts.join(" | "),
                elements: uia_els,
                needs_ai_vision: false,
                screen_summary: summary_parts.join("\n"),
                frame_b64: None,
            });
        }

        // TIER 3: Fallback to Windows Native OCR
        if let Ok((ocr_text, ocr_els)) = run_native_ocr_on_screen() {
            if !ocr_text.trim().is_empty() {
                let snippet: String = ocr_text.chars().take(360).collect();
                if let Ok(mut guard) = elements_store().lock() {
                    *guard = ocr_els.clone();
                }
                return Ok(SmartCommandResult {
                    handled: true,
                    tier: "Tier 3 (Windows OCR)".to_string(),
                    message: format!("Screen text (OCR): {}", snippet),
                    elements: ocr_els,
                    needs_ai_vision: false,
                    screen_summary: ocr_text,
                    frame_b64: None,
                });
            }
        }

        // TIER 4: Escalate to AI Vision
        let frame_b64 = frame_store().lock().ok().and_then(|g| g.clone());
        return Ok(SmartCommandResult {
            handled: false,
            tier: "Tier 4 (AI Vision Escalation)".to_string(),
            message: "Escalating to AI Vision for complex visual analysis.".to_string(),
            elements: Vec::new(),
            needs_ai_vision: true,
            screen_summary: String::new(),
            frame_b64,
        });
    }

    // "Click <target>" or "Open that file" / "Open <file>"
    let is_open_file = lower.starts_with("open that file")
        || lower.starts_with("open file ")
        || lower.starts_with("open ");
    let is_click = lower.starts_with("click ");

    if is_click || is_open_file {
        let target = if is_click {
            cmd[6..].trim().to_string()
        } else if lower.starts_with("open that file") {
            if let (Some(x), Some(y)) = (cursor_x, cursor_y) {
                send_mouse_click_at(x, y, "left", true)?;
                return Ok(SmartCommandResult {
                    handled: true,
                    tier: "Tier 1 (Win32 Double-Click)".to_string(),
                    message: format!("Opened item at ({}, {}).", x, y),
                    elements: Vec::new(),
                    needs_ai_vision: false,
                    screen_summary: String::new(),
                    frame_b64: None,
                });
            }
            "1".to_string()
        } else if lower.starts_with("open file ") {
            cmd[10..].trim().to_string()
        } else {
            cmd[5..].trim().to_string()
        };

        // Try Tier 2 UIA first
        let _ = scan_foreground_uia(60);
        if let Ok(msg) = click_element_by_query(&target, is_open_file) {
            return Ok(SmartCommandResult {
                handled: true,
                tier: "Tier 2 (Windows UIA)".to_string(),
                message: msg,
                elements: elements_store().lock().map(|g| g.clone()).unwrap_or_default(),
                needs_ai_vision: false,
                screen_summary: String::new(),
                frame_b64: None,
            });
        }

        // Try Tier 3 OCR fallback
        if let Ok((_, ocr_els)) = run_native_ocr_on_screen() {
            if let Ok(mut guard) = elements_store().lock() {
                *guard = ocr_els;
            }
            if let Ok(msg) = click_element_by_query(&target, is_open_file) {
                return Ok(SmartCommandResult {
                    handled: true,
                    tier: "Tier 3 (Windows OCR)".to_string(),
                    message: msg,
                    elements: elements_store().lock().map(|g| g.clone()).unwrap_or_default(),
                    needs_ai_vision: false,
                    screen_summary: String::new(),
                    frame_b64: None,
                });
            }
        }

        // Tier 4: Escalate to AI Vision
        let frame_b64 = frame_store().lock().ok().and_then(|g| g.clone());
        return Ok(SmartCommandResult {
            handled: false,
            tier: "Tier 4 (AI Vision Escalation)".to_string(),
            message: format!("Could not find '{}' via UIA/OCR; escalating to AI Vision.", target),
            elements: Vec::new(),
            needs_ai_vision: true,
            screen_summary: String::new(),
            frame_b64,
        });
    }

    // Default: return current context without AI Vision
    let win = get_active_window_details();
    Ok(SmartCommandResult {
        handled: false,
        tier: "Tier 2 (Context)".to_string(),
        message: format!("Active window: {}", win.title),
        elements: Vec::new(),
        needs_ai_vision: false,
        screen_summary: win.title,
        frame_b64: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_folders_resolution() {
        for name in ["desktop", "downloads", "documents"] {
            let path = get_known_folder_path(name).expect("Failed to resolve known folder");
            assert!(!path.is_empty(), "Empty path for {}", name);
            assert!(std::path::Path::new(&path).exists(), "Path does not exist: {}", path);
        }
    }

    #[test]
    fn test_active_window_details() {
        let info = get_active_window_details();
        assert!(info.screen_w > 0 && info.screen_h > 0, "Invalid screen size: {:?}", info);
    }

    #[test]
    fn test_capture_and_jpeg_encode() {
        let (bgra, w, h) = capture_screen_bgra().expect("Screen capture failed");
        assert!(w > 0 && h > 0);
        let (b64, ew, eh) = encode_bgra_downscaled_jpeg(&bgra, w as u32, h as u32, 640, 65)
            .expect("JPEG encode failed");
        assert!(!b64.is_empty() && ew > 0 && eh > 0);
    }

    #[test]
    fn test_uia_scan_foreground() {
        let res = scan_foreground_uia(30);
        assert!(res.is_ok(), "UIA scan failed: {:?}", res);
    }

    #[test]
    fn test_native_ocr_on_screen() {
        let res = run_native_ocr_on_screen();
        assert!(res.is_ok(), "Windows Native OCR failed: {:?}", res);
    }

    #[test]
    fn test_wgc_session_init() {
        let res = try_create_wgc_session();
        assert!(res.is_ok(), "WGC session init failed: {:?}", res);
        if let Ok((_, _, pool, session, w, h)) = res {
            assert!(w > 0 && h > 0);
            let _ = session.Close();
            let _ = pool.Close();
        }
    }

    #[test]
    fn test_multi_monitor_enumeration() {
        let mons = enumerate_monitors();
        assert!(!mons.is_empty(), "Expected at least 1 monitor");
        assert!(mons[0].1.w > 0 && mons[0].1.h > 0);
    }

    #[test]
    fn test_powershell_execution() {
        let res = desktop_run_powershell("Write-Output 'JARVIS_PS_OK'".to_string())
            .expect("PowerShell execution failed");
        assert!(res.ok, "PowerShell exited with {}: {}", res.exit_code, res.stderr);
        assert!(res.stdout.contains("JARVIS_PS_OK"), "Unexpected stdout: {}", res.stdout);

        let cls_res = desktop_run_powershell("cls".to_string()).expect("cls failed");
        assert!(cls_res.ok);
        assert_eq!(cls_res.stdout, "__JARVIS_CLS__");
    }

    #[tokio::test]
    async fn test_smart_command_read_screen() {
        let res = desktop_smart_command("read my screen".to_string(), None, None)
            .await
            .expect("desktop_smart_command failed");
        assert!(
            res.handled || res.needs_ai_vision,
            "Unexpected smart command result: {:?}",
            res
        );
    }
}
