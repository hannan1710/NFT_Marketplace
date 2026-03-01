Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting NFT Marketplace Development" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# [1/9] Start MongoDB
Write-Host "[1/9] Starting MongoDB..." -ForegroundColor Yellow
$mongoPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
if (Test-Path $mongoPath) {
    Start-Process -FilePath $mongoPath -ArgumentList "--dbpath", "C:\data\db" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "  MongoDB started" -ForegroundColor Green
} else {
    Write-Host "  WARNING: MongoDB not found. Install it: winget install MongoDB.Server" -ForegroundColor Yellow
}

# [2/9] Start Hardhat Node
Write-Host "[2/9] Starting Hardhat Node..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx hardhat node" -WindowStyle Normal
Start-Sleep -Seconds 5
Write-Host "  Hardhat Node started" -ForegroundColor Green

# [3/9] Deploy NFT Contract
Write-Host "[3/9] Deploying NFT Contract..." -ForegroundColor Yellow
$deployOutput = npx hardhat run scripts/deploy.js --network localhost 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  NFT Contract deployed" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to deploy NFT contract" -ForegroundColor Red
    Write-Host $deployOutput
    pause
    exit 1
}

# [4/9] Deploy Marketplace Contract
Write-Host "[4/9] Deploying Marketplace Contract..." -ForegroundColor Yellow
$marketplaceOutput = npx hardhat run scripts/deployMarketplace.js --network localhost 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Marketplace Contract deployed" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to deploy Marketplace contract" -ForegroundColor Red
    Write-Host $marketplaceOutput
    pause
    exit 1
}

# [5/9] Update Frontend Configuration
Write-Host "[5/9] Updating Frontend Configuration..." -ForegroundColor Yellow
node scripts/updateFrontendConfig.js
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Frontend config updated" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Failed to update frontend config" -ForegroundColor Yellow
}

# [6/9] Fund Wallet
Write-Host "[6/9] Funding Your Wallet..." -ForegroundColor Yellow
$fundOutput = npx hardhat run scripts/fundWallet.js --network localhost 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Wallet funded" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to fund wallet" -ForegroundColor Red
    Write-Host $fundOutput
    pause
    exit 1
}

# [7/9] Grant Roles (ADMIN AUTHORITY)
Write-Host "[7/9] Granting Admin & Minter Roles..." -ForegroundColor Yellow
$rolesOutput = npx hardhat run scripts/grantAllRoles.js --network localhost 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Admin & Minter roles granted" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to grant roles" -ForegroundColor Red
    Write-Host $rolesOutput
    pause
    exit 1
}

# [8/9] Start Backend Services
Write-Host "[8/9] Starting Backend Services..." -ForegroundColor Yellow

Write-Host "  Starting Trust Score Service..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd trust-score-service; npm start" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "  Starting Event Orchestrator..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd event-orchestrator-service; npm start" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "  Starting Validator Service..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd validator-service; npm start" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host "  Starting Fraud Detector..." -ForegroundColor Gray
if (Test-Path "nft-fraud-detector\venv\Scripts\Activate.ps1") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-fraud-detector; .\venv\Scripts\Activate.ps1; python src/api/main.py" -WindowStyle Normal
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-fraud-detector; python src/api/main.py" -WindowStyle Normal
}
Start-Sleep -Seconds 2

Write-Host "  Starting Price Predictor..." -ForegroundColor Gray
if (Test-Path "nft-price-predictor\venv\Scripts\Activate.ps1") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-price-predictor; .\venv\Scripts\Activate.ps1; python src/api/main.py" -WindowStyle Normal
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-price-predictor; python src/api/main.py" -WindowStyle Normal
}
Start-Sleep -Seconds 3

# [9/9] Start Frontend
Write-Host "[9/9] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-marketplace-frontend; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  Frontend:              http://localhost:3000" -ForegroundColor Gray
Write-Host "  Hardhat Node:          http://localhost:8545" -ForegroundColor Gray
Write-Host "  MongoDB:               mongodb://localhost:27017" -ForegroundColor Gray
Write-Host "  Trust Score Service:   http://localhost:4000" -ForegroundColor Gray
Write-Host "  Event Orchestrator:    http://localhost:5000" -ForegroundColor Gray
Write-Host "  Validator Service:     http://localhost:3002" -ForegroundColor Gray
Write-Host "  Fraud Detector:        http://localhost:8000" -ForegroundColor Gray
Write-Host "  Price Predictor:       http://localhost:8001" -ForegroundColor Gray
Write-Host ""
Write-Host "TIP: Run 'npx hardhat run scripts/checkSetup.js --network localhost' to verify setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop all services, run: .\stop-dev.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
