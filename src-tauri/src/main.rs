// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use std::{error::Error, time::Duration};
use tauri_plugin_shell::ShellExt;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::ClickType,
    App, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_clipboard_manager::ClipboardExt;
// use tauri_plugin_updater::UpdaterExt;
use tokio;

// TODO: Add a way to close the backend server when the app is closed
// TODO: Restart the backend server if it's not running

#[derive(serde::Deserialize)]
struct APIBaseResponse {
    version: String,
}

#[derive(serde::Deserialize)]
struct Settings {
    api: SettingsAPI,
    autostart: bool,
    // log_level: String,
}

#[derive(serde::Deserialize)]
struct SettingsAPI {
    token: String,
    port: i32,
}

const BACKEND_HOST: &str = "127.0.0.1";

const WINDOW_WIDTH: f64 = 1280.0;
const WINDOW_HEIGHT: f64 = 720.0;

fn page_title_map() -> Vec<(&'static str, &'static str)> {
    vec![("data", "Data"), ("settings", "Settings")]
}

fn get_install_path() -> String {
    format!(
        "{}/timmo001/systembridge",
        std::env::var("LOCALAPPDATA").unwrap()
    )
}

fn get_settings() -> Result<Settings, Box<dyn Error>> {
    // Get install directory from &localappdata%\timmo001\systembridge
    let install_path = get_install_path();

    // Read settings from {install_path}\settings.json
    let settings_path = format!("{}/settings.json", install_path);
    if !std::path::Path::new(&settings_path).exists() {
        return Err("Settings file not found".into());
    }

    let settings = std::fs::read_to_string(settings_path)?;
    let settings = serde_json::from_str(&settings)?;

    Ok(settings)
}

