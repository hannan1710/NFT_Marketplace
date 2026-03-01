@echo off
echo ========================================
echo Setting up Python Virtual Environments
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9 or higher
    pause
    exit /b 1
)

REM Setup Fraud Detector venv
echo [1/2] Setting up Fraud Detector environment...
cd nft-fraud-detector
if not exist venv (
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    echo ✓ Fraud Detector environment created
) else (
    echo ✓ Fraud Detector environment already exists
)
cd ..
echo.

REM Setup Price Predictor venv
echo [2/2] Setting up Price Predictor environment...
cd nft-price-predictor
if not exist venv (
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    echo ✓ Price Predictor environment created
) else (
    echo ✓ Price Predictor environment already exists
)
cd ..
echo.

echo ========================================
echo Python Environments Ready!
echo ========================================
echo.
echo You can now run start-dev.bat
echo.
pause
