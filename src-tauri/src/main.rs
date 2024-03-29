// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api;
mod autostart;
mod backend;
mod settings;
mod websocket;

use std::thread;
use std::time::Duration;
use tauri::PhysicalPosition;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::ClickType,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::ShellExt;
use tokio::runtime::Runtime;
use tokio::time::interval;

use crate::{
    autostart::setup_autostart,
    backend::{setup_backend, stop_backend},
    settings::{get_config_path, get_settings, Settings},
    websocket::setup_websocket_client,
};

pub const BACKEND_HOST: &str = "127.0.0.1";

const WINDOW_WIDTH: f64 = 1280.0;
const WINDOW_HEIGHT: f64 = 720.0;
const WINDOW_NOTIFICATION_WIDTH: f64 = 420.0;
const WINDOW_NOTIFICATION_HEIGHT: f64 = 48.0;

fn page_title_map() -> Vec<(&'static str, &'static str)> {
    vec![
        ("data", "Data"),
        ("settings", "Settings"),
        ("notification", "Notification"),
    ]
}

#[tauri::command]
fn create_window(
    app_handle: AppHandle,
    page: String,
    query_additional: Option<String>,
    height: Option<f64>,
) {
    println!("Creating window: {}", page);
    // Get settings
    let settings: settings::Settings = settings::get_settings();

    let title = format!(
        "{} | System Bridge",
        page_title_map()
            .iter()
            .find(|(key, _)| key == &page)
            .unwrap()
            .1
    );

    let url: tauri::Url = format!(
        "http://{}:{}/app/{}.html?apiPort={}&token={}{}",
        BACKEND_HOST,
        settings.api.port.to_string().clone(),
        page,
        settings.api.port.clone(),
        settings.api.token.clone(),
        query_additional.clone().unwrap_or("".to_string())
    )
    .parse()
    .unwrap();

    if page == "notification" {
        let webview_window_result = app_handle.get_webview_window("notification");
        if webview_window_result.is_some() {
            let mut window: tauri::WebviewWindow = webview_window_result.unwrap();
            window.navigate(url);
            window.show().unwrap();
            return;
        }

        let window_result =
            WebviewWindowBuilder::new(&app_handle, "notification", WebviewUrl::External(url))
                .always_on_top(true)
                .decorations(false)
                .focused(false)
                .inner_size(
                    WINDOW_NOTIFICATION_WIDTH,
                    height.unwrap_or(WINDOW_NOTIFICATION_HEIGHT as f64),
                )
                .position(28.0, 28.0)
                .resizable(false)
                .skip_taskbar(true)
                .title(title)
                .visible(true)
                .on_page_load(move |window, _payload| {
                    if window.url().as_str().contains("close.window") {
                        window.close().unwrap();
                    }
                })
                .build();
    } else {
        let webview_window_result = app_handle.get_webview_window("main");
        if webview_window_result.is_some() {
            let mut window: tauri::WebviewWindow = webview_window_result.unwrap();
            window.navigate(url);
            window.show().unwrap();
            window.set_title(title.as_str()).unwrap();
            window.set_focus().unwrap();
            return;
        }

        let window_result =
            WebviewWindowBuilder::new(&app_handle, "main", WebviewUrl::External(url))
                .focused(true)
                .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
                .title(title)
                .build();
    }
    if window_result.is_err() {
        println!("Failed to create window: {:?}", window_result.err());
    }
}

#[tauri::command]
fn close_window(app_handle: AppHandle, label: String) {
    println!("Closing window: {}", label);

    let webview_window_result = app_handle.get_webview_window(label.as_str());
    if webview_window_result.is_some() {
        let window: tauri::WebviewWindow = webview_window_result.unwrap();
        window.close().unwrap();
        window.destroy().unwrap();
    }
}

