@echo off
REM Docker Setup Verification Script for Windows
REM Checks if all components are properly configured

setlocal enabledelayedexpansion

set ERRORS=0
set WARNINGS=0

echo ==========================================
echo Docker Setup Verification
echo ==========================================
echo.

REM Check Docker installation
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [OK] Docker installed: !DOCKER_VERSION!
)

REM Check Docker Compose installation
echo.
echo Checking Docker Compose installation...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
    echo [OK] Docker Compose installed: !COMPOSE_VERSION!
)

REM Check if Docker is running
echo.
echo Checking Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running
    set /a ERRORS+=1
) else (
    echo [OK] Docker daemon is running
)

REM Check for required files
echo.
echo Checking required files...

set FILES=docker-compose.yml docker-compose.prod.yml docker\Dockerfile.node docker\Dockerfile.python docker\nginx\nginx.conf docker\nginx\nginx.prod.conf docker\nginx\conf.d\default.conf docker\mongo-init\init-mongo.js

for %%f in (%FILES%) do (
    if exist "%%f" (
        echo [OK] Found: %%f
    ) else (
        echo [ERROR] Missing: %%f
        set /a ERRORS+=1
    )
)

REM Check for .env file
echo.
echo Checking environment configuration...
if exist ".env" (
    echo [OK] Found .env file
    
    REM Check for critical variables
    findstr /B "MONGO_ROOT_PASSWORD=" .env >nul
    if errorlevel 1 (
        echo [ERROR] MONGO_ROOT_PASSWORD is missing from .env
        set /a ERRORS+=1
    ) else (
        for /f "tokens=2 delims==" %%a in ('findstr /B "MONGO_ROOT_PASSWORD=" .env') do set MONGO_PASS=%%a
        if "!MONGO_PASS!"=="changeme" (
            echo [WARNING] MONGO_ROOT_PASSWORD is not properly configured
            set /a WARNINGS+=1
        ) else (
            echo [OK] MONGO_ROOT_PASSWORD is configured
        )
    )
    
    findstr /B "REDIS_PASSWORD=" .env >nul
    if errorlevel 1 (
        echo [ERROR] REDIS_PASSWORD is missing from .env
        set /a ERRORS+=1
    ) else (
        for /f "tokens=2 delims==" %%a in ('findstr /B "REDIS_PASSWORD=" .env') do set REDIS_PASS=%%a
        if "!REDIS_PASS!"=="changeme" (
            echo [WARNING] REDIS_PASSWORD is not properly configured
            set /a WARNINGS+=1
        ) else (
            echo [OK] REDIS_PASSWORD is configured
        )
    )
    
    findstr /B "SEPOLIA_RPC_URL=" .env >nul
    if errorlevel 1 (
        echo [ERROR] SEPOLIA_RPC_URL is missing from .env
        set /a ERRORS+=1
    ) else (
        echo [OK] SEPOLIA_RPC_URL is configured
    )
) else (
    echo [WARNING] .env file not found (will be created from template)
    set /a WARNINGS+=1
)

REM Check Docker Compose configuration
echo.
echo Validating Docker Compose configuration...
docker-compose config >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose configuration has errors
    set /a ERRORS+=1
) else (
    echo [OK] Docker Compose configuration is valid
)

REM Check SSL certificates
echo.
echo Checking SSL configuration...
if exist "docker\nginx\ssl\cert.pem" (
    if exist "docker\nginx\ssl\key.pem" (
        echo [OK] SSL certificates found
    ) else (
        echo [INFO] SSL certificates not found (optional for development)
    )
) else (
    echo [INFO] SSL certificates not found (optional for development)
)

REM Summary
echo.
echo ==========================================
echo Verification Summary
echo ==========================================

if !ERRORS! EQU 0 (
    if !WARNINGS! EQU 0 (
        echo [SUCCESS] All checks passed! Ready to deploy.
        echo.
        echo Next steps:
        echo   1. Review .env configuration
        echo   2. Start services: docker-start.bat dev
        echo   3. Check logs: docker-compose logs -f
        exit /b 0
    ) else (
        echo [WARNING] !WARNINGS! warning(s) found
        echo.
        echo You can proceed, but review the warnings above.
        exit /b 0
    )
) else (
    echo [ERROR] !ERRORS! error(s) and !WARNINGS! warning(s) found
    echo.
    echo Please fix the errors before deploying.
    exit /b 1
)

endlocal
