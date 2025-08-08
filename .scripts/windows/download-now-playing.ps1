$ErrorActionPreference = 'Stop'

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
