use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct APIBaseResponse {
    pub version: String,
}
