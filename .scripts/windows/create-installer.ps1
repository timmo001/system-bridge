param (
    [switch]$Clean
)

# Create NSIS installer script
$VERSION = $env:VERSION
if (-not $VERSION) {
    $VERSION = "5.0.0-dev+$(git rev-parse --short HEAD)"
}
Write-Host "Version: $VERSION"

if (-not (Test-Path "dist\system-bridge.exe") -and -not (Test-Path "system-bridge.exe")) {
    Write-Error "Executable not found"
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

# Verify icon file exists
$iconPath = ".resources/system-bridge-dimmed.ico"
if (-not (Test-Path $iconPath)) {
    Write-Error ".resources/system-bridge-dimmed.ico not found. This icon is required for the installer."
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read the template and replace version, year, and DOT_VERSION
$templateContent = Get-Content -Path "$scriptDir\installer.nsi.template" -Raw
$YEAR = (Get-Date).Year
if ($VERSION -match "^(\d+)\.(\d+)\.(\d+)") {
    $major = $matches[1]
    $minor = $matches[2]
    $patch = $matches[3]
    $build = 0
    $DOT_VERSION = "$major.$minor.$patch.$build"
} else {
    $DOT_VERSION = "0.0.0.0"
}
$installerScript = $templateContent -replace '\$VERSION', $VERSION -replace '\$YEAR', $YEAR -replace '\$DOT_VERSION', $DOT_VERSION

# Write the processed script to a file
Set-Content -Path "installer.nsi" -Value $installerScript

Write-Host "Building installer with NSIS..."
# Build the installer
& makensis installer.nsi
