mod battery;
mod cpu;
mod networks;
mod system;

use crate::shared::get_data_path;
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

pub fn get_modules_data_path(module: &Module) -> String {
    format!("{}/modules/{}.json", get_data_path(), module)
}

pub fn setup_modules_data() {
    std::fs::create_dir_all(format!("{}/modules", get_data_path())).unwrap();
}

pub async fn get_module_data(module: &Module) -> Result<Value, String> {
    match module {
        _ => Ok(serde_json::from_str(
            &std::fs::read_to_string(get_modules_data_path(module)).unwrap(),
        )
        .unwrap()),
    }
}

pub async fn update_modules(modules: &Vec<Module>) -> Result<(), String> {
    sysinfo::set_open_files_limit(0);

    for module in modules {
        let data = match module {
            Module::Battery => battery::update().await,
            Module::CPU => cpu::update().await,
            Module::System => system::update().await,
            _ => Err(format!("Invalid module: {}", module)),
        };

        if data.is_err() {
            return Err(format!(
                "Failed to update module: {:?} - {:?}",
                module,
                data.err()
            ));
        }

        // Save module data to file
        std::fs::write(get_modules_data_path(module), data.unwrap().to_string()).unwrap();
    }

    Ok(())
}
