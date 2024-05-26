use get_if_addrs::get_if_addrs;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkAddress {
    address: Option<String>,
    family: Option<String>,
    netmask: Option<String>,
    broadcast: Option<String>,
    ptp: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkStats {
    isup: Option<bool>,
    duplex: Option<String>,
    speed: Option<i32>,
    mtu: Option<i32>,
    flags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkConnection {
    fd: Option<i32>,
    family: Option<i32>,
    type_: Option<i32>,
    laddr: Option<String>,
    raddr: Option<String>,
    status: Option<String>,
    pid: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkIO {
    bytes_sent: Option<i32>,
    bytes_recv: Option<i32>,
    packets_sent: Option<i32>,
    packets_recv: Option<i32>,
    errin: Option<i32>,
    errout: Option<i32>,
    dropin: Option<i32>,
    dropout: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Network {
    name: Option<String>,
    addresses: Option<Vec<NetworkAddress>>,
    stats: Option<NetworkStats>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleNetworks {
    connections: Option<Vec<NetworkConnection>>,
    io: Option<NetworkIO>,
    networks: Option<Vec<Network>>,
}

pub async fn update() -> Result<Value, String> {
    Ok(serde_json::to_value(ModuleNetworks {
        connections: None,
        io: None,
        networks: None,
    })
    .unwrap())
}
