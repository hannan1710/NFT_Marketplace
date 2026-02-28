# Stop all NFT Marketplace services

Write-Host "Stopping All Services..." -ForegroundColor Red

# Stop Node.js processes
Write-Host "Stopping Node.js services..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*nft-marketplace*"
} | Stop-Process -Force

# Stop Python processes
Write-Host "Stopping Python services..." -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*nft-*"
} | Stop-Process -Force

# Stop Hardhat
Write-Host "Stopping Hardhat..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*hardhat*"
} | Stop-Process -Force

Write-Host "`n✓ All services stopped!" -ForegroundColor Green
