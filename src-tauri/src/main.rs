// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod autostart;
mod backend;
mod gui;
mod resources;
mod settings;
mod shared;
mod websocket;

use fern::colors::{Color, ColoredLevelConfig};
use log::{info, LevelFilter};
use std::thread;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::time::interval;

use crate::{
    backend::setup_backend, gui::setup_gui, resources::start_application, shared::get_data_path,
};

#[tokio::main]
async fn main() {
    setup_logger().unwrap();

    let args: Vec<String> = std::env::args().collect();

    // Parse the arguments
    let mut cli = false;
    let mut no_backend = false;
    let mut no_gui = false;
    for arg in args.iter() {
        match arg.as_str() {
            "--cli" => cli = true,
            "--no-backend" => no_backend = true,
            "--no-gui" => no_gui = true,
            _ => (),
        }
    }

    if cli {
        let cli_args = args[2..args.len()].to_vec();

        // Call the CLI application
        start_application(
            "_up_/dist/systembridgecli/systembridgecli".to_string(),
            Some(cli_args),
            false,
        )
        .unwrap();

        std::process::exit(0);
    }

    if no_backend && no_gui {
        info!("Both backend and GUI are disabled. Nothing to do");
        std::process::exit(0);
    }

    if no_backend {
        info!("Backend is disabled");
    } else {
        // Setup the backend server
        let _handle = thread::spawn(move || {
            let rt = Runtime::new().unwrap();
            rt.block_on(async {
                // Check backend server is running every 60 seconds
                let mut interval: tokio::time::Interval = interval(Duration::from_secs(60));
                loop {
                    // Setup the backend server
                    setup_backend().await;

                    info!("Waiting for 60 seconds before checking the backend server again");
                    interval.tick().await;
                }
            });
        });
    }

    if no_gui {
        info!("GUI is disabled");

        // Wait forever
        loop {
            thread::park();
        }
    } else {
        // Setup the GUI
        setup_gui().await;
    }
}
fn setup_logger() -> Result<(), fern::InitError> {
    let log_path = format!("{}/systembridge.log", get_data_path());

    let colors = ColoredLevelConfig::new()
        .trace(Color::BrightBlack)
        .debug(Color::Cyan)
        .info(Color::Green)
        .warn(Color::Yellow)
        .error(Color::Red);

    let stdout_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                colors.color(record.level()),
                record.target(),
                message
            ))
        })
        .chain(std::io::stdout());

    let file_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{} {} {}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                record.level(),
                record.target(),
                message
            ))
        })
        .chain(fern::log_file(log_path.clone())?);

    // Create a new logger
    // Configure logger at runtime
    fern::Dispatch::new()
        // Add blanket level filter -
        .level(LevelFilter::Debug)
        // - and per-module overrides
        .level_for("hyper", log::LevelFilter::Info)
        // Output to stdout, files, and other Dispatch configurations
        .chain(stdout_config)
        .chain(file_config)
        // Apply globally
        .apply()?;

    info!("--------------------------------------------------------------------------------");
    info!("System Bridge {}", env!("CARGO_PKG_VERSION"));
    info!("--------------------------------------------------------------------------------");
    info!("Log is available at {}", log_path.clone());

    Ok(())
}
