# 清除浏览器缓存并重新加载前端
Write-Host "🔄 清除缓存并重新加载前端..." -ForegroundColor Cyan

# 1. 停止当前运行的开发服务器（如果有）
Write-Host "1️⃣ 停止当前开发服务器..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. 清除 node_modules/.cache
Write-Host "2️⃣ 清除 node_modules 缓存..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Path "node_modules/.cache" -Recurse -Force
    Write-Host "   ✅ 已清除 node_modules/.cache" -ForegroundColor Green
}

# 3. 清除 build 目录
Write-Host "3️⃣ 清除 build 目录..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Path "build" -Recurse -Force
    Write-Host "   ✅ 已清除 build 目录" -ForegroundColor Green
}

# 4. 重新启动开发服务器
Write-Host "4️⃣ 重新启动开发服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  请在浏览器中按 Ctrl + Shift + R 强制刷新" -ForegroundColor Yellow
Write-Host "  或者按 Ctrl + F5 清除缓存并刷新" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 启动开发服务器
yarn start
