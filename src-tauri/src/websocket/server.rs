use super::{WebsocketRequest, WebsocketResponse};
use crate::{
    event::{EventSubtype, EventType},
    modules::{get_module_data, watch_modules, Module, RequestModules},
    settings::{get_settings, update_settings, Settings},
};
use log::{debug, error, info, warn};
use rocket::futures::channel::mpsc::{channel, Sender};
use rocket::futures::{SinkExt, StreamExt};
use rocket::get;
use rocket::tokio::select;
use rocket::tokio::sync::Mutex;
use rocket::State;
use rocket_ws::{Channel, Message, WebSocket};
use serde_json::Value;
use std::{collections::HashMap, str::FromStr, sync::Arc, thread};

pub type PeersMap = Arc<Mutex<HashMap<String, Sender<String>>>>;

#[get("/api/websocket")]
pub async fn websocket(websocket: WebSocket, peers_map: &State<PeersMap>) -> Channel<'static> {
    let peers_map = peers_map.inner().clone();

    // // Create multiple threads to handle the different tasks
    // let mut tasks: Vec<thread::JoinHandle<()>> = vec![];

    // fn handle_module_data(module: &Module, data: &Value) {
    //     // Send data update to the client
    //     info!("Data update for module: {:?}", module);

    //     let request_id = uuid::Uuid::new_v4().to_string();
    //     let listeners = REGISTERED_LISTENERS.lock().unwrap();
    //     for (_, ws) in &*listeners {
    //         let (mut sender, mut receiver) = ws.split();

    //         let _ = sender
    //             .send(Message::text(
    //                 serde_json::to_string(&WebsocketResponse {
    //                     id: request_id.clone(),
    //                     type_: EventType::DataUpdate.to_string(),
    //                     data: data.clone(),
    //                     subtype: None,
    //                     message: None,
    //                     module: Some(module.to_string()),
    //                 })
    //                 .unwrap(),
    //             ))
    //             .await;
    //     }

    //     info!("Sent data update for module: {:?}", module);
    // }

    // // Listen for data updates for the requested modules on another thread
    // tasks.push(
    //     thread::Builder::new()
    //         .name("listener".into())
    //         .spawn(move || {
    //             let rt = Runtime::new().unwrap();
    //             rt.block_on(async {
    //                 watch_modules(
    //                     &vec![
    //                         Module::Battery,
    //                         Module::CPU,
    //                         Module::Disks,
    //                         Module::Displays,
    //                         Module::GPUs,
    //                         Module::Media,
    //                         Module::Memory,
    //                         Module::Networks,
    //                         Module::Processes,
    //                         Module::Sensors,
    //                         Module::System,
    //                     ],
    //                     handle_module_data,
    //                 )
    //                 .await
    //                 .unwrap();
    //             });
    //         })
    //         .unwrap(),
    // );

    websocket.channel(move |mut stream| {
        Box::pin(async move {
            let assigned_id = uuid::Uuid::new_v4().to_string();
            let (tx, mut rx) = channel(1);
            peers_map.lock().await.insert(assigned_id.clone(), tx);
            let count = peers_map.lock().await.len();
            info!("Connection opened ({} clients)", count);

            loop {
                select! {
                    message = stream.next() => match message {
                        Some(Ok(Message::Text(text))) => {
                            debug!("Received message: {:?}", text);

                            // Parse the message
                            let request_result = serde_json::from_str(&text);
                            if request_result.is_err() {
                                error!(
                                    "Failed to parse request: {:?} - {:?}",
                                    text,
                                    request_result.err()
                                );
                                continue;
                            }
                            let request: WebsocketRequest = request_result.unwrap();
                            debug!("Received request: {:?}", request);

                            let request_id: String = request.id.clone();
                            let required_token = get_settings().api.token;

                            // Check if the token is valid
                            if request.token != required_token {
                                warn!(
                                    "Invalid token provided: {} - Expected: {}",
                                    request.token, required_token
                                );

                                let _ = stream
                                    .send(Message::text(
                                        serde_json::to_string(&WebsocketResponse {
                                            id: request_id.clone(),
                                            type_: EventType::Error.to_string(),
                                            data: Value::Null,
                                            subtype: None,
                                            message: Some("Invalid token".to_string()),
                                            module: None,
                                        })
                                        .unwrap(),
                                    ))
                                    .await;

                                continue;
                            }

                            // Process the request
                            let event_type = EventType::from_str(&request.event);

                            match event_type {
                                Ok(EventType::ApplicationUpdate) => {
                                    info!("ApplicationUpdate event");

                                    // TODO: Update the application

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::ApplicationUpdating.to_string(),
                                                data: Value::Null,
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
                                }
                                Ok(EventType::ExitApplication) => {
                                    info!("ExitApplication event");

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::ExitingApplication.to_string(),
                                                data: Value::Null,
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;

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
                                                let _ = stream
                                                    .send(Message::text(
                                                        serde_json::to_string(&WebsocketResponse {
                                                            id: request_id.clone(),
                                                            type_: EventType::DataUpdate.to_string(),
                                                            data: module_data,
                                                            subtype: None,
                                                            message: None,
                                                            module: Some(module.to_string()),
                                                        })
                                                        .unwrap(),
                                                    ))
                                                    .await;
                                            }
                                            Err(e) => {
                                                warn!(
                                                    "Failed to get data for module: {:?} - {:?}",
                                                    module.to_string(),
                                                    e
                                                );

                                                let _ = stream
                                                    .send(Message::text(
                                                        serde_json::to_string(&WebsocketResponse {
                                                            id: request_id.clone(),
                                                            type_: EventType::Error.to_string(),
                                                            data: Value::Null,
                                                            subtype: None,
                                                            message: Some(format!(
                                                                "Failed to get data for module: {:?}",
                                                                module.to_string()
                                                            )),
                                                            module: Some(module.to_string()),
                                                        })
                                                        .unwrap(),
                                                    ))
                                                    .await;
                                            }
                                        }
                                    }
                                }
                                Ok(EventType::GetSettings) => {
                                    info!("GetSettings event");

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::SettingsResult.to_string(),
                                                data: serde_json::to_value(get_settings()).unwrap(),
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
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
                                    // let modules = request_data.modules;
                                    info!(
                                        "Register data listener for modules: {:?}",
                                        request_data.modules
                                    );

                                    // Register the listener

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::DataListenerRegistered.to_string(),
                                                data: Value::Null,
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
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

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::SettingsUpdated.to_string(),
                                                data: Value::Null,
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::SettingsResult.to_string(),
                                                data: serde_json::to_value(new_settings).unwrap(),
                                                subtype: None,
                                                message: None,
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
                                }
                                Ok(EventType::Unknown) => {
                                    warn!("Unknown event: {}", request.event);

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::Error.to_string(),
                                                data: Value::Null,
                                                subtype: Some(EventSubtype::UnknownEvent.to_string()),
                                                message: Some("Unknown event".to_string()),
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
                                }
                                _ => {
                                    warn!("Unsupported event: {}", request.event);

                                    let _ = stream
                                        .send(Message::text(
                                            serde_json::to_string(&WebsocketResponse {
                                                id: request_id.clone(),
                                                type_: EventType::Error.to_string(),
                                                data: Value::Null,
                                                subtype: Some(EventSubtype::UnknownEvent.to_string()),
                                                message: Some("Unsupported event".to_string()),
                                                module: None,
                                            })
                                            .unwrap(),
                                        ))
                                        .await;
                                }
                            }; // End of event type match


                        } // End of Message::Text
                        Some(Ok(message)) => {
                            println!("Received message from client: {:?}", message);
                            let _ = stream.send(message).await;
                        }
                        Some(Err(error)) => {
                            println!("Error: {:?}", error);
                            break;
                        }
                        None => break,
                    },
                    Some(message) = rx.next() => {
                            println!("Received message from other client: {:?}", message);
                            let _ = stream.send(Message::Text(message)).await;
                    },
                    else => break,
                }
            }

            peers_map.lock().await.remove(&assigned_id.clone());
            let count = peers_map.lock().await.len();
            info!("Connection closed ({} clients)", count);

            Ok(())
        })
    }) // End of ws.channel
} // End of websocket
