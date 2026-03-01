@echo off
REM Quick stop script that closes terminal immediately after stopping services

echo Stopping all NFT Marketplace services...

REM Stop Node.js processes
taskkill /F /IM node.exe /T >nul 2>&1

REM Stop Python processes
taskkill /F /IM python.exe /T >nul 2>&1

REM Stop MongoDB
taskkill /F /IM mongod.exe /T >nul 2>&1

echo Services stopped!

REM Close this terminal window immediately
exit
