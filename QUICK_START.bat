@echo off
cls
echo ╔════════════════════════════════════════════╗
echo ║   NFT Marketplace - Quick Start Guide     ║
echo ╚════════════════════════════════════════════╝
echo.
echo This will start:
echo   ✓ Hardhat Blockchain
echo   ✓ Backend Services (4 services)
echo   ✓ Frontend Application
echo.
echo Press any key to start all services...
pause >nul

echo.
echo Starting services...
powershell -ExecutionPolicy Bypass -File start-all.ps1

echo.
echo ════════════════════════════════════════════
echo.
echo ⏳ Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo.
echo 📦 Deploying smart contracts...
call npx hardhat run scripts/deploy.js --network localhost

echo.
echo ╔════════════════════════════════════════════╗
echo ║            Setup Complete! ✓               ║
echo ╚════════════════════════════════════════════╝
echo.
echo 🌐 Open: http://localhost:3000
echo 🔗 Connect your MetaMask wallet
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo 💡 All services are running!
echo    Close all PowerShell windows to stop.
echo.
pause
