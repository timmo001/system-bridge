use futures_util::{SinkExt, StreamExt};
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use std::str::FromStr;
use tauri::AppHandle;
use tokio_websockets::{ClientBuilder, Message};

use crate::{
    // gui::{close_window, create_window, WINDOW_NOTIFICATION_HEIGHT},
    settings::{get_settings, Settings},
};

#[derive(Debug, Serialize, Deserialize)]
pub struct Notification {
    title: String,
    message: Option<String>,
    icon: Option<String>,
    image: Option<String>,
    actions: Option<Vec<Action>>,
    timeout: Option<u64>,
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

pub async fn setup_websocket_client(app_handle: AppHandle) {
    // Get settings
    let settings: Settings = get_settings();

    let ws_url = format!(
        "ws://{}:{}/api/websocket",
        "127.0.0.1",
        settings.api.port.to_string(),
    );
    let ws_uri = http::uri::Uri::from_str(ws_url.as_str()).unwrap();

    let client_builder_result = ClientBuilder::from_uri(ws_uri).connect().await;
    if client_builder_result.is_err() {
        log::error!(
            "Failed to connect to WebSocket server: {}",
            client_builder_result.unwrap_err()
        );
        return;
    }

    let (mut client, _) = client_builder_result.unwrap();

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
    info!("Sending request: {}", request_string);
    client.send(Message::text(request_string)).await.unwrap();

    while let Some(item) = client.next().await {
        // Read the message
        let message = item.unwrap();

        if message.is_close() {
            break;
        }

        if message.is_text() {
            let message_string = message.as_text().unwrap();
            info!("Received message: {}", message_string);

            // Deserialize the message
            let response_result = serde_json::from_str(&message_string);
            if response_result.is_err() {
                log::error!(
                    "Failed to deserialize message: {}",
                    response_result.unwrap_err()
                );
                continue;
            }
            let response: Response = response_result.unwrap();

            // Handle the message
            match response.r#type.as_str() {
                "DATA_UPDATE" => {
                    info!("Received data update: {:?}", response.data);
                    // TODO: Handle data update
                }
                "NOTIFICATION" => {
                    info!("Received notification: {:?}", response.data);
                    // TODO: Reinstate notifications
                    // let notification_result = serde_json::from_value(response.data);
                    // if notification_result.is_err() {
                    //     log::error!(
                    //         "Failed to deserialize notification: {}",
                    //         notification_result.unwrap_err()
                    //     );
                    //     continue;
                    // }
                    // let notification: Notification = notification_result.unwrap();
                    // let timeout = notification.timeout.unwrap_or(5) as u64;

                    // // Calculate the window height
                    // let mut height: f64 = WINDOW_NOTIFICATION_HEIGHT as f64;
                    // let title_lines: f64 =
                    //     1.0 + (notification.title.len() as f64 / 52.0).round() as f64;
                    // info!("Title Lines: {}", title_lines);
                    // if title_lines > 1.0 {
                    //     height += 64.0 * title_lines;
                    // }
                    // if let Some(message) = &notification.message {
                    //     height += 24.0;
                    //     let message_lines: f64 = 1.0 + (message.len() as f64 / 62.0).round() as f64;
                    //     info!("Message Lines: {}", message_lines);
                    //     if message_lines > 1.0 {
                    //         height += 20.0 * message_lines;
                    //     }
                    // }
                    // if notification.image.is_some() {
                    //     height += 280.0;
                    // }
                    // if let Some(actions) = &notification.actions {
                    //     if !actions.is_empty() {
                    //         height += 72.0;
                    //     }
                    // }
                    // info!("Window Height: {}", height);

                    // let actions_string = if notification.actions.is_some() {
                    //     serde_json::to_string(notification.actions.as_ref().unwrap()).unwrap()
                    // } else {
                    //     "".to_string()
                    // };

                    // let audio_string = if notification.audio.is_some() {
                    //     serde_json::to_string(notification.audio.as_ref().unwrap()).unwrap()
                    // } else {
                    //     "".to_string()
                    // };

                    // let notification_json = json!({
                    //     "title": notification.title,
                    //     "message": notification.message.unwrap_or_else(|| String::from("") ),
                    //     "icon": notification.icon.unwrap_or_else(|| String::from("") ),
                    //     "image": notification.image.unwrap_or_else(|| String::from("") ),
                    //     "actions": actions_string,
                    //     "timeout": timeout.to_string(),
                    //     "audio": audio_string,
                    // });
                    // info!("Notification JSON: {}", notification_json.to_string());

                    // let query_string_result = serde_urlencoded::to_string(notification_json);
                    // if query_string_result.is_err() {
                    //     log::error!(
                    //         "Failed to serialize notification to query string: {}",
                    //         query_string_result.unwrap_err()
                    //     );
                    //     continue;
                    // }
                    // let query_string = format!("&{}", query_string_result.unwrap());
                    // info!("Query string: {}", query_string);

                    // let app_handle_clone_1 = app_handle.clone();
                    // let app_handle_clone_2 = app_handle.clone();
                    // create_window(
                    //     app_handle_clone_1,
                    //     "notification".to_string(),
                    //     Some(query_string),
                    //     Some(height),
                    // );

                    // let _handle = thread::spawn(move || {
                    //     let rt = Runtime::new().unwrap();
                    //     rt.block_on(async {
                    //         info!("Waiting for {} seconds to close the notification", timeout);
                    //         thread::sleep(Duration::from_secs(timeout));

                    //         close_window(app_handle_clone_2, "notification".to_string());
                    //     });
                    // });
                }
                _ => {
                    info!("Received event: {}", response.r#type);
                }
            }
        }
    }
}
