use log::info;
use serde::{Deserialize, Serialize};

use crate::shared::get_data_path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub api: SettingsAPI,
    pub autostart: bool,
    pub keyboard_hotkeys: Vec<SettingsKeyboardHotkeys>,
    pub log_level: String,
    pub media: SettingsMedia,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsAPI {
    pub token: String,
    pub port: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsKeyboardHotkeys {
    pub name: String,
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsMedia {
    pub directories: Vec<SettingsMediaDirectories>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsMediaDirectories {
    pub name: String,
    pub path: String,
}

fn create_settings() -> Settings {
    // Create a uuid v4 token
    let token = uuid::Uuid::new_v4().to_string();

    // Create settings from {config_path}\settings.json
    let settings = Settings {
        api: SettingsAPI {
            token: token.to_string(),
            port: 9170,
        },
        autostart: false,
        keyboard_hotkeys: vec![],
        log_level: "INFO".to_string(),
        media: SettingsMedia {
            directories: vec![],
        },
    };

    // Create settings string
    let settings_string = serde_json::to_string(&settings).unwrap();

    info!("Creating settings file: {}", settings_string);

    // Write settings to {config_path}\settings.json
    let settings_path = format!("{}/settings.json", get_data_path());
    std::fs::write(settings_path, settings_string).unwrap();

    settings
}

#[tauri::command]
pub fn get_settings() -> Settings {
    // Read settings from {config_path}\settings.json
    let settings_path = format!("{}/settings.json", get_data_path());
    if !std::path::Path::new(&settings_path).exists() {
        return create_settings();
    }

    let settings = std::fs::read_to_string(settings_path);
    if settings.is_err() {
        return create_settings();
    }
    let settings = serde_json::from_str(&settings.unwrap());
    if settings.is_err() {
        return create_settings();
    }

    settings.unwrap()
}

pub fn update_settings(settings: &Settings) {
    // Write settings to {config_path}\settings.json
    let settings_string = serde_json::to_string(settings).unwrap();
    let settings_path = format!("{}/settings.json", get_data_path());
    std::fs::write(settings_path, settings_string).unwrap();
}
