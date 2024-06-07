use fern::colors::{Color, ColoredLevelConfig};
use log::{info, LevelFilter};

use crate::{settings::get_settings, shared::get_data_path};

pub fn setup_logger() -> Result<(), fern::InitError> {
    let log_path = format!("{}/systembridge.log", get_data_path());

    let colors = ColoredLevelConfig::new()
        .trace(Color::BrightBlack)
        .debug(Color::Cyan)
        .info(Color::Green)
        .warn(Color::Yellow)
        .error(Color::Red);

    let stdout_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "{} {} ({}) [{}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                colors.color(record.level()),
                std::thread::current().name().unwrap_or(
                    &format!("{:?}", std::thread::current().id())
                        .replace("ThreadId(", "")
                        .replace(")", "")
                ),
                record.target(),
                message
            ))
        })
        .chain(std::io::stdout());

    let file_config = fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "[{} {} {} {}] {}",
                humantime::format_rfc3339(std::time::SystemTime::now()),
                record.level(),
                std::thread::current().name().unwrap_or(
                    &format!("{:?}", std::thread::current().id())
                        .replace("ThreadId(", "")
                        .replace(")", "")
                ),
                record.target(),
                message
            ))
        })
        .chain(
            std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .append(false)
                .open(log_path.clone())?,
        );

    let settings = get_settings();
    let log_level = match settings.log_level.as_str() {
        "TRACE" => LevelFilter::Trace,
        "DEBUG" => LevelFilter::Debug,
        "INFO" => LevelFilter::Info,
        "WARNING" => LevelFilter::Warn,
        "ERROR" => LevelFilter::Error,
        "CRITICAL" => LevelFilter::Off,
        _ => LevelFilter::Info,
    };

    // Create a new logger
    // Configure logger at runtime
    fern::Dispatch::new()
        // Add blanket level filter -
        .level(log_level)
        // - and per-module overrides
        // .level_for("hyper", log::LevelFilter::Info)
        // Output to stdout, files, and other Dispatch configurations
        .chain(stdout_config)
        .chain(file_config)
        // Apply globally
        .apply()?;

    info!("--------------------------------------------------------------------------------");
    info!(
        "{} ({})",
        env!("CARGO_PKG_DESCRIPTION"),
        env!("CARGO_PKG_VERSION")
    );
    info!("--------------------------------------------------------------------------------");
    info!("Log is available at {}", log_path.clone());

    Ok(())
}
