use crate::settings::{get_settings, Settings};
use log::{info, warn};
use rocket::async_trait;
use rocket::http::Status;
use rocket::request::Outcome;
use rocket::request::{FromRequest, Request};
use rocket::serde::{json::Json, Serialize};
use rocket::{catch, catchers, get, routes};
use rocket_ws::{Stream, WebSocket};
use std::error::Error;

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

struct Token<'r>(&'r str);

#[derive(Debug)]
enum TokenError {
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
fn api(_token: Token<'_>) -> Json<APISubRoot> {
    Json(APISubRoot {
        message: "Hello!",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[get("/api/websocket")]
pub async fn websocket(ws: WebSocket) -> Stream!['static] {
    Stream! { ws =>
        for await message in ws {
            yield message?;
        }
    }
}

pub async fn setup_api() -> Result<(), Box<dyn Error>> {
    // Get settings
    let settings: Settings = get_settings();

    info!("API Port: {}", settings.api.port);

    // Get the current Rocket configuration
    let mut config = rocket::Config::default();
    config.address = std::net::IpAddr::from([0, 0, 0, 0]);
    config.port = settings.api.port as u16;

    let _rocket = rocket::build()
        .configure(config)
        .register("/", catchers![not_found])
        .mount("/", routes![root, api, websocket])
        .launch()
        .await?;

    Ok(())
}
