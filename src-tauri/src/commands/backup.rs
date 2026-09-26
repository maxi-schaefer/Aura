use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::{command, AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::commands::system::{get_aliases, get_config, Config};
use crate::setup;

/// Bumped only when the on-disk shape changes incompatibly.
const BUNDLE_VERSION: u32 = 1;

/// Everything Aura persists, in one portable file.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SettingsBundle {
    pub version: u32,
    /// Which Aura wrote the file; informational only.
    #[serde(default)]
    pub app_version: String,
    /// Both are optional so a hand-trimmed file still imports.
    #[serde(default)]
    pub config: Option<Config>,
    #[serde(default)]
    pub aliases: Option<HashMap<String, String>>,
}

/// What an import actually changed, so the UI can say so and resync.
#[derive(Serialize, Clone, Debug)]
pub struct ImportSummary {
    pub config_imported: bool,
    pub aliases_imported: usize,
    /// The config now in effect, for the frontend to adopt without a reload.
    pub config: Config,
}

fn default_file_name() -> String {
    // Cheap YYYY-MM-DD without pulling in a date crate.
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let days = secs / 86_400;
    let (mut y, mut remaining) = (1970i64, days as i64);
    loop {
        let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        let len = if leap { 366 } else { 365 };
        if remaining < len {
            break;
        }
        remaining -= len;
        y += 1;
    }

    let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let months = [
        31,
        if leap { 29 } else { 28 },
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ];

    let mut m = 0;
    while m < 12 && remaining >= months[m] {
        remaining -= months[m];
        m += 1;
    }

    format!("aura-settings-{y:04}-{:02}-{:02}.json", m + 1, remaining + 1)
}

/// Writes config and aliases to a file the user chooses.
///
/// Returns the chosen path, or None when the dialog was cancelled.
#[command]
pub async fn export_settings(app: AppHandle) -> Result<Option<String>, String> {
    let bundle = SettingsBundle {
        version: BUNDLE_VERSION,
        app_version: app.package_info().version.to_string(),
        config: Some(get_config(app.clone())),
        aliases: Some(get_aliases(app.clone())),
    };

    let Some(target) = app
        .dialog()
        .file()
        .set_file_name(&default_file_name())
        .add_filter("JSON", &["json"])
        .blocking_save_file()
    else {
        return Ok(None);
    };

    let json = serde_json::to_string_pretty(&bundle).map_err(|e| e.to_string())?;
    let path = target.to_string();
    fs::write(&path, json).map_err(|e| format!("Could not write {path}: {e}"))?;

    Ok(Some(path))
}

/// Restores config and aliases from a previously exported file.
///
/// Returns None when the dialog was cancelled.
#[command]
pub async fn import_settings(app: AppHandle) -> Result<Option<ImportSummary>, String> {
    let Some(source) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = source.to_string();
    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Could not read {path}: {e}"))?;

    let bundle: SettingsBundle = serde_json::from_str(&contents)
        .map_err(|_| "That file is not an Aura settings export.".to_string())?;

    if bundle.version > BUNDLE_VERSION {
        return Err(format!(
            "This file was written by a newer Aura (format {}). Update Aura first.",
            bundle.version
        ));
    }

    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let summary = apply_bundle(&dir, bundle, || get_config(app.clone()))?;

    if summary.config_imported {
        // Picks up an imported main_shortcut immediately.
        setup::refresh_global_shortcut(&app);
    }

    Ok(Some(summary))
}

