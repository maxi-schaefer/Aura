use rayon::prelude::*;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;
use walkdir::WalkDir;

use crate::commands::system::create_hidden_command;
use crate::commands::vscode::editor_binary;

/// A single matching line inside a file.
#[derive(Serialize, Clone, Debug)]
pub struct ContentMatch {
    pub name: String,
    pub path: String,
    /// 1-based, so it can be handed straight to an editor.
    pub line: usize,
    /// The matching line, trimmed and truncated for display.
    pub preview: String,
    /// Total matching lines in this file, which may exceed those returned.
    pub total_in_file: usize,
}

/// Short queries match almost everything, and scanning for them is wasted work.
const MIN_QUERY_LEN: usize = 3;
/// Files larger than this are skipped; they are rarely what a launcher wants.
const MAX_FILE_BYTES: u64 = 1024 * 1024;
const MAX_RESULTS: usize = 60;
const MAX_MATCHES_PER_FILE: usize = 3;
const MAX_PREVIEW_CHARS: usize = 160;
const MAX_DEPTH: usize = 6;

/// Directories that are large, generated, or both.
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", ".svn", ".hg", "target", "dist", "build", "out",
    ".next", ".nuxt", ".venv", "venv", "__pycache__", ".cache", "vendor",
    ".gradle", ".idea", ".vs", "bin", "obj", "coverage",
];

/// Extensions treated as text. Anything else is assumed binary and skipped.
const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "markdown", "rst", "adoc", "log", "csv", "tsv",
    "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "properties",
    "xml", "html", "htm", "svg", "css", "scss", "sass", "less",
    "js", "jsx", "mjs", "cjs", "ts", "tsx", "vue", "svelte",
    "py", "rs", "go", "java", "kt", "kts", "scala", "clj", "ex", "exs",
    "c", "h", "cpp", "cxx", "cc", "hpp", "hxx", "cs", "m", "mm",
    "rb", "php", "pl", "lua", "r", "jl", "dart", "swift", "zig", "nim",
    "sh", "bash", "zsh", "fish", "ps1", "psm1", "bat", "cmd",
    "sql", "graphql", "gql", "proto", "tf", "tfvars", "gradle", "sbt",
    "tex", "bib", "gitignore", "gitattributes", "editorconfig", "dockerignore",
];

/// Extensionless files that are still text.
const TEXT_FILENAMES: &[&str] = &[
    "dockerfile", "makefile", "readme", "license", "licence", "changelog",
    "authors", "contributing", "notice", "codeowners", "procfile", "gemfile",
    "rakefile", "brewfile", "justfile", "vagrantfile",
];

fn is_text_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        return TEXT_EXTENSIONS.contains(&ext.to_lowercase().as_str());
    }

    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| TEXT_FILENAMES.contains(&n.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn is_skipped_dir(entry: &walkdir::DirEntry) -> bool {
    entry.file_type().is_dir()
        && entry
            .file_name()
            .to_str()
            .map(|n| SKIP_DIRS.contains(&n.to_lowercase().as_str()) || n.starts_with('.'))
            .unwrap_or(false)
}

fn truncate(line: &str) -> String {
    let trimmed = line.trim();
    if trimmed.chars().count() <= MAX_PREVIEW_CHARS {
        return trimmed.to_string();
    }
    let cut: String = trimmed.chars().take(MAX_PREVIEW_CHARS).collect();
    format!("{cut}...")
}

fn search_file(path: &Path, needle: &str) -> Vec<ContentMatch> {
    let Ok(metadata) = fs::metadata(path) else {
        return Vec::new();
    };
    if metadata.len() > MAX_FILE_BYTES {
        return Vec::new();
    }

    // Invalid UTF-8 means a binary file slipped past the extension filter.
    let Ok(contents) = fs::read_to_string(path) else {
        return Vec::new();
    };

    let hits: Vec<(usize, &str)> = contents
        .lines()
        .enumerate()
        .filter(|(_, line)| line.to_lowercase().contains(needle))
        .map(|(i, line)| (i + 1, line))
        .collect();

    if hits.is_empty() {
        return Vec::new();
    }

    let total = hits.len();
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    hits.into_iter()
        .take(MAX_MATCHES_PER_FILE)
        .map(|(line, text)| ContentMatch {
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            line,
            preview: truncate(text),
            total_in_file: total,
        })
        .collect()
}

fn search_roots() -> Vec<PathBuf> {
    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };
    ["Documents", "Downloads", "Desktop"]
        .iter()
        .map(|d| home.join(d))
        .filter(|p| p.exists())
        .collect()
}

