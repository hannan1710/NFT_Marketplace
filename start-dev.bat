@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Starting NFT Marketplace Development
echo ========================================
echo.

REM Start MongoDB
echo [1/9] Starting MongoDB...
start "MongoDB" "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db"
if %errorlevel% neq 0 (
    echo ERROR: Failed to start MongoDB
    echo Make sure MongoDB is installed: winget install MongoDB.Server
    pause
    exit /b 1
)
timeout /t 3 /nobreak >nul

REM Start Hardhat Node
echo [2/9] Starting Hardhat Node...
start "Hardhat Node" cmd /k "npx hardhat node"
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Hardhat node
    pause
    exit /b 1
)
timeout /t 5 /nobreak >nul

REM Deploy Contracts
echo [3/9] Deploying NFT Contract...
call npx hardhat run scripts/deploy.js --network localhost
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy NFT contract
    pause
    exit /b 1
)
echo.

echo [4/9] Deploying Marketplace Contract...
call npx hardhat run scripts/deployMarketplace.js --network localhost
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy Marketplace contract
    pause
    exit /b 1
)
echo.

echo [5/9] Updating Frontend Configuration...
call node scripts/updateFrontendConfig.js
if %errorlevel% neq 0 (
    echo WARNING: Failed to update frontend config
)
echo.

echo [6/9] Funding Your Wallet...
call npx hardhat run scripts/fundWallet.js --network localhost
if %errorlevel% neq 0 (
    echo ERROR: Failed to fund wallet
    pause
    exit /b 1
)
echo.

echo [7/9] Granting Roles...
call npx hardhat run scripts/grantAllRoles.js --network localhost
if %errorlevel% neq 0 (
    echo ERROR: Failed to grant roles
    pause
    exit /b 1
)
echo.

REM Start Backend Services
echo [8/9] Starting Backend Services...

echo Starting Trust Score Service...
start "Trust Score Service" cmd /k "cd trust-score-service && npm start"
timeout /t 2 /nobreak >nul

echo Starting Event Orchestrator...
start "Event Orchestrator" cmd /k "cd event-orchestrator-service && npm start"
timeout /t 2 /nobreak >nul

echo Starting Validator Service...
start "Validator Service" cmd /k "cd validator-service && npm start"
timeout /t 2 /nobreak >nul

echo Starting Fraud Detector...
if exist "nft-fraud-detector\venv\Scripts\activate.bat" (
    start "Fraud Detector" cmd /k "cd nft-fraud-detector && call venv\Scripts\activate && python src/api/main.py"
) else (
    start "Fraud Detector" cmd /k "cd nft-fraud-detector && python src/api/main.py"
)
timeout /t 2 /nobreak >nul

echo Starting Price Predictor...
if exist "nft-price-predictor\venv\Scripts\activate.bat" (
    start "Price Predictor" cmd /k "cd nft-price-predictor && call venv\Scripts\activate && python src/api/main.py"
) else (
    start "Price Predictor" cmd /k "cd nft-price-predictor && python src/api/main.py"
)
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [9/9] Starting Frontend...
start "Frontend" cmd /k "cd nft-marketplace-frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All Services Started Successfully!
echo ========================================
echo.
echo Frontend:              http://localhost:3000
echo Hardhat Node:          http://localhost:8545
echo MongoDB:               mongodb://localhost:27017
echo Trust Score Service:   http://localhost:4000
echo Event Orchestrator:    http://localhost:5000
echo Validator Service:     http://localhost:3002
echo Fraud Detector:        http://localhost:8000
echo Price Predictor:       http://localhost:8001
echo.
echo TIP: Run 'npx hardhat run scripts/checkSetup.js --network localhost' to verify setup
echo.
echo Press any key to exit...
pause >nul
