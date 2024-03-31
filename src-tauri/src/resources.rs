use std::error::Error;
use std::process::Command;

pub fn start_application(
    path: String,
    args: Option<Vec<String>>,
    spawn: bool,
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

    if spawn {
        println!("Spawning application: {}", application_path_string);
        let mut command = Command::new(application_path_string);

        let process = if let Some(args) = args {
            println!("  with args: {:?}", args);
            command.args(args).spawn()
        } else {
            command.spawn()
        };

        if process.is_err() {
            return Err("Failed to spawn the application".into());
        }
    } else {
        if !application_path_string.contains("systembridgecli") {
            println!("Starting application: {}", application_path_string);
        }
        let mut command = Command::new(application_path_string);

        let process = if let Some(args) = args {
            command.args(args).status()
        } else {
            command.status()
        };

        if process.is_err() {
            return Err("Failed to start the application".into());
        }
    }

    Ok(())
}
