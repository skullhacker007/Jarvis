// Prevents additional console window on Windows, DO NOT REMOVE!!
#![windows_subsystem = "windows"]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let log_msg = format!("{:#?}", info);
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let _ = std::fs::write(parent.join("crash.log"), &log_msg);
            }
        }
        let _ = std::fs::write("crash.log", &log_msg);
    }));
    jarvis_lib::run()
}
