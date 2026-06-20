# Remove build artifacts (Windows)

$files = @(
    'system-bridge.syso',
    'system-bridge.exe',
    'system-bridge-console.exe',
    'system-bridge-windows.exe',
    'system-bridge-tui.exe',
    'installer.nsi',
    'system-bridge.rc'
)
foreach ($file in $files) {
    if (Test-Path $file) { Remove-Item -Force $file }
}

$dirs = @(
    'now-playing',
    './.scripts/windows/now-playing'
)
foreach ($dir in $dirs) {
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
}
