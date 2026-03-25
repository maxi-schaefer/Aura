use tauri::{App, Emitter, Manager, WindowEvent, WebviewUrl, WebviewWindowBuilder, menu::{Menu, MenuItem}, tray::TrayIconBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(any(target_os = "windows", target_os = "macos"))]
use window_vibrancy::{apply_acrylic, apply_vibrancy, NSVisualEffectMaterial};

pub fn init(app: &mut App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").unwrap();

    // --- Window Effects ---
    #[cfg(target_os = "windows")]
    let _ = apply_acrylic(&window, Some((0, 0, 0, 175)));

    #[cfg(target_os = "macos")]
    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::UnderWindowBackground, None, None);

    // --- Tray Setup ---
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Aura", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "settings" => {
                    if let Some(win) = app.get_webview_window("settings") {
                        let _ = win.set_focus();
                    } else {
                        let settings_win = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
                            .title("Aura Settings")
                            .inner_size(700.0, 550.0)
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
                "quit" => app.exit(0),
                _ => {}
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

    // --- Shortcut Logic ---
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

    Ok(())
}