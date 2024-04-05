use log::info;
use platform_dirs::AppDirs;

pub fn get_data_path() -> String {
    // Get data path from {localappdata}\timmo001\systembridge
    let app_dirs = AppDirs::new(Some("timmo001"), true).unwrap();
    let data_path = app_dirs.data_dir.to_str().unwrap().to_string();
    info!("Data path: {}", data_path);

    let path = format!("{}/systembridge", data_path);

    if !std::path::Path::new(&path).exists() {
        std::fs::create_dir_all(&path).unwrap();
    }

    path
}
