use log::warn;
use pyo3::prelude::*;
use pyo3::FromPyObject;
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
    active: Option<bool>,
    terminal: String,
    host: String,
    started: f64,
    pid: f64,
}

impl<'source> FromPyObject<'source> for SystemUser {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let name = ob.getattr("name")?.extract::<String>()?;
        let terminal = ob.getattr("terminal")?.extract::<String>()?;
        let host = ob.getattr("host")?.extract::<String>()?;
        let started = ob.getattr("started")?.extract::<f64>()?;
        let pid = ob.getattr("pid")?.extract::<f64>()?;

        Ok(SystemUser {
            name,
            active: None,
            terminal,
            host,
            started,
            pid,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleSystem {
    boot_time: u64,
    fqdn: Option<String>,
    hostname: Option<String>,
    ip_address_4: Option<String>,
    mac_address: Option<String>,
    platform_version: Option<String>,
    platform: Option<String>,
    run_mode: RunMode,
    uptime: u64,
    users: Option<Vec<SystemUser>>,
    uuid: String,
    version: String,
    camera_usage: Option<Vec<String>>,
    ip_address_6: Option<String>,
    pending_reboot: Option<bool>,
    version_latest_url: Option<String>,
    version_latest: Option<String>,
    version_newer_available: Option<bool>,
}

pub async fn update() -> Result<Value, String> {
    // let fqdn = lookup_addr(&ip).unwrap();
    // let mac_address = get_mac_address().unwrap();
    // let mac_address_string: Option<String> = match mac_address {
    //     Some(mac) => Some(mac.to_string()),
    //     None => None,
    // };

    let (fqdn, ip_address_4, ip_address_6, mac_address, pending_reboot, users) =
        Python::with_gil(|py| {
            // Import the module
            let system_module = PyModule::import_bound(py, "systembridgedata.module.system")
                .expect("Failed to import systembridgedata.module.system module");

            // Create an instance of the System class
            let system_instance = match system_module
                .getattr("System")
                .expect("Failed to get System class")
                .call0()
            {
                Ok(instance) => instance,
                Err(e) => {
                    warn!("Error: {:?}", e);
                    return (None, None, None, None, None, None);
                }
            };

            // Call the methods
            let fqdn = system_instance
                .getattr("get_fqdn")
                .expect("Failed to get get_fqdn method")
                .call0()
                .expect("Failed to call get_fqdn method")
                .extract::<String>()
                .expect("Failed to extract from get_fqdn result");

            let ip_address_4 = system_instance
                .getattr("get_ip_address_4")
                .expect("Failed to get get_ip_address_4 method")
                .call0()
                .expect("Failed to call get_ip_address_4 method")
                .extract::<String>()
                .expect("Failed to extract from get_ip_address_4 result");

            let ip_address_6 = system_instance
                .getattr("get_ip_address_6")
                .expect("Failed to get get_ip_address_6 method")
                .call0()
                .expect("Failed to call get_ip_address_6 method")
                .extract::<String>()
                .expect("Failed to extract from get_ip_address_6 result");

            let mac_address = system_instance
                .getattr("get_mac_address")
                .expect("Failed to get get_mac_address method")
                .call0()
                .expect("Failed to call get_mac_address method")
                .extract::<String>()
                .expect("Failed to extract from get_mac_address result");

            let pending_reboot = system_instance
                .getattr("get_pending_reboot")
                .expect("Failed to get get_pending_reboot method")
                .call0()
                .expect("Failed to call get_pending_reboot method")
                .extract::<bool>()
                .expect("Failed to extract boolean value from get_pending_reboot result");

            let users = system_instance
                .getattr("get_users")
                .expect("Failed to get get_users method")
                .call0()
                .expect("Failed to call get_users method")
                .extract::<Vec<SystemUser>>()
                .expect("Failed to extract Vec<SystemUser> value from get_users result");

            // Set output
            (
                Some(fqdn),
                Some(ip_address_4),
                Some(ip_address_6),
                Some(mac_address),
                Some(pending_reboot),
                Some(users),
            )
        });

    let uuid_machine = machine_uid::get().unwrap();

    Ok(serde_json::to_value(ModuleSystem {
        boot_time: System::boot_time(),
        fqdn,
        hostname: System::host_name(),
        ip_address_4,
        mac_address,
        platform_version: System::long_os_version(),
        platform: System::name(),
        run_mode: RunMode::Standalone,
        uptime: System::uptime(),
        users,
        uuid: uuid_machine,
        version: env!("CARGO_PKG_VERSION").to_string(),
        camera_usage: None, // TODO: Implement
        ip_address_6,
        pending_reboot,
        version_latest_url: None,      // TODO: Implement
        version_latest: None,          // TODO: Implement
        version_newer_available: None, // TODO: Implement
    })
    .unwrap())
}
