# PowerShell script to install System Bridge as a Windows service
# Run as Administrator

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as an Administrator."
    Exit 1
}

# Stop and remove existing service if it exists
$ServiceName = "SystemBridge"
$ServiceExists = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($ServiceExists) {
    Write-Host "Stopping existing System Bridge service..."
    Stop-Service -Name $ServiceName -Force
    Write-Host "Removing existing System Bridge service..."
    sc.exe delete $ServiceName
}

# Get the installation directory (default is the script directory's parent)
$InstallDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ExecutablePath = Join-Path -Path $InstallDir -ChildPath "system-bridge.exe"

# Check if executable exists
if (-NOT (Test-Path $ExecutablePath)) {
    Write-Error "System Bridge executable not found at: $ExecutablePath"
    Exit 1
}

# Create the Windows service
Write-Host "Creating System Bridge service..."
New-Service -Name $ServiceName `
    -DisplayName "System Bridge" `
    -Description "A bridge for your systems." `
    -BinaryPathName "$ExecutablePath backend" `
    -StartupType Automatic

# Start the service
Write-Host "Starting System Bridge service..."
Start-Service -Name $ServiceName

# Show service status
Get-Service -Name $ServiceName

Write-Host "System Bridge service installed and started successfully!"
