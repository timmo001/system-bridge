param (
    [switch]$Clean
)

# Create NSIS installer script
$VERSION = $env:VERSION
if (-not $VERSION) {
    $VERSION = "5.0.0-dev+$(git rev-parse --short HEAD)"
}
Write-Host "Version: $VERSION"

if (-not (Test-Path "dist\system-bridge.exe") -and -not (Test-Path "system-bridge.exe")) {
    Write-Error "Executable not found"
    exit 1
}

if (-not (Test-Path "dist") -or $Clean) {
    Write-Host "Creating dist directory"
    New-Item -ItemType Directory -Path "dist"
}

if (-not (Test-Path "dist\system-bridge.exe") -or $Clean) {
    Write-Host "Copying system-bridge.exe to dist directory"
    Copy-Item system-bridge.exe dist\system-bridge.exe
}


# Verify Visual C++ Runtime
Write-Host "Verifying Visual C++ Runtime..."
$vcRuntimePath = "C:\Windows\System32\vcruntime140.dll"
if (-not (Test-Path $vcRuntimePath)) {
    Write-Warning "Visual C++ Runtime not found. The installer will attempt to install it during setup."
}

# # List current directory contents for debugging
# Write-Host "Current directory contents:"
# Get-ChildItem -Path $PWD -Recurse | ForEach-Object { Write-Host $_.FullName }

# Verify system-bridge.exe exists before building installer
if (-not (Test-Path "dist\system-bridge.exe")) {
    Write-Error "system-bridge.exe not found in dist directory"
    exit 1
}

# Verify CSS inclusion in binary
Write-Host "Verifying CSS inclusion in binary..."
function Verify-CSSInclusion {
    param(
        [string]$BinaryPath
    )
    
    Write-Host "Checking for embedded web client in $BinaryPath..."
    
    # Check if binary contains embedded web client
    # Use Select-String to search for the embedded content marker
    $hasEmbeddedContent = Select-String -Path $BinaryPath -Pattern "web-client/dist/index.html" -Quiet
    if (-not $hasEmbeddedContent) {
        Write-Error "Binary does not contain embedded web client"
        return $false
    }
    
    Write-Host "✓ Binary contains embedded web client"
    
    # If curl is available, do more thorough verification
    $curlCommand = Get-Command curl -ErrorAction SilentlyContinue
    if ($curlCommand) {
        Write-Host "Starting temporary server to verify embedded content..."
        $PORT = 9171
        $oldPort = $env:SYSTEM_BRIDGE_PORT
        $env:SYSTEM_BRIDGE_PORT = $PORT.ToString()
        $LOG_FILE = Join-Path $env:TEMP "system-bridge-server.log"
        $ERROR_LOG_FILE = Join-Path $env:TEMP "system-bridge-server-error.log"
        
        try {
            # Start server in background
            $serverProcess = Start-Process -FilePath $BinaryPath -ArgumentList "backend" -RedirectStandardOutput $LOG_FILE -RedirectStandardError $ERROR_LOG_FILE -PassThru
            
            # Wait for server to start
            Write-Host "Waiting for server to start..."
            $serverStarted = $false
            for ($i = 1; $i -le 10; $i++) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$PORT/api/health" -TimeoutSec 2 -ErrorAction Stop
                    if ($response.StatusCode -eq 200) {
                        Write-Host "✓ Server started successfully"
                        $serverStarted = $true
                        break
                    }
                } catch {
                    # Server not ready yet
                }
                
                if ($i -eq 10) {
                    Write-Error "Server failed to start within 10 seconds"
                    if (Test-Path $LOG_FILE) {
                        Get-Content $LOG_FILE | Write-Error
                    }
                    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                    return $false
                }
                Start-Sleep -Seconds 1
            }
            
            if ($serverStarted) {
                # Fetch index page and check for CSS
                Write-Host "Fetching index page to verify CSS inclusion..."
                try {
                    $indexResponse = Invoke-WebRequest -Uri "http://localhost:$PORT/" -TimeoutSec 5 -ErrorAction Stop
                    $indexContent = $indexResponse.Content
                    
                    if ($indexContent -match '\.css') {
                        Write-Host "✓ Embedded web client contains CSS references"
                    } else {
                        Write-Error "No CSS references found in served index page"
                        Write-Host "Index content (first 500 chars):"
                        $indexContent.Substring(0, [Math]::Min(500, $indexContent.Length))
                        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                        return $false
                    }
                    
                    # Try to extract CSS URL and fetch it
                    if ($indexContent -match 'href="([^"]*\.css)"') {
                        $cssUrl = $matches[1]
                        Write-Host "Fetching CSS file: $cssUrl"
                        
                        try {
                            $cssResponse = Invoke-WebRequest -Uri "http://localhost:$PORT$cssUrl" -TimeoutSec 5 -ErrorAction Stop
                            $cssContent = $cssResponse.Content
                            
                            if ($cssContent -match 'tw-') {
                                Write-Host "✓ CSS contains Tailwind utility classes"
                                
                                # Check CSS size
                                $cssSize = $cssContent.Length
                                if ($cssSize -lt 10000) {
                                    Write-Warning "CSS seems small ($cssSize bytes). Expected at least 10KB for full Tailwind build."
                                } else {
                                    Write-Host "✓ CSS file size is reasonable ($cssSize bytes)"
                                }
                            } else {
                                Write-Error "CSS does not contain Tailwind utility classes"
                                Write-Host "First 200 characters of CSS:"
                                $cssContent.Substring(0, [Math]::Min(200, $cssContent.Length))
                                Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                                return $false
                            }
                        } catch {
                            Write-Error "Failed to fetch CSS file: $($_.Exception.Message)"
                            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                            return $false
                        }
                    } else {
                        Write-Error "Could not extract CSS URL from index page"
                        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                        return $false
                    }
                } catch {
                    Write-Error "Failed to fetch index page: $($_.Exception.Message)"
                    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
                    return $false
                }
            }
        } finally {
            # Clean up server
            if ($serverProcess) {
                Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
            }
            if (Test-Path $LOG_FILE) {
                Remove-Item $LOG_FILE -ErrorAction SilentlyContinue
            }
            if (Test-Path $ERROR_LOG_FILE) {
                Remove-Item $ERROR_LOG_FILE -ErrorAction SilentlyContinue
            }
            # Restore original port
            if ($oldPort) {
                $env:SYSTEM_BRIDGE_PORT = $oldPort
            } else {
                Remove-Item Env:SYSTEM_BRIDGE_PORT -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Warning "curl not available, basic verification only"
        Write-Host "✓ Binary contains embedded web client"
    }
    
    Write-Host "✓ Binary verification passed"
    return $true
}

# Run CSS verification
if (-not (Verify-CSSInclusion -BinaryPath "dist\system-bridge.exe")) {
    Write-Error "CSS verification failed"
    exit 1
}

# Verify icon file exists
$iconPath = ".resources/system-bridge-dimmed.ico"
if (-not (Test-Path $iconPath)) {
    Write-Error ".resources/system-bridge-dimmed.ico not found. This icon is required for the installer."
    exit 1
}

# Ensure NowPlaying helper exists (download step should have run earlier)
$nowPlayingDir = ".\now-playing"
if (-not (Test-Path $nowPlayingDir)) {
    $nowPlayingDir = ".\.scripts\windows\now-playing"
}
$includeNowPlaying = $false
if (Test-Path (Join-Path $nowPlayingDir "NowPlaying.exe")) {
    $includeNowPlaying = $true
} else {
    Write-Host "NowPlaying helper not found; installer will be built without it."
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read the template and replace version, year, and DOT_VERSION
$templateContent = Get-Content -Path "$scriptDir\installer.nsi.template" -Raw
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

# Write the processed script to a file
Set-Content -Path "installer.nsi" -Value $installerScript

Write-Host "Building installer with NSIS..."
# Find makensis executable
$makensisPath = Get-Command makensis -ErrorAction SilentlyContinue
if (-not $makensisPath) {
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

# Build the installer, optionally defining INCLUDE_NOW_PLAYING
if ($includeNowPlaying) {
    Write-Host "Including NowPlaying files in installer"
    & $makensisPath /DINCLUDE_NOW_PLAYING installer.nsi
} else {
    & $makensisPath installer.nsi
}
