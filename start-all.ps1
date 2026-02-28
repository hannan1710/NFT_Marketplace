# Start Complete NFT Marketplace Ecosystem
# This script starts: Blockchain, Backend Services, and Frontend

Write-Host "Starting NFT Marketplace..." -ForegroundColor Cyan
Write-Host ""

# 1. Start Hardhat Blockchain
Write-Host "[1/3] Starting Hardhat Blockchain..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Hardhat Blockchain' -ForegroundColor Magenta; npx hardhat node" -WindowStyle Normal
Write-Host "OK Blockchain starting on http://127.0.0.1:8545" -ForegroundColor Green
Start-Sleep -Seconds 3

# 2. Start Backend Services
Write-Host ""
Write-Host "[2/3] Starting Backend Services..." -ForegroundColor Yellow

# Trust Score Service
if (Test-Path "trust-score-service") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd trust-score-service; Write-Host 'Trust Score Service' -ForegroundColor Yellow; npm start" -WindowStyle Normal
    Write-Host "OK Trust Score Service starting on port 4000" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Event Orchestrator
if (Test-Path "event-orchestrator-service") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd event-orchestrator-service; Write-Host 'Event Orchestrator' -ForegroundColor Yellow; npm start" -WindowStyle Normal
    Write-Host "OK Event Orchestrator starting on port 5000" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Fraud Detector (Python)
if (Test-Path "nft-fraud-detector") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-fraud-detector; Write-Host 'Fraud Detector Service' -ForegroundColor Yellow; python src/api/main.py" -WindowStyle Normal
    Write-Host "OK Fraud Detector starting on port 8000" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Price Predictor (Python)
if (Test-Path "nft-price-predictor") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-price-predictor; Write-Host 'Price Predictor Service' -ForegroundColor Yellow; python src/api/main.py" -WindowStyle Normal
    Write-Host "OK Price Predictor starting on port 8001" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# 3. Start Frontend
Write-Host ""
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd nft-marketplace-frontend; Write-Host 'Frontend Application' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
Write-Host "OK Frontend starting on http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  Frontend:           http://localhost:3000" -ForegroundColor White
Write-Host "  Blockchain:         http://127.0.0.1:8545" -ForegroundColor White
Write-Host "  Trust Score:        http://localhost:4000" -ForegroundColor White
Write-Host "  Event Orchestrator: http://localhost:5000" -ForegroundColor White
Write-Host "  Fraud Detector:     http://localhost:8000" -ForegroundColor White
Write-Host "  Price Predictor:    http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 10 seconds for all services to start"
Write-Host "  2. Deploy contracts: npx hardhat run scripts/deploy.js --network localhost"
Write-Host "  3. Open http://localhost:3000 in your browser"
Write-Host "  4. Connect MetaMask wallet"
Write-Host ""
Write-Host "Tip: Close all PowerShell windows to stop all services" -ForegroundColor Gray