#[tokio::main]
async fn main() {
    setup_backend().await.unwrap();

    // Create the main window
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![create_window])
        .invoke_handler(tauri::generate_handler![close_window])
        .invoke_handler(tauri::generate_handler![get_settings])
        .setup(|app| {
            // Setup autostart from settings
            setup_autostart(app).unwrap();

            // Setup the tray menu
            let separator = PredefinedMenuItem::separator(app)?;
            let show_settings =
                MenuItemBuilder::with_id("show_settings", "Open settings").build(app)?;
            let show_data = MenuItemBuilder::with_id("show_data", "View data").build(app)?;
            let check_for_updates =
                MenuItemBuilder::with_id("check_for_updates", "Check for updates").build(app)?;
            let open_docs =
                MenuItemBuilder::with_id("open_docs", "Documentation / Website").build(app)?;
            let open_suggestions =
                MenuItemBuilder::with_id("open_suggestions", "Suggest / Request a feature")
                    .build(app)?;
            let open_issues =
                MenuItemBuilder::with_id("open_issues", "Report an Issue").build(app)?;
            let open_discussions =
                MenuItemBuilder::with_id("open_discussions", "Discussions / Community")
                    .build(app)?;
            let copy_token =
                MenuItemBuilder::with_id("copy_token", "Copy token to clipboard").build(app)?;
            let open_logs_backend =
                MenuItemBuilder::with_id("open_logs_backend", "View backend logs").build(app)?;
            let help = SubmenuBuilder::new(app, "Help")
                .items(&[
                    &open_docs,
                    &open_suggestions,
                    &open_issues,
                    &open_discussions,
                    &separator,
                    &copy_token,
                    &separator,
                    &open_logs_backend,
                ])
                .build()?;
            let exit = MenuItemBuilder::with_id("exit", "Exit").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[
                    &show_settings,
                    &show_data,
                    &separator,
                    &check_for_updates,
                    &help,
                    &separator,
                    &exit,
                ])
                .build()?;

            // Setup the tray
            let tray = app.tray_by_id("main").unwrap();
            tray.set_menu(Some(menu))?;
            tray.on_tray_icon_event(|tray, event| match event.click_type {
                ClickType::Double => {
                    let app_handle = tray.app_handle();

                    create_window(app_handle.clone(), "data".to_string(), None, None);
                }
                _ => (),
            });
            tray.on_menu_event(move |app_handle, event| match event.id().as_ref() {
                "show_settings" => {
                    create_window(app_handle.clone(), "settings".to_string(), None, None);
                }
                "show_data" => {
                    create_window(app_handle.clone(), "data".to_string(), None, None);
                }
                "check_for_updates" => {
                    app_handle
                        .shell()
                        .open("https://github.com/timmo001/system-bridge/releases", None)
                        .unwrap();
                }
                "open_docs" => {
                    app_handle
                        .shell()
                        .open("https://system-bridge.timmo.dev", None)
                        .unwrap();
                }
                "open_suggestions" => {
                    app_handle
                        .shell()
                        .open(
                            "https://github.com/timmo001/system-bridge/issues/new/choose",
                            None,
                        )
                        .unwrap();
                }
                "open_issues" => {
                    app_handle
                        .shell()
                        .open(
                            "https://github.com/timmo001/system-bridge/issues/new/choose",
                            None,
                        )
                        .unwrap();
                }
                "open_discussions" => {
                    app_handle
                        .shell()
                        .open(
                            "https://github.com/timmo001/system-bridge/discussions",
                            None,
                        )
                        .unwrap();
                }
                "copy_token" => {
                    // Get settings
                    let settings: Settings = get_settings();

                    app_handle
                        .clipboard()
                        .write(tauri_plugin_clipboard_manager::ClipKind::PlainText {
                            label: Some("System Bridge Token".to_string()),
                            text: settings.api.token.clone(),
                        })
                        .unwrap();
                }
                "open_logs_backend" => {
                    let config_path = get_config_path();
                    let backend_log_path = format!("{}/system-bridge-backend.log", config_path);
                    if !std::path::Path::new(&backend_log_path).exists() {
                        println!("Backend log file not found at: {}", backend_log_path);
                        return;
                    }
                    app_handle.shell().open(backend_log_path, None).unwrap();
                }
                "exit" => {
                    let stop_result = stop_backend();
                    if stop_result.is_err() {
                        println!("Failed to stop the backend server");
                    }
                    println!("Exiting application");
                    std::process::exit(0);
                }
                _ => (),
            });

            let app_handle_clone = app.handle().clone();
            let _handle = thread::spawn(|| {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    // Check backend server is running every 60 seconds
                    let mut interval: tokio::time::Interval = interval(Duration::from_secs(60));
                    loop {
                        println!("Waiting for 60 seconds before checking the backend server again");
                        interval.tick().await;

                        setup_backend().await.unwrap();
                    }
                });
            });

            let _websocket_handle = thread::spawn(|| {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    setup_websocket_client(app_handle_clone).await.unwrap();
                });
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                println!("Exit requested");
                api.prevent_exit();
            }
            _ => {}
        });
}
