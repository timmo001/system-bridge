param (
    [switch]$Clean
)

# Create NSIS installer script
$VERSION = $env:VERSION
if (-not $VERSION) {
    $VERSION = "5.0.0-dev+$(git rev-parse --short HEAD)"
}
Write-Host "Version: $VERSION"

if (-not (Test-Path "system-bridge.exe")) {
    Write-Error "system-bridge.exe not found in root directory"
    exit 1
}

if (-not (Test-Path "dist") -or $Clean) {
    Write-Host "Creating dist directory"
    New-Item -ItemType Directory -Path "dist"
}

if (-not (Test-Path "dist\system-bridge.exe") -or $Clean) {
    Write-Host "Copying system-bridge.exe to dist directory"
    Copy-Item system-bridge.exe dist\system-bridge.exe
}

# Verify .NET Runtime version
$dotnetVersion = "8.0"
Write-Host "Verifying .NET Runtime $dotnetVersion is available..."
$runtimes = dotnet --list-runtimes
if ($LASTEXITCODE -ne 0 -or -not ($runtimes -match "Microsoft.NETCore.App $dotnetVersion")) {
    Write-Warning ".NET $dotnetVersion Runtime not found. The installer will attempt to install it during setup."
}

# Verify Visual C++ Runtime
Write-Host "Verifying Visual C++ Runtime..."
$vcRuntimePath = "C:\Windows\System32\vcruntime140.dll"
if (-not (Test-Path $vcRuntimePath)) {
    Write-Warning "Visual C++ Runtime not found. The installer will attempt to install it during setup."
}

# # List current directory contents for debugging
# Write-Host "Current directory contents:"
# Get-ChildItem -Path $PWD -Recurse | ForEach-Object { Write-Host $_.FullName }

# Verify system-bridge.exe exists before building installer
if (-not (Test-Path "dist\system-bridge.exe")) {
    Write-Error "system-bridge.exe not found in dist directory"
    exit 1
}

# Verify Windows sensors executable exists
$sensorsExePath = "lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe"
if (-not (Test-Path $sensorsExePath)) {
    Write-Error "Windows sensors executable not found at: $sensorsExePath"
    exit 1
}

# Verify icon file exists
$iconPath = ".resources/system-bridge-dimmed.ico"
if (-not (Test-Path $iconPath)) {
    Write-Error ".resources/system-bridge-dimmed.ico not found. This icon is required for the installer."
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read the template and replace version
$templateContent = Get-Content -Path "$scriptDir\installer.nsi.template" -Raw
$installerScript = $templateContent -replace '\$VERSION', $VERSION

# Write the processed script to a file
Set-Content -Path "installer.nsi" -Value $installerScript

Write-Host "Building installer with NSIS..."
# Build the installer
& makensis installer.nsi