/// Searches the contents of text files under the user's common folders.
///
/// Complements `search_files`, which only matches file names.
#[command]
pub async fn search_file_contents(query: String) -> Vec<ContentMatch> {
    let needle = query.trim().to_lowercase();
    if needle.len() < MIN_QUERY_LEN {
        return Vec::new();
    }

    let candidates: Vec<PathBuf> = search_roots()
        .iter()
        .flat_map(|root| {
            WalkDir::new(root)
                .max_depth(MAX_DEPTH)
                .into_iter()
                .filter_entry(|e| !is_skipped_dir(e))
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
                .map(|e| e.into_path())
                .filter(|p| is_text_file(p))
                .collect::<Vec<_>>()
        })
        .collect();

    let mut matches: Vec<ContentMatch> = candidates
        .par_iter()
        .flat_map(|path| search_file(path, &needle))
        .collect();

    // Files with more hits first, then by name for a stable order.
    matches.sort_by(|a, b| {
        b.total_in_file
            .cmp(&a.total_in_file)
            .then_with(|| a.path.cmp(&b.path))
            .then_with(|| a.line.cmp(&b.line))
    });
    matches.truncate(MAX_RESULTS);

    matches
}

/// Opens a file, jumping to a line when an editor that supports it is present.
#[command]
pub fn open_file_at_line(path: String, line: usize) -> Result<(), String> {
    if let Some(binary) = editor_binary("VS Code") {
        return create_hidden_command("cmd")
            .args(["/C", &binary.to_string_lossy(), "-g", &format!("{path}:{line}")])
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open {path}: {e}"));
    }

    // No editor with line support: fall back to the shell association.
    open::that(&path).map_err(|e| format!("Failed to open {path}: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("aura_content_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write(dir: &Path, name: &str, body: &str) -> PathBuf {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(body.as_bytes()).unwrap();
        path
    }

    #[test]
    fn classifies_text_files() {
        assert!(is_text_file(Path::new("a/b/notes.md")));
        assert!(is_text_file(Path::new("a/main.RS")));
        assert!(is_text_file(Path::new("a/Dockerfile")));
        assert!(is_text_file(Path::new("a/README")));
        assert!(!is_text_file(Path::new("a/photo.png")));
        assert!(!is_text_file(Path::new("a/app.exe")));
        assert!(!is_text_file(Path::new("a/archive.zip")));
    }

    #[test]
    fn finds_matches_with_line_numbers_and_counts() {
        let dir = temp_dir("matches");
        let file = write(&dir, "notes.md", "alpha
beta needle
gamma
needle again
");

        let hits = search_file(&file, "needle");
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].line, 2);
        assert_eq!(hits[0].preview, "beta needle");
        assert_eq!(hits[1].line, 4);
        // Both matches counted, even though only some are returned.
        assert_eq!(hits[0].total_in_file, 2);
    }

    #[test]
    fn matching_is_case_insensitive() {
        let dir = temp_dir("case");
        let file = write(&dir, "a.txt", "The Needle Is Here
");
        assert_eq!(search_file(&file, "needle").len(), 1);
    }

    #[test]
    fn caps_matches_per_file_but_reports_the_true_total() {
        let dir = temp_dir("cap");
        let body = "hit
".repeat(10);
        let file = write(&dir, "many.txt", &body);

        let hits = search_file(&file, "hit");
        assert_eq!(hits.len(), MAX_MATCHES_PER_FILE);
        assert_eq!(hits[0].total_in_file, 10);
    }

    #[test]
    fn skips_binary_and_oversized_files() {
        let dir = temp_dir("skip");

        // Invalid UTF-8 behind a text extension.
        let binary = dir.join("fake.txt");
        fs::write(&binary, [0xff, 0xfe, 0x00, 0x01]).unwrap();
        assert!(search_file(&binary, "any").is_empty());

        let big = write(&dir, "big.txt", &"needle
".repeat(200_000));
        assert!(fs::metadata(&big).unwrap().len() > MAX_FILE_BYTES);
        assert!(search_file(&big, "needle").is_empty());
    }

    #[test]
    fn truncates_long_previews() {
        let dir = temp_dir("long");
        let file = write(&dir, "long.txt", &format!("{}needle
", "x".repeat(500)));

        let hits = search_file(&file, "needle");
        assert_eq!(hits.len(), 1);
        assert!(hits[0].preview.ends_with("..."));
        assert_eq!(hits[0].preview.chars().count(), MAX_PREVIEW_CHARS + 3);
    }

    #[test]
    fn rejects_short_queries() {
        use futures::executor::block_on;
        assert!(block_on(search_file_contents("ab".into())).is_empty());
        assert!(block_on(search_file_contents("  ".into())).is_empty());
    }
}
