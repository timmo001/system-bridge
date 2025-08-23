# Stop all running System Bridge processes

Write-Host "Searching for running System Bridge processes..." -ForegroundColor Cyan

# Find processes by name
$processes = Get-Process | Where-Object {
    $_.ProcessName -eq "system-bridge" -or
    $_.ProcessName -eq "system-bridge-console" -or
    $_.MainWindowTitle -like "*System Bridge*"
}

if ($processes.Count -eq 0) {
    Write-Host "No System Bridge processes found." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($processes.Count) System Bridge process(es) to stop:" -ForegroundColor Yellow
Write-Host ""

$stoppedCount = 0
foreach ($process in $processes) {
    Write-Host "Stopping process ID: $($process.Id) - $($process.ProcessName)" -ForegroundColor Red
    try {
        $process.Kill()
        $process.WaitForExit(5000)  # Wait up to 5 seconds for the process to exit
        if ($process.HasExited) {
            Write-Host "  Successfully stopped process $($process.Id)" -ForegroundColor Green
            $stoppedCount++
        } else {
            Write-Host "  Warning: Process $($process.Id) may still be running" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Error stopping process $($process.Id): $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "Stopped $stoppedCount out of $($processes.Count) System Bridge processes." -ForegroundColor Cyan

# Verify no processes remain
Start-Sleep -Seconds 2
$remaining = Get-Process | Where-Object {
    $_.ProcessName -eq "system-bridge" -or
    $_.ProcessName -eq "system-bridge-console" -or
    $_.MainWindowTitle -like "*System Bridge*"
}

if ($remaining.Count -eq 0) {
    Write-Host "All System Bridge processes have been stopped successfully." -ForegroundColor Green
} else {
    Write-Host "Warning: $($remaining.Count) System Bridge process(es) may still be running." -ForegroundColor Yellow
    Write-Host "Remaining processes:" -ForegroundColor Yellow
    foreach ($process in $remaining) {
        Write-Host "  - Process ID: $($process.Id) - $($process.ProcessName)" -ForegroundColor Yellow
    }
}
