use std::{collections::HashMap, fs};

use serde::Serialize;
use tauri::{AppHandle, Manager, command};
use crate::scanner;

use walkdir::WalkDir;
use std::path::PathBuf;

use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;
use windows::Storage::Streams::{Buffer, DataReader, InputStreamOptions};
use base64::{Engine as _, engine::general_purpose};

#[derive(Serialize, Clone)]
pub struct AppItem {
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Serialize, Clone)]
pub struct MediaInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub thumbnail: Option<String>,
    pub is_playing: bool,
    pub position: u64,
    pub duration: u64,
    pub source: String,
}

#[command]
pub async fn get_now_playing() -> Result<Option<MediaInfo>, String> {
    tokio::task::spawn_blocking(|| {
        futures::executor::block_on(run_get_now_playing_raw())
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn run_get_now_playing_raw() -> Result<Option<MediaInfo>, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    let session = match manager.GetCurrentSession() {
        Ok(s) => s,
        Err(_) => return Ok(None),
    };

    let properties = session.TryGetMediaPropertiesAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
    let is_playing = playback_info.PlaybackStatus().map(|s| s.0 == 4).unwrap_or(false);

    let mut thumbnail_base64 = None;

    if let Ok(thumbnail_ref) = properties.Thumbnail() {
        if let Ok(stream) = thumbnail_ref.OpenReadAsync().map_err(|e| e.to_string())?.await {
            let content_type = stream.ContentType().map(|s| s.to_string()).unwrap_or_else(|_| "image/png".into());
            let size = stream.Size().unwrap_or(0) as u32;

            if size > 0 {
                let buffer = Buffer::Create(size).map_err(|e| e.to_string())?;
                let _ = stream.ReadAsync(&buffer, size, InputStreamOptions::None)
                    .map_err(|e| e.to_string())?
                    .await;

                let reader = DataReader::FromBuffer(&buffer).map_err(|e| e.to_string())?;
                let mut bytes = vec![0u8; size as usize];
                let _ = reader.ReadBytes(&mut bytes);

                let b64 = general_purpose::STANDARD.encode(bytes);
                thumbnail_base64 = Some(format!("data:{};base64,{}", content_type, b64));
            }
        }
    }

    let timeline = session.GetTimelineProperties().ok();
    let position = timeline.as_ref().map(|t| t.Position().unwrap_or_default().Duration / 10_000_000).unwrap_or(0);
    let duration = timeline.as_ref().map(|t| t.EndTime().unwrap_or_default().Duration / 10_000_000).unwrap_or(0);
    let source = session.SourceAppUserModelId().map(|s| s.to_string()).unwrap_or_default();

    Ok(Some(MediaInfo {
        title: properties.Title().map(|s| s.to_string()).unwrap_or_else(|_| "Unknown".into()),
        artist: properties.Artist().map(|s| s.to_string()).unwrap_or_else(|_| "Unknown".into()),
        album: properties.AlbumTitle().map(|s| s.to_string()).unwrap_or_default(),
        thumbnail: thumbnail_base64,
        is_playing,
        position: position as u64,
        duration: duration as u64,
        source
    }))
}

#[command]
pub async fn media_command(action: String) -> Result<(), String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;

    if let Ok(session) = manager.GetCurrentSession() {
        match action.as_str() {
            "play_pause" => { let _ = session.TryTogglePlayPauseAsync(); },
            "next" => { let _ = session.TrySkipNextAsync(); },
            "prev" => { let _ = session.TrySkipPreviousAsync(); },
            _ => {}
        }
    }
    Ok(())
}

#[command]
pub async fn search_files(query: String) -> Vec<FileItem> {
    if query.is_empty() { return Vec::new(); }
    
    // Define search locations (Home directory)
    let home = dirs::home_dir().unwrap_or(PathBuf::from("/"));
    let search_paths = vec![
        home.join("Pictures"),
        home.join("Music"),
        home.join("Videos"),
        home.join("Documents"),
        home.join("Desktop"),
        home.join("Downloads"),
    ];

    let mut results = Vec::new();
    let query_l = query.to_lowercase();

    for path in search_paths {
        for entry in WalkDir::new(path)
            .max_depth(3) // Keep it fast
            .into_iter()
            .filter_map(|e| e.ok()) 
        {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.to_lowercase().contains(&query_l) {
                results.push(FileItem {
                    name,
                    path: entry.path().to_string_lossy().to_string(),
                    is_dir: entry.path().is_dir(),
                });
            }
            if results.len() > 15 { break; } // Cap results for UI snappiness
        }
        if results.len() > 15 { break; }
    }
    results
}

#[command]
pub fn search_web(app: AppHandle, query: String) {
    let aliases = get_aliases(app.clone());
    let trimmed = query.trim();
    let config = get_config(app.clone());

    let destination = if trimmed.starts_with('@') {
        let alias_key = trimmed[1..].to_lowercase();
        
        if let Some(url) = aliases.get(&alias_key) {
            url.clone()
        } else {
            format!("{}{}", config.search_engine, query.replace(' ', "+"))
        }
    } 
    else if (query.contains('.') && !query.contains(' ')) || query.starts_with("http") {
        if query.starts_with("http") { query } else { format!("https://{}", query) }
    } else {
        format!("{}{}", config.search_engine, query.replace(' ', "+"))
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

// --- Settings Module ---
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Config {
    pub search_engine: String,
}

#[command]
pub fn get_config(app: AppHandle) -> Config {
    let path = app.path().app_config_dir().unwrap().join("config.json");
    fs::read_to_string(path).map(|c| serde_json::from_str(&c).unwrap_or(default_config()))
    .unwrap_or_else(|_| default_config())
}

#[command]
pub fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&config_dir);
    let path = config_dir.join("config.json");
    
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn default_config() -> Config {
    Config { search_engine: "https://google.com/search?q=".into() }
}