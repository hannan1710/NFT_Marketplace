Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping NFT Marketplace Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping Node.js processes..." -NoNewline
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No Node.js processes running" -ForegroundColor Yellow
}

Write-Host "Stopping Python processes..." -NoNewline
$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Stop-Process -Name python -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Python processes stopped" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No Python processes running" -ForegroundColor Yellow
}

Write-Host "Stopping MongoDB..." -NoNewline
$mongoProcesses = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($mongoProcesses) {
    Stop-Process -Name mongod -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] MongoDB stopped" -ForegroundColor Green
} else {
    Write-Host "  [INFO] MongoDB not running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Services Stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Closing terminal in 2 seconds..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

# Close the PowerShell window
Stop-Process -Id $PID
