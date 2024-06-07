pub(crate) mod server;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct WebsocketRequest {
    pub id: String,
    pub token: String,
    pub event: String,
    pub data: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebsocketResponse {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub data: Value,
    pub subtype: Option<String>,
    pub message: Option<String>,
    pub module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataListener {
    pub id: String,
    pub modules: Vec<String>,
}
