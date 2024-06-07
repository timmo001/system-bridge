// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod autostart;
mod event;
mod gui;
mod logger;
mod modules;
mod run;
mod settings;
mod shared;
mod websocket;

use crate::run::run;
use ctrlc;
use log::info;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);

        info!("Ctrl+C received, exiting application");
        std::process::exit(0);
    })
    .expect("Error setting Ctrl-C handler");

    while running.load(Ordering::SeqCst) {
        run().await;
    }
}
