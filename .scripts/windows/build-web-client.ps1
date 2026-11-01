# Build the web client and verify the output (Windows)

Set-Location client/web
bun run build
if ($LASTEXITCODE -ne 0) { Write-Host 'ERROR: bun run build failed'; exit $LASTEXITCODE }
Set-Location ../..

Write-Host "Verifying build files are accessible..."
if (!(Test-Path 'client/web/dist/index.html')) { Write-Host 'ERROR: client/web/dist/index.html not found'; exit 1 }
if (!(Get-ChildItem 'client/web/dist/assets/*.css' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: CSS files not found in client/web/dist/assets/'; Get-ChildItem 'client/web/dist/assets/' -ErrorAction SilentlyContinue; exit 1 }
if (!(Get-ChildItem 'client/web/dist/assets/*.js' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: JS files not found in client/web/dist/assets/'; Get-ChildItem 'client/web/dist/assets/' -ErrorAction SilentlyContinue; exit 1 }

Write-Host "Verifying the design tokens are in the CSS..."
$css = Get-ChildItem 'client/web/dist/assets/*.css' -ErrorAction SilentlyContinue | Select-Object -First 1 | Get-Content -Raw
if ($css -match '--gw-color-') {
    Write-Host '  [OK] Found the design tokens'
} else {
    Write-Host 'ERROR: The CSS has no Groundwork --gw-color-* design tokens'
    Write-Host 'Check client/web/src/styles/tokens.css is imported by src/app.ts'
    exit 1
}

Write-Host "[OK] Build files verified and ready for embedding"
