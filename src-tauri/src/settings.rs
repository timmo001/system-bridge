use platform_dirs::AppDirs;
use serde::{Deserialize, Serialize};

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

pub fn get_config_path() -> String {
    // Get config path from {localappdata}\timmo001\systembridge
    let app_dirs = AppDirs::new(Some("timmo001"), true).unwrap();
    let data_path = app_dirs.data_dir.to_str().unwrap().to_string();
    println!("Data path: {}", data_path);

    let path = format!("{}/systembridge", data_path);

    if !std::path::Path::new(&path).exists() {
        std::fs::create_dir_all(&path).unwrap();
    }

    path
}

fn create_settings() -> Settings {
    // Get config path from {localappdata}\timmo001\systembridge
    let config_path = get_config_path();

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

    println!("Creating settings file: {}", settings_string);

    // Write settings to {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
    std::fs::write(settings_path, settings_string).unwrap();

    settings
}

#[tauri::command]
pub fn get_settings() -> Settings {
    // Get install directory from &localappdata%\timmo001\systembridge
    let config_path = get_config_path();

    // Read settings from {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
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
