use log::{info, warn};
use std::error::Error;

use crate::{
    resources::start_application,
    settings::{get_settings, Settings},
};

pub const BACKEND_HOST: &str = "127.0.0.1";

pub async fn keep_backend_alive() {
    // Get settings
    let settings: Settings = get_settings();

    let base_url = format!("http://{}:{}", BACKEND_HOST, settings.api.port.to_string());

    // Check if the backend server is running
    let backend_active = check_backend(base_url.clone()).await;
    if backend_active.is_err() {
        // Stop the backend server if running
        info!("Stopping any lingering backend processes..");
        stop_backend().unwrap();

        // Start the backend server
        warn!("Backend server is not running. Starting it..");
        let backend_start = start_backend().await;
        if backend_start.is_err() {
            info!("Failed to start the backend server");
            std::process::exit(1);
        }
    }
}

pub async fn check_backend(base_url: String) -> Result<(), Box<dyn Error>> {
    info!("Checking backend server: {}/", base_url);

    // Check if the backend server is running
    let response = reqwest::Client::new()
        .get(format!("{}/", base_url))
        .send()
        .await?;

    if response.status().is_success() {
        info!("Backend server is already running");
        Ok(())
    } else {
        info!("3");
        Err(format!("Backend server is not running").into())
    }
}

async fn start_backend() -> Result<(), Box<dyn Error>> {
    let result = start_application(
        "_up_/dist/systembridgebackend/systembridgebackend".to_string(),
        None,
        true,
    );
    if result.is_err() {
        return Err("Failed to start the backend server".into());
    }

    info!("Backend server started. Waiting for it to be ready..");

    Ok(())
}

pub fn stop_backend() -> Result<(), Box<dyn Error>> {
    // Find any running backend server processes
    sysinfo::set_open_files_limit(0);
    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    for (pid, process) in sys.processes() {
        let process_name = process.name().to_str();
        match process_name {
            None => continue,
            Some(process_name) => {
                if process_name.contains("systembridgebac")
                    || process_name.contains("systembridgebackend")
                {
                    info!("Killing process: {} ({})", process_name, pid);
                    process.kill();
                }
            }
        }
    }

    Ok(())
}
