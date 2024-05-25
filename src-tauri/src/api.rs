use std::error::Error;
use log::info;

use crate::settings::{get_settings, Settings};

pub async fn setup_api() -> Result<(), Box<dyn Error>> {
    // Get settings
    let settings: Settings = get_settings();

    info!("API Port: {}", settings.api.port);

    Ok(())
}