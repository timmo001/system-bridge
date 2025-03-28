# Windows Sensor Libraries for System Bridge

This directory contains the code for integrating LibreHardwareMonitor and NvAPIWrapper with System Bridge.

## Directory Structure

- `librehardwaremonitor/` - Contains the C# wrapper and C++ bridge for LibreHardwareMonitor
- `nvidia/` - Contains the C# wrapper and C++ bridge for NvAPIWrapper

## Building the Libraries

To build the libraries, you'll need:

1. Visual Studio 2022 with .NET Desktop development and C++ development workloads
2. LibreHardwareMonitor NuGet package
3. NvAPIWrapper NuGet package

### Steps to Build:

1. Open a new C# Class Library project in Visual Studio
2. Add the LibreHardwareMonitorWrapper.cs file to the project
3. Install the LibreHardwareMonitor NuGet package
4. Build the project to create the managed DLL
5. Repeat steps 1-4 for the NvidiaWrapper.cs file, installing NvAPIWrapper instead

### Building the C++ Bridge:

1. Create a new C++/CLI project in Visual Studio
2. Add the HardwareMonitorBridge.cpp file to the project
3. Reference the managed DLL created in the previous steps
4. Set project properties to export the functions
5. Build the project to create the unmanaged DLL
6. Repeat steps 1-5 for the NvidiaBridge.cpp file

## Using the Libraries in Go

The `backend/data/module/sensors/sensors_windows.go` file uses these libraries via CGO. The library paths are specified in the CGO directives.

## Current Status

Currently, placeholder DLLs are used with stub implementations. These need to be replaced with actual compiled DLLs that implement the full functionality.

## References

- [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor)
- [NvAPIWrapper](https://github.com/falahati/NvAPIWrapper)
- [LHM-CppExport](https://github.com/aristocratos/LHM-CppExport) - Similar implementation used as reference