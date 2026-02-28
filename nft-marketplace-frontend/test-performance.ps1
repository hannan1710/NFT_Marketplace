# Performance Test Script for Windows PowerShell
# This script helps diagnose and fix slow page transitions

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NFT Marketplace Performance Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
Write-Host "Checking dev server..." -ForegroundColor Yellow
$devServer = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($devServer) {
    Write-Host "✅ Dev server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Dev server not running" -ForegroundColor Red
    Write-Host "   Start it with: npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Check .next cache
Write-Host "Checking cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "✅ Cache exists" -ForegroundColor Green
    Write-Host "   To clear: Remove-Item -Recurse -Force .next" -ForegroundColor Cyan
} else {
    Write-Host "ℹ️  No cache found (first run)" -ForegroundColor Cyan
}
Write-Host ""

# Check node_modules
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ node_modules not found" -ForegroundColor Red
    Write-Host "   Run: npm install" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Fixes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Clear cache and restart:" -ForegroundColor Yellow
Write-Host "   Remove-Item -Recurse -Force .next" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "2. Use production build (FASTEST):" -ForegroundColor Yellow
Write-Host "   npm run build" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host "   ⚡ 5-10x faster than dev mode!" -ForegroundColor Green
Write-Host ""

Write-Host "3. Close unnecessary programs" -ForegroundColor Yellow
Write-Host "   - Close other browser tabs" -ForegroundColor White
Write-Host "   - Close heavy applications" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Expected Performance" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Development Mode:" -ForegroundColor Yellow
Write-Host "  • Initial load: 2-5 seconds" -ForegroundColor White
Write-Host "  • Page transitions: 1-3 seconds" -ForegroundColor White
Write-Host ""
Write-Host "Production Mode:" -ForegroundColor Yellow
Write-Host "  • Initial load: 0.5-2 seconds ⚡" -ForegroundColor Green
Write-Host "  • Page transitions: 0.2-1 second ⚡" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  What would you like to do?" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] Clear cache and restart" -ForegroundColor White
Write-Host "[2] Show build commands" -ForegroundColor White
Write-Host "[Q] Quit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Clearing cache..." -ForegroundColor Yellow
        if (Test-Path ".next") {
            Remove-Item -Recurse -Force .next
            Write-Host "✅ Cache cleared!" -ForegroundColor Green
        }
        if (Test-Path "node_modules\.cache") {
            Remove-Item -Recurse -Force node_modules\.cache
            Write-Host "✅ Node cache cleared!" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "Now run: npm run dev" -ForegroundColor Cyan
    }
    "2" {
        Write-Host ""
        Write-Host "Production Build Commands:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Step 1: Build" -ForegroundColor Cyan
        Write-Host "  npm run build" -ForegroundColor White
        Write-Host ""
        Write-Host "Step 2: Start" -ForegroundColor Cyan
        Write-Host "  npm start" -ForegroundColor White
        Write-Host ""
        Write-Host "Then open: http://localhost:3000" -ForegroundColor Green
    }
    default {
        Write-Host ""
        Write-Host "Goodbye! 👋" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "For more help, see:" -ForegroundColor Cyan
Write-Host "  • SPEED_FIX_SUMMARY.md" -ForegroundColor White
Write-Host "  • ADMIN_ACCESS_GUIDE.md" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
