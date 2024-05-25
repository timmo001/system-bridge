// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// mod autostart;
mod api;
mod api_routes;
mod event;
mod logger;
// mod gui;
mod modules;
mod settings;
mod shared;
// mod websocket_client;
mod websocket;

use log::{error, info};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tokio::runtime::Runtime;

use crate::{api::setup_api, logger::setup_logger};

#[tokio::main]
async fn main() {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);

        // Stop any running tasks

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

    // Create multiple threads to handle the different tasks
    let mut tasks: Vec<thread::JoinHandle<()>> = vec![];

    tasks.push(
        thread::Builder::new()
            .name("api".into())
            .spawn(|| {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    // Setup the api server
                    info!("Setting up api server..");
                    let setup_api_result = setup_api().await;
                    if setup_api_result.is_err() {
                        error!("Failed to setup api server: {:?}", setup_api_result.err());
                        info!("Exiting application (API)");
                        std::process::exit(1);
                    }
                });
            })
            .unwrap(),
    );

    tasks.push(
        thread::Builder::new()
            .name("modules".into())
            .spawn(|| {
                let modules = vec![
                    // modules::Module::Battery,
                    // modules::Module::CPU,
                    // modules::Module::Disks,
                    // modules::Module::Displays,
                    // modules::Module::GPUs,
                    // modules::Module::Media,
                    // modules::Module::Memory,
                    // modules::Module::Networks,
                    // modules::Module::Processes,
                    // modules::Module::Sensors,
                    modules::Module::System,
                ];

                // Run every 30 seconds
                let interval = std::time::Duration::from_secs(30);

                loop {
                    let rt = Runtime::new().unwrap();
                    rt.block_on(async {
                        // Update modules data
                        info!("Update modules data for: {:?}", modules);
                        let update_modules_result = modules::update_modules(&modules).await;
                        if update_modules_result.is_err() {
                            error!(
                                "Failed to update modules data: {:?}",
                                update_modules_result.err()
                            );
                        }
                    });

                    // Sleep for the interval
                    info!("Waiting for {} seconds before next run", interval.as_secs());
                    std::thread::sleep(interval);
                }
            })
            .unwrap(),
    );

    if no_gui {
        info!("GUI is disabled");
    } else {
        // Setup the GUI
        // TODO: Reinstate GUI
        // setup_gui().await;
    }

    // Wait for all tasks to complete
    for task in tasks {
        task.join().unwrap();
    }

    // Nothing is running, exit the application
    info!("All tasks are completed, exiting application");
    std::process::exit(0);
}
