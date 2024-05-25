use dns_lookup::{lookup_addr, lookup_host};
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
    boot_time: u64,
    fqdn: Option<String>,
    hostname: Option<String>,
    ip_address_4: String,
    mac_address: String,
    platform_version: Option<String>,
    platform: Option<String>,
    run_mode: RunMode,
    uptime: u64,
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
    let hostname = System::host_name();
    if hostname.is_none() {
        return Err("Failed to get hostname".to_string());
    }

    let ip = lookup_host(&hostname.clone().unwrap())
        .unwrap()
        .pop()
        .unwrap();
    let fqdn = lookup_addr(&ip).unwrap();

    let uuid_machine = machine_uid::get().unwrap();

    Ok(serde_json::to_value(ModuleSystem {
        boot_time: System::boot_time(),
        fqdn: Some(fqdn),
        hostname: hostname,
        ip_address_4: ip.to_string(),
        mac_address: "".to_string(), // TODO: Implement
        platform_version: System::os_version(),
        platform: System::name(),
        run_mode: RunMode::Standalone,
        uptime: System::uptime(),
        users: vec![], // TODO: Implement
        uuid: uuid_machine,
        version: env!("CARGO_PKG_VERSION").to_string(),
        camera_usage: None,            // TODO: Implement
        ip_address_6: None,            // TODO: Implement
        pending_reboot: None,          // TODO: Implement
        version_latest_url: None,      // TODO: Implement
        version_latest: None,          // TODO: Implement
        version_newer_available: None, // TODO: Implement
    })
    .unwrap())
}
