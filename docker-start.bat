@echo off
REM Docker startup script for NFT Marketplace (Windows)
REM Usage: docker-start.bat [dev|prod]

setlocal enabledelayedexpansion

set MODE=%1
if "%MODE%"=="" set MODE=dev

echo ==========================================
echo NFT Marketplace Docker Startup
echo ==========================================
echo Mode: %MODE%
echo.

REM Check if .env file exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Creating .env from .env.docker template...
    copy .env.docker .env
    echo SUCCESS: .env file created. Please update it with your configuration.
    echo.
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker and try again.
    exit /b 1
)

echo Starting Docker containers...
echo.

if "%MODE%"=="prod" (
    echo Starting in PRODUCTION mode...
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
) else (
    echo Starting in DEVELOPMENT mode...
    docker-compose up -d
)

echo.
echo Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo Service Status:
docker-compose ps

echo.
echo ==========================================
echo SUCCESS: Docker containers started!
echo ==========================================
echo.
echo Service URLs:
echo   - Trust Score Service:    http://localhost:3001
echo   - Event Orchestrator:     http://localhost:3002
echo   - Validator Service:      http://localhost:3003
echo   - Fraud Detector:         http://localhost:8001
echo   - Price Predictor:        http://localhost:8002
echo   - Nginx Reverse Proxy:    http://localhost
echo   - MongoDB:                mongodb://localhost:27017
echo   - Redis:                  redis://localhost:6379
echo.
echo API Endpoints (via Nginx):
echo   - Trust Score:            http://localhost/api/trust-score/
echo   - Events:                 http://localhost/api/events/
echo   - Validator:              http://localhost/api/validator/
echo   - Fraud Detector:         http://localhost/api/fraud-detector/
echo   - Price Predictor:        http://localhost/api/price-predictor/
echo.
echo Useful commands:
echo   - View logs:              docker-compose logs -f [service-name]
echo   - Stop containers:        docker-compose down
echo   - Restart service:        docker-compose restart [service-name]
echo   - View all logs:          docker-compose logs -f
echo.

endlocal
