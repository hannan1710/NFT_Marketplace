@echo off
echo ========================================
echo Stopping NFT Marketplace Services
echo ========================================
echo.

echo Stopping Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Node.js processes stopped
) else (
    echo   [INFO] No Node.js processes running
)

echo Stopping Python processes...
taskkill /F /IM python.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Python processes stopped
) else (
    echo   [INFO] No Python processes running
)

echo Stopping MongoDB...
taskkill /F /IM mongod.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] MongoDB stopped
) else (
    echo   [INFO] MongoDB not running
)

echo.
echo ========================================
echo All Services Stopped!
echo ========================================
echo.
echo This window will close automatically in 3 seconds...
echo Press any key to close immediately.
timeout /t 3 /nobreak >nul
exit
