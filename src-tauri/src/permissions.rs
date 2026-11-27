use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tokio::sync::oneshot;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskLevel {
    Safe,
    Moderate,
    High,
    Blocked,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyDecision {
    Allow,
    Prompt,
    Deny,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PermissionPolicyEntry {
    pub action: String,
    pub risk: RiskLevel,
    pub decision: PolicyDecision,
    pub reason: String,
}

struct PermissionManagerState {
    policies: HashMap<String, PolicyDecision>,
    pending: HashMap<String, (String, oneshot::Sender<bool>)>,
}

static PERMISSION_STATE: OnceLock<Mutex<PermissionManagerState>> = OnceLock::new();

fn policy_file_path() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let mut path = PathBuf::from(appdata);
    path.push("Jarvis");
    let _ = fs::create_dir_all(&path);
    path.push("permissions.json");
    path
}

fn load_policies_from_disk() -> HashMap<String, PolicyDecision> {
    let path = policy_file_path();
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(map) = serde_json::from_str::<HashMap<String, PolicyDecision>>(&raw) {
            return map;
        }
    }
    HashMap::new()
}

fn save_policies_to_disk(policies: &HashMap<String, PolicyDecision>) {
    let path = policy_file_path();
    if let Ok(json) = serde_json::to_string_pretty(policies) {
        let _ = fs::write(path, json);
    }
}

fn get_state() -> &'static Mutex<PermissionManagerState> {
    PERMISSION_STATE.get_or_init(|| {
        Mutex::new(PermissionManagerState {
            policies: load_policies_from_disk(),
            pending: HashMap::new(),
        })
    })
}

pub fn normalize_action(action: &str) -> String {
    match action.trim().to_lowercase().as_str() {
        "open" | "launch" | "launch_app" | "start" => "open_app".to_string(),
        "close" | "kill" | "kill_app" | "kill_process" | "terminate" | "stop" => "close_app".to_string(),
        "run" | "shell" | "powershell" | "exec" => "run_cmd".to_string(),
        "cmd" => "cmd".to_string(),
        "mkdir" => "create_folder".to_string(),
        "rmdir" => "delete_folder".to_string(),
        "write_file" => "create_file".to_string(),
        "append_file" => "modify_file".to_string(),
        "rename_file" | "move_folder" => "move_file".to_string(),
        "copy_folder" => "copy_file".to_string(),
        "list_files" | "ls" | "dir" => "list_dir".to_string(),
        other => other.to_string(),
    }
}

pub fn classify_action(action: &str, target: &str) -> (RiskLevel, &'static str) {
    let norm = normalize_action(action);
    let t_lower = target.to_lowercase();

    // Hard-blocked destructive OS patterns
    let dangerous_patterns = [
        "format ",
        "rm -rf /",
        "del /s /q c:\\",
        "rd /s /q c:\\",
        "cipher /w",
        "bcdedit",
        "diskpart",
        "reg delete hklm",
    ];
    if (norm == "run_cmd" || norm == "cmd" || norm == "run_as_admin")
        && dangerous_patterns.iter().any(|p| t_lower.contains(p))
    {
        return (
            RiskLevel::Blocked,
            "Destructive system command blocked by JARVIS Safety Policy.",
        );
    }

    match norm.as_str() {
        "run_cmd" | "cmd" | "run_as_admin" | "elevated_cmd" | "self_heal_code" => (
            RiskLevel::High,
            "Executes arbitrary system or shell commands.",
        ),
        "close_app" => (
            RiskLevel::High,
            "Terminates a running application process.",
        ),
        "delete_file" | "delete_folder" => (
            RiskLevel::High,
            "Deletes a file or folder from disk.",
        ),
        "start_service" | "stop_service" | "restart_service" | "registry_write" | "env_set" => (
            RiskLevel::High,
            "Modifies Windows services, registry, or environment.",
        ),
        "memory_clear" => (
            RiskLevel::High,
            "Permanently clears stored long-term memories.",
        ),
        "lock_pc" | "sleep_pc" | "sleep" | "hibernate" | "shutdown" | "shutdown_pc" | "restart" | "restart_pc" | "logoff" => (
            RiskLevel::High,
            "Changes workstation power or lock state.",
        ),
        "airdrop_file" => (
            RiskLevel::High,
            "Transfers a local file to a paired mobile device.",
        ),
        "dial_phone_call" => (
            RiskLevel::High,
            "Initiates an outbound phone call via ADB.",
        ),
        "set_auto_startup" => (
            RiskLevel::High,
            "Modifies Windows startup registry configuration.",
        ),
        "browser_click" | "browser_type" => (
            RiskLevel::High,
            "Interacts with live web page DOM elements.",
        ),
        "open_app" | "close_tab" | "paste_clipboard" | "open_file" | "create_file" | "modify_file"
        | "move_file" | "copy_file" | "create_folder" => (
            RiskLevel::Moderate,
            "Standard desktop, file, or tab manipulation.",
        ),
        _ => (RiskLevel::Safe, "Read-only or low-risk control."),
    }
}

