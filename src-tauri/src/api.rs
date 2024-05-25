use log::info;
use rocket::serde::{json::Json, Serialize};
use rocket::{get, routes};
use std::error::Error;

use crate::settings::{get_settings, Settings};

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct Root {
    message: &'static str,
}

#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct APIRoot {
    message: &'static str,
    version: &'static str,
}

#[get("/")]
pub fn root() -> Json<Root> {
    Json(Root { message: "Hello!" })
}

#[get("/api")]
pub fn api() -> Json<APIRoot> {
    Json(APIRoot {
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
        .mount("/", routes![root, api])
        .launch()
        .await?;

    Ok(())
}
