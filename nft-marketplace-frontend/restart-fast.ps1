# Fast Restart Script for Windows PowerShell
# This clears cache and restarts the dev server with Turbopack

Write-Host "🧹 Cleaning cache..." -ForegroundColor Yellow

# Remove .next cache
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Removed .next folder" -ForegroundColor Green
}

# Remove node_modules cache
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✅ Removed node_modules cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting dev server with Turbopack..." -ForegroundColor Cyan
Write-Host ""

# Start dev server with Turbopack
npm run dev
