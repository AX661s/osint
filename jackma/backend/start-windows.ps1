# Windows启动脚本 - OSINT Tracker优化版
# 使用方法: powershell -ExecutionPolicy Bypass -File start-windows.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OSINT Tracker 优化版 - Windows启动  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "celery_tasks.py")) {
    Write-Host "❌ 错误: 请在 jackma/backend 目录下运行此脚本" -ForegroundColor Red
    exit 1
}

# 1. 检查并启动Redis（使用WSL或Docker）
Write-Host "📦 步骤 1/3: 检查Redis..." -ForegroundColor Yellow

# 检查Redis是否已经在运行
$redisRunning = $false
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded) {
        $redisRunning = $true
        Write-Host "✅ Redis已在运行 (localhost:6379)" -ForegroundColor Green
    }
} catch {
    $redisRunning = $false
}

if (-not $redisRunning) {
    Write-Host "⚠️  Redis未运行，尝试启动..." -ForegroundColor Yellow
    
    # 方案1: 尝试使用WSL启动Redis
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        Write-Host "   使用WSL启动Redis..." -ForegroundColor Cyan
        Start-Process wsl -ArgumentList "redis-server --daemonize yes" -WindowStyle Hidden
        Start-Sleep -Seconds 2
        
        # 再次检查
        $testConnection = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($testConnection.TcpTestSucceeded) {
            Write-Host "✅ Redis已通过WSL启动" -ForegroundColor Green
            $redisRunning = $true
        }
    }
    
    # 方案2: 尝试使用Docker启动Redis
    if (-not $redisRunning -and (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "   使用Docker启动Redis..." -ForegroundColor Cyan
        docker run -d --name osint-redis -p 6379:6379 redis:7-alpine 2>$null
        Start-Sleep -Seconds 3
        
        # 再次检查
        $testConnection = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($testConnection.TcpTestSucceeded) {
            Write-Host "✅ Redis已通过Docker启动" -ForegroundColor Green
            $redisRunning = $true
        }
    }
    
    if (-not $redisRunning) {
        Write-Host ""
        Write-Host "❌ 无法启动Redis。请手动安装并启动Redis:" -ForegroundColor Red
        Write-Host ""
        Write-Host "   方案1 - 使用WSL (推荐):" -ForegroundColor Yellow
        Write-Host "   1. 启用WSL: wsl --install" -ForegroundColor White
        Write-Host "   2. 安装Redis: wsl sudo apt update && wsl sudo apt install redis-server" -ForegroundColor White
        Write-Host "   3. 启动Redis: wsl redis-server --daemonize yes" -ForegroundColor White
        Write-Host ""
        Write-Host "   方案2 - 使用Docker:" -ForegroundColor Yellow
        Write-Host "   docker run -d --name osint-redis -p 6379:6379 redis:7-alpine" -ForegroundColor White
        Write-Host ""
        Write-Host "   方案3 - 下载Windows版本:" -ForegroundColor Yellow
        Write-Host "   https://github.com/tporadowski/redis/releases" -ForegroundColor White
        Write-Host ""
        Read-Host "按Enter键退出"
        exit 1
    }
}

Write-Host ""

# 2. 启动Celery Worker
Write-Host "🔧 步骤 2/3: 启动Celery Worker..." -ForegroundColor Yellow

# 检查Celery是否已经在运行
$celeryRunning = Get-Process | Where-Object {$_.ProcessName -like "*celery*"}
if ($celeryRunning) {
    Write-Host "⚠️  Celery Worker已在运行，跳过启动" -ForegroundColor Yellow
} else {
    Write-Host "   启动Celery Worker (后台运行)..." -ForegroundColor Cyan
    
    # 在新窗口启动Celery Worker
    $celeryCmd = "celery -A celery_tasks worker --loglevel=info --pool=solo"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; $celeryCmd" -WindowStyle Minimized
    
    Write-Host "✅ Celery Worker已启动 (最小化窗口)" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host ""

# 3. 启动FastAPI服务器
Write-Host "🚀 步骤 3/3: 启动FastAPI服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  服务器启动信息" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  API地址:    http://localhost:8000" -ForegroundColor White
Write-Host "  API文档:    http://localhost:8000/docs" -ForegroundColor White
Write-Host "  缓存统计:   http://localhost:8000/api/cache/stats" -ForegroundColor White
Write-Host "  队列统计:   http://localhost:8000/api/queue/stats" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动FastAPI服务器（前台运行）
uvicorn server_optimized:app --host 0.0.0.0 --port 8000 --reload
