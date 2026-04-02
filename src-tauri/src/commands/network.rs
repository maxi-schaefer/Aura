use serde::Serialize;
use tauri::command;
use regex::Regex;
use lazy_static::lazy_static;
use std::collections::HashMap;

use crate::commands::system::create_hidden_command;

#[derive(Serialize, Debug, Clone)]
pub struct Beacon {
    pub ssid: String,
    pub signal: u8,
    pub dbm: i16,
    pub channel: u16,
    pub frequency: u32,
    pub band: String,
    pub bssid: String,
    pub vendor: String,
    pub security: String,
    pub radio: String,
    pub width: Option<u16>,
}

lazy_static! {
    static ref RE_SSID: Regex = Regex::new(r"^SSID\s+\d+\s*:\s*(.+)$").unwrap();
    static ref RE_AUTH: Regex = Regex::new(r"(?i)(?:Auth)\w*\s*:\s*(.+)$").unwrap(); 
    static ref RE_BSSID: Regex = Regex::new(r"([0-9a-f]{2}(:[0-9a-f]{2}){5})").unwrap();
    static ref RE_SIGNAL: Regex = Regex::new(r"(\d+)%").unwrap();
    static ref RE_CHANNEL: Regex = Regex::new(r"\b(\d{1,3})\b").unwrap();
    static ref RE_RADIO: Regex = Regex::new(r"802\.11[acnaxbe]+").unwrap();

    // Load and parse the OUI file into a Map once at startup
    static ref OUI_MAP: HashMap<String, String> = {
        let mut m = HashMap::new();
        // Ensure oui.txt is in your src folder or adjust path accordingly
        let data = include_str!("../assets/oui.txt");
        
        for line in data.lines() {
            // IEEE format: "XX-XX-XX   (hex)		VENDOR NAME"
            if line.contains("(hex)") {
                let parts: Vec<&str> = line.split("(hex)").collect();
                if parts.len() == 2 {
                    let oui = parts[0].replace("-", "").trim().to_uppercase();
                    let vendor = parts[1].trim().to_string();
                    m.insert(oui, vendor);
                }
            }
        }
        m
    };
}

#[command]
pub async fn scan_neighborhood() -> Result<Vec<Beacon>, String> {
    let output = create_hidden_command("netsh")
        .args(["wlan", "show", "networks", "mode=bssid"])
        .output()
        .map_err(|e| format!("netsh failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut networks = Vec::new();
    let mut current_ssid = "Hidden".to_string();
    let mut current_auth = "Open".to_string();

    for line in stdout.lines() {
        let trimmed = line.trim();

        if let Some(caps) = RE_SSID.captures(trimmed) {
            current_ssid = caps.get(1).unwrap().as_str().trim().to_string();
            continue;
        }

        if let Some(caps) = RE_AUTH.captures(trimmed) {
            current_auth = caps.get(1).unwrap().as_str().trim().to_string();
            continue;
        }

        if let Some(mat) = RE_BSSID.find(trimmed) {
            let bssid_str = mat.as_str().to_string();
            networks.push(Beacon {
                ssid: current_ssid.clone(),
                signal: 0,
                dbm: -100,
                channel: 0,
                frequency: 0,
                band: "Unknown".into(),
                bssid: bssid_str.clone(),
                vendor: lookup_vendor(&bssid_str),
                security: current_auth.clone(),
                radio: "Unknown".into(),
                width: None,
            });
            continue;
        }

        if let Some(last) = networks.last_mut() {
            if let Some(caps) = RE_SIGNAL.captures(trimmed) {
                if let Ok(sig) = caps[1].parse::<u8>() {
                    last.signal = sig;
                    last.dbm = -100 + (sig as i16 / 2);
                }
            }

            if trimmed.to_lowercase().contains("kanal") || trimmed.to_lowercase().contains("channel") {
                if let Some(caps) = RE_CHANNEL.captures(trimmed) {
                    if let Ok(ch) = caps[1].parse::<u16>() {
                        last.channel = ch;
                        last.frequency = match ch {
                            1..=13 => 2412 + ((ch - 1) as u32 * 5),
                            14 => 2484,
                            36..=165 => 5000 + (ch as u32 * 5),
                            _ => 0,
                        };
                        last.band = if last.frequency < 3000 { "2.4 GHz".into() } else { "5 GHz".into() };
                    }
                }
            }

            if let Some(mat) = RE_RADIO.find(trimmed) {
                last.radio = mat.as_str().to_string();
            }
        }
    }

    Ok(networks)
}

fn lookup_vendor(bssid: &str) -> String {
    let normalized = bssid.replace(":", "").to_uppercase();
    if normalized.len() < 6 { return "Unknown".to_string(); }
    let prefix = &normalized[0..6];

    OUI_MAP.get(prefix)
        .cloned()
        .unwrap_or_else(|| "Unknown Vendor".to_string())
}