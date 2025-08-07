param(
    [string]$Repo = "timmo001/dotnet-now-playing"
)

$ErrorActionPreference = 'Stop'

function Get-AuthHeaders {
    $headers = @{ 'User-Agent' = 'system-bridge' }
    if ($env:GITHUB_TOKEN) {
        $headers['Authorization'] = "Bearer $($env:GITHUB_TOKEN)"
    }
    return $headers
}

function Get-LatestReleaseAssetUrl {
    param(
        [string]$Repository
    )
    $headers = Get-AuthHeaders
    $release = $null
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -Headers $headers -ErrorAction Stop
    } catch {
        # Fallback for when latest is not available (e.g., private repos without auth or no latest)
        try {
            $list = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases" -Headers $headers -ErrorAction Stop
            $release = $list | Where-Object { -not $_.draft -and -not $_.prerelease } | Select-Object -First 1
        } catch {
            throw "Failed to query releases for ${Repository}: $_"
        }
    }

    if (-not $release) { throw "No release found for $Repository" }

    $asset = $release.assets | Where-Object { $_.name -match '(?i)^nowplaying-.*\.zip$' } | Select-Object -First 1
    if (-not $asset) { $asset = $release.assets | Where-Object { $_.name -match '(?i)\.zip$' } | Select-Object -First 1 }
    if (-not $asset) { throw "Could not find suitable zip asset in $Repository release $($release.tag_name)" }
    return $asset.browser_download_url
}

function Ensure-NowPlaying {
    $outDirPrimary = Join-Path (Get-Location) 'now-playing'
    $outDirFallback = Join-Path (Get-Location) '.scripts/windows/now-playing'

    $targetDir = $outDirPrimary
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    try {
        $url = Get-LatestReleaseAssetUrl -Repository $Repo
        $zipPath = Join-Path $env:TEMP 'nowplaying.zip'
        $headers = Get-AuthHeaders
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing -Headers $headers
        # Extract preserving folder structure
        if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $targetDir)
        Remove-Item $zipPath -Force
    } catch {
        Write-Warning "Failed to download NowPlaying: $_"
        if (-not (Test-Path $outDirFallback)) { New-Item -ItemType Directory -Path $outDirFallback -Force | Out-Null }
    }
}

Ensure-NowPlaying
