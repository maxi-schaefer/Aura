use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder},
    App, Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::commands::system::get_config;

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").unwrap();
    let app_handle = app.handle().clone();

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
            if event.id.as_ref() == "quit" { app.exit(0); }
        })
        .build(app)?;

    // --- Focus & Visibility Logic ---
    if is_first_run {
        // 1. Force the window to show on the taskbar for the setup process
        let _ = window.set_skip_taskbar(false); 
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        // 2. Ensure it is hidden from taskbar if already configured
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
    let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    app.global_shortcut().on_shortcut(alt_space, move |app_handle, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
                let current_config = get_config(app_handle.clone());
                
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    // If setup is done, always ensure skip_taskbar is true before showing
                    if current_config.first_run_complete {
                        let _ = window.set_skip_taskbar(true);
                    }
                    
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("window-opened", ());
                }
            }
        }
    })?;

    Ok(())
}