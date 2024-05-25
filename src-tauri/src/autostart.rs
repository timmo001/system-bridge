use log::info;
use std::error::Error;
use tauri::App;
use tauri_plugin_autostart::ManagerExt;

use crate::settings::{get_settings, Settings};

pub fn setup_autostart(app: &mut App) -> Result<(), Box<dyn Error>> {
    // Get settings
    let settings: Settings = get_settings();

    info!("Autostart: {}", settings.autostart);

    // Get the autostart manager
    let autostart_manager: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager> =
        app.autolaunch();

    if settings.autostart {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    Ok(())
}
