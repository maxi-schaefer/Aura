#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod scanner;
mod setup;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent, 
            Some(vec!["--minimized"])
        ))
        .invoke_handler(tauri::generate_handler![
            commands::get_installed_apps, 
            commands::launch_app, 
            commands::search_web,
            commands::get_aliases,
            commands::save_aliases
        ])
        .setup(|app| {
            setup::init(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}