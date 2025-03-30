# PowerShell script to uninstall System Bridge Windows service
# Run as Administrator

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as an Administrator."
    Exit 1
}

# Define service name
$ServiceName = "SystemBridge"

# Check if service exists
$ServiceExists = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($ServiceExists) {
    # Stop the service
    Write-Host "Stopping System Bridge service..."
    Stop-Service -Name $ServiceName -Force

    # Remove the service
    Write-Host "Removing System Bridge service..."
    sc.exe delete $ServiceName

    Write-Host "System Bridge service has been successfully removed."
} else {
    Write-Host "System Bridge service does not exist or has already been removed."
}
