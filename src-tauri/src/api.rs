use log::info;
use rocket::serde::{json::Json, Serialize};
use rocket::{catch, catchers, get, routes};
use std::error::Error;

use crate::settings::{get_settings, Settings};

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

#[get("/api", format = "json")]
pub fn api() -> Json<APISubRoot> {
    Json(APISubRoot {
        message: "Hello!",
        version: env!("CARGO_PKG_VERSION"),
    })
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
        .mount("/", routes![root, api])
        .launch()
        .await?;

    Ok(())
}
