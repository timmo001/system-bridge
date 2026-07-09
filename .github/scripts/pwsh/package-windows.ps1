# Move the built Windows binaries into dist/ and build the NSIS installer.
#
# Usage: package-windows.ps1
$ErrorActionPreference = 'Stop'

Write-Output "::group::Setup"
New-Item -ItemType Directory -Force -Path dist | Out-Null
Move-Item system-bridge.exe dist/system-bridge.exe -Force
Move-Item system-bridge-tui.exe dist/system-bridge-tui.exe -Force
Write-Output "::endgroup::"

Write-Output "::group::Create installer"
./.scripts/windows/create-installer.ps1
Write-Output "::endgroup::"

Write-Output "::group::List dist"
Get-ChildItem dist -Recurse | Format-Table -AutoSize
Write-Output "::endgroup::"
