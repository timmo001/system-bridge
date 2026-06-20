# Remove dist directory (Windows)

if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }
