# Create NSIS installer script
$version = $env:VERSION
if (-not $version) {
    $version = "0.0.0"
}

# Rename Windows binary to .exe if needed
if (Test-Path "system-bridge-windows") {
    Move-Item -Path "system-bridge-windows" -Destination "system-bridge-windows.exe" -Force
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

# Build the installer
& makensis installer.nsi
