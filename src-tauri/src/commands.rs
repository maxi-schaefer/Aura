use serde::Serialize;
use tauri::command;
use crate::scanner;

#[derive(Serialize, Clone)]
pub struct AppItem {
    pub name: String,
    pub path: String,
}

#[command]
pub fn search_web(query: String) {
    let destination = if (query.contains('.') && !query.contains(' ')) || query.starts_with("http") {
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