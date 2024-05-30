use pyo3::prelude::*;
use pyo3::FromPyObject;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sysinfo::{Cpu, CpuRefreshKind, RefreshKind, System};

#[derive(Debug, Serialize, Deserialize)]
pub struct CPUFrequency {
    current: u64,
    min: u64,
    max: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CPUStats {
    ctx_switches: Option<i64>,
    interrupts: Option<i64>,
    soft_interrupts: Option<i64>,
    syscalls: Option<i64>,
}

impl<'source> FromPyObject<'source> for CPUStats {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let ctx_switches = ob.getattr("ctx_switches")?.extract::<i64>()?;
        let interrupts = ob.getattr("interrupts")?.extract::<i64>()?;
        let soft_interrupts = ob.getattr("soft_interrupts")?.extract::<i64>()?;
        let syscalls = ob.getattr("syscalls")?.extract::<i64>()?;

        Ok(CPUStats {
            ctx_switches: Some(ctx_switches),
            interrupts: Some(interrupts),
            soft_interrupts: Some(soft_interrupts),
            syscalls: Some(syscalls),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CPUTimes {
    user: Option<f32>,
    system: Option<f32>,
    idle: Option<f32>,
    interrupt: Option<f32>,
    dpc: Option<f32>,
}

impl<'source> FromPyObject<'source> for CPUTimes {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        let user = ob.getattr("user")?.extract::<f32>()?;
        let system = ob.getattr("system")?.extract::<f32>()?;
        let idle = ob.getattr("idle")?.extract::<f32>()?;
        let interrupt = ob.getattr("interrupt")?.extract::<f32>()?;
        let dpc = ob.getattr("dpc")?.extract::<f32>()?;

        Ok(CPUTimes {
            user: Some(user),
            system: Some(system),
            idle: Some(idle),
            interrupt: Some(interrupt),
            dpc: Some(dpc),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerCPU {
    id: i32,
    frequency: CPUFrequency,
    power: Option<f32>,
    times: Option<CPUTimes>,
    times_percent: Option<CPUTimes>,
    usage: f32,
    voltage: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleCPU {
    count: usize,
    frequency: CPUFrequency,
    load_average: f32,
    per_cpu: Vec<PerCPU>,
    power: Option<f32>,
    stats: Option<CPUStats>,
    temperature: Option<f32>,
    times: Option<CPUTimes>,
    times_percent: Option<CPUTimes>,
    usage: f32,
    voltage: f32,
}

pub fn get_frequency(cpu: &Cpu, existing: Option<CPUFrequency>) -> Result<CPUFrequency, String> {
    let current = cpu.frequency();

    Ok(match existing {
        Some(existing) => {
            let mut new = CPUFrequency {
                current,
                min: existing.min,
                max: existing.max,
            };

            if current < existing.min {
                new.min = current;
            }
            if current > existing.max {
                new.max = current;
            }

            new
        }
        None => CPUFrequency {
            current,
            min: current,
            max: current,
        },
    })
}

pub fn get_per_cpu(cpus: &[Cpu]) -> Result<Vec<PerCPU>, String> {
    let mut new: Vec<PerCPU> = Vec::new();

    let mut id = 0;
    for cpu in cpus {
        id += 1;
        new.push(PerCPU {
            id,
            frequency: get_frequency(cpu, None).unwrap(),
            power: None,
            times: None,
            times_percent: None,
            usage: cpu.cpu_usage(),
            voltage: 0.0,
        });
    }

    Ok(new)
}

pub async fn update() -> Result<Value, String> {
    // Refresh CPU information
    let mut sys =
        System::new_with_specifics(RefreshKind::new().with_cpu(CpuRefreshKind::everything()));
    // Wait a bit because CPU usage is based on diff.
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    // Refresh CPUs again.
    sys.refresh_cpu();

    let cpu = sys.global_cpu_info();

    let cpus = sys.cpus();

    let (load_average, stats, times, times_percent) = Python::with_gil(|py| {
        // Import the module
        let cpu_module = PyModule::import_bound(py, "systembridgedata.module.cpu")
            .expect("Failed to import systembridgedata.module.cpu module");

        // Create an instance of the CPU class
        let cpu_instance = cpu_module
            .getattr("CPU")
            .expect("Failed to get CPU class")
            .call0()
            .expect("Failed to create CPU instance");

        // Call the methods
        let load_average = cpu_instance
            .getattr("get_load_average")
            .expect("Failed to get get_load_average method")
            .call0()
            .expect("Failed to call get_load_average method")
            .extract::<f32>()
            .expect("Failed to extract from get_load_average result");

        let stats = cpu_instance
            .getattr("get_stats")
            .expect("Failed to get get_stats method")
            .call0()
            .expect("Failed to call get_stats method")
            .extract::<CPUStats>()
            .expect("Failed to extract from get_stats result");

        let times = cpu_instance
            .getattr("get_times")
            .expect("Failed to get get_times method")
            .call0()
            .expect("Failed to call get_times method")
            .extract::<CPUTimes>()
            .expect("Failed to extract from get_times result");

        let times_percent = cpu_instance
            .getattr("get_times_percent")
            .expect("Failed to get get_times_percent method")
            .call0()
            .expect("Failed to call get_times_percent method")
            .extract::<CPUTimes>()
            .expect("Failed to extract from get_times_percent result");

        // Set output
        (load_average, stats, times, times_percent)
    });

    Ok(serde_json::to_value(ModuleCPU {
        count: cpus.len(),
        frequency: get_frequency(cpu, None).unwrap(),
        load_average,
        per_cpu: get_per_cpu(cpus).unwrap(),
        power: None,
        stats: Some(stats),
        temperature: None,
        times: Some(times),
        times_percent: Some(times_percent),
        usage: cpu.cpu_usage(),
        voltage: 0.0,
    })
    .unwrap())
}
