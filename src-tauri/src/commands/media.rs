use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::command;
use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;
use windows::Storage::Streams::{Buffer, DataReader, InputStreamOptions};

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
    tokio::task::spawn_blocking(|| futures::executor::block_on(run_get_now_playing_raw()))
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

    let properties = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
    let is_playing = playback_info
        .PlaybackStatus()
        .map(|s| s.0 == 4)
        .unwrap_or(false);

    let mut thumbnail_base64 = None;
    if let Ok(thumbnail_ref) = properties.Thumbnail() {
        if let Ok(stream) = thumbnail_ref
            .OpenReadAsync()
            .map_err(|e| e.to_string())?
            .await
        {
            let content_type = stream
                .ContentType()
                .map(|s| s.to_string())
                .unwrap_or_else(|_| "image/png".into());
            let size = stream.Size().unwrap_or(0) as u32;
            if size > 0 {
                let buffer = Buffer::Create(size).map_err(|e| e.to_string())?;
                let _ = stream
                    .ReadAsync(&buffer, size, InputStreamOptions::None)
                    .map_err(|e| e.to_string())?
                    .await;
                let reader = DataReader::FromBuffer(&buffer).map_err(|e| e.to_string())?;
                let mut bytes = vec![0u8; size as usize];
                let _ = reader.ReadBytes(&mut bytes);
                thumbnail_base64 = Some(format!(
                    "data:{};base64,{}",
                    content_type,
                    general_purpose::STANDARD.encode(bytes)
                ));
            }
        }
    }

    let timeline = session.GetTimelineProperties().ok();
    Ok(Some(MediaInfo {
        title: properties
            .Title()
            .map(|s| s.to_string())
            .unwrap_or_else(|_| "Unknown".into()),
        artist: properties
            .Artist()
            .map(|s| s.to_string())
            .unwrap_or_else(|_| "Unknown".into()),
        album: properties
            .AlbumTitle()
            .map(|s| s.to_string())
            .unwrap_or_default(),
        thumbnail: thumbnail_base64,
        is_playing,
        position: timeline
            .as_ref()
            .map(|t| t.Position().unwrap_or_default().Duration / 10_000_000)
            .unwrap_or(0) as u64,
        duration: timeline
            .as_ref()
            .map(|t| t.EndTime().unwrap_or_default().Duration / 10_000_000)
            .unwrap_or(0) as u64,
        source: session
            .SourceAppUserModelId()
            .map(|s| s.to_string())
            .unwrap_or_default(),
    }))
}

#[command]
pub async fn media_command(action: String) -> Result<(), String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;

    if let Ok(session) = manager.GetCurrentSession() {
        match action.as_str() {
            "play_pause" => {
                let _ = session.TryTogglePlayPauseAsync();
            }
            "next" => {
                let _ = session.TrySkipNextAsync();
            }
            "prev" => {
                let _ = session.TrySkipPreviousAsync();
            }
            _ => {}
        }
    }
    Ok(())
}
