use futures_util::SinkExt;
use log::{debug, info};
use serde_json::json;
use std::str::FromStr;
use tokio_websockets::{ClientBuilder, Message};

use crate::{
    settings::{get_settings, Settings},
    websocket::WebsocketRequest,
};

pub struct WebSocketClient {
    pub settings: Settings,
}
impl WebSocketClient {
    pub async fn new() -> Self {
        let settings = get_settings();

        Self { settings }
    }

    pub async fn send_message(&self, request: WebsocketRequest) -> Result<(), String> {
        let request_json = json!(request);
        let request_string = serde_json::to_string(&request_json).unwrap();

        debug!("Sending request: {}", request_string);

        let ws_url = format!(
            "ws://{}:{}/api/websocket",
            "127.0.0.1",
            &self.settings.api.port.to_string(),
        );
        info!("Connecting to WebSocket server: {}", ws_url);
        let ws_uri = http::uri::Uri::from_str(ws_url.as_str()).unwrap();

        let client_builder_result = ClientBuilder::from_uri(ws_uri).connect().await;
        if client_builder_result.is_err() {
            return Err(format!(
                "Failed to connect to WebSocket server: {}",
                client_builder_result.unwrap_err()
            ));
        }

        let (mut client, _) = client_builder_result.unwrap();
        info!("WebSocket client connected");

        match client.send(Message::text(request_string)).await {
            Ok(_) => (),
            Err(e) => return Err(format!("Failed to send message: {:?}", e)),
        };

        Ok(())
    }
}
