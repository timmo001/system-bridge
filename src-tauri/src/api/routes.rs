use crate::{
    modules::{get_module_data, Module},
    settings::{get_settings, Settings},
};
use log::{info, warn};
use rocket::async_trait;
use rocket::http::Status;
use rocket::request::Outcome;
use rocket::request::{FromRequest, Request};
use rocket::serde::{json::Json, Serialize};
use rocket::{catch, get};
use serde_json::Value;
use std::str::FromStr;

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct APIError {
    code: u16,
    message: &'static str,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct APIRoot {
    message: &'static str,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct APISubRoot {
    message: &'static str,
    version: &'static str,
}

#[catch(404)]
pub fn not_found() -> Json<APIError> {
    Json(APIError {
        code: 404,
        message: "Not Found",
    })
}

#[get("/", format = "json")]
pub fn root() -> Json<APIRoot> {
    Json(APIRoot { message: "Hello!" })
}

#[allow(dead_code)]
pub struct Token<'r>(&'r str);

#[derive(Debug)]
pub enum TokenError {
    Missing,
    Invalid,
}

#[async_trait]
impl<'r> FromRequest<'r> for Token<'r> {
    type Error = TokenError;

    async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        fn is_valid(token: &str) -> bool {
            // Get settings
            let settings: Settings = get_settings();

            let valid = token == settings.api.token;

            if !valid {
                warn!(
                    "Invalid token provided: {} - Expected: {}",
                    token, settings.api.token
                );
            }

            valid
        }

        match req.headers().get_one("token") {
            None => Outcome::Error((Status::BadRequest, TokenError::Missing)),
            Some(token) if is_valid(token) => Outcome::Success(Token(token)),
            Some(_) => Outcome::Error((Status::BadRequest, TokenError::Invalid)),
        }
    }
}

#[get("/api", format = "json")]
pub fn api(_token: Token<'_>) -> Json<APISubRoot> {
    Json(APISubRoot {
        message: "Hello!",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[get("/api/data/<module>", format = "json")]
pub async fn data(_token: Token<'_>, module: &str) -> Json<Value> {
    let data_module = match Module::from_str(module) {
        Ok(module) => module,
        Err(e) => {
            warn!("Error parsing module: {}", e);
            return Json(Value::Null);
        }
    };

    info!("Getting data for module: {:?}", data_module);
    match get_module_data(&data_module).await {
        Ok(data) => Json(data),
        Err(e) => {
            warn!("Error getting module data: {}", e);
            Json(Value::Null)
        }
    }
}
