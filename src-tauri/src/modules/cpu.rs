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
    user: Option<f64>,
    system: Option<f64>,
    idle: Option<f64>,
    interrupt: Option<f64>,
    dpc: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerCPU {
    id: i32,
    frequency: Option<CPUFrequency>,
    power: Option<f64>,
    times: Option<CPUTimes>,
    times_percent: Option<CPUTimes>,
    usage: Option<f64>,
    voltage: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleCPU {
    count: usize,
    frequency: Option<CPUFrequency>,
    load_average: Option<f64>,
    per_cpu: Option<Vec<PerCPU>>,
    power: Option<f64>,
    stats: Option<CPUStats>,
    temperature: Option<f64>,
    times: Option<CPUTimes>,
    times_percent: Option<CPUTimes>,
    usage: Option<f32>,
    voltage: Option<f64>,
}

pub async fn get_cpu_frequency(
    cpu: &Cpu,
    existing: Option<CPUFrequency>,
) -> Result<CPUFrequency, String> {
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

pub async fn update() -> Result<Value, String> {
    // Refresh the CPU information
    let mut sys =
        System::new_with_specifics(RefreshKind::new().with_cpu(CpuRefreshKind::everything()));
    // Wait a bit because CPU usage is based on diff.
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    // Refresh CPUs again.
    sys.refresh_cpu();

    let cpu = sys.global_cpu_info();

    let cpus = sys.cpus();
    // for cpu in cpus {
    //     cpu::get_current_frequency();
    //     info!("{:?}", cpu);
    // }

    Ok(serde_json::to_value(ModuleCPU {
        count: cpus.len(),
        frequency: Some(get_cpu_frequency(cpu, None).await.unwrap()),
        load_average: Some(0.0),
        per_cpu: None,
        power: Some(0.0),
        stats: None,
        temperature: Some(0.0),
        times: None,
        times_percent: None,
        usage: Some(cpu.cpu_usage()),
        voltage: Some(0.0),
    })
    .unwrap())
}
