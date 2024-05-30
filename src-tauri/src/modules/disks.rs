use serde::{Deserialize, Serialize};
use serde_json::Value;

// TODO: Implement
#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleDisks {}

pub async fn update() -> Result<Value, String> {
    Ok(serde_json::to_value(ModuleDisks {}).unwrap())
}
