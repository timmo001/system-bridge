# Build the web client and verify the output (Windows)

Set-Location web-client
bun run build
if ($LASTEXITCODE -ne 0) { Write-Host 'ERROR: bun run build failed'; exit $LASTEXITCODE }
Set-Location ..

Write-Host "Waiting for file system to sync..."
Start-Sleep -Seconds 2

Write-Host "Verifying build files are accessible..."
if (!(Test-Path 'web-client/dist/index.html')) { Write-Host 'ERROR: web-client/dist/index.html not found'; exit 1 }
if (!(Get-ChildItem 'web-client/dist/assets/*.css' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: CSS files not found in web-client/dist/assets/'; Get-ChildItem 'web-client/dist/assets/' -ErrorAction SilentlyContinue; exit 1 }
if (!(Get-ChildItem 'web-client/dist/assets/*.js' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: JS files not found in web-client/dist/assets/'; Get-ChildItem 'web-client/dist/assets/' -ErrorAction SilentlyContinue; exit 1 }

Write-Host "Verifying Tailwind CSS compilation..."
$css = Get-ChildItem 'web-client/dist/assets/*.css' -ErrorAction SilentlyContinue | Select-Object -First 1 | Get-Content -Raw
if ($css -match '@layer utilities|--tw-|\.(flex|grid|hidden|block)\{') {
    Write-Host '  [OK] Found Tailwind CSS patterns'
} else {
    Write-Host 'ERROR: Tailwind CSS compilation failed - no utility classes found'
    Write-Host 'This may indicate that @tailwindcss/vite plugin did not run properly'
    exit 1
}

Write-Host "[OK] Build files verified and ready for embedding"
