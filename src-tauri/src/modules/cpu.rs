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
    ctx_switches: Option<i32>,
    interrupts: Option<i32>,
    soft_interrupts: Option<i32>,
    syscalls: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CPUTimes {
    user: Option<f32>,
    system: Option<f32>,
    idle: Option<f32>,
    interrupt: Option<f32>,
    dpc: Option<f32>,
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

    Ok(serde_json::to_value(ModuleCPU {
        count: cpus.len(),
        frequency: get_frequency(cpu, None).unwrap(),
        load_average: 0.0,
        per_cpu: get_per_cpu(cpus).unwrap(),
        power: None,
        stats: None,
        temperature: None,
        times: None,
        times_percent: None,
        usage: cpu.cpu_usage(),
        voltage: 0.0,
    })
    .unwrap())
}
