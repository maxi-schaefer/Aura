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
            commands::network::scan_neighborhood,
            commands::media::get_now_playing,
            commands::media::media_command,
            commands::system::search_files,
            commands::system::search_web,
            commands::system::get_installed_apps,
            commands::system::launch_app,
            commands::system::get_aliases,
            commands::system::save_aliases,
            commands::system::get_config,
            commands::system::save_config,
            commands::system::install_package,
            commands::system::search_winget,
            commands::system::get_installed_winget,
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