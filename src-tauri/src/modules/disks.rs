use pyo3::prelude::*;
use pyo3::FromPyObject;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DiskIOCounters {
    read_count: i64,
    write_count: i64,
    read_bytes: i64,
    write_bytes: i64,
    read_time: i64,
    write_time: i64,
}

impl<'source> FromPyObject<'source> for DiskIOCounters {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(DiskIOCounters {
            read_count: ob.getattr("read_count")?.extract()?,
            write_count: ob.getattr("write_count")?.extract()?,
            read_bytes: ob.getattr("read_bytes")?.extract()?,
            write_bytes: ob.getattr("write_bytes")?.extract()?,
            read_time: ob.getattr("read_time")?.extract()?,
            write_time: ob.getattr("write_time")?.extract()?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskUsage {
    total: i64,
    used: i64,
    free: i64,
    percent: f32,
}

impl<'source> FromPyObject<'source> for DiskUsage {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(DiskUsage {
            total: ob.getattr("total")?.extract()?,
            used: ob.getattr("used")?.extract()?,
            free: ob.getattr("free")?.extract()?,
            percent: ob.getattr("percent")?.extract()?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskPartition {
    device: String,
    mount_point: String,
    filesystem_type: String,
    options: String,
    max_file_size: i64,
    max_path_length: i64,
    usage: Option<DiskUsage>,
}

impl<'source> FromPyObject<'source> for DiskPartition {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(DiskPartition {
            device: ob.getattr("device")?.extract()?,
            mount_point: ob.getattr("mount_point")?.extract()?,
            filesystem_type: ob.getattr("filesystem_type")?.extract()?,
            options: ob.getattr("options")?.extract()?,
            max_file_size: ob.getattr("max_file_size")?.extract()?,
            max_path_length: ob.getattr("max_path_length")?.extract()?,
            usage: ob.getattr("usage")?.extract().ok(),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Disk {
    name: String,
    partitions: Vec<DiskPartition>,
    io_counters: Option<DiskIOCounters>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleDisks {
    devices: Vec<Disk>,
    io_counters: Option<DiskIOCounters>,
}

pub async fn update() -> Result<Value, String> {
    let (devices, io_counters) = Python::with_gil(|py| {
        // Import the module
        let disks_module = PyModule::import_bound(py, "systembridgedata.module.disks")
            .expect("Failed to import systembridgedata.module.disks module");

        // Create an instance of the Disks class
        let disks_instance = disks_module
            .getattr("Disks")
            .expect("Failed to get Disks class")
            .call0()
            .expect("Failed to create Disks instance");

        // Call the methods
        let io_counters = disks_instance
            .getattr("get_io_counters")
            .expect("Failed to get get_io_counters method")
            .call0()
            .expect("Failed to call get_io_counters method")
            .extract::<DiskIOCounters>()
            .expect("Failed to extract from get_io_counters result");

        let io_counters_per_disk = disks_instance
            .getattr("get_io_counters_per_disk")
            .expect("Failed to get get_io_counters_per_disk method")
            .call0()
            .expect("Failed to call get_io_counters_per_disk method")
            .extract::<HashMap<String, DiskIOCounters>>()
            .expect("Failed to extract from get_io_counters_per_disk result");

        let partitions = disks_instance
            .getattr("get_partitions")
            .expect("Failed to get get_partitions method")
            .call0()
            .expect("Failed to call get_partitions method")
            .extract::<Vec<DiskPartition>>()
            .expect("Failed to extract from get_partitions result");

        let mut devices: Vec<Disk> = vec![];

        for partition in partitions {
            // Find the disk and add the partition to it, else create a new disk
            let disk_id = devices
                .iter()
                .position(|disk| disk.name == partition.device)
                .unwrap_or_else(|| {
                    // Find the disk io counters from the disk name
                    let disk_io_counters = io_counters_per_disk.get(&partition.device).cloned();

                    devices.push(Disk {
                        name: partition.device.clone(),
                        partitions: vec![],
                        io_counters: disk_io_counters,
                    });
                    devices.len() - 1
                });

            devices[disk_id].partitions.push(partition);
        }

        // Set output
        (devices, io_counters)
    });

    Ok(serde_json::to_value(ModuleDisks {
        devices,
        io_counters: Some(io_counters),
    })
    .unwrap())
}
