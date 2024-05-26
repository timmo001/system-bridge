use battery::units::electric_potential::volt;
use battery::units::energy::watt_hour;
use battery::units::thermodynamic_temperature::degree_celsius;
use battery::units::time::second;
use battery::units::{power::watt, ratio::percent};
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleBattery {
    consumption: Option<f32>,
    current: Option<f32>,
    is_charging: Option<bool>,
    percentage: Option<f32>,
    temperature: Option<f32>,
    time_remaining: Option<f32>,
    time_until_charged: Option<f32>,
    voltage: Option<f32>,
}

pub async fn update() -> Result<Value, String> {
    // Get battery information
    let manager = battery::Manager::new().unwrap();
    Ok(
        serde_json::to_value(match manager.batteries().unwrap().next() {
            Some(Ok(battery)) => {
                let consumption = battery.energy_rate().get::<watt>();

                let current = battery.energy().get::<watt_hour>();

                let is_charging = battery.state() == battery::State::Charging;

                let percentage = battery.state_of_charge().get::<percent>();

                let time_remaining: f32 = match battery.time_to_empty() {
                    Some(time) => time.get::<second>() as f32,
                    None => -1.0,
                };

                let time_until_charged: f32 = match battery.time_to_full() {
                    Some(time) => time.get::<second>() as f32,
                    None => -1.0,
                };

                let temperature: f32 = match battery.temperature() {
                    Some(temp) => temp.get::<degree_celsius>(),
                    None => -1.0,
                };

                let voltage: f32 = battery.voltage().get::<volt>();

                ModuleBattery {
                    consumption: Some(consumption),
                    current: Some(current),
                    is_charging: Some(is_charging),
                    percentage: Some(percentage),
                    temperature: Some(temperature),
                    time_remaining: Some(time_remaining),
                    time_until_charged: Some(time_until_charged),
                    voltage: Some(voltage),
                }
            }
            Some(Err(e)) => {
                warn!("Unable to access battery information: {:?}", e);
                ModuleBattery {
                    consumption: None,
                    current: None,
                    is_charging: None,
                    percentage: None,
                    temperature: None,
                    time_remaining: None,
                    time_until_charged: None,
                    voltage: None,
                }
            }
            None => {
                warn!("Unable to find any batteries");
                ModuleBattery {
                    consumption: None,
                    current: None,
                    is_charging: None,
                    percentage: None,
                    temperature: None,
                    time_remaining: None,
                    time_until_charged: None,
                    voltage: None,
                }
            }
        })
        .unwrap(),
    )
}
