# Move the built Windows binaries into dist/ and build the NSIS installer.
#
# Usage: package-windows.ps1
$ErrorActionPreference = 'Stop'

Write-Output "::group::Setup"
New-Item -ItemType Directory -Force -Path dist | Out-Null
Move-Item system-bridge.exe dist/system-bridge.exe -Force
Write-Output "::endgroup::"

Write-Output "::group::Create installer"
./.scripts/windows/create-installer.ps1
Write-Output "::endgroup::"

# A portable archive for mise, aqua and manual installs. The media module looks
# for the NowPlaying helper in now-playing\ beside the executable
Write-Output "::group::Create archive"
$archiveDir = Join-Path $env:RUNNER_TEMP "system-bridge-archive"
if (Test-Path $archiveDir) { Remove-Item -Recurse -Force $archiveDir }
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
Copy-Item dist/system-bridge.exe $archiveDir
Copy-Item LICENSE $archiveDir
$nowPlayingDir = ".scripts/windows/now-playing"
if (Test-Path (Join-Path $nowPlayingDir "NowPlaying.exe")) {
    Copy-Item -Recurse $nowPlayingDir (Join-Path $archiveDir "now-playing")
} else {
    Write-Output "NowPlaying helper not found; archive will be built without it."
}
Compress-Archive -Path (Join-Path $archiveDir "*") -DestinationPath "dist/system-bridge-$env:VERSION-windows-x86_64.zip" -Force
Write-Output "::endgroup::"

Write-Output "::group::List dist"
Get-ChildItem dist -Recurse | Format-Table -AutoSize
Write-Output "::endgroup::"
