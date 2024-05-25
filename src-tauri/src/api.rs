use crate::{
    api_routes::{api, not_found, root},
    settings::{get_settings, Settings},
};
use log::info;
use rocket::{catchers, get, routes};
use rocket_ws::{Stream, WebSocket};
use std::error::Error;

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
