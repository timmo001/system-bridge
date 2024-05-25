// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod api_routes;
mod event;
// mod autostart;
// mod gui;
mod modules;
mod settings;
mod shared;
// mod websocket_client;
mod websocket;

use fern::colors::{Color, ColoredLevelConfig};
use log::{error, info, LevelFilter};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use crate::{api::setup_api, shared::get_data_path};

#[tokio::main]
async fn main() {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);

        info!("Exiting application");
        std::process::exit(0);
    })
    .unwrap();
    while running.load(Ordering::SeqCst) {
        run().await;
    }
}

async fn run() {
    let setup_logger_result = setup_logger();
    if setup_logger_result.is_err() {
        error!("Failed to setup logger: {:?}", setup_logger_result.err());
        info!("Exiting application");
        std::process::exit(1);
    }

    let args: Vec<String> = std::env::args().collect();

    // Parse the arguments
    let mut cli = false;
    let mut no_gui = false;
    for arg in args.iter() {
        match arg.as_str() {
            "--cli" => cli = true,
            "--no-gui" => no_gui = true,
            _ => (),
        }
    }

    if cli {
        // TODO: Add CLI interface
        info!("CLI interface is not implemented yet..");

        // Exit for now
        info!("Exiting application (CLI)");
        std::process::exit(0);
    }

    // Setup the backend server
    info!("Setting up api server..");
    let setup_api_result = setup_api().await;
    if setup_api_result.is_err() {
        error!("Failed to setup api server: {:?}", setup_api_result.err());
        info!("Exiting application (API)");
        std::process::exit(1);
    }

    if no_gui {
        info!("GUI is disabled");
    } else {
        // Setup the GUI
        // TODO: Reinstate GUI
        // setup_gui().await;
    }

    // Nothing is running, exit the application
    info!("All tasks are completed, exiting application");
    std::process::exit(0);
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
                "{} {} ({}) [{}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                colors.color(record.level()),
                std::thread::current().name().unwrap_or(
                    &format!("{:?}", std::thread::current().id())
                        .replace("ThreadId(", "")
                        .replace(")", "")
                ),
                record.target(),
                message
            ))
        })
        .chain(std::io::stdout());

    let file_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{} {} {} {}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                record.level(),
                std::thread::current().name().unwrap_or(
                    &format!("{:?}", std::thread::current().id())
                        .replace("ThreadId(", "")
                        .replace(")", "")
                ),
                record.target(),
                message
            ))
        })
        .chain(
            std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .append(false)
                .open(log_path.clone())?,
        );

    // Create a new logger
    // Configure logger at runtime
    fern::Dispatch::new()
        // Add blanket level filter -
        .level(LevelFilter::Info)
        // - and per-module overrides
        .level_for("hyper", log::LevelFilter::Info)
        // Output to stdout, files, and other Dispatch configurations
        .chain(stdout_config)
        .chain(file_config)
        // Apply globally
        .apply()?;

    info!("--------------------------------------------------------------------------------");
    info!(
        "{} ({})",
        env!("CARGO_PKG_DESCRIPTION"),
        env!("CARGO_PKG_VERSION")
    );
    info!("--------------------------------------------------------------------------------");
    info!("Log is available at {}", log_path.clone());

    Ok(())
}
