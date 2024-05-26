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

pub fn get_addresses(iface: &get_if_addrs::Interface) -> Vec<NetworkAddress> {
    let mut addresses = Vec::new();

    for address in iface.ip() {
        addresses.push(NetworkAddress {
            address: Some(address.to_string()),
            family: Some(address.family().to_string()),
            netmask: address.netmask().map(|netmask| netmask.to_string()),
            broadcast: address.broadcast().map(|broadcast| broadcast.to_string()),
            ptp: address.ptp().map(|ptp| ptp.to_string()),
        });
    }   

    addresses
}

pub fn get_stats(iface: &get_if_addrs::Interface) -> Option<NetworkStats> {
    get_if_addrs()
        .unwrap()
        .iter()
        .find(|&x| x.name == iface.name)
        .map(|iface| NetworkStats {
            isup: iface.is_up(),
            duplex: iface.duplex().map(|duplex| duplex.to_string()),
            speed: iface.speed(),
            mtu: iface.mtu(),
            flags: Some(iface.flags().iter().map(|flag| flag.to_string()).collect()),
        })
}

pub fn get_networks() -> Vec<Network> {
    let mut networks = Vec::new();

    for iface in get_if_addrs().unwrap() {
        let addresses = get_addresses(&iface);
        let stats = get_stats(&iface);

        networks.push(Network {
            name: Some(iface.name.to_string()),
            addresses: Some(addresses),
            stats,
        });
    }

    networks
}

pub async fn update() -> Result<Value, String> {
    let module_networks = ModuleNetworks {
        connections: None,
        io: None,
        networks: Some(get_networks()),
    };

    Ok(serde_json::to_value(module_networks).unwrap())
}