fn setup_autostart(app: &mut App, autostart: bool) -> Result<(), Box<dyn Error>> {
    println!("Autostart: {}", autostart);

    // Get the autostart manager
    let autostart_manager: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager> =
        app.autolaunch();

    if autostart {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    Ok(())
}

async fn check_backend(base_url: String) -> Result<(), Box<dyn Error>> {
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

async fn check_backend_api(base_url: String, token: String) -> Result<(), Box<dyn Error>> {
    // Check if the backend server is running
    let client = Client::builder().timeout(Duration::from_secs(5)).build()?;
    let response = client
        .get(format!("{}/api?token={}", base_url, token))
        .send()
        .await?;

    if !response.status().is_success() {
        let response_code = response.status().as_u16();
        // Return error with the response code
        return Err(format!("Backend server returned an error: {}", response_code).into());
    }

    let response: APIBaseResponse = response.json().await?;
    println!("Backend server version: {}", response.version);

    Ok(())
}

async fn start_backend(install_path: String, base_url: String) -> Result<(), Box<dyn Error>> {
    let backend_path = format!("{}/backend/systembridge", install_path);
    println!("Starting backend server: {} --no-gui", backend_path);
    let process = std::process::Command::new(backend_path)
        .args(["--no-gui"])
        .spawn();
    if process.is_err() {
        return Err("Failed to start the backend server".into());
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

fn stop_backend() -> Result<(), Box<dyn Error>> {
    println!("Stopping backend server");

    // Find any running backend server processes
    sysinfo::set_open_files_limit(0);
    let mut sys = sysinfo::System::new();
    sys.refresh_processes();

    for (pid, process) in sys.processes() {
        if process.name().contains("systembridge") {
            println!("Killing process: {}", pid);
            let _ = process.kill();
        }
    }

    Ok(())
}

fn create_window(app: &AppHandle, page: String) -> Result<(), Box<dyn Error>> {
    println!("Creating window: {}", page);

    let settings = get_settings().unwrap();

    let title = format!(
        "{} | System Bridge",
        page_title_map()
            .iter()
            .find(|(key, _)| key == &page)
            .unwrap()
            .1
    );

    let url: tauri::Url = format!(
        "http://{}:{}/app/{}.html?apiPort={}&token={}",
        BACKEND_HOST,
        settings.api.port.to_string().clone(),
        page,
        settings.api.port.clone(),
        settings.api.token.clone()
    )
    .parse()
    .unwrap();

    let window = app.get_webview_window("main");
    if window.is_some() {
        let mut window: tauri::WebviewWindow = window.unwrap();
        window.show().unwrap();
        window.navigate(url);
        window.set_title(title.as_str()).unwrap();
        window.set_focus().unwrap();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
        .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
        .title(title)
        .build()
        .unwrap();

    Ok(())
}

#[tokio::main]
async fn main() {
    // Get install directory from &localappdata%\timmo001\systembridge
    let install_path = get_install_path();

    // Read settings from {install_path}\settings.json
    let settings_path = format!("{}/settings.json", install_path);
    if !std::path::Path::new(&settings_path).exists() {
        println!("Settings file not found");
        std::process::exit(1);
    }

    // Get settings
    let settings = get_settings().unwrap();

    let base_url = format!(
        "http://{}:{}",
        BACKEND_HOST,
        settings.api.port.to_string().clone()
    );

    // Check if the backend server is running
    let backend_active = check_backend(base_url.clone()).await;
    if !backend_active.is_ok() {
        // Start the backend server
        let backend_start = start_backend(install_path.clone(), base_url.clone()).await;
        if !backend_start.is_ok() {
            println!("Failed to start the backend server");
            std::process::exit(1);
        }
    }

    // Check the backend API
    let api_active = check_backend_api(base_url.clone(), settings.api.token.clone()).await;
    if !api_active.is_ok() {
        println!("Backend API is not running");
        std::process::exit(1);
    }

    // Create the main window
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app: &mut App| {
            // Check for updates
            // let handle: &tauri::AppHandle = app.handle();
            // tauri::async_runtime::spawn(async move {
            //     let response: Result<
            //         Option<tauri_plugin_updater::Update>,
            //         tauri_plugin_updater::Error,
            //     > = handle.updater().expect("REASON").check().await;
            //     if response.is_ok() {
            //         let update: Option<tauri_plugin_updater::Update> = response.unwrap();
            //         if update.is_some() {
            //             let update: tauri_plugin_updater::Update = update.unwrap();
            //             println!("Update available: {}", update.version);
            //         }
            //     }
            // });

            // Setup autostart from settings
            setup_autostart(app, settings.autostart.clone()).unwrap();

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
            let tray = app.tray().unwrap();
            tray.set_menu(Some(menu))?;
            tray.on_tray_icon_event(|tray, event| match event.click_type {
                ClickType::Double => {
                    let app = tray.app_handle();

                    create_window(app, "data".to_string()).unwrap();
                }
                _ => (),
            });
            tray.on_menu_event(
                move |app: &tauri::AppHandle, event: tauri::menu::MenuEvent| match event
                    .id()
                    .as_ref()
                {
                    "show_settings" => {
                        create_window(app, "settings".to_string()).unwrap();
                    }
                    "show_data" => {
                        create_window(app, "data".to_string()).unwrap();
                    }
                    "check_for_updates" => {
                        // let handle: &tauri::AppHandle = app;
                        // tauri::async_runtime::spawn(async move {
                        //     let response: Result<
                        //         Option<tauri_plugin_updater::Update>,
                        //         tauri_plugin_updater::Error,
                        //     > = handle.updater().expect("REASON").check().await;
                        //     if response.is_ok() {
                        //         let update: Option<tauri_plugin_updater::Update> = response.unwrap();
                        //         if update.is_some() {
                        //             let update: tauri_plugin_updater::Update = update.unwrap();
                        //             println!("Update available: {}", update.version);
                        //         }
                        //     }
                        // });
                    }
                    "open_docs" => {
                        app.shell()
                            .open("https://system-bridge.timmo.dev", None)
                            .unwrap();
                    }
                    "open_suggestions" => {
                        app.shell()
                            .open(
                                "https://github.com/timmo001/system-bridge/issues/new/choose",
                                None,
                            )
                            .unwrap();
                    }
                    "open_issues" => {
                        app.shell()
                            .open(
                                "https://github.com/timmo001/system-bridge/issues/new/choose",
                                None,
                            )
                            .unwrap();
                    }
                    "open_discussions" => {
                        app.shell()
                            .open(
                                "https://github.com/timmo001/system-bridge/discussions",
                                None,
                            )
                            .unwrap();
                    }
                    "copy_token" => {
                        let settings = get_settings().unwrap();
                        app.clipboard()
                            .write(tauri_plugin_clipboard_manager::ClipKind::PlainText {
                                label: Some("System Bridge Token".to_string()),
                                text: settings.api.token.clone(),
                            })
                            .unwrap();
                    }
                    "open_logs_backend" => {
                        let install_path = get_install_path();
                        let backend_log_path = format!("{}/systembridgebackend.log", install_path);
                        if !std::path::Path::new(&backend_log_path).exists() {
                            println!("Backend log file not found at: {}", backend_log_path);
                            return;
                        }
                        app.shell().open(backend_log_path, None).unwrap();
                    }
                    "exit" => {
                        let _ = stop_backend();
                        app.exit(0);
                    }
                    _ => (),
                },
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
