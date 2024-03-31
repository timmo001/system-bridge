// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod autostart;
mod backend;
mod gui;
mod resources;
mod settings;
mod websocket;

use std::thread;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::time::interval;

use crate::{backend::setup_backend, gui::setup_gui, resources::start_application};

#[tokio::main]
async fn main() {
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
        println!("Both backend and GUI are disabled. Nothing to do");
        std::process::exit(0);
    }

    if no_backend {
        println!("Backend is disabled");
    } else {
        // Setup the backend server
        let _handle = thread::spawn(move || {
            let rt = Runtime::new().unwrap();
            rt.block_on(async {
                // Setup the backend server
                setup_backend().await.unwrap();

                // Check backend server is running every 60 seconds
                let mut interval: tokio::time::Interval = interval(Duration::from_secs(60));
                loop {
                    println!("Waiting for 60 seconds before checking the backend server again");
                    interval.tick().await;

                    // Setup the backend server
                    setup_backend().await.unwrap();
                }
            });
        });
    }

    if no_gui {
        println!("GUI is disabled");

        // Wait forever
        loop {
            thread::park();
        }
    } else {
        // Setup the GUI
        setup_gui().await;
    }
}
