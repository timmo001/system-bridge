use super::{DataListener, WebsocketRequest, WebsocketResponse};
use crate::{
    event::{EventSubtype, EventType},
    modules::{get_module_data, Module, ModuleUpdate, RequestModules},
    settings::{get_settings, update_settings, Settings},
};
use log::{debug, error, info, warn};
use rocket::get;
use rocket_ws::{Message, Stream, WebSocket};
use serde_json::Value;
use std::str::FromStr;
use std::sync::Mutex;

static REGISTERED_LISTENERS: Mutex<Vec<DataListener>> = Mutex::new(vec![]);

#[get("/api/websocket")]
pub async fn websocket(ws: WebSocket) -> Stream!['static] {
    Stream! { ws =>
        for await msg in ws {
            // Get the message
            let message = msg?.to_string();
            debug!("Received message: {:?}", message);

            // Parse the message
            let request_result = serde_json::from_str(&message);
            if request_result.is_err() {
                error!("Failed to parse request: {:?} - {:?}", message, request_result.err());
                continue;
            }
            let request: WebsocketRequest = request_result.unwrap();
            debug!("Received request: {:?}", request);

            let request_id:String = request.id.clone();
            let required_token = get_settings().api.token;

            // Check if the token is valid
            if request.token != required_token {
                warn!("Invalid token provided: {} - Expected: {}", request.token, required_token);

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
            let event_type = EventType::from_str(&request.event);

            match event_type {
                Ok(EventType::ApplicationUpdate) => {
                    info!("ApplicationUpdate event");

                    // TODO: Update the application

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::ApplicationUpdating.to_string(),
                        data: Value::Null,
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());
                }
                Ok(EventType::ExitApplication) => {
                    info!("ExitApplication event");

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::ExitingApplication.to_string(),
                        data: Value::Null,
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());

                    info!("Exiting application");
                    std::process::exit(0);
                }
                Ok(EventType::GetData) => {
                    info!("GetData event: {:?}", request.data);

                    let request_data_result: Result<RequestModules, _> =
                        serde_json::from_value(request.data.clone());
                    if let Err(e) = request_data_result {
                        warn!("Invalid data: {:?}", e);
                        continue;
                    }

                    let request_data = request_data_result.unwrap();
                    info!("Request data: {:?}", request_data);

                    for module_str in request_data.modules {
                        let module_type_result = Module::from_str(&module_str);
                        if module_type_result.is_err() {
                            warn!("Invalid module: {:?}", module_str);
                            continue;
                        }

                        let module = module_type_result.unwrap();
                        info!("Getting data for module: {:?}", module.to_string());

                        match get_module_data(&module).await {
                            Ok(module_data) => {
                                info!("Got data for module: {:?}", module.to_string());

                                // Send data update to the client
                                yield Message::text(serde_json::to_string(&WebsocketResponse {
                                    id: request_id.clone(),
                                    type_: EventType::DataUpdate.to_string(),
                                    data: module_data,
                                    subtype: None,
                                    message: None,
                                    module: Some(module.to_string()),
                                }).unwrap());
                            }
                            Err(e) => {
                                warn!(
                                    "Failed to get data for module: {:?} - {:?}",
                                    module.to_string(),
                                    e
                                );

                                yield Message::text(serde_json::to_string(&WebsocketResponse {
                                    id: request_id.clone(),
                                    type_: EventType::Error.to_string(),
                                    data: Value::Null,
                                    subtype: None,
                                    message: Some(format!(
                                        "Failed to get data for module: {:?}",
                                        module.to_string()
                                    )),
                                    module: Some(module.to_string()),
                                }).unwrap());
                            }
                        }
                    }
                }
                Ok(EventType::GetSettings) => {
                    info!("GetSettings event");

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::SettingsResult.to_string(),
                        data: serde_json::to_value(get_settings()).unwrap(),
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());
                }
                Ok(EventType::ModuleUpdated) => {
                    let module_update_result: Result<ModuleUpdate, _> =
                        serde_json::from_value(request.data.clone());
                    if let Err(e) = module_update_result {
                        warn!("Invalid module update: {:?}", e);
                        continue;
                    }

                    let module_update = module_update_result.unwrap();
                    info!("Module update: {:?}", module_update.module.to_string());

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::DataUpdate.to_string(),
                        data: module_update.data,
                        subtype: None,
                        message: None,
                        module: module_update.module.to_string().into(),
                    }).unwrap());
                }
                Ok(EventType::Open) => {
                    info!("Open event");

                    // TODO: Open the application
                }
                Ok(EventType::RegisterDataListener) => {
                    let request_data_result: Result<RequestModules, _> =
                    serde_json::from_value(request.data.clone());
                    if let Err(e) = request_data_result {
                        warn!("Invalid data: {:?}", e);
                        continue;
                    }

                    let request_data = request_data_result.unwrap();
                    info!("Register data listener for modules: {:?}", request_data.modules);

                    // Register data listener
                    REGISTERED_LISTENERS.lock().unwrap().push(DataListener {
                        id: uuid::Uuid::new_v4().to_string(),
                        modules: request_data.modules,
                    });

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::DataListenerRegistered.to_string(),
                        data: Value::Null,
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());
                }
                Ok(EventType::UpdateSettings) => {
                    info!("UpdateSettings event: {:?}", request.data);

                    let settings_result: Result<Settings, _> =
                        serde_json::from_value(request.data.clone());
                    if let Err(e) = settings_result {
                        warn!("Invalid settings: {:?}", e);
                        continue;
                    }

                    let new_settings = settings_result.unwrap();
                    info!("Updating settings: {:?}", new_settings);

                    // Update the settings
                    update_settings(&new_settings);

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::SettingsUpdated.to_string(),
                        data: Value::Null,
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
                        type_: EventType::SettingsResult.to_string(),
                        data: serde_json::to_value(new_settings).unwrap(),
                        subtype: None,
                        message: None,
                        module: None,
                    }).unwrap());
                }
                Ok(EventType::Unknown) => {
                    warn!("Unknown event: {}", request.event);

                    yield Message::text(serde_json::to_string(&WebsocketResponse {
                        id: request_id.clone(),
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
                        id: request_id.clone(),
                        type_: EventType::Error.to_string(),
                        data: Value::Null,
                        subtype: Some(EventSubtype::UnknownEvent.to_string()),
                        message: Some("Unsupported event".to_string()),
                        module: None,
                    }).unwrap());
                }
            }; // End of event type match
        }; // End of message
    } // End of Stream
} // End of websocket