fn default_decision(risk: RiskLevel) -> PolicyDecision {
    match risk {
        RiskLevel::Blocked => PolicyDecision::Deny,
        // Full administrator autonomy: all non-blocked actions are allowed without approval prompts
        RiskLevel::High | RiskLevel::Moderate | RiskLevel::Safe => PolicyDecision::Allow,
    }
}

pub fn check_sync_policy(action: &str, target: &str) -> Result<(), String> {
    let (risk, reason) = classify_action(action, target);
    if risk == RiskLevel::Blocked {
        return Err(format!("BLOCKED: {}", reason));
    }

    let norm = normalize_action(action);
    let decision = {
        let guard = get_state().lock().map_err(|_| "Permission lock poisoned")?;
        guard
            .policies
            .get(&norm)
            .copied()
            .unwrap_or_else(|| default_decision(risk))
    };

    match decision {
        PolicyDecision::Allow | PolicyDecision::Prompt => Ok(()),
        PolicyDecision::Deny => Err(format!("DENIED by Permission Manager: {} ({})", norm, reason)),
    }
}

pub async fn authorize_action(
    _app: &tauri::AppHandle,
    action: &str,
    target: &str,
) -> Result<(), String> {
    let (risk, reason) = classify_action(action, target);
    if risk == RiskLevel::Blocked {
        return Err(format!("BLOCKED: {}", reason));
    }

    let norm = normalize_action(action);
    let decision = {
        let guard = get_state().lock().map_err(|_| "Permission lock poisoned")?;
        guard
            .policies
            .get(&norm)
            .copied()
            .unwrap_or_else(|| default_decision(risk))
    };

    match decision {
        PolicyDecision::Allow | PolicyDecision::Prompt => Ok(()),
        PolicyDecision::Deny => Err(format!("DENIED by Permission Manager: {} ({})", norm, reason)),
    }
}

#[tauri::command]
pub fn get_permission_policies() -> Result<Vec<PermissionPolicyEntry>, String> {
    let tracked = [
        "run_cmd",
        "close_app",
        "memory_clear",
        "lock_pc",
        "airdrop_file",
        "dial_phone_call",
        "set_auto_startup",
        "browser_click",
        "browser_type",
        "open_app",
        "close_tab",
    ];
    let guard = get_state().lock().map_err(|_| "Permission lock poisoned")?;
    let mut entries = Vec::new();
    for act in tracked {
        let (risk, reason) = classify_action(act, "");
        let decision = guard
            .policies
            .get(act)
            .copied()
            .unwrap_or_else(|| default_decision(risk));
        entries.push(PermissionPolicyEntry {
            action: act.to_string(),
            risk,
            decision,
            reason: reason.to_string(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn set_permission_policy(action: String, decision: String) -> Result<bool, String> {
    let norm = normalize_action(&action);
    let parsed = match decision.trim().to_lowercase().as_str() {
        "allow" => PolicyDecision::Allow,
        "prompt" => PolicyDecision::Prompt,
        "deny" => PolicyDecision::Deny,
        _ => return Err("Invalid decision. Use Allow, Prompt, or Deny.".to_string()),
    };

    let mut guard = get_state().lock().map_err(|_| "Permission lock poisoned")?;
    guard.policies.insert(norm, parsed);
    save_policies_to_disk(&guard.policies);
    Ok(true)
}

#[tauri::command]
pub fn resolve_permission_request(
    request_id: String,
    approved: bool,
    remember: bool,
) -> Result<bool, String> {
    let mut guard = get_state().lock().map_err(|_| "Permission lock poisoned")?;
    if let Some((action_name, tx)) = guard.pending.remove(&request_id) {
        if remember {
            let decision = if approved {
                PolicyDecision::Allow
            } else {
                PolicyDecision::Deny
            };
            guard.policies.insert(action_name, decision);
            save_policies_to_disk(&guard.policies);
        }
        let _ = tx.send(approved);
        Ok(true)
    } else {
        Ok(false)
    }
}
