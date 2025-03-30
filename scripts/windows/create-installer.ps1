# Create NSIS installer script
$version = $env:VERSION
if (-not $version) {
    $version = "0.0.0"
}

# List current directory contents for debugging
Write-Host "Current directory contents:"
Get-ChildItem -Path $PWD -Recurse | ForEach-Object { Write-Host $_.FullName }

# Find the binary (could be named system-bridge or system-bridge.exe)
$binary = Get-ChildItem -Path $PWD -Filter "system-bridge*" -File | Select-Object -First 1
if (-not $binary) {
    Write-Error "Could not find system-bridge binary"
    exit 1
}

# Ensure it has .exe extension
if ($binary.Extension -ne ".exe") {
    Write-Host "Renaming $($binary.Name) to system-bridge.exe"
    Move-Item -Path $binary.FullName -Destination "system-bridge.exe" -Force
} elseif ($binary.Name -ne "system-bridge.exe") {
    Write-Host "Renaming $($binary.Name) to system-bridge.exe"
    Move-Item -Path $binary.FullName -Destination "system-bridge.exe" -Force
}

# Create directory for the installer
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read the template and replace version
$templateContent = Get-Content -Path "$scriptDir\installer.nsi.template" -Raw
$installerScript = $templateContent -replace '\$VERSION', $version

# Write the processed script to a file
Set-Content -Path "installer.nsi" -Value $installerScript

# Verify system-bridge.exe exists before building installer
if (-not (Test-Path "system-bridge.exe")) {
    Write-Error "system-bridge.exe not found before building installer"
    exit 1
}

Write-Host "Building installer with NSIS..."
# Build the installer
& makensis installer.nsi
