// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Duration;
use std::{error::Error, thread};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::ClickType,
    App, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::ShellExt;
use tokio::runtime::Runtime;
use tokio::time::interval;

#[derive(Serialize, Deserialize)]
struct APIBaseResponse {
    version: String,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    pub api: SettingsAPI,
    pub autostart: bool,
    pub keyboard_hotkeys: Vec<SettingsKeyboardHotkeys>,
    pub log_level: String,
    pub media: SettingsMedia,
}

#[derive(Serialize, Deserialize)]
pub struct SettingsAPI {
    token: String,
    port: i64,
}

#[derive(Serialize, Deserialize)]
pub struct SettingsKeyboardHotkeys {
    name: String,
    key: String,
}

#[derive(Serialize, Deserialize)]
pub struct SettingsMedia {
    directories: Vec<SettingsMediaDirectories>,
}

#[derive(Serialize, Deserialize)]
pub struct SettingsMediaDirectories {
    name: String,
    path: String,
}

const BACKEND_HOST: &str = "127.0.0.1";

const WINDOW_WIDTH: f64 = 1280.0;
const WINDOW_HEIGHT: f64 = 720.0;

async fn setup_app() -> Result<(), Box<dyn std::error::Error>> {
    // Get settings
    let mut settings_result = get_settings();
    if settings_result.is_err() {
        println!("Failed to read settings file");
        settings_result = create_settings();
    }
    let settings: Settings = settings_result.unwrap();

    let base_url = format!(
        "http://{}:{}",
        BACKEND_HOST,
        settings.api.port.to_string().clone()
    );

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

fn page_title_map() -> Vec<(&'static str, &'static str)> {
    vec![("data", "Data"), ("settings", "Settings")]
}

fn get_config_path() -> String {
    let path = format!(
        "{}/timmo001/systembridge",
        std::env::var("LOCALAPPDATA").unwrap()
    );

    if !std::path::Path::new(&path).exists() {
        std::fs::create_dir_all(&path).unwrap();
    }

    path
}

fn create_settings() -> Result<Settings, Box<dyn Error>> {
    // Get install directory from &localappdata%\timmo001\systembridge
    let config_path = get_config_path();

    // Create a uuid v4 token
    let token = uuid::Uuid::new_v4().to_string();

    // Create settings from {config_path}\settings.json
    let settings = Settings {
        api: SettingsAPI {
            token: token.to_string(),
            port: 9170,
        },
        autostart: false,
        keyboard_hotkeys: vec![],
        log_level: "INFO".to_string(),
        media: SettingsMedia {
            directories: vec![],
        },
    };

    // Create settings string
    let settings_string = serde_json::to_string(&settings)?;
    println!("Creating settings file: {}", settings_string);

    // Write settings to {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
    std::fs::write(settings_path, settings_string)?;

    Ok(settings)
}

fn get_settings() -> Result<Settings, Box<dyn Error>> {
    // Get install directory from &localappdata%\timmo001\systembridge
    let config_path = get_config_path();

    // Read settings from {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
    if !std::path::Path::new(&settings_path).exists() {
        return Err("Settings file not found".into());
    }

    let settings = std::fs::read_to_string(settings_path)?;
    let settings = serde_json::from_str(&settings)?;

    Ok(settings)
}

fn setup_autostart(app: &mut App) -> Result<(), Box<dyn Error>> {
    let settings = get_settings().unwrap();

    println!("Autostart: {}", settings.autostart);

    // Get the autostart manager
    let autostart_manager: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager> =
        app.autolaunch();

    if settings.autostart {
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

async fn start_backend(base_url: String) -> Result<(), Box<dyn Error>> {
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
        if process.name().contains("systembridgebackend") {
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

    let webview_window_result = app.get_webview_window("main");
    if webview_window_result.is_some() {
        let mut window: tauri::WebviewWindow = webview_window_result.unwrap();
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
    let _ = setup_app().await;

    // Create the main window
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
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
            let tray = app.tray().unwrap();
            tray.set_menu(Some(menu))?;
            tray.on_tray_icon_event(|tray, event| match event.click_type {
                ClickType::Double => {
                    let app = tray.app_handle();

                    create_window(app, "data".to_string()).unwrap();
                }
                _ => (),
            });
            tray.on_menu_event(move |app_handle, event| match event.id().as_ref() {
                "show_settings" => {
                    create_window(app_handle, "settings".to_string()).unwrap();
                }
                "show_data" => {
                    create_window(app_handle, "data".to_string()).unwrap();
                }
                "check_for_updates" => {
                    // TODO: Check for updates with a page
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
                    let settings = get_settings().unwrap();
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
                    let backend_log_path = format!("{}/systembridgebackend.log", config_path);
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

            // Check backend server is running every 30 seconds
            let _handle = thread::spawn(|| {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    let mut interval: tokio::time::Interval = interval(Duration::from_secs(60));
                    loop {
                        println!("Waiting for 60 seconds before checking the backend server again");
                        interval.tick().await;

                        setup_app().await.unwrap();
                    }
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
