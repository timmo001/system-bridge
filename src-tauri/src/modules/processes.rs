use pyo3::prelude::*;
use rocket::serde;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleProcess {
    id: f64,
    name: String,
    cpu_usage: f64,
    created: f64,
    processes_usage: f64,
    path: String,
    status: String,
    username: String,
    working_directory: String,
}

impl<'source> FromPyObject<'source> for ModuleProcess {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(ModuleProcess {
            id: ob.getattr("id")?.extract()?,
            name: ob.getattr("name")?.extract()?,
            cpu_usage: ob.getattr("cpu_usage")?.extract()?,
            created: ob.getattr("created")?.extract()?,
            processes_usage: ob.getattr("processes_usage")?.extract()?,
            path: ob.getattr("path")?.extract()?,
            status: ob.getattr("status")?.extract()?,
            username: ob.getattr("username")?.extract()?,
            working_directory: ob.getattr("working_directory")?.extract()?,
        })
    }
}

pub async fn update() -> Result<Value, String> {
    let processes = Python::with_gil(|py| {
        // Import the module
        let processes_module = PyModule::import_bound(py, "systembridgedata.module.processes")
            .expect("Failed to import systembridgedata.module.processes module");

        // Create an instance of the Processes class
        let processes_instance = processes_module
            .getattr("Processes")
            .expect("Failed to get Processes class")
            .call0()
            .expect("Failed to create Processes instance");

        // Call the methods
        let processes = processes_instance
            .getattr("get_processes")
            .expect("Failed to get get_processes method")
            .call0()
            .expect("Failed to call get_processes method")
            .extract::<Vec<ModuleProcess>>();

        // Set output
        processes
    });

    match processes {
        Ok(processes) => Ok(serde_json::to_value(processes).unwrap()),
        Err(e) => Err(e.to_string()),
    }
}
