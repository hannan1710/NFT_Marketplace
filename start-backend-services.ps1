# Start all backend services for NFT Marketplace

Write-Host "Starting All Backend Services..." -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

# Function to start a service
function Start-Service {
    param($Name, $Port, $Path, $Command)
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Cyan
    
    if (Test-Path $Path) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; Write-Host '$Name Service' -ForegroundColor Yellow; $Command" -WindowStyle Normal
        Write-Host "✓ $Name started" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "✗ $Name directory not found: $Path" -ForegroundColor Red
    }
}

# Start Node.js services
Start-Service -Name "Trust Score Service" -Port 4000 -Path "trust-score-service" -Command "npm start"
Start-Service -Name "Event Orchestrator" -Port 5000 -Path "event-orchestrator-service" -Command "npm start"

# Start Python services
Start-Service -Name "Fraud Detector" -Port 8000 -Path "nft-fraud-detector" -Command "python src/api/main.py"
Start-Service -Name "Price Predictor" -Port 8001 -Path "nft-price-predictor" -Command "python src/api/main.py"

Write-Host "`n================================" -ForegroundColor Green
Write-Host "✓ All Services Started!" -ForegroundColor Green
Write-Host "`nServices running on:" -ForegroundColor Yellow
Write-Host "  - Trust Score:        http://localhost:4000" -ForegroundColor Cyan
Write-Host "  - Event Orchestrator: http://localhost:5000" -ForegroundColor Cyan
Write-Host "  - Fraud Detector:     http://localhost:8000" -ForegroundColor Cyan
Write-Host "  - Price Predictor:    http://localhost:8001" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each window to stop services" -ForegroundColor Gray

