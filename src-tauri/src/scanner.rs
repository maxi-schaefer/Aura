use std::path::Path;
use crate::commands::AppItem;

pub fn get_apps() -> Vec<AppItem> {
    let mut apps = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let user_start = format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", std::env::var("APPDATA").unwrap_or_default());
        let paths = vec!["C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string(), user_start];
        for p in paths { scan_dir_recursive(Path::new(&p), &mut apps); }
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
        for p in paths { scan_linux_desktop_files(Path::new(p), &mut apps); }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());
    apps
}

fn scan_dir_recursive(dir: &Path, apps: &mut Vec<AppItem>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_dir_recursive(&path, apps);
            } else if path.extension().and_then(|s| s.to_str()) == Some("lnk") {
                let name = path.file_stem().unwrap().to_string_lossy().into_owned();
                let name_low = name.to_lowercase();
                let is_trash = ["visit", "website", "documentation", "handbuch", "help online"]
                    .iter().any(|&word| name_low.contains(word));

                if !is_trash {
                    apps.push(AppItem { name, path: path.to_string_lossy().into_owned() });
                }
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn scan_linux_desktop_files(dir: &Path, apps: &mut Vec<AppItem>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let content = std::fs::read_to_string(entry.path()).unwrap_or_default();
            if let Some(name_line) = content.lines().find(|l| l.starts_with("Name=")) {
                let name = name_line.replace("Name=", "");
                apps.push(AppItem { name, path: entry.path().to_string_lossy().into_owned() });
            }
        }
    }
}