use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use std::str::FromStr;

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

pub fn refresh_global_shortcut(app: &tauri::AppHandle) {
    let config = crate::commands::system::get_config(app.clone());
    let shortcut_str = config.main_shortcut.unwrap_or_else(|| "Alt+Space".to_string());
    
    // 1. Unregister everything
    let _ = app.global_shortcut().unregister_all();

    // 2. Register the new shortcut
    if let Ok(shortcut) = Shortcut::from_str(&shortcut_str) {
        let _ = app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
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
                        // h_menu is an HMENU, which is also a pointer type in windows-sys
                        DeleteMenu(h_menu as _, i as u32, MF_BYPOSITION);
                    }
                }

                SetWindowPos(
                    hwnd as _, 
                    std::ptr::null_mut(), 
                    0, 0, 0, 0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED
                );
            }
        }
    }
}