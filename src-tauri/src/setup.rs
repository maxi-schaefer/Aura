use serde::Serialize;
use std::collections::HashSet;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use std::str::FromStr;

/// Event carrying the command id a global shortcut asked to open.
pub const ACTIVATE_COMMAND_EVENT: &str = "command://activate";

/// Outcome of registering one accelerator, so the UI can explain failures
/// rather than leaving a shortcut silently dead.
#[derive(Serialize, Clone, Debug)]
pub struct ShortcutRegistration {
    /// "main", or the command id the accelerator opens.
    pub id: String,
    pub accelerator: String,
    pub ok: bool,
    pub error: Option<String>,
}

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::*;

use crate::commands::system::get_config;

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").unwrap();
    let app_handle = app.handle().clone();

    create_main_window(&app_handle, window.clone());

    // 1. Check first-run status immediately
    let config = get_config(app_handle.clone());
    let is_first_run = !config.first_run_complete;

    // --- Tray Decorative Menu ---
    let title_i = MenuItem::with_id(app, "title", "AURA", false, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Aura", true, None::<&str>)?;

    let tray_menu = Menu::with_items(app, &[&title_i, &sep, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .on_menu_event(move |app, event| {
            if event.id.as_ref() == "quit" {
                app.exit(0);
            }
        })
        .build(app)?;

    // --- Focus & Visibility Logic ---
    if is_first_run {
        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = window.set_skip_taskbar(true);
    }

    let w_handle = window.clone();
    let app_handle_for_focus = app_handle.clone();

    window.on_window_event(move |event| {
        if let WindowEvent::Focused(focused) = event {
            if !focused {
                let current_config = get_config(app_handle_for_focus.clone());
                if current_config.first_run_complete {
                    let _ = w_handle.hide();
                    // Ensure it skips taskbar when it hides after setup
                    let _ = w_handle.set_skip_taskbar(true);
                }
            }
        }
    });

    // --- Global Shortcut ---
    let app_handle = app.handle().clone();
    refresh_global_shortcut(&app_handle);

    Ok(())
}

fn create_main_window(_app: &tauri::AppHandle, window: tauri::WebviewWindow) -> tauri::WebviewWindow {
    let _ = window.set_decorations(false);
    let _ = window.set_always_on_top(true);
    let _ = window.set_skip_taskbar(true);

    #[cfg(target_os = "windows")]
    {
        unsafe {
            let hwnd = window.hwnd().unwrap().0 as *mut std::ffi::c_void;
            
            let style = GetWindowLongW(hwnd as _, GWL_STYLE) as u32;
            let ex_style = GetWindowLongW(hwnd as _, GWL_EXSTYLE) as u32;

            let new_style = (style & !WS_SYSMENU & !WS_CAPTION) | WS_POPUP;
            let new_ex_style = ex_style | WS_EX_TOOLWINDOW;

            SetWindowLongW(hwnd as _, GWL_STYLE, new_style as i32);
            SetWindowLongW(hwnd as _, GWL_EXSTYLE, new_ex_style as i32);
            
            SetWindowPos(
                hwnd as _, 
                std::ptr::null_mut(), // HWND_TOP
                0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED
            );
        }
    }
    window
}

/// Normalised form used only to spot two accelerators that mean the same
/// thing written differently ("Alt+C" and "alt+c").
fn accelerator_key(accelerator: &str) -> String {
    let mut parts: Vec<String> = accelerator
        .split('+')
        .map(|p| p.trim().to_lowercase())
        .filter(|p| !p.is_empty())
        .collect();
    parts.sort();
    parts.join("+")
}

/// Windows reserves most Win+<key> combinations and never passes them on;
/// the underlying error only says that registration failed.
fn describe_error(raw: &str) -> String {
    let lowered = raw.to_lowercase();
    if lowered.contains("already") || lowered.contains("registered") {
        "Already taken by another application".into()
    } else {
        format!("The system refused this shortcut ({raw})")
    }
}

pub fn refresh_global_shortcut(app: &tauri::AppHandle) -> Vec<ShortcutRegistration> {
    let config = crate::commands::system::get_config(app.clone());
    let shortcut_str = config
        .main_shortcut
        .clone()
        .unwrap_or_else(|| "Alt+Space".to_string());

    let mut registrations: Vec<ShortcutRegistration> = Vec::new();
    let mut taken: HashSet<String> = HashSet::new();

    // 1. Unregister everything
    let _ = app.global_shortcut().unregister_all();

    // 2. The main toggle is registered first, so it wins any clash.
    let main_registration = match Shortcut::from_str(&shortcut_str) {
        Ok(shortcut) => {
            let outcome = app
                .global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });

            match outcome {
                Ok(()) => {
                    taken.insert(accelerator_key(&shortcut_str));
                    ShortcutRegistration {
                        id: "main".into(),
                        accelerator: shortcut_str.clone(),
                        ok: true,
                        error: None,
                    }
                }
                Err(e) => ShortcutRegistration {
                    id: "main".into(),
                    accelerator: shortcut_str.clone(),
                    ok: false,
                    error: Some(describe_error(&e.to_string())),
                },
            }
        }
        Err(_) => ShortcutRegistration {
            id: "main".into(),
            accelerator: shortcut_str.clone(),
            ok: false,
            error: Some("Not a valid shortcut".into()),
        },
    };
    registrations.push(main_registration);

    // 3. One accelerator per command, each opening that command.
    for (command_id, accelerator) in config.command_shortcuts.unwrap_or_default() {
        let accelerator = accelerator.trim().to_string();
        if accelerator.is_empty() {
            continue;
        }

        if !taken.insert(accelerator_key(&accelerator)) {
            registrations.push(ShortcutRegistration {
                id: command_id,
                accelerator,
                ok: false,
                error: Some("Already used by another shortcut".into()),
            });
            continue;
        }

        let registration = match Shortcut::from_str(&accelerator) {
            Ok(shortcut) => {
                let id_for_event = command_id.clone();
                let outcome = app
                    .global_shortcut()
                    .on_shortcut(shortcut, move |app, _shortcut, event| {
                        if event.state() != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                            return;
                        }
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit(ACTIVATE_COMMAND_EVENT, id_for_event.clone());
                    });

                match outcome {
                    Ok(()) => ShortcutRegistration {
                        id: command_id,
                        accelerator,
                        ok: true,
                        error: None,
                    },
                    Err(e) => ShortcutRegistration {
                        id: command_id,
                        accelerator,
                        ok: false,
                        error: Some(describe_error(&e.to_string())),
                    },
                }
            }
            Err(_) => ShortcutRegistration {
                id: command_id,
                accelerator,
                ok: false,
                error: Some("Not a valid shortcut".into()),
            },
        };

        registrations.push(registration);
    }

    #[cfg(target_os = "windows")]
    if let Some(window) = app.get_webview_window("main") {
        unsafe {
            if let Ok(hwnd_wrap) = window.hwnd() {
                // Cast HWND correctly
                let hwnd = hwnd_wrap.0 as *mut std::ffi::c_void;

                let h_menu = GetSystemMenu(hwnd as _, 0);
                if h_menu != std::ptr::null_mut() {
                    for i in (0..10).rev() {
                        // h_menu is an HMENU, also a pointer type in windows-sys
                        DeleteMenu(h_menu as _, i as u32, MF_BYPOSITION);
                    }
                }

                SetWindowPos(
                    hwnd as _,
                    std::ptr::null_mut(),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
                );
            }
        }
    }

    registrations
}

#[cfg(test)]
mod tests {
    use super::accelerator_key;

    #[test]
    fn the_same_shortcut_written_differently_collides() {
        assert_eq!(accelerator_key("Alt+C"), accelerator_key("alt+c"));
        assert_eq!(
            accelerator_key("Ctrl+Shift+K"),
            accelerator_key("Shift+Ctrl+K")
        );
        assert_eq!(accelerator_key(" Alt + C "), accelerator_key("Alt+C"));
    }

    #[test]
    fn different_shortcuts_do_not_collide() {
        assert_ne!(accelerator_key("Alt+C"), accelerator_key("Alt+V"));
        assert_ne!(accelerator_key("Alt+C"), accelerator_key("Ctrl+C"));
        assert_ne!(accelerator_key("Alt+Shift+C"), accelerator_key("Alt+C"));
    }

    #[test]
    fn empty_segments_are_ignored() {
        assert_eq!(accelerator_key("Alt++C"), accelerator_key("Alt+C"));
        assert_eq!(accelerator_key(""), "");
    }
}
