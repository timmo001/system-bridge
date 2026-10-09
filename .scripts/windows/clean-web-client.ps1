# Remove web client build artifacts (Windows)

if (Test-Path 'client/web/dist') { Remove-Item -Recurse -Force 'client/web/dist' }
