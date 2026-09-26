use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use std::fs;
use tauri::command;

use crate::commands::system::create_hidden_command;

/// One entry from a VS Code variant's workspace storage.
#[derive(Serialize, Clone, Debug)]
pub struct VsCodeProject {
    pub name: String,
    pub path: String,
    /// True for a .code-workspace file, false for a plain folder.
    pub is_workspace: bool,
    /// Seconds since the epoch, used to order by recency.
    pub last_opened: u64,
    /// Which editor the entry came from, e.g. "VS Code" or "VS Code Insiders".
    pub editor: String,
}

/// Supported editors, as (roaming config directory, display name).
const VARIANTS: &[(&str, &str)] = &[
    ("Code", "VS Code"),
    ("Code - Insiders", "VS Code Insiders"),
    ("VSCodium", "VSCodium"),
];

/// Decodes the percent escapes VS Code writes into its file:// URIs.
fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;

    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(byte) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }

    String::from_utf8_lossy(&out).into_owned()
}

/// Turns "file:///c%3A/Users/x/dev" into "C:\Users\x\dev".
fn uri_to_path(uri: &str) -> Option<PathBuf> {
    let rest = uri.strip_prefix("file:///")?;
    let decoded = percent_decode(rest);

    // A leading drive letter arrives lowercase; Windows paths read better
    // capitalised, and the rest of the app compares them as display strings.
    let mut path = decoded.replace('/', "\\");
    if path.len() >= 2 && path.as_bytes()[1] == b':' {
        path = path[..1].to_uppercase() + &path[1..];
    }

    Some(PathBuf::from(path))
}

fn display_name(path: &Path, is_workspace: bool) -> String {
    let raw = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    if is_workspace {
        raw.trim_end_matches(".code-workspace").to_string()
    } else {
        raw
    }
}

fn read_entry(dir: &Path, editor: &str) -> Option<VsCodeProject> {
    let contents = fs::read_to_string(dir.join("workspace.json")).ok()?;
    let json: serde_json::Value = serde_json::from_str(&contents).ok()?;

    // "folder" for an opened directory, "workspace" for a .code-workspace file.
    let (uri, is_workspace) = match json.get("folder").and_then(|v| v.as_str()) {
        Some(folder) => (folder, false),
        None => (json.get("workspace")?.as_str()?, true),
    };

    let path = uri_to_path(uri)?;
    if !path.exists() {
        return None;
    }

    let last_opened = fs::metadata(dir)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    Some(VsCodeProject {
        name: display_name(&path, is_workspace),
        path: path.to_string_lossy().to_string(),
        is_workspace,
        last_opened,
        editor: editor.to_string(),
    })
}

/// Recently opened VS Code folders and workspaces, most recent first.
///
/// Reads each variant's workspaceStorage directory, which stores one
/// workspace.json per entry. That avoids touching state.vscdb, which is
/// SQLite and would mean pulling in a database dependency.
#[command]
pub fn get_vscode_projects() -> Vec<VsCodeProject> {
    let Some(roaming) = dirs::config_dir() else {
        return Vec::new();
    };

    let mut projects: Vec<VsCodeProject> = VARIANTS
        .par_iter()
        .flat_map(|(dir, editor)| {
            let storage = roaming.join(dir).join("User").join("workspaceStorage");

            let Ok(entries) = fs::read_dir(&storage) else {
                return Vec::new();
            };

            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .filter_map(|e| read_entry(&e.path(), editor))
                .collect::<Vec<_>>()
        })
        .collect();

    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));

    // The same folder can appear under several variants. Keep the most
    // recent of each; retain() is order-preserving where dedup_by would
    // only collapse entries that happen to be adjacent.
    let mut seen = HashSet::new();
    projects.retain(|p| seen.insert(p.path.to_lowercase()));

    projects
}

/// Locates the executable for a variant, preferring a real install path.
pub(crate) fn editor_binary(editor: &str) -> Option<PathBuf> {
    let (program_files_name, cli) = match editor {
        "VS Code Insiders" => ("Microsoft VS Code Insiders", "code-insiders.cmd"),
        "VSCodium" => ("VSCodium", "codium.cmd"),
        _ => ("Microsoft VS Code", "code.cmd"),
    };

    let candidates = [
        dirs::data_local_dir().map(|p| p.join("Programs").join(program_files_name).join("bin").join(cli)),
        Some(PathBuf::from("C:\\Program Files").join(program_files_name).join("bin").join(cli)),
        Some(PathBuf::from("C:\\Program Files (x86)").join(program_files_name).join("bin").join(cli)),
    ];

    candidates.into_iter().flatten().find(|p| p.exists())
}

/// Opens a folder or .code-workspace in the editor it came from.
#[command]
pub fn open_vscode_project(path: String, editor: String) -> Result<(), String> {
    match editor_binary(&editor) {
        Some(binary) => {
            // The launcher is a .cmd shim, so it needs a shell to run it.
            create_hidden_command("cmd")
                .args(["/C", &binary.to_string_lossy(), &path])
                .spawn()
                .map(|_| ())
                .map_err(|e| format!("Failed to launch {editor}: {e}"))
        }
        // No CLI shim found: fall back to whatever the shell associates.
        None => create_hidden_command("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open {path}: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_percent_escapes() {
        assert_eq!(percent_decode("c%3A/Users"), "c:/Users");
        assert_eq!(percent_decode("my%20project"), "my project");
        assert_eq!(percent_decode("plain"), "plain");
        // A stray or truncated escape must pass through, not panic.
        assert_eq!(percent_decode("100%"), "100%");
        assert_eq!(percent_decode("%zz"), "%zz");
        assert_eq!(percent_decode("a%2"), "a%2");
        // Multi-byte UTF-8 survives a round trip.
        assert_eq!(percent_decode("caf%C3%A9"), "café");
    }

    #[test]
    fn converts_file_uris_to_windows_paths() {
        assert_eq!(
            uri_to_path("file:///c%3A/Users/x/dev/Aura"),
            Some(PathBuf::from(r"C:\Users\x\dev\Aura"))
        );
        // Drive letter is capitalised.
        assert_eq!(uri_to_path("file:///d%3A/work"), Some(PathBuf::from(r"D:\work")));
        // Spaces and non-ASCII names.
        assert_eq!(
            uri_to_path("file:///c%3A/My%20Projects/caf%C3%A9"),
            Some(PathBuf::from(r"C:\My Projects\café"))
        );
        // Anything that is not a local file URI is rejected.
        assert_eq!(uri_to_path("vscode-remote://ssh/home/x"), None);
        assert_eq!(uri_to_path("untitled:1"), None);
    }

    #[test]
    fn names_folders_and_workspaces() {
        assert_eq!(display_name(Path::new(r"C:\dev\Aura"), false), "Aura");
        assert_eq!(
            display_name(Path::new(r"C:\dev\team.code-workspace"), true),
            "team"
        );
    }

    #[test]
    fn resolves_projects_without_panicking() {
        // Exercises the real storage directories on this machine; the list
        // may legitimately be empty, but every entry must be usable.
        let projects = get_vscode_projects();
        println!("found {} project(s)", projects.len());

        for project in projects {
            println!("  {} <- {} ({})", project.name, project.path, project.editor);
            assert!(!project.path.is_empty());
            assert!(!project.name.is_empty());
            assert!(Path::new(&project.path).exists(), "{}", project.path);
        }
    }
}
