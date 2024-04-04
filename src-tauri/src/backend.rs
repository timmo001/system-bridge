use reqwest::Client;
use std::error::Error;
use std::time::Duration;

use crate::{
    resources::start_application,
    settings::{get_settings, Settings},
};

pub const BACKEND_HOST: &str = "127.0.0.1";

pub async fn setup_backend() -> Result<(), Box<dyn std::error::Error>> {
    println!("Setting up backend server..");

    // Get settings
    let settings: Settings = get_settings();

    let base_url = format!("http://{}:{}", BACKEND_HOST, settings.api.port.to_string());

    // Check if the backend server is running
    let backend_active = check_backend(base_url.clone()).await;
    if !backend_active.is_ok() {
        // Start the backend server
        let backend_start = start_backend().await;
        if !backend_start.is_ok() {
            println!("Failed to start the backend server");
            std::process::exit(1);
        }
    }

    Ok(())
}

pub async fn check_backend(base_url: String) -> Result<(), Box<dyn Error>> {
    println!("Checking backend server: {}/", base_url);

    // Check if the backend server is running
    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;
    let response = client.get(format!("{}/", base_url)).send().await?;

    if response.status().is_success() {
        println!("Backend server is already running");
        Ok(())
    } else {
        Err(format!("Backend server is not running").into())
    }
}

async fn start_backend() -> Result<(), Box<dyn Error>> {
    start_application(
        "_up_/dist/systembridgebackend/systembridgebackend".to_string(),
        None,
        true,
    )?;

    println!("Backend server started");

    Ok(())
}

pub fn stop_backend() -> Result<(), Box<dyn Error>> {
    println!("Stopping backend server");

    // Find any running backend server processes
    sysinfo::set_open_files_limit(0);
    let mut sys = sysinfo::System::new();
    sys.refresh_processes();

    for (pid, process) in sys.processes() {
        if process.name().contains("systembridgebac")
            || process.name().contains("systembridgebackend")
        {
            println!("Killing process: {}", pid);
            process.kill();
        }
    }

    Ok(())
}
