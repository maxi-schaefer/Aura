use std::time::{Duration, Instant};
use tauri::{command, AppHandle, Emitter, Manager, PhysicalPosition};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::POINT,
    Graphics::Gdi::{GetDC, GetPixel, ReleaseDC, CLR_INVALID},
    UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE, VK_LBUTTON},
    UI::WindowsAndMessaging::GetCursorPos,
};

/// Label of the transient window that previews the colour under the cursor.
const OVERLAY_LABEL: &str = "picker-overlay";
const OVERLAY_WIDTH: f64 = 168.0;
const OVERLAY_HEIGHT: f64 = 52.0;
/// Offset from the cursor so the overlay never sits under the sampled pixel.
const OVERLAY_GAP: i32 = 22;

/// Roughly 60fps; fast enough to feel live without spinning a core.
const POLL: Duration = Duration::from_millis(16);
/// Backstop so a forgotten pick cannot leave the main window hidden forever.
const TIMEOUT: Duration = Duration::from_secs(60);

#[cfg(target_os = "windows")]
fn is_down(key: i32) -> bool {
    // The high bit of GetAsyncKeyState marks a key as currently down.
    unsafe { (GetAsyncKeyState(key) as u16 & 0x8000) != 0 }
}

/// Builds the always-on-top preview window, click-through so it cannot
/// swallow the click that picks the colour.
fn build_overlay(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    if let Some(existing) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = existing.close();
    }

    let overlay = tauri::WebviewWindowBuilder::new(
        app,
        OVERLAY_LABEL,
        tauri::WebviewUrl::App("index.html#/picker-overlay".into()),
    )
    .title("Aura colour preview")
    .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .shadow(false)
    .focused(false)
    .visible(false)
    .build()
    .map_err(|e| format!("Could not open the colour preview: {e}"))?;

    // Must not intercept the picking click.
    let _ = overlay.set_ignore_cursor_events(true);

    Ok(overlay)
}

#[cfg(target_os = "windows")]
fn pick_loop(overlay: &tauri::WebviewWindow) -> Result<Option<String>, String> {
    unsafe {
        let screen = GetDC(std::ptr::null_mut());
        if screen.is_null() {
            return Err("Could not read the screen".into());
        }

        // The click that started the pick may still be down; wait it out so
        // it is not immediately consumed as the pick itself.
        let started = Instant::now();
        while is_down(VK_LBUTTON as i32) && started.elapsed() < TIMEOUT {
            std::thread::sleep(POLL);
        }

        let mut shown = false;
        let mut last_hex: Option<String> = None;

        loop {
            if started.elapsed() > TIMEOUT {
                ReleaseDC(std::ptr::null_mut(), screen);
                return Ok(None);
            }

            if is_down(VK_ESCAPE as i32) {
                ReleaseDC(std::ptr::null_mut(), screen);
                return Ok(None);
            }

            let mut cursor = POINT { x: 0, y: 0 };
            if GetCursorPos(&mut cursor) == 0 {
                std::thread::sleep(POLL);
                continue;
            }

            let colour = GetPixel(screen, cursor.x, cursor.y);
            if colour == CLR_INVALID {
                std::thread::sleep(POLL);
                continue;
            }

            // COLORREF is 0x00bbggrr, not RGB order.
            let (r, g, b) = (colour & 0xFF, (colour >> 8) & 0xFF, (colour >> 16) & 0xFF);
            let hex = format!("#{r:02x}{g:02x}{b:02x}");

            let _ = overlay.set_position(PhysicalPosition::new(
                cursor.x + OVERLAY_GAP,
                cursor.y + OVERLAY_GAP,
            ));

            if last_hex.as_deref() != Some(hex.as_str()) {
                let _ = overlay.emit("picker://preview", &hex);
                last_hex = Some(hex.clone());
            }

            // Shown only once positioned, so it never flashes at 0,0.
            if !shown {
                let _ = overlay.show();
                shown = true;
            }

            if is_down(VK_LBUTTON as i32) {
                ReleaseDC(std::ptr::null_mut(), screen);
                return Ok(Some(hex));
            }

            std::thread::sleep(POLL);
        }
    }
}

/// Picks a colour from anywhere on screen, with Aura hidden while you do.
///
/// Returns None when the pick is cancelled with Escape or times out.
///
/// This replaces the web EyeDropper API deliberately: Chromium cancels an
/// in-flight EyeDropper as soon as the initiating document is hidden, so it
/// cannot be combined with getting the window out of the way.
#[command]
pub async fn start_color_pick(app: AppHandle) -> Result<Option<String>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        return Err("Screen picking is only implemented on Windows".into());
    }

    #[cfg(target_os = "windows")]
    {
        let main = app
            .get_webview_window("main")
            .ok_or_else(|| "Main window is gone".to_string())?;

        let overlay = build_overlay(&app)?;
        let _ = main.hide();

        let outcome = tauri::async_runtime::spawn_blocking({
            let overlay = overlay.clone();
            move || pick_loop(&overlay)
        })
        .await;

        // Always restore, whatever happened in the loop.
        let _ = overlay.close();
        let _ = main.show();
        let _ = main.set_focus();

        match outcome {
            Ok(result) => result,
            Err(e) => Err(format!("Colour picking failed: {e}")),
        }
    }
}

#[cfg(test)]
mod tests {
    /// Mirrors the conversion in pick_loop, which cannot run without a screen.
    fn colorref_to_hex(colour: u32) -> String {
        let (r, g, b) = (colour & 0xFF, (colour >> 8) & 0xFF, (colour >> 16) & 0xFF);
        format!("#{r:02x}{g:02x}{b:02x}")
    }

    #[test]
    fn colorref_is_read_as_bgr_not_rgb() {
        // COLORREF 0x00bbggrr: this is pure red, despite looking like blue.
        assert_eq!(colorref_to_hex(0x0000_00FF), "#ff0000");
        assert_eq!(colorref_to_hex(0x0000_FF00), "#00ff00");
        assert_eq!(colorref_to_hex(0x00FF_0000), "#0000ff");
    }

    #[test]
    fn channels_are_zero_padded() {
        assert_eq!(colorref_to_hex(0x0000_0000), "#000000");
        assert_eq!(colorref_to_hex(0x0001_0203), "#030201");
        assert_eq!(colorref_to_hex(0x00FF_FFFF), "#ffffff");
    }

    #[test]
    fn the_unused_high_byte_is_ignored() {
        // GDI leaves the top byte zero, but a stray value must not leak in.
        assert_eq!(colorref_to_hex(0xFF12_3456), "#563412");
    }
}
