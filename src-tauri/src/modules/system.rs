use serde::{Deserialize, Serialize};
use sysinfo::{System, SystemExt};

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
pub struct System {
    boot_time: f64,
    fqdn: String,
    hostname: String,
    ip_address_4: String,
    mac_address: String,
    platform_version: String,
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

fn update() -> Result<System, Box<dyn std::error::Error>> {
    let mut sys = System::new_all();
    sys.refresh_all();

    Ok(System {
        boot_time: sys.get_boot_time(),
        fqdn: "".to_string(),
        hostname: "".to_string(),
        ip_address_4: "".to_string(),
        mac_address: "".to_string(),
        platform_version: "".to_string(),
        platform: "".to_string(),
        run_mode: RunMode::Standalone,
        uptime: 0.0,
        users: vec![],
        uuid: "".to_string(),
        version: "".to_string(),
        camera_usage: None,
        ip_address_6: None,
        pending_reboot: None,
        version_latest_url: None,
        version_latest: None,
        version_newer_available: None,
    })
}