/// Writes a bundle into the config directory.
///
/// Split out from import_settings so it can be exercised without a file
/// dialog; `current` supplies the config to keep when the bundle has none.
fn apply_bundle(
    dir: &std::path::Path,
    bundle: SettingsBundle,
    current: impl FnOnce() -> Config,
) -> Result<ImportSummary, String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;

    let mut aliases_imported = 0;
    if let Some(aliases) = bundle.aliases {
        aliases_imported = aliases.len();
        let json = serde_json::to_string_pretty(&aliases).map_err(|e| e.to_string())?;
        fs::write(dir.join("aliases.json"), json).map_err(|e| e.to_string())?;
    }

    let config_imported = bundle.config.is_some();
    let config = match bundle.config {
        Some(mut imported) => {
            // The user is importing from inside Settings, so they are past
            // setup; a false flag in the file must not send them back to it.
            imported.first_run_complete = true;

            let json = serde_json::to_string_pretty(&imported).map_err(|e| e.to_string())?;
            fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;

            imported
        }
        None => current(),
    };

    Ok(ImportSummary {
        config_imported,
        aliases_imported,
        config,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_config() -> Config {
        Config {
            search_engine: "https://example.com/?q=".into(),
            username: Some("tester".into()),
            first_run_complete: true,
            theme: Some("nord".into()),
            window_mode: Some("expanded".into()),
            main_shortcut: Some("Ctrl+Space".into()),
        }
    }

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("aura_backup_{name}"));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn exported_bundle_imports_back_through_a_real_file() {
        let dir = temp_dir("roundtrip");
        fs::create_dir_all(&dir).unwrap();

        // Exactly what export_settings serialises.
        let exported = SettingsBundle {
            version: BUNDLE_VERSION,
            app_version: "0.0.1".into(),
            config: Some(sample_config()),
            aliases: Some(HashMap::from([
                ("gh".into(), "github.com".into()),
                ("yt".into(), "youtube.com".into()),
            ])),
        };
        let file = dir.join("export.json");
        fs::write(&file, serde_json::to_string_pretty(&exported).unwrap()).unwrap();

        // Exactly what import_settings parses.
        let parsed: SettingsBundle =
            serde_json::from_str(&fs::read_to_string(&file).unwrap()).unwrap();

        let target = temp_dir("roundtrip_target");
        let summary = apply_bundle(&target, parsed, sample_config).unwrap();

        assert!(summary.config_imported);
        assert_eq!(summary.aliases_imported, 2);
        assert_eq!(summary.config.theme.as_deref(), Some("nord"));
        assert_eq!(summary.config.main_shortcut.as_deref(), Some("Ctrl+Space"));

        // Both files land where get_config and get_aliases will read them.
        let written: Config =
            serde_json::from_str(&fs::read_to_string(target.join("config.json")).unwrap())
                .unwrap();
        assert_eq!(written.search_engine, "https://example.com/?q=");

        let aliases: HashMap<String, String> =
            serde_json::from_str(&fs::read_to_string(target.join("aliases.json")).unwrap())
                .unwrap();
        assert_eq!(aliases["gh"], "github.com");
    }

    #[test]
    fn import_never_reopens_the_setup_screen() {
        let dir = temp_dir("firstrun");
        let mut config = sample_config();
        config.first_run_complete = false;

        let summary = apply_bundle(
            &dir,
            SettingsBundle {
                version: BUNDLE_VERSION,
                app_version: String::new(),
                config: Some(config),
                aliases: None,
            },
            sample_config,
        )
        .unwrap();

        assert!(summary.config.first_run_complete, "would re-run setup");
    }

    #[test]
    fn sections_absent_from_the_bundle_are_left_alone() {
        let dir = temp_dir("partial");

        // Aliases only: the current config is kept and no config.json written.
        let summary = apply_bundle(
            &dir,
            SettingsBundle {
                version: BUNDLE_VERSION,
                app_version: String::new(),
                config: None,
                aliases: Some(HashMap::from([("gh".into(), "github.com".into())])),
            },
            sample_config,
        )
        .unwrap();

        assert!(!summary.config_imported);
        assert_eq!(summary.aliases_imported, 1);
        assert_eq!(summary.config.theme.as_deref(), Some("nord"));
        assert!(!dir.join("config.json").exists(), "config.json was written");

        // Config only: aliases.json is not touched.
        let dir2 = temp_dir("partial2");
        let summary2 = apply_bundle(
            &dir2,
            SettingsBundle {
                version: BUNDLE_VERSION,
                app_version: String::new(),
                config: Some(sample_config()),
                aliases: None,
            },
            sample_config,
        )
        .unwrap();

        assert_eq!(summary2.aliases_imported, 0);
        assert!(!dir2.join("aliases.json").exists(), "aliases.json was written");
    }

    #[test]
    fn export_file_name_is_dated_and_json() {
        let name = default_file_name();
        assert!(name.starts_with("aura-settings-"), "{name}");
        assert!(name.ends_with(".json"), "{name}");

        // aura-settings-YYYY-MM-DD.json
        let stem = name
            .trim_start_matches("aura-settings-")
            .trim_end_matches(".json");
        let parts: Vec<&str> = stem.split('-').collect();
        assert_eq!(parts.len(), 3, "{name}");

        let year: i32 = parts[0].parse().unwrap();
        let month: u32 = parts[1].parse().unwrap();
        let day: u32 = parts[2].parse().unwrap();

        assert!((2024..2100).contains(&year), "year {year}");
        assert!((1..=12).contains(&month), "month {month}");
        assert!((1..=31).contains(&day), "day {day}");
    }

    #[test]
    fn bundle_survives_a_round_trip() {
        let bundle = SettingsBundle {
            version: BUNDLE_VERSION,
            app_version: "0.0.1".into(),
            config: Some(Config {
                search_engine: "https://example.com/?q=".into(),
                username: Some("tester".into()),
                first_run_complete: true,
                theme: Some("nord".into()),
                window_mode: Some("expanded".into()),
                main_shortcut: Some("Ctrl+Space".into()),
            }),
            aliases: Some(HashMap::from([("gh".into(), "github.com".into())])),
        };

        let json = serde_json::to_string(&bundle).unwrap();
        let back: SettingsBundle = serde_json::from_str(&json).unwrap();

        assert_eq!(back.version, BUNDLE_VERSION);
        assert_eq!(back.config.unwrap().theme.unwrap(), "nord");
        assert_eq!(back.aliases.unwrap()["gh"], "github.com");
    }

    #[test]
    fn partial_and_invalid_files_are_handled() {
        // Missing sections are allowed and simply left alone on import.
        let minimal: SettingsBundle = serde_json::from_str(r#"{"version":1}"#).unwrap();
        assert!(minimal.config.is_none());
        assert!(minimal.aliases.is_none());
        assert_eq!(minimal.app_version, "");

        // Aliases only, no config.
        let aliases_only: SettingsBundle =
            serde_json::from_str(r#"{"version":1,"aliases":{"yt":"youtube.com"}}"#).unwrap();
        assert!(aliases_only.config.is_none());
        assert_eq!(aliases_only.aliases.unwrap().len(), 1);

        // Anything without a version is not one of our exports.
        assert!(serde_json::from_str::<SettingsBundle>(r#"{"packages":[]}"#).is_err());
        assert!(serde_json::from_str::<SettingsBundle>("not json").is_err());
    }
}
