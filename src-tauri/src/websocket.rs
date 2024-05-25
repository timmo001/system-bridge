use std::str::FromStr;

use crate::{
    event::{EventSubtype, EventType},
    settings::{get_settings, Settings},
};
use log::{debug, info, warn};
use rocket::get;
use rocket_ws::{Message, Stream, WebSocket};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct WebsocketRequest {
    id: String,
    token: String,
    event: String,
    data: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebsocketResponse {
    id: String,
    #[serde(rename = "type")]
    type_: String,
    data: Value,
    subtype: Option<String>,
    message: Option<String>,
    module: Option<String>,
}

#[get("/api/websocket")]
pub async fn websocket(ws: WebSocket) -> Stream!['static] {
    // Get settings
    let settings: Settings = get_settings();

    Stream! { ws =>
        for await msg in ws {
            let message = msg?.to_string();
            debug!("Received message: {:?}", message);

            // Parse the message
            let request_result = serde_json::from_str(&message);
            if request_result.is_err() {
                warn!("Failed to parse request: {:?}", request_result.err());
                continue;
            }
            let request: WebsocketRequest = request_result.unwrap();
            info!("Received request: {:?}", request);

            // Check if the token is valid
            if request.token != settings.api.token {
                warn!("Invalid token provided: {} - Expected: {}", request.token, settings.api.token);

                yield Message::text(serde_json::to_string(&WebsocketResponse {
                    id: request.id,
                    type_: EventType::Error.to_string(),
                    data: Value::Null,
                    subtype: None,
                    message: Some("Invalid token".to_string()),
                    module: None,
                }).unwrap());

                continue;
            }

            // Process the request
            let event_type = EventType::from_str(&request.event);
            match event_type {
                Ok(EventType::ApplicationUpdate) => {
                    info!("ApplicationUpdate event");

                    // TODO: Update the application
                    // yield Message::text(serde_json::to_string(&WebsocketResponse {
                    //     id: request.id,
                    //     type_: EventType::ApplicationUpdating.to_string(),
                    //     data: Value::Null,
                    //     subtype: None,
                    //     message: None,
                    //     module: None,
                    // }).unwrap());
                }
                Ok(EventType::ExitApplication) => {
                    info!("ExitApplication event");

                    info!("Exiting application");
                    std::process::exit(0);
                }
                Ok(EventType::Unknown) => {
                    warn!("Unknown event: {}", request.event);

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request.id,
                        type_: EventType::Error.to_string(),
                        data: Value::Null,
                        subtype: Some(EventSubtype::UnknownEvent.to_string()),
                        message: Some("Unknown event".to_string()),
                        module: None,
                    }).unwrap());
                }
                _ => {
                    warn!("Unsupported event: {}", request.event);

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request.id,
                        type_: EventType::Error.to_string(),
                        data: Value::Null,
                        subtype: Some(EventSubtype::UnknownEvent.to_string()),
                        message: Some("Unsupported event".to_string()),
                        module: None,
                    }).unwrap());
                }
            }
        }
    }
}
