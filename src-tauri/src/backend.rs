use reqwest::Client;
use std::process::Command;
use std::time::Duration;
use std::{error::Error, path::Path};

use crate::settings::{get_settings, Settings};

pub const BACKEND_HOST: &str = "127.0.0.1";

pub async fn setup_backend() -> Result<(), Box<dyn std::error::Error>> {
    // Get settings
    let settings: Settings = get_settings();

    let base_url = format!("http://{}:{}", BACKEND_HOST, settings.api.port.to_string());

    // Check if the backend server is running
    let backend_active = check_backend(base_url.clone()).await;
    if !backend_active.is_ok() {
        // Start the backend server
        let backend_start = start_backend(base_url.clone()).await;
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

async fn start_backend(base_url: String) -> Result<(), Box<dyn Error>> {
    // If package installed and linux, we need to use /usr/lib/system-bridge/_up_/dist/systembridgebackend/systembridgebackend
    if cfg!(target_os = "linux")
        && std::path::Path::new(
            "/usr/lib/system-bridge/_up_/dist/systembridgebackend/systembridgebackend",
        )
        .exists()
    {
        let backend_path =
            Path::new("/usr/lib/system-bridge/_up_/dist/systembridgebackend/systembridgebackend");

        let backend_path_str = backend_path.to_str().unwrap();
        println!("Starting backend server from lib: {}", backend_path_str);
        let process = Command::new(backend_path_str).spawn();
        if process.is_err() {
            return Err("Failed to start the backend server".into());
        }
    } else {
        let exe = std::env::current_exe()?;
        let dir = exe.parent().expect("Executable must be in some directory");
        let backend_dir: String = format!(
            "{}/_up_/dist/systembridgebackend/systembridgebackend",
            dir.to_str().unwrap()
        );
        let backend_path = Path::new(&backend_dir);

        let backend_path_str = backend_path.to_str().unwrap();
        println!("Starting backend server: {}", backend_path_str);
        let process = Command::new(backend_path_str).spawn();
        if process.is_err() {
            return Err("Failed to start the backend server".into());
        }
    }

    println!("Backend server started");

    // Wait for the backend server to start
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    // Check if the backend server is running
    let backend_active = check_backend(base_url.clone()).await;
    if !backend_active.is_ok() {
        return Err("Failed to start the backend server".into());
    }

    println!("Backend server is running");

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
