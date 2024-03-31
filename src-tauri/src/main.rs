// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod autostart;
mod backend;
mod gui;
mod settings;
mod websocket;

use crate::gui::setup_gui;

pub const BACKEND_HOST: &str = "127.0.0.1";

#[tokio::main]
async fn main() {
    setup_gui().await;
}
