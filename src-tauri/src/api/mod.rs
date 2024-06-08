mod routes;

use crate::{
    settings::{get_settings, Settings},
    websocket::server::{websocket, PeersMap},
};
use log::info;
use rocket::tokio::sync::Mutex;
use rocket::{catchers, routes};
use routes::{api, data, data_key, not_found, root};
use std::{collections::HashMap, error::Error, sync::Arc};

pub async fn setup_api() -> Result<(), Box<dyn Error>> {
    // Get settings
    let settings: Settings = get_settings();

    info!("API Port: {}", settings.api.port);

    // Get the current Rocket configuration
    let mut config = rocket::Config::default();
    config.address = std::net::IpAddr::from([0, 0, 0, 0]);
    config.port = settings.api.port as u16;

    let peers_map: PeersMap = Arc::new(Mutex::new(HashMap::new()));

    let _rocket = rocket::build()
        .configure(config)
        .register("/", catchers![not_found])
        .manage(peers_map)
        .mount("/", routes![root, api, data, data_key, websocket])
        .launch()
        .await?;

    Ok(())
}
