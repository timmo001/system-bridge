use log::info;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::error::Error;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ModulesData {
    battery: Value,
    cpu: Value,
    disks: Value,
    displays: Value,
    gpus: Value,
    media: Value,
    memory: Value,
    networks: Value,
    processes: Value,
    sensors: Value,
    system: Value,
}

pub async fn get_module_data(module: &Module) -> Result<Value, String> {
    match module {
        _ => Ok(Value::Null),
    }
}

pub async fn update_modules(modules: &Vec<Module>) -> Result<(), Box<dyn Error>> {
    for module in modules {
        let data = get_module_data(&module).await?;
        info!("{}: {:?}", module, data);
    }

    Ok(())
}
