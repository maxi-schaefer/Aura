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
    
    #[cfg(target_os = "windows")]
    {
        let user_start = format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", std::env::var("APPDATA").unwrap_or_default());
        let paths = vec!["C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string(), user_start];
        for p in paths { scan_dir_recursive(std::path::Path::new(&p), &mut apps); }
    }

    #[cfg(target_os = "macos")]
    {
        let paths = vec!["/Applications", "/System/Applications"];
        for p in paths {
            if let Ok(entries) = std::fs::read_dir(p) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("app") {
                        let name = path.file_stem().unwrap().to_string_lossy().into_owned();
                        apps.push(AppItem { name, path: path.to_string_lossy().into_owned() });
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let paths = vec!["/usr/share/applications", "/usr/local/share/applications"];
        // Linux .desktop files are text files; you'd parse the "Name=" line
        for p in paths { scan_linux_desktop_files(std::path::Path::new(p), &mut apps); }
    }

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

fn scan_linux_desktop_files(dir: &std::path::Path, apps: &mut Vec<AppItem>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let content = std::fs::read_to_string(entry.path()).unwrap_or_default();
            // Simple logic: find line starting with Name=
            if let Some(name_line) = content.lines().find(|l| l.starts_with("Name=")) {
                let name = name_line.replace("Name=", "");
                apps.push(AppItem { name, path: entry.path().to_string_lossy().into_owned() });
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

            // --- Polish ---
            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 175))).expect("Unsupported");

            #[cfg(target_os = "macos")]
            use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::UnderWindowBackground, None, None).expect("Unsupported");

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