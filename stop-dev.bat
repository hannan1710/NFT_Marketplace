@echo off
echo ========================================
echo Stopping NFT Marketplace Services
echo ========================================
echo.

echo Stopping Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1

echo Stopping Python processes...
taskkill /F /IM python.exe /T >nul 2>&1

echo Stopping MongoDB...
taskkill /F /IM mongod.exe /T >nul 2>&1

echo.
echo ========================================
echo All Services Stopped!
echo ========================================
echo.
timeout /t 2 /nobreak >nul
exit
