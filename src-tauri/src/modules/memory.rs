use pyo3::prelude::*;
use pyo3::FromPyObject;
use rocket::serde;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct MemorySwap {
    total: Option<i64>,
    used: Option<i64>,
    free: Option<f64>,
    percent: Option<f64>,
    sin: Option<i64>,
    sout: Option<i64>,
}

impl<'source> FromPyObject<'source> for MemorySwap {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(MemorySwap {
            total: ob.getattr("total")?.extract()?,
            used: ob.getattr("used")?.extract()?,
            free: ob.getattr("free")?.extract()?,
            percent: ob.getattr("percent")?.extract()?,
            sin: ob.getattr("sin")?.extract()?,
            sout: ob.getattr("sout")?.extract()?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryVirtual {
    total: Option<i64>,
    available: Option<i64>,
    percent: Option<f64>,
    used: Option<i64>,
    free: Option<i64>,
    active: Option<i64>,
    inactive: Option<i64>,
    buffers: Option<i64>,
    cached: Option<i64>,
    wired: Option<i64>,
    shared: Option<i64>,
}

impl<'source> FromPyObject<'source> for MemoryVirtual {
    fn extract(ob: &'source PyAny) -> PyResult<Self> {
        Ok(MemoryVirtual {
            total: ob.getattr("total")?.extract()?,
            available: ob.getattr("available")?.extract()?,
            percent: ob.getattr("percent")?.extract()?,
            used: ob.getattr("used")?.extract()?,
            free: ob.getattr("free")?.extract()?,
            active: ob.getattr("active")?.extract()?,
            inactive: ob.getattr("inactive")?.extract()?,
            buffers: ob.getattr("buffers")?.extract()?,
            cached: ob.getattr("cached")?.extract()?,
            wired: ob.getattr("wired")?.extract()?,
            shared: ob.getattr("shared")?.extract()?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleMemory {
    swap: MemorySwap,
    #[serde(rename = "virtual")]
    virtual_: MemoryVirtual,
}

pub async fn update() -> Result<Value, String> {
    let (swap, virtual_) = Python::with_gil(|py| {
        // Import the module
        let memory_module = PyModule::import_bound(py, "systembridgedata.module.memory")
            .expect("Failed to import systembridgedata.module.memory module");

        // Create an instance of the Memory class
        let memory_instance = memory_module
            .getattr("Memory")
            .expect("Failed to get Memory class")
            .call0()
            .expect("Failed to create Memory instance");

        // Call the methods
        let swap = memory_instance
            .getattr("get_swap")
            .expect("Failed to get get_swap method")
            .call0()
            .expect("Failed to call get_swap method")
            .extract::<MemorySwap>()
            .expect("Failed to extract from get_swap result");

        let virtual_ = memory_instance
            .getattr("get_virtual")
            .expect("Failed to get get_virtual method")
            .call0()
            .expect("Failed to call get_virtual method")
            .extract::<MemoryVirtual>()
            .expect("Failed to extract from get_virtual result");

        // Set output
        (swap, virtual_)
    });

    Ok(serde_json::to_value(ModuleMemory { swap, virtual_ }).unwrap())
}
