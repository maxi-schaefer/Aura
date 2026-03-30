use std::{collections::HashMap, fs, path::PathBuf};
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, command, Manager};
use rayon::prelude::*;
use walkdir::WalkDir;
use crate::scanner;

#[derive(Serialize, Clone)]
pub struct AppItem { pub name: String, pub path: String, pub icon: Option<String> }

#[derive(Serialize, Clone)]
pub struct FileItem { pub name: String, pub path: String, pub is_dir: bool, pub icon: Option<String> }

#[derive(Serialize, Deserialize)]
pub struct Config { pub search_engine: String }

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
    fs::read_to_string(path).map(|c| serde_json::from_str(&c).unwrap_or(Config { search_engine: "https://google.com/search?q=".into() }))
        .unwrap_or(Config { search_engine: "https://google.com/search?q=".into() })
}

#[command] pub fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&dir);
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}