use battery::units::ratio::percent;
use battery::units::time::second;
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleBattery {
    is_charging: Option<bool>,
    percentage: Option<f32>,
    time_remaining: Option<f32>,
    time_until_charged: Option<f32>,
}

pub async fn update() -> Result<Value, String> {
    // Refresh battery information
    let manager = battery::Manager::new().unwrap();
    let mut battery = match manager.batteries().unwrap().next() {
        Some(Ok(battery)) => battery,
        Some(Err(e)) => {
            warn!("Unable to access battery information");
            return Err(e.to_string());
        }
        None => {
            warn!("Unable to find any batteries");
            return Ok(serde_json::to_value(ModuleBattery {
                is_charging: None,
                percentage: None,
                time_remaining: None,
                time_until_charged: None,
            })
            .unwrap());
        }
    };

    let is_charging = battery.state() == battery::State::Charging;

    let percentage = battery.state_of_charge().get::<percent>();

    let time_remaining = match battery.time_to_empty() {
        Some(time) => time.get::<second>() as f32,
        None => -1.0,
    };

    let time_until_charged = match battery.time_to_full() {
        Some(time) => time.get::<second>() as f32,
        None => -1.0,
    };

    Ok(serde_json::to_value(ModuleBattery {
        is_charging: Some(is_charging),
        percentage: Some(percentage),
        time_remaining: Some(time_remaining),
        time_until_charged: Some(time_until_charged),
    })
    .unwrap())
}
