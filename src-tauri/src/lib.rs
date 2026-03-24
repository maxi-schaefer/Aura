// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::env;
use std::path::Path;

use serde::Serialize;
use tauri::{Emitter, Manager, WindowEvent, command, menu::{Menu, MenuItem}, tray::TrayIconBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_acrylic;

#[derive(Serialize, Clone)]
pub struct AppItem {
    name: String,
    path: String,
}

#[command]
fn search_web(query: String) {
    let destination = if (query.contains('.') && !query.contains(' ')) || query.starts_with("http") {
        if query.starts_with("http") { query } else { format!("https://{}", query) }
    } else {
        format!("https://www.google.com/search?q={}", query.replace(' ', "+"))
    };
    let _ = open::that(destination);
}

#[command]
async fn get_installed_apps() -> Vec<AppItem> {
    let mut apps = Vec::new();
    // Resolve dynamic User AppData path
    let user_start_menu = format!(
        "{}\\Microsoft\\Windows\\Start Menu\\Programs",
        env::var("APPDATA").unwrap_or_default()
    );

    let paths = vec![
        "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string(),
        user_start_menu,
        "C:\\Users\\Public\\Desktop".to_string(),
    ];

    for path in paths {
        scan_dir_recursive(Path::new(&path), &mut apps);
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps.dedup_by(|a, b| a.name == b.name);

    apps
}

// Helper function to crawl subfolders
fn scan_dir_recursive(dir: &Path, apps: &mut Vec<AppItem>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_dir_recursive(&path, apps);
            } else if path.extension().and_then(|s| s.to_str()) == Some("lnk") {
                let name = path.file_stem().unwrap().to_string_lossy().into_owned();
                apps.push(AppItem {
                    name,
                    path: path.to_string_lossy().into_owned(),
                });
            }
        }
    }
}

#[command]
fn launch_app(path: String) {
    let _ = open::that(path);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_installed_apps, launch_app, search_web])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // --- Windows Specific Polish ---
            #[cfg(target_os = "windows")]
            {
                // This removes the native Windows border and the Alt+Space system menu
                let _ = window.set_decorations(false);
                apply_acrylic(&window, Some((0, 0, 0, 175)))
                    .expect("Failed to apply acrylic blur");
            }

            // --- System Tray ---
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            // --- Hide on Focus Loss ---
            let w_handle = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::Focused(focused) = event {
                    if !focused {
                        w_handle.hide().unwrap();
                    }
                }
            });

            // --- Global Shortcut (Alt + Space) ---
            let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            app.global_shortcut().on_shortcut(alt_space, move |app_handle, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap();
                        } else {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            // Optional: emit event to React to clear input
                            let _ = window.emit("window-opened", ());
                        }
                    }
                }
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}