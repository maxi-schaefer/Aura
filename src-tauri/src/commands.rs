use std::{collections::HashMap, fs};

use serde::Serialize;
use tauri::{AppHandle, Manager, command};
use crate::scanner;

#[derive(Serialize, Clone)]
pub struct AppItem {
    pub name: String,
    pub path: String,
}

#[command]
pub fn search_web(app: AppHandle, query: String) {
    let aliases = get_aliases(app);
    let trimmed = query.trim();

    let destination = if trimmed.starts_with('@') {
        let alias_key = trimmed[1..].to_lowercase();
        
        if let Some(url) = aliases.get(&alias_key) {
            url.clone()
        } else {
            format!("https://www.google.com/search?q={}", query.replace(' ', "+"))
        }
    } 
    else if (query.contains('.') && !query.contains(' ')) || query.starts_with("http") {
        if query.starts_with("http") { query } else { format!("https://{}", query) }
    } else {
        format!("https://www.google.com/search?q={}", query.replace(' ', "+"))
    };

    let _ = open::that(destination);
}

#[command]
pub async fn get_installed_apps() -> Vec<AppItem> {
    scanner::get_apps()
}

#[command]
pub fn launch_app(path: String) {
    let _ = open::that(path);
}

#[command]
pub fn get_aliases(app: AppHandle) -> HashMap<String, String> {
    let path = app.path().app_config_dir().unwrap().join("aliases.json");
    if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

#[command]
pub fn save_aliases(app: AppHandle, aliases: HashMap<String, String>) {
    let config_dir = app.path().app_config_dir().unwrap();
    let _ = fs::create_dir_all(&config_dir);
    let path = config_dir.join("aliases.json");
    let _ = fs::write(path, serde_json::to_string_pretty(&aliases).unwrap());
}