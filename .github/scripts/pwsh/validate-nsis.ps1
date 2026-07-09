# Render the NSIS installer template with a dummy version and compile it with
# makensis to check the script for syntax errors.
#
# Usage: validate-nsis.ps1
$version = '5.0.0-dev+123a4bcd'
$templateContent = Get-Content -Path ".scripts/windows/installer.nsi.template" -Raw
$YEAR = (Get-Date).Year
if ($VERSION -match "^(\d+)\.(\d+)\.(\d+)") {
    $major = $matches[1]
    $minor = $matches[2]
    $patch = $matches[3]
    $build = 0
    $DOT_VERSION = "$major.$minor.$patch.$build"
} else {
    $DOT_VERSION = "0.0.0.0"
}
$installerScript = $templateContent -replace '\$VERSION', $VERSION -replace '\$YEAR', $YEAR -replace '\$DOT_VERSION', $DOT_VERSION
Set-Content -Path "installer.nsi" -Value $installerScript

# Find makensis executable (same logic as create-installer.ps1)
$makensisCmd = Get-Command makensis -ErrorAction SilentlyContinue
if ($makensisCmd) {
    $makensisPath = $makensisCmd.Source
} else {
    # Try common installation paths
    $possiblePaths = @(
        "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
        "${env:ProgramFiles}\NSIS\makensis.exe",
        "$env:ChocolateyInstall\lib\nsis\tools\makensis.exe",
        "C:\ProgramData\chocolatey\lib\nsis\tools\makensis.exe"
    )
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $makensisPath = $path
            break
        }
    }
}

if (-not $makensisPath) {
    Write-Error "makensis not found. Please ensure NSIS is installed correctly."
    exit 1
}

# Check for syntax errors in NSIS script (this is a basic check, it just tries to compile)
& $makensisPath /V2 installer.nsi
