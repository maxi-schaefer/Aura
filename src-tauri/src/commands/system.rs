use std::{collections::HashMap, fs, path::PathBuf, process::Stdio};
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, command, Manager, Emitter};
use rayon::prelude::*;
use walkdir::WalkDir;
use crate::scanner;
use tauri_plugin_dialog::DialogExt;
use std::process::Command as StdCommand;
use std::io::BufRead;
use std::io::BufReader;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WingetPackage {
    pub name: String,
    pub id: String,
    pub version: String,
    pub source: String,
}

#[derive(Serialize, Clone)]
pub struct AppItem { pub name: String, pub path: String, pub icon: Option<String> }

#[derive(Serialize, Clone)]
pub struct FileItem { pub name: String, pub path: String, pub is_dir: bool, pub icon: Option<String> }

#[derive(Serialize, Deserialize)]
pub struct Config { 
    pub search_engine: String,
    pub username: Option<String>,
    pub first_run_complete: bool,
    pub theme: Option<String>,
}

pub fn create_hidden_command(program: &str) -> StdCommand {
    let mut cmd = StdCommand::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

fn parse_winget_parallel(stdout: String) -> Vec<WingetPackage> {
    let lines: Vec<String> = stdout.lines().skip(2).map(|s| s.to_string()).collect();
    
    lines.par_iter() // This handles the "Parallel Search" factor
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                Some(WingetPackage {
                    name: parts[0].to_string(),
                    id: parts[1].to_string(),
                    version: parts[2].to_string(),
                    source: parts.get(3).unwrap_or(&"winget").to_string(),
                })
            } else {
                None
            }
        })
        .collect()
}

#[command]
pub async fn export_winget_setup(app: tauri::AppHandle, packages: Vec<WingetPackage>) -> Result<(), String> {
    let file_path = app.dialog()
        .file()
        .set_file_name("winget_setup.json")
        .blocking_save_file(); // Use blocking for simpler async command flow

    if let Some(path) = file_path {
        let path_str = path.to_string();
        let json = serde_json::to_string_pretty(&packages).map_err(|e| e.to_string())?;
        std::fs::write(path_str, json).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn import_winget_setup(app: tauri::AppHandle) -> Result<Vec<WingetPackage>, String> {
    let file_path = app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    if let Some(path) = file_path {
        let path_str = path.to_string();
        let contents = std::fs::read_to_string(path_str).map_err(|e| e.to_string())?;
        let packages: Vec<WingetPackage> = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
        return Ok(packages);
    }
    Err("No file selected".into())
}

#[command]
pub async fn search_winget(query: String) -> Result<Vec<WingetPackage>, String> {
    if query.len() < 2 { return Ok(vec![]); }

    let output = create_hidden_command("winget")
        .args(["search", &query, "--accept-source-agreements"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(parse_winget_parallel(stdout))
}

#[command]
pub async fn get_installed_winget() -> Result<Vec<WingetPackage>, String> {
    let output = create_hidden_command("winget")
        .args(["list", "--accept-source-agreements"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(parse_winget_parallel(stdout))
}

#[command]
pub async fn get_winget_updates() -> Result<Vec<WingetPackage>, String> {
    let output = create_hidden_command("winget")
        .args(["upgrade", "--accept-source-agreements"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(parse_winget_parallel(stdout))
}

#[command]
pub async fn install_package(app: AppHandle, id: String) -> Result<(), String> {
    let mut child = create_hidden_command("winget")
        .args(["install", "--id", &id, "--accept-package-agreements", "--accept-source-agreements"])
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);

    // Stream lines to frontend
    for line in reader.lines() {
        if let Ok(l) = line {
            // Emit progress to the specific package ID
            let _ = app.emit("winget-progress", serde_json::json!({ "id": id, "line": l }));
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() { Ok(()) } else { Err("Failed".into()) }
}

#[command]
pub async fn update_package(id: String) -> Result<(), String> {
    let status = create_hidden_command("winget")
        .args(["upgrade", "--id", &id, "--silent", "--accept-source-agreements"])
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() { Ok(()) } 
    else { Err("Update failed".into()) }
}

#[command]
pub async fn uninstall_package(id: String) -> Result<(), String> {
    let status = create_hidden_command("winget")
        .args(["uninstall", "--id", &id, "--silent", "--accept-source-agreements"])
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() { Ok(()) } 
    else { Err("Uninstallation failed".into()) }
}

#[command]
pub async fn search_files(query: String) -> Vec<FileItem> {
    if query.is_empty() { return Vec::new(); }
    let home = dirs::home_dir().unwrap_or(PathBuf::from("/"));
    let search_paths = vec![home.join("Documents"), home.join("Downloads"), home.join("Desktop")];
    let query_l = query.to_lowercase();

    search_paths.par_iter().flat_map(|path| {
        WalkDir::new(path).max_depth(3).into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().to_lowercase().contains(&query_l))
            .take(10)
            .map(|e| FileItem {
                name: e.file_name().to_string_lossy().to_string(),
                path: e.path().to_string_lossy().to_string(),
                is_dir: e.path().is_dir(),
                icon: scanner::get_base64_icon(e.path().to_str().unwrap_or_default()),
            }).collect::<Vec<_>>()
    }).take_any(15).collect()
}

#[command]
pub fn search_web(app: AppHandle, query: String) {
    let aliases = get_aliases(app.clone());
    let config = get_config(app.clone());
    let trimmed = query.trim();

    let dest = if trimmed.starts_with('@') {
        aliases.get(&trimmed[1..].to_lowercase()).cloned()
            .unwrap_or_else(|| format!("{}{}", config.search_engine, query.replace(' ', "+")))
    } else if (query.contains('.') && !query.contains(' ')) || query.starts_with("http") {
        if query.starts_with("http") { query } else { format!("https://{}", query) }
    } else {
        format!("{}{}", config.search_engine, query.replace(' ', "+"))
    };
    let _ = open::that(dest);
}

#[command] pub async fn get_installed_apps() -> Vec<AppItem> { scanner::get_apps() }
#[command] pub fn launch_app(path: String) { let _ = open::that(path); }

#[command]
pub fn get_aliases(app: AppHandle) -> HashMap<String, String> {
    let path = app.path().app_config_dir().unwrap().join("aliases.json");
    fs::read_to_string(path).map(|c| serde_json::from_str(&c).unwrap_or_default()).unwrap_or_default()
}

#[command]
pub fn save_aliases(app: AppHandle, aliases: HashMap<String, String>) {
    let dir = app.path().app_config_dir().unwrap();
    let _ = fs::create_dir_all(&dir);
    let _ = fs::write(dir.join("aliases.json"), serde_json::to_string_pretty(&aliases).unwrap());
}

#[command] pub fn get_config(app: AppHandle) -> Config {
    let path = app.path().app_config_dir().unwrap().join("config.json");
    fs::read_to_string(path).map(|c| serde_json::from_str(&c).unwrap_or(Config { search_engine:"https://google.com/search?q=".into(),first_run_complete:false, username: None, theme: None }))
    .unwrap_or(Config { search_engine: "https://google.com/search?q=".into(), first_run_complete: false, username: None, theme: None })
}

#[command] pub fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&dir);
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}