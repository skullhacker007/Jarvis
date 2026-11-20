// Prevents additional console window on Windows, DO NOT REMOVE!!
#![windows_subsystem = "windows"]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let _ = std::fs::write("C:\\Users\\Chowdary\\Desktop\\Project\\Jarvis\\crash.log", format!("{:#?}", info));
    }));
    jarvis_lib::run()
}
