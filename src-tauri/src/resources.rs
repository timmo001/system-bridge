use std::error::Error;
use std::process::Command;

use log::{info, warn};

fn start_app(path: String, args: Option<Vec<String>>) -> Result<(), Box<dyn Error>> {
    if !path.contains("systembridgecli") {
        info!("Starting application: {}", path);
    }

    let mut command = Command::new(path);
    if let Some(args) = args {
        command.args(args);
    }

    let output = command.output().unwrap();

    if !output.status.success() {
        return Err("Failed to start the application".into());
    }

    // Convert the output bytes to a String
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    info!("[systembridgebackend] stdout: {}", stdout);
    info!("[systembridgebackend] stderr: {}", stderr);

    Ok(())
}

pub fn start_application(
    path: String,
    args: Option<Vec<String>>,
    new_thread: bool,
) -> Result<(), Box<dyn Error>> {
    // If package installed and linux, we need to use /usr/lib/system-bridge/{path}
    let linux_path = format!("/usr/lib/system-bridge/{}", path);
    let application_path_string: String =
        if cfg!(target_os = "linux") && std::path::Path::new(&linux_path).exists() {
            linux_path
        } else {
            let exe = std::env::current_exe()?;
            let dir = exe.parent().expect("Executable must be in some directory");
            let dir_str = dir.to_str().unwrap().to_owned();

            format!("{}/{}", dir_str, path)
        };

    if new_thread {
        std::thread::spawn(move || {
            let result = start_app(application_path_string, args);
            if result.is_err() {
                warn!("Application closed: {}", path);
            }
        });
    } else {
        let result = start_app(application_path_string, args);
        if result.is_err() {
            return Err(format!("Failed to start the application: {}", path).into());
        }
    }

    Ok(())
}
