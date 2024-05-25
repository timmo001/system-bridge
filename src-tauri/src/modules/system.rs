use serde::{Deserialize, Serialize};
use serde_json::Value;
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize)]
pub enum RunMode {
    Standalone,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemUser {
    name: String,
    active: bool,
    terminal: String,
    host: String,
    started: f64,
    pid: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleSystem {
    boot_time: f64,
    fqdn: Option<String>,
    hostname: Option<String>,
    ip_address_4: String,
    mac_address: String,
    platform_version: Option<String>,
    platform: String,
    run_mode: RunMode,
    uptime: f64,
    users: Vec<SystemUser>,
    uuid: String,
    version: String,
    camera_usage: Option<Vec<String>>,
    ip_address_6: Option<String>,
    pending_reboot: Option<bool>,
    version_latest_url: Option<String>,
    version_latest: Option<String>,
    version_newer_available: Option<bool>,
}

pub async fn update(sys: &System) -> Result<Value, String> {
    Ok(serde_json::to_value(ModuleSystem {
        boot_time: 0.0,
        fqdn: System::name(),
        hostname: System::host_name(),
        ip_address_4: "".to_string(),
        mac_address: "".to_string(),
        platform_version: System::os_version(),
        platform: "".to_string(),
        run_mode: RunMode::Standalone,
        uptime: 0.0,
        users: vec![],
        uuid: "".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        camera_usage: None,
        ip_address_6: None,
        pending_reboot: None,
        version_latest_url: None,
        version_latest: None,
        version_newer_available: None,
    })
    .unwrap())
}
