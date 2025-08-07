param(
    [string]$Repo = 'timmo001/dotnet-now-playing'
)

$ErrorActionPreference = 'Stop'

function Test-GhAvailable {
    return [bool](Get-Command gh -ErrorAction SilentlyContinue)
}

function Download-With-Gh {
    param(
        [string]$Repository,
        [string]$Destination
    )
    $temp = Join-Path $env:TEMP ("npdl_" + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    try {
        # Download the latest matching zip asset
        gh release download -R $Repository -p '*.zip' -D $temp --clobber | Out-Null
        $zip = Get-ChildItem -Path $temp -Filter *.zip | Select-Object -First 1
        if (-not $zip) { throw 'No zip asset found' }

        if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null

        Expand-Archive -Path $zip.FullName -DestinationPath $Destination -Force
    } finally {
        if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
    }
}

$outDir = Join-Path (Get-Location) '.scripts/windows/now-playing'

try {
    Download-With-Gh -Repository $Repo -Destination $outDir
} catch {
    Write-Error "Failed to download NowPlaying: $_"
    exit 1
}
