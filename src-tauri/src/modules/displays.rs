use serde::{Deserialize, Serialize};
use serde_json::Value;

// TODO: Implement
#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleDisplays {}

pub async fn update() -> Result<Value, String> {
    Ok(serde_json::to_value(ModuleDisplays {}).unwrap())
}