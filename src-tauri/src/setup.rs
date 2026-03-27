use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(any(target_os = "windows", target_os = "macos"))]
use window_vibrancy::{apply_acrylic, NSVisualEffectMaterial};

// Helper to open settings (extracted since we call it from two places now)
fn open_settings(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.set_focus();
    } else {
        let settings_win = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html#settings".into()))
            .title("Aura Settings")
            .inner_size(720.0, 600.0)
            .resizable(false)
            .transparent(true)
            .decorations(false)
            .build()
            .unwrap();

        #[cfg(target_os = "windows")]
        let _ = apply_acrylic(&settings_win, Some((0, 0, 0, 175)));

        #[cfg(target_os = "macos")]
        let _ = apply_vibrancy(&settings_win, NSVisualEffectMaterial::UnderWindowBackground, None, None);
    }
}

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").unwrap();

    // --- Tray Decorative Menu ---
    // Using PredefinedMenuItem for separators and custom styles
    let title_i = MenuItem::with_id(app, "title", "AURA", false, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Aura", true, None::<&str>)?;
    
    let tray_menu = Menu::with_items(app, &[
        &title_i, 
        &sep, 
        &settings_i, 
        &quit_i
    ])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "settings" => open_settings(app),
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                open_settings(app);
            }
        })
        .build(app)?;

    // --- Focus Logic ---
    let w_handle = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(focused) = event {
            if !focused { let _ = w_handle.hide(); }
        }
    });

    // --- Global Shortcut ---
    let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    app.global_shortcut().on_shortcut(alt_space, move |app_handle, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(window) = app_handle.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("window-opened", ());
                }
            }
        }
    })?;

    // --- Apply Acrylic ---
    let _ = apply_acrylic(&window, Some((0, 0, 0, 175)));

    Ok(())
}