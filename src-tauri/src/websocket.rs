use std::str::FromStr;

use crate::{
    event::{EventSubtype, EventType},
    modules::{get_module_data, Module, RequestModules},
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

                let request_id:String = request.id.clone();

                // Check if the token is valid
                if request.token != settings.api.token {
                    warn!("Invalid token provided: {} - Expected: {}", request.token, settings.api.token);

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::Error.to_string(),
                        data: Value::Null,
                        subtype: None,
                        message: Some("Invalid token".to_string()),
                        module: None,
                    }).unwrap());

                    continue;
                }

                // Process the request
                let request_processor = RequestProcessor::new();
                let response: Result<Vec<WebsocketResponse>, String> = request_processor.process(&request, request_id.clone()).await;

                match response {
                    Err(e) => {
                        warn!("Failed to process request: {:?}", e);

                        yield Message::text(serde_json::to_string(&WebsocketResponse {
                            id: request_id.clone(),
                            type_: EventType::Error.to_string(),
                            data: Value::Null,
                            subtype: None,
                            message: Some(e),
                            module: None,
                        }).unwrap());
                    }
                    Ok(response) =>
                        for response in response {
                            yield Message::text(serde_json::to_string(&response).unwrap());
                        }
                }

        }
    }
}

struct RequestProcessor {
    settings: Settings,
}
impl RequestProcessor {
    fn new() -> Self {
        Self {
            settings: get_settings(),
        }
    }

    async fn process(
        &self,
        request: &WebsocketRequest,
        request_id: String,
    ) -> Result<Vec<WebsocketResponse>, String> {
        // Process the request
        let event_type = EventType::from_str(&request.event);

        let mut responses: Vec<WebsocketResponse> = vec![];

        match event_type {
            Ok(EventType::ApplicationUpdate) => {
                info!("ApplicationUpdate event");

                // TODO: Update the application

                responses.push(WebsocketResponse {
                    id: request_id.clone(),
                    type_: EventType::ApplicationUpdating.to_string(),
                    data: Value::Null,
                    subtype: None,
                    message: None,
                    module: None,
                });
            }
            Ok(EventType::ExitApplication) => {
                info!("ExitApplication event");

                // yield Ok(WebsocketResponse {
                //     id: request_id.clone(),
                //     type_: EventType::ExitingApplication.to_string(),
                //     data: Value::Null,
                //     subtype: None,
                //     message: None,
                //     module: None,
                // });

                info!("Exiting application");
                std::process::exit(0);
            }
            Ok(EventType::GetData) => {
                info!("GetData event: {:?}", request.data);

                let request_data_result: Result<RequestModules, _> =
                    serde_json::from_value(request.data.clone());
                if let Err(e) = request_data_result {
                    warn!("Invalid data: {:?}", e);
                    return Err(e.to_string());
                }

                let request_data = request_data_result.unwrap();
                info!("Request data: {:?}", request_data);

                for module_str in request_data.modules {
                    let module_type_result = Module::from_str(&module_str);
                    if module_type_result.is_err() {
                        warn!("Invalid module: {:?}", module_str);
                        return Err(module_type_result.err().unwrap());
                    }

                    let module = module_type_result.unwrap();
                    info!("Getting data for module: {:?}", module.to_string());

                    let module_data_result = get_module_data(&module).await;
                    if module_data_result.is_err() {
                        warn!(
                            "Failed to get data for module: {:?} - {:?}",
                            module.to_string(),
                            module_data_result.clone().err()
                        );
                    }

                    let module_data = module_data_result.unwrap();
                    info!(
                        "Got data for module: {:?} - {}",
                        module.to_string(),
                        module_data
                    );

                    // Send data update to the client
                    responses.push(WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::DataUpdate.to_string(),
                        data: module_data,
                        subtype: None,
                        message: None,
                        module: Some(module.to_string()),
                    });
                }
            }
            Ok(EventType::RegisterDataListener) => {
                info!("RegisterDataListener event");

                // TODO: Register data listener
                responses.push(WebsocketResponse {
                    id: request_id.clone(),
                    type_: EventType::DataListenerRegistered.to_string(),
                    data: Value::Null,
                    subtype: None,
                    message: None,
                    module: None,
                });
            }
            Ok(EventType::Unknown) => {
                warn!("Unknown event: {}", request.event);

                responses.push(WebsocketResponse {
                    id: request_id.clone(),
                    type_: EventType::Error.to_string(),
                    data: Value::Null,
                    subtype: Some(EventSubtype::UnknownEvent.to_string()),
                    message: Some("Unknown event".to_string()),
                    module: None,
                });
            }
            _ => {
                warn!("Unsupported event: {}", request.event);

                responses.push(WebsocketResponse {
                    id: request_id.clone(),
                    type_: EventType::Error.to_string(),
                    data: Value::Null,
                    subtype: Some(EventSubtype::UnknownEvent.to_string()),
                    message: Some("Unsupported event".to_string()),
                    module: None,
                });
            }
        };

        // Return the responses
        Ok(responses)
    }
}
