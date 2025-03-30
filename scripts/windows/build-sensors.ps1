#!/usr/bin/env pwsh

# Parameters
param(
    [string]$Version = "0.0.0"
)

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "Building Windows Sensors application..."

# Create sensors directory if it doesn't exist
$sensorsDir = "lib/sensors/windows"
if (-not (Test-Path $sensorsDir)) {
    New-Item -ItemType Directory -Path $sensorsDir -Force | Out-Null
}

# Create bin directory if it doesn't exist
$binDir = "$sensorsDir/bin"
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

# Clone the repository
$repoUrl = "https://github.com/timmo001/system-bridge-windows-sensors.git"
$tempDir = "temp-sensors"

Write-Host "Cloning Windows Sensors repository..."
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
git clone $repoUrl $tempDir

# Setup .NET
Write-Host "Setting up .NET..."
$dotnetVersion = "8.0"
dotnet --list-sdks
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing .NET SDK..."
    winget install Microsoft.DotNet.SDK.$dotnetVersion
    if ($LASTEXITCODE -ne 0) {
        Write-Error ".NET SDK installation failed"
        exit 1
    }
}

# Build the application
Write-Host "Building Windows Sensors application..."
Push-Location $tempDir
try {
    dotnet restore
    dotnet publish -c Release -r win-x64 --self-contained true /p:Version=$Version /p:PublishSingleFile=true

    # Copy the built executable
    Copy-Item "bin/Release/net8.0/win-x64/publish/SystemBridgeWindowsSensors.exe" "../$binDir/" -Force
} finally {
    Pop-Location
}

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "Windows Sensors build completed successfully"