mod battery;
mod cpu;
mod disks;
mod displays;
mod gpus;
mod media;
mod memory;
mod networks;
mod processes;
mod sensors;
mod system;

use crate::{
    event::EventType,
    shared::get_data_path,
    websocket::{client::WebSocketClient, WebsocketRequest},
};
use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize)]
pub enum Module {
    Battery,
    CPU,
    Disks,
    Displays,
    GPUs,
    Media,
    Memory,
    Networks,
    Processes,
    Sensors,
    System,
}

impl FromStr for Module {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "battery" => Ok(Self::Battery),
            "cpu" => Ok(Self::CPU),
            "disks" => Ok(Self::Disks),
            "displays" => Ok(Self::Displays),
            "gpus" => Ok(Self::GPUs),
            "media" => Ok(Self::Media),
            "memory" => Ok(Self::Memory),
            "networks" => Ok(Self::Networks),
            "processes" => Ok(Self::Processes),
            "sensors" => Ok(Self::Sensors),
            "system" => Ok(Self::System),
            _ => Err(format!("Invalid module: {}", s)),
        }
    }
}

impl fmt::Display for Module {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Self::Battery => "battery",
                Self::CPU => "cpu",
                Self::Disks => "disks",
                Self::Displays => "displays",
                Self::GPUs => "gpus",
                Self::Media => "media",
                Self::Memory => "memory",
                Self::Networks => "networks",
                Self::Processes => "processes",
                Self::Sensors => "sensors",
                Self::System => "system",
            }
        )
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestModules {
    pub modules: Vec<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ModulesData {
    battery: Option<Value>,
    cpu: Option<Value>,
    disks: Option<Value>,
    displays: Option<Value>,
    gpus: Option<Value>,
    media: Option<Value>,
    memory: Option<Value>,
    networks: Option<Value>,
    processes: Option<Value>,
    sensors: Option<Value>,
    system: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleUpdate {
    pub module: String,
    pub data: Value,
}

pub fn get_modules_path() -> String {
    format!("{}/modules", get_data_path())
}

pub fn get_modules_data_path(module: &Module) -> String {
    format!("{}/{}.json", get_modules_path(), module)
}

pub fn setup_modules_data() {
    std::fs::create_dir_all(format!("{}/modules", get_data_path())).unwrap();

    for module in vec![
        Module::Battery,
        Module::CPU,
        Module::Disks,
        Module::Displays,
        Module::GPUs,
        Module::Media,
        Module::Memory,
        Module::Networks,
        Module::Processes,
        Module::Sensors,
        Module::System,
    ] {
        if !std::path::Path::new(&get_modules_data_path(&module)).exists() {
            let contents = match module {
                Module::Processes => "[]",
                _ => "{}",
            };

            match std::fs::write(get_modules_data_path(&module), contents) {
                Ok(_) => info!("Created '{}' module data file", module),
                Err(e) => error!("Failed to create '{}' module data file: {:?}", module, e),
            }
        }
    }
}

pub async fn get_module_data(module: &Module) -> Result<Value, String> {
    let data_string = match std::fs::read_to_string(get_modules_data_path(module)) {
        Ok(data) => data,
        Err(_) => return Err(format!("No data for '{:?}' module", module)),
    };

    match serde_json::from_str(&data_string) {
        Ok(data) => Ok(data),
        Err(e) => Err(format!(
            "Failed to parse '{:?}' module data: {:?}",
            module, e
        )),
    }
}

pub async fn update_modules(modules: &Vec<Module>) -> Result<(), String> {
    let websocket_client = WebSocketClient::new().await;

    for module in modules {
        let data = match module {
            Module::Battery => battery::update().await,
            Module::CPU => cpu::update().await,
            Module::Disks => disks::update().await,
            Module::Displays => displays::update().await,
            Module::GPUs => gpus::update().await,
            Module::Media => media::update().await,
            Module::Memory => memory::update().await,
            Module::Networks => networks::update().await,
            Module::Processes => processes::update().await,
            Module::Sensors => sensors::update().await,
            Module::System => system::update().await,
        };

        match data {
            Ok(_) => {
                // Check if data is the same as the current data
                let current_data = get_module_data(module).await.unwrap();
                if current_data == data.clone().unwrap() {
                    info!("'{:?}' module data is the same", module);
                    continue;
                }

                // Save module data to file
                match std::fs::write(
                    get_modules_data_path(module),
                    data.clone().unwrap().to_string(),
                ) {
                    Ok(_) => {
                        info!("'{:?}' module updated", module);
                    }
                    Err(e) => {
                        error!("Failed to save '{:?}' module data: {:?}", module, e);
                        continue;
                    }
                };

                // Send updated module data to the websocket
                match websocket_client
                    .send_message(WebsocketRequest {
                        id: uuid::Uuid::new_v4().to_string(),
                        token: websocket_client.settings.api.token.clone(),
                        event: EventType::ModuleUpdated.to_string(),
                        data: serde_json::to_value(ModuleUpdate {
                            module: module.to_string(),
                            data: data.clone().unwrap(),
                        })
                        .unwrap(),
                    })
                    .await
                {
                    Ok(_) => info!("'{:?}' module data sent to websocket", module),
                    Err(e) => error!(
                        "'{:?}' module data failed to send to websocket: {:?}",
                        module, e
                    ),
                };
            }
            Err(e) => {
                error!("'{:?}' module update failed: {:?}", module, e)
            }
        }
    }

    Ok(())
}
