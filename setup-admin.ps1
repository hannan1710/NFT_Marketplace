# Admin Setup Script for NFT Marketplace
# Run this from the ROOT directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NFT Marketplace - Admin Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in root directory
if (!(Test-Path "hardhat.config.js")) {
    Write-Host "ERROR: Run this script from the ROOT directory!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Navigate to root first:" -ForegroundColor Yellow
    Write-Host '  cd "C:\Users\hanna\Downloads\Sem 8\AI Driven NFT Marketplace"' -ForegroundColor Cyan
    exit 1
}

Write-Host "Step 1: Starting local blockchain..." -ForegroundColor Yellow
Write-Host "Opening new terminal for blockchain node..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run node"
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Step 2: Deploying contracts..." -ForegroundColor Yellow
npm run deploy:local

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Contract deployment failed!" -ForegroundColor Red
    Write-Host "Make sure the blockchain node is running." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 3: Granting admin role..." -ForegroundColor Yellow
npx hardhat run scripts/grantAdminRole.js --network localhost

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to grant admin role!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open a new terminal" -ForegroundColor White
Write-Host "  2. Navigate to frontend:" -ForegroundColor White
Write-Host '     cd nft-marketplace-frontend' -ForegroundColor Gray
Write-Host "  3. Start the frontend:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host "  4. Open browser:" -ForegroundColor White
Write-Host "     http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "For FASTEST performance, use production build:" -ForegroundColor Yellow
Write-Host "  npm run build && npm start" -ForegroundColor Gray
Write-Host ""
