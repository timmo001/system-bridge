# Remove web client build artifacts (Windows)

if (Test-Path 'web-client/dist') { Remove-Item -Recurse -Force 'web-client/dist' }
