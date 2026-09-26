use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

/// The scratchpad lives beside the other config as plain Markdown, so it
/// stays readable outside the app.
const NOTE_FILE: &str = "scratchpad.md";

fn note_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(NOTE_FILE))
}

/// Reads the scratchpad, returning empty text when it does not exist yet.
#[command]
pub fn get_note(app: AppHandle) -> Result<String, String> {
    let path = note_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(contents),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Could not read the scratchpad: {e}")),
    }
}

/// Replaces the scratchpad's contents.
#[command]
pub fn save_note(app: AppHandle, content: String) -> Result<(), String> {
    let path = note_path(&app)?;
    fs::write(&path, content).map_err(|e| format!("Could not save the scratchpad: {e}"))
}

/// Joins a new line onto existing text without doubling or dropping breaks.
///
/// Returns None when there is nothing worth appending.
fn with_appended_line(existing: &str, text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }

    let needs_break = !existing.is_empty() && !existing.ends_with('\n');
    let separator = if needs_break { "\n" } else { "" };

    Some(format!("{existing}{separator}{trimmed}\n"))
}

/// Appends a line, for capturing a thought without opening the view first.
#[command]
pub fn append_note(app: AppHandle, text: String) -> Result<(), String> {
    let existing = get_note(app.clone())?;

    match with_appended_line(&existing, &text) {
        Some(updated) => save_note(app, updated),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::with_appended_line;

    #[test]
    fn appends_to_an_empty_scratchpad() {
        assert_eq!(with_appended_line("", "buy milk").unwrap(), "buy milk\n");
    }

    #[test]
    fn does_not_double_the_line_break() {
        assert_eq!(
            with_appended_line("first\n", "second").unwrap(),
            "first\nsecond\n"
        );
    }

    #[test]
    fn adds_a_break_when_the_note_lacks_a_trailing_newline() {
        assert_eq!(
            with_appended_line("first", "second").unwrap(),
            "first\nsecond\n"
        );
    }

    #[test]
    fn trims_the_appended_text_but_leaves_existing_content_alone() {
        assert_eq!(
            with_appended_line("  spaced  \n", "  padded  ").unwrap(),
            "  spaced  \npadded\n"
        );
    }

    #[test]
    fn blank_input_changes_nothing() {
        assert!(with_appended_line("first\n", "").is_none());
        assert!(with_appended_line("first\n", "   ").is_none());
        assert!(with_appended_line("", " \t ").is_none());
    }

    #[test]
    fn preserves_interior_blank_lines() {
        assert_eq!(with_appended_line("a\n\nb\n", "c").unwrap(), "a\n\nb\nc\n");
    }
}
