// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod autostart;
mod backend;
mod gui;
mod settings;
mod websocket;

use std::thread;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::time::interval;

use crate::{backend::setup_backend, gui::setup_gui};

pub const BACKEND_HOST: &str = "127.0.0.1";

#[tokio::main]
async fn main() {
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

    // Setup the GUI
    setup_gui().await;
}
