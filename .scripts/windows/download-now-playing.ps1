$ErrorActionPreference = 'Stop'

$ghToken = $env:GH_TOKEN
if (-not $ghToken -and $env:GITHUB_TOKEN) {
    $env:GH_TOKEN = $env:GITHUB_TOKEN
    $ghToken = $env:GH_TOKEN
}
if (-not $ghToken) {
    Write-Error 'GH_TOKEN (or GITHUB_TOKEN) is not set. Set it in the workflow env.'
    exit 1
}

try {
    gh auth status
} catch {
    Write-Error 'Error calling gh auth status. Please check if the GH_TOKEN is set correctly.'
}

$outDir = Join-Path (Get-Location) '.scripts/windows/now-playing'

$temp = Join-Path $env:TEMP ("npdl_" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
    gh release download -R timmo001/dotnet-now-playing -p '*.zip' -D $temp --clobber | Out-Null
    $zip = Get-ChildItem -Path $temp -Filter *.zip | Select-Object -First 1
    if (-not $zip) { throw 'No zip asset found' }

    if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null

    Expand-Archive -Path $zip.FullName -DestinationPath $outDir -Force
    Write-Output "NowPlaying helper downloaded to $outDir"
}
finally {
    if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
}
