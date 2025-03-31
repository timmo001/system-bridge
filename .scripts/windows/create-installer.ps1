# Create NSIS installer script
$version = $env:VERSION
if (-not $version) {
    $version = "5.0.0"
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

# List current directory contents for debugging
Write-Host "Current directory contents:"
Get-ChildItem -Path $PWD -Recurse | ForEach-Object { Write-Host $_.FullName }

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

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read the template and replace version
$templateContent = Get-Content -Path "$scriptDir\installer.nsi.template" -Raw
$installerScript = $templateContent -replace '\$VERSION', $version

# Write the processed script to a file
Set-Content -Path "installer.nsi" -Value $installerScript

Write-Host "Building installer with NSIS..."
# Build the installer
& makensis installer.nsi
