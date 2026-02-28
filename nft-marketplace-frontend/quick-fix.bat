@echo off
echo.
echo ========================================
echo   NFT Marketplace - Quick Performance Fix
echo ========================================
echo.
echo This will clear the cache and improve speed.
echo.
pause

echo.
echo Clearing .next cache...
if exist .next (
    rmdir /s /q .next
    echo ✓ Cache cleared!
) else (
    echo ℹ No cache found
)

echo.
echo Clearing node_modules cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo ✓ Node cache cleared!
)

echo.
echo ========================================
echo   Done! Now run:
echo   npm run dev
echo ========================================
echo.
echo For FASTEST performance, use production:
echo   npm run build
echo   npm start
echo.
pause
