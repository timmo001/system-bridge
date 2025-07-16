#!/usr/bin/env pwsh

# Parameters
param(
    [string]$Version = "5.0.0"
)

# Exit on error
$ErrorActionPreference = "Stop"

# Ensure version is in semantic version format
if ($Version -notmatch '^\d+\.\d+\.\d+') {
    $Version = "5.0.0-$Version"
}

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

# Get absolute paths
$rootDir = $PWD
$binDirAbs = Join-Path $rootDir $binDir

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

# Find the .csproj file
Write-Host "Finding project file..."
$projectFile = Get-ChildItem -Path $tempDir -Filter "*.csproj" -Recurse | Select-Object -First 1
if (-not $projectFile) {
    Write-Error "No .NET project file found"
    exit 1
}

# Build the application
Write-Host "Building Windows Sensors application from $($projectFile.FullName)..."
Push-Location $projectFile.Directory
try {
    # Ensure the project is set to WinExe output type
    Write-Host "Ensuring project is configured for windowless execution..."
    $csprojContent = Get-Content $projectFile.FullName -Raw
    if ($csprojContent -notmatch '<OutputType>WinExe</OutputType>') {
        Write-Host "Updating project file to set OutputType to WinExe..."
        # Find the first PropertyGroup and add OutputType if it doesn't exist
        if ($csprojContent -match '(<PropertyGroup[^>]*>)') {
            $csprojContent = $csprojContent -replace '(<PropertyGroup[^>]*>)', "`$1`n    <OutputType>WinExe</OutputType>"
        }
        Set-Content -Path $projectFile.FullName -Value $csprojContent
    } else {
        Write-Host "Project is already configured for windowless execution"
    }
    
    dotnet restore
    dotnet publish -c Release -r win-x64 --self-contained true /p:Version=$Version /p:PublishSingleFile=true /p:OutputType=WinExe

    # Copy the built executable
    $publishDir = Join-Path $projectFile.Directory "bin/net$dotnetVersion-windows$dotnetVersion/win-x64/publish"
    $exePath = Join-Path $publishDir "SystemBridgeWindowsSensors.exe"

    if (-not (Test-Path $exePath)) {
        Write-Error "Build output not found at expected path: $exePath"
        exit 1
    }

    # Copy all files
    Copy-Item -Path "$publishDir/*" -Destination $binDirAbs -Recurse -Force
} finally {
    Pop-Location
}

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "Windows Sensors build completed successfully"
