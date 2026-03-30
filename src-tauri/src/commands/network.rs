use serde::Serialize;
use tauri::command;
use std::process::Command;

#[derive(Serialize, Debug)]
pub struct Beacon {
    pub ssid: String,
    pub signal: u8,
    pub channel: u16,
    pub bssid: String,
}

#[command]
pub async fn scan_neighborhood() -> Result<Vec<Beacon>, String> {
    let output = Command::new("netsh")
        .args(["wlan", "show", "networks", "mode=bssid"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut networks = Vec::new();
    let mut current_ssid = String::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("SSID") && !trimmed.contains("BSSID") {
            current_ssid = trimmed.split(':').nth(1).unwrap_or("Hidden").trim().to_string();
        } else if trimmed.starts_with("BSSID") {
            networks.push(Beacon {
                ssid: if current_ssid.is_empty() { "Hidden".into() } else { current_ssid.clone() },
                signal: 0,
                channel: 0,
                bssid: trimmed.splitn(2, ':').nth(1).unwrap_or("").trim().to_string(),
            });
        } else if trimmed.starts_with("Signal") {
            if let Some(last) = networks.last_mut() {
                let sig = trimmed.split(':').nth(1).unwrap_or("0").trim().replace('%', "");
                last.signal = sig.parse::<u8>().unwrap_or(0);
            }
        } else if trimmed.starts_with("Channel") {
            if let Some(last) = networks.last_mut() {
                last.channel = trimmed.split(':').nth(1).unwrap_or("0").trim().parse::<u16>().unwrap_or(0);
            }
        }
    }
    Ok(networks)
}