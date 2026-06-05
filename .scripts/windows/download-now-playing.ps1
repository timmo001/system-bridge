$ErrorActionPreference = 'Stop'

$ghToken = $env:GH_TOKEN
$allowRateLimitSkip = $env:ALLOW_RATE_LIMIT_SKIP -eq 'true'
if (-not $ghToken -and $env:GITHUB_TOKEN) {
    $env:GH_TOKEN = $env:GITHUB_TOKEN
    $ghToken = $env:GH_TOKEN
}
if (-not $ghToken) {
    Write-Error 'GH_TOKEN (or GITHUB_TOKEN) is not set. Set it in the workflow env.'
    exit 1
}

try {
    $authStatusOutput = & gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($authStatusOutput | Out-String).Trim()
    }
} catch {
    Write-Error 'Error calling gh auth status. Please check if the GH_TOKEN is set correctly.'
    exit 1
}

function Test-RateLimitError {
    param(
        [string]$Message
    )

    return $Message -match 'rate limit|secondary rate limit|api rate limit exceeded|http 429|too many requests'
}

$outDir = Join-Path (Get-Location) '.scripts/windows/now-playing'

$temp = Join-Path $env:TEMP ("npdl_" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
    $downloadOutput = & gh release download -R timmo001/dotnet-now-playing -p '*.zip' -D $temp --clobber 2>&1
    if ($LASTEXITCODE -ne 0) {
        $message = ($downloadOutput | Out-String).Trim()
        if ($allowRateLimitSkip -and (Test-RateLimitError -Message $message)) {
            Write-Host '::warning title=NowPlaying download skipped::GitHub rate limit hit while downloading the NowPlaying helper. Continuing without it for this pull request.'
            return
        }

        throw "Failed to download NowPlaying helper. $message"
    }

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
