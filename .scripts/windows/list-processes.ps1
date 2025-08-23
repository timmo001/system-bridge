# List running System Bridge processes

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

Write-Host "Found $($processes.Count) System Bridge process(es):" -ForegroundColor Yellow
Write-Host ""

foreach ($process in $processes) {
    Write-Host "Process ID: $($process.Id)" -ForegroundColor Magenta
    Write-Host "  Name: $($process.ProcessName)"
    Write-Host "  Start Time: $($process.StartTime)"
    Write-Host "  CPU Time: $($process.TotalProcessorTime)"
    Write-Host "  Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB"
    Write-Host "  Threads: $($process.Threads.Count)"
    if ($process.MainWindowTitle) {
        Write-Host "  Window Title: $($process.MainWindowTitle)"
    }
    Write-Host ""
}

Write-Host "Use 'make stop_processes' to stop all System Bridge processes." -ForegroundColor Cyan
