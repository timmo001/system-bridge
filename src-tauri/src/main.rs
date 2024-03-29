// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use futures_util::{SinkExt, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::str::FromStr;
use std::time::Duration;
use std::{error::Error, thread};
use tauri::PhysicalPosition;
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
use tokio_websockets::{ClientBuilder, Message};

#[derive(Debug, Serialize, Deserialize)]
struct APIBaseResponse {
    version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub api: SettingsAPI,
    pub autostart: bool,
    pub keyboard_hotkeys: Vec<SettingsKeyboardHotkeys>,
    pub log_level: String,
    pub media: SettingsMedia,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsAPI {
    token: String,
    port: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsKeyboardHotkeys {
    name: String,
    key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsMedia {
    directories: Vec<SettingsMediaDirectories>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsMediaDirectories {
    name: String,
    path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Notification {
    title: String,
    message: Option<String>,
    icon: Option<String>,
    image: Option<String>,
    actions: Option<Vec<Action>>,
    timeout: Option<f32>,
    audio: Option<Audio>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Action {
    command: String,
    label: String,
    data: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Audio {
    source: String,
    volume: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetData {
    modules: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    id: String,
    event: String,
    data: HashMap<String, String>,
    #[doc(hidden)]
    token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    id: String,
    r#type: String,
    data: Value,
    subtype: Option<String>,
    message: Option<String>,
    module: Option<String>,
}

const BACKEND_HOST: &str = "127.0.0.1";

const WINDOW_WIDTH: f64 = 1280.0;
const WINDOW_HEIGHT: f64 = 720.0;
const WINDOW_NOTIFICATION_WIDTH: f64 = 420.0;
const WINDOW_NOTIFICATION_HEIGHT: f64 = 48.0;

async fn setup_app() -> Result<(), Box<dyn std::error::Error>> {
    // Get settings
    let settings: Settings = get_settings();

    let base_url = format!("http://{}:{}", BACKEND_HOST, settings.api.port.to_string());

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

async fn setup_websocket_client(app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get settings
    let settings: Settings = get_settings();

    let ws_url = format!(
        "ws://{}:{}/api/websocket",
        BACKEND_HOST,
        settings.api.port.to_string(),
    );
    let ws_uri = http::uri::Uri::from_str(ws_url.as_str()).unwrap();

    let (mut client, _) = ClientBuilder::from_uri(ws_uri).connect().await?;

    let mut request = Request {
        id: uuid::Uuid::new_v4().to_string(),
        event: "".to_string(),
        data: HashMap::new(),
        token: settings.api.token.clone(),
    };

    request.event = "REGISTER_DATA_LISTENER".to_string();
    let mut request_json = json!(request);
    request_json["data"] = json!({
      "modules": ["system"]
    });

    let request_string = serde_json::to_string(&request_json).unwrap();
    println!("Sending request: {}", request_string);
    client.send(Message::text(request_string)).await?;

    while let Some(item) = client.next().await {
        // Read the message
        let message = item.unwrap();

        if message.is_close() {
            break;
        }

        if message.is_text() {
            let message_string = message.as_text().unwrap();
            println!("Received message: {}", message_string);

            // Deserialize the message
            let response_result = serde_json::from_str(&message_string);
            if response_result.is_err() {
                println!(
                    "Failed to deserialize message: {}",
                    response_result.unwrap_err()
                );
                continue;
            }
            let response: Response = response_result.unwrap();

            // Handle the message
            match response.r#type.as_str() {
                "DATA_UPDATE" => {
                    println!("Received data update: {:?}", response.data);
                    // TODO: Handle data update
                }
                "NOTIFICATION" => {
                    println!("Received notification: {:?}", response.data);

                    let notification_result = serde_json::from_value(response.data);
                    if notification_result.is_err() {
                        println!(
                            "Failed to deserialize notification: {}",
                            notification_result.unwrap_err()
                        );
                        continue;
                    }
                    let notification: Notification = notification_result.unwrap();
                    let timeout = notification.timeout.unwrap_or(5.0) as u64;

                    // Calculate the window height
                    let mut height: i32 = WINDOW_NOTIFICATION_HEIGHT as i32;
                    let title_lines: i32 =
                        1 + (notification.title.len() as f64 / 52.0).round() as i32;
                    println!("Title Lines: {}", title_lines);
                    if title_lines > 1 {
                        height += 64 * title_lines;
                    }
                    if let Some(message) = &notification.message {
                        height += 24;
                        let message_lines: i32 = 1 + (message.len() as f64 / 62.0).round() as i32;
                        println!("Message Lines: {}", message_lines);
                        if message_lines > 1 {
                            height += 20 * message_lines;
                        }
                    }
                    if notification.image.is_some() {
                        height += 280;
                    }
                    if let Some(actions) = &notification.actions {
                        if !actions.is_empty() {
                            height += 72;
                        }
                    }
                    println!("Window Height: {}", height);

                    let actions_string = if notification.actions.is_some() {
                        serde_json::to_string(notification.actions.as_ref().unwrap()).unwrap()
                    } else {
                        "".to_string()
                    };

                    let audio_string = if notification.audio.is_some() {
                        serde_json::to_string(notification.audio.as_ref().unwrap()).unwrap()
                    } else {
                        "".to_string()
                    };

                    let notification_json = json!({
                        "title": notification.title,
                        "message": notification.message.unwrap_or_else(|| String::from("") ),
                        "icon": notification.icon.unwrap_or_else(|| String::from("") ),
                        "image": notification.image.unwrap_or_else(|| String::from("") ),
                        "actions": actions_string,
                        "timeout": timeout.to_string(),
                        "audio": audio_string,
                    });
                    println!("Notification JSON: {}", notification_json.to_string());

                    let query_string_result = serde_urlencoded::to_string(notification_json);
                    if query_string_result.is_err() {
                        println!(
                            "Failed to serialize notification to query string: {}",
                            query_string_result.unwrap_err()
                        );
                        continue;
                    }
                    let query_string = format!("&{}", query_string_result.unwrap());
                    println!("Query string: {}", query_string);

                    let app_handle_clone_1 = app_handle.clone();
                    let app_handle_clone_2 = app_handle.clone();
                    create_window(
                        app_handle_clone_1,
                        "notification".to_string(),
                        Some(query_string),
                        Some(height),
                    );

                    let _handle = thread::spawn(move || {
                        let rt = Runtime::new().unwrap();
                        rt.block_on(async {
                            println!("Waiting for {} seconds to close the notification", timeout);
                            thread::sleep(Duration::from_secs(timeout));

                            close_window(app_handle_clone_2, "notification".to_string());
                        });
                    });
                }
                _ => {
                    println!("Received event: {}", response.r#type);
                }
            }
        }
    }

    Ok(())
}

fn setup_autostart(app: &mut App) -> Result<(), Box<dyn Error>> {
    // Get settings
    let settings: Settings = get_settings();

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

fn page_title_map() -> Vec<(&'static str, &'static str)> {
    vec![
        ("data", "Data"),
        ("settings", "Settings"),
        ("notification", "Notification"),
    ]
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

fn create_settings() -> Settings {
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
    let settings_string = serde_json::to_string(&settings).unwrap();

    println!("Creating settings file: {}", settings_string);

    // Write settings to {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
    std::fs::write(settings_path, settings_string).unwrap();

    settings
}

#[tauri::command]
fn get_settings() -> Settings {
    // Get install directory from &localappdata%\timmo001\systembridge
    let config_path = get_config_path();

    // Read settings from {config_path}\settings.json
    let settings_path = format!("{}/settings.json", config_path);
    if !std::path::Path::new(&settings_path).exists() {
        return create_settings();
    }

    let settings = std::fs::read_to_string(settings_path);
    if settings.is_err() {
        return create_settings();
    }
    let settings = serde_json::from_str(&settings.unwrap());
    if settings.is_err() {
        return create_settings();
    }

    settings.unwrap()
}

#[tauri::command]
fn create_window(
    app_handle: AppHandle,
    page: String,
    query_additional: Option<String>,
    height: Option<i32>,
) {
    println!("Creating window: {}", page);
    // Get settings
    let settings: Settings = get_settings();

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
        let height = height.unwrap_or(WINDOW_NOTIFICATION_HEIGHT as i32);

        let window =
            WebviewWindowBuilder::new(&app_handle, "notification", WebviewUrl::External(url))
                .always_on_top(true)
                .decorations(false)
                .inner_size(WINDOW_NOTIFICATION_WIDTH, height as f64)
                .resizable(false)
                .skip_taskbar(true)
                .title(title)
                .visible(false)
                .build()
                .unwrap();

        // Get the display size
        let monitor = window
            .primary_monitor()
            .expect("No primary monitor available")
            .unwrap();
        let size = monitor.size();
        println!("Display size: {}, {}", size.width, size.height);

        let window_x = (size.width - ((WINDOW_NOTIFICATION_WIDTH as u32) * 2) - 128) as f64;
        let window_y = (size.height - ((height as u32) * 2) - 192) as f64;
        println!("Window position: {}, {}", window_x, window_y);

        window
            .set_position(PhysicalPosition {
                x: window_x,
                y: window_y,
            })
            .unwrap();
        window.show().unwrap();
    } else {
        let webview_window_result = app_handle.get_webview_window("main");
        if webview_window_result.is_some() {
            let mut window: tauri::WebviewWindow = webview_window_result.unwrap();
            window.show().unwrap();
            window.navigate(url);
            window.set_title(title.as_str()).unwrap();
            window.set_focus().unwrap();
            return;
        }

        WebviewWindowBuilder::new(&app_handle, "main", WebviewUrl::External(url))
            .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
            .title(title)
            .build()
            .unwrap();
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
    setup_app().await.unwrap();

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

            let app_handle_clone = app.handle().clone();
            let _handle = thread::spawn(|| {
                let rt = Runtime::new().unwrap();
                rt.block_on(async {
                    // Check backend server is running every 60 seconds
                    let mut interval: tokio::time::Interval = interval(Duration::from_secs(60));
                    loop {
                        println!("Waiting for 60 seconds before checking the backend server again");
                        interval.tick().await;

                        setup_app().await.unwrap();
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
