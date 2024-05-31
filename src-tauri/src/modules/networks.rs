use log::info;
use log::warn;
use pyo3::prelude::*;
use pyo3::FromPyObject;
use rocket::serde;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkAddress {
    address: Option<String>,
    family: Option<String>,
    netmask: Option<String>,
    broadcast: Option<String>,
    ptp: Option<String>,
}

impl<'source> FromPyObject<'source> for NetworkAddress {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let address = ob.getattr("address")?.extract::<String>()?;
        let family = ob.getattr("family")?.extract::<String>()?;
        let netmask = ob.getattr("netmask")?.extract::<String>()?;
        let broadcast = ob.getattr("broadcast")?.extract::<String>()?;
        let ptp = ob.getattr("ptp")?.extract::<String>()?;

        Ok(NetworkAddress {
            address: Some(address),
            family: Some(family),
            netmask: Some(netmask),
            broadcast: Some(broadcast),
            ptp: Some(ptp),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkStats {
    isup: Option<bool>,
    duplex: Option<String>,
    speed: Option<i64>,
    mtu: Option<i64>,
    flags: Option<Vec<String>>,
}

impl<'source> FromPyObject<'source> for NetworkStats {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let isup = ob.getattr("isup")?.extract::<bool>()?;
        let duplex = ob.getattr("duplex")?.extract::<String>()?;
        let speed = ob.getattr("speed")?.extract::<i64>()?;
        let mtu = ob.getattr("mtu")?.extract::<i64>()?;
        let flags = ob.getattr("flags")?.extract::<Vec<String>>()?;

        Ok(NetworkStats {
            isup: Some(isup),
            duplex: Some(duplex),
            speed: Some(speed),
            mtu: Some(mtu),
            flags: Some(flags),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkConnection {
    fd: Option<i64>,
    family: Option<i64>,
    type_: Option<i64>,
    laddr: Option<String>,
    raddr: Option<String>,
    status: Option<String>,
    pid: Option<i64>,
}

impl<'source> FromPyObject<'source> for NetworkConnection {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let fd = ob.getattr("fd")?.extract::<i64>()?;
        let family = ob.getattr("family")?.extract::<i64>()?;
        let type_ = ob.getattr("type")?.extract::<i64>()?;
        let laddr = ob.getattr("laddr")?.extract::<String>()?;
        let raddr = ob.getattr("raddr")?.extract::<String>()?;
        let status = ob.getattr("status")?.extract::<String>()?;
        let pid = ob.getattr("pid")?.extract::<i64>()?;

        Ok(NetworkConnection {
            fd: Some(fd),
            family: Some(family),
            type_: Some(type_),
            laddr: Some(laddr),
            raddr: Some(raddr),
            status: Some(status),
            pid: Some(pid),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkIO {
    bytes_sent: Option<i64>,
    bytes_recv: Option<i64>,
    packets_sent: Option<i64>,
    packets_recv: Option<i64>,
    errin: Option<i64>,
    errout: Option<i64>,
    dropin: Option<i64>,
    dropout: Option<i64>,
}

impl<'source> FromPyObject<'source> for NetworkIO {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let bytes_sent = ob.getattr("bytes_sent")?.extract::<i64>()?;
        let bytes_recv = ob.getattr("bytes_recv")?.extract::<i64>()?;
        let packets_sent = ob.getattr("packets_sent")?.extract::<i64>()?;
        let packets_recv = ob.getattr("packets_recv")?.extract::<i64>()?;
        let errin = ob.getattr("errin")?.extract::<i64>()?;
        let errout = ob.getattr("errout")?.extract::<i64>()?;
        let dropin = ob.getattr("dropin")?.extract::<i64>()?;
        let dropout = ob.getattr("dropout")?.extract::<i64>()?;

        Ok(NetworkIO {
            bytes_sent: Some(bytes_sent),
            bytes_recv: Some(bytes_recv),
            packets_sent: Some(packets_sent),
            packets_recv: Some(packets_recv),
            errin: Some(errin),
            errout: Some(errout),
            dropin: Some(dropin),
            dropout: Some(dropout),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Network {
    name: String,
    addresses: Vec<NetworkAddress>,
    stats: NetworkStats,
}

impl<'source> FromPyObject<'source> for Network {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let name = ob.getattr("name")?.extract::<String>()?;
        let addresses = ob.getattr("addresses")?.extract::<Vec<NetworkAddress>>()?;
        let stats = ob.getattr("stats")?.extract::<NetworkStats>()?;

        Ok(Network {
            name: name,
            addresses: addresses,
            stats: stats,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleNetworks {
    connections: Vec<NetworkConnection>,
    io: NetworkIO,
    networks: Vec<Network>,
}

pub async fn update() -> Result<Value, String> {
    let (addresses, connections, io_counters, stats) = Python::with_gil(|py| {
        // Import the module
        let networks_module = PyModule::import_bound(py, "systembridgedata.module.networks")
            .expect("Failed to import systembridgedata.module.networks module");

        // Create an instance of the Networks class
        let networks_instance = networks_module
            .getattr("Networks")
            .expect("Failed to get Networks class")
            .call0()
            .expect("Failed to create Networks instance");

        // Call the methods
        let addresses_output = networks_instance
            .getattr("get_addresses")
            .expect("Failed to get get_addresses method")
            .call0()
            .expect("Failed to call get_addresses method");
        // info!("{:?}", addresses_output);
        let addresses = addresses_output.extract::<HashMap<String, Vec<NetworkAddress>>>();

        let connections = networks_instance
            .getattr("get_connections")
            .expect("Failed to get get_connections method")
            .call0()
            .expect("Failed to call get_connections method")
            .extract::<Vec<NetworkConnection>>()
            .expect("Failed to extract from get_connections result");

        let io_counters = networks_instance
            .getattr("get_io_counters")
            .expect("Failed to get get_io_counters method")
            .call0()
            .expect("Failed to call get_io_counters method")
            .extract::<NetworkIO>()
            .expect("Failed to extract from get_io_counters result");

        let stats = networks_instance
            .getattr("get_stats")
            .expect("Failed to get get_stats method")
            .call0()
            .expect("Failed to call get_stats method")
            .extract::<HashMap<String, NetworkStats>>();

        // Set output
        (addresses, connections, io_counters, stats)
    });

    // [systembridge::modules::networks] {'Ethernet 2': [NetworkAddress(address='D8-5E-D3-E5-8E-1E', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='192.168.1.127', family=None, netmask='255.255.255.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::db8a:ecfb:c90f:32d4', family=None, netmask=None, broadcast=None, ptp=None)], 'Local Area Connection': [NetworkAddress(address='00-FF-BC-F1-E2-EE', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='169.254.209.241', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::1062:86a:fd18:81be', family=None, netmask=None, broadcast=None, ptp=None)], 'WiFi 3': [NetworkAddress(address='4C-03-4F-C3-46-28', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='169.254.107.31', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::2e61:9c2e:5b40:d2ae', family=None, netmask=None, broadcast=None, ptp=None)], 'Local Area Connection* 1': [NetworkAddress(address='4C-03-4F-C3-46-29', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='169.254.207.79', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::9574:8449:f97:f666', family=None, netmask=None, broadcast=None, ptp=None)], 'Local Area Connection* 10': [NetworkAddress(address='4E-03-4F-C3-46-28', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='169.254.62.56', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::83c7:5647:7582:11d5', family=None, netmask=None, broadcast=None, ptp=None)], 'Bluetooth Network Connection 3': [NetworkAddress(address='4C-03-4F-C3-46-2C', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='169.254.113.160', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::c84:555c:ce22:1973', family=None, netmask=None, broadcast=None, ptp=None)], 'vEthernet (Default Switch)': [NetworkAddress(address='00-15-5D-59-D1-40', family=None, netmask=None, broadcast=None, ptp=None), NetworkAddress(address='172.19.0.1', family=None, netmask='255.255.240.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::5628:6c57:df31:598e', family=None, netmask=None, broadcast=None, ptp=None)], 'Tailscale': [NetworkAddress(address='169.254.83.107', family=None, netmask='255.255.0.0', broadcast=None, ptp=None), NetworkAddress(address='fe80::d8ff:5060:f230:9168', family=None, netmask=None, broadcast=None, ptp=None)], 'Loopback Pseudo-Interface 1': [NetworkAddress(address='127.0.0.1', family=None, netmask='255.0.0.0', broadcast=None, ptp=None), NetworkAddress(address='::1', family=None, netmask=None, broadcast=None, ptp=None)]}
    // thread 'modules' panicked at src\modules\networks.rs:184:14:
    // Failed to extract from get_addresses result: PyErr { type: <class 'TypeError'>, value: TypeError("'NoneType' object cannot be converted to 'PyString'"), traceback: None }

    let networks: Vec<Network> = match addresses {
        Ok(addresses) => {
            let mut networks: Vec<Network> = vec![];

            match stats {
                Ok(stats) => {
                    for (name, stat) in stats.iter() {
                        if let Some(addrs) = addresses.get(name) {
                            let network_addresses: Vec<NetworkAddress> = addrs
                                .iter()
                                .map(|address| NetworkAddress {
                                    address: address.address.clone(),
                                    family: address.family.clone(),
                                    netmask: address.netmask.clone(),
                                    broadcast: address.broadcast.clone(),
                                    ptp: address.ptp.clone(),
                                })
                                .collect();

                            let network_stats = NetworkStats {
                                isup: stat.isup.clone(),
                                duplex: stat.duplex.clone(),
                                speed: stat.speed.clone(),
                                mtu: stat.mtu.clone(),
                                flags: stat.flags.clone(),
                            };

                            let network = Network {
                                name: name.clone(),
                                addresses: network_addresses,
                                stats: network_stats,
                            };

                            networks.push(network);
                        }
                    }
                }
                Err(e) => {
                    info!("Failed to get stats: {:?}", e);
                }
            }

            networks
        }
        Err(e) => {
            warn!("Failed to get addresses: {:?}", e);
            vec![]
        }
    };

    Ok(serde_json::to_value(ModuleNetworks {
        connections,
        io: io_counters,
        networks,
    })
    .unwrap())
}
