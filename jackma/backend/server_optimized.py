"""
优化版服务器 - 集成Redis缓存和Celery异步任务
使用此文件替代原server.py以启用高性能特性
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# 导入Redis缓存和Celery任务
from redis_cache import (
    redis_cache,
    get_cached_result,
    save_cached_result,
    CACHE_TTL_LONG
)
from celery_tasks import (
    async_query_phone,
    async_query_email,
    get_task_status,
    cancel_task,
    get_queue_stats
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database and API modules
from models import init_db, get_db
from db_operations import (
    save_email_query,
    save_phone_query,
    log_search,
    get_cache,
    save_cache
)

# Import authentication modules
from auth_operations import (
    login_user,
    verify_session,
    logout_user,
    init_default_users,
    create_user,
    get_user_info
)

try:
    from apis import (
        query_email_comprehensive, 
        query_phone_comprehensive,
        EmailQueryResult,
        PhoneQueryResult
    )
    HAS_EXTERNAL_APIS = True
except ImportError:
    HAS_EXTERNAL_APIS = False
    print("⚠️ Warning: external_apis module not found")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize SQLite database
try:
    init_db()
    from models import SessionLocal
    db_session = SessionLocal()
    init_default_users(db_session)
    db_session.close()
except Exception as e:
    print(f"⚠️ Database initialization skipped: {str(e)}")

# MongoDB connection (optional)
try:
    mongo_url = os.environ.get('MONGO_URL')
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'jackma_db')]
    else:
        db = None
except Exception as e:
    print(f"⚠️ MongoDB connection skipped: {str(e)}")
    db = None

# Create the main app
app = FastAPI(
    title="OSINT Tracker API (Optimized)",
    description="High-performance OSINT platform with Redis cache and Celery tasks",
    version="2.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== Startup & Shutdown Events ====================

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化Redis连接"""
    try:
        await redis_cache.initialize()
        logger.info("✅ 应用启动完成 - Redis已连接")
    except Exception as e:
        logger.error(f"⚠️ Redis连接失败: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理资源"""
    try:
        await redis_cache.close()
        if client:
            client.close()
        logger.info("✅ 应用关闭完成")
    except Exception as e:
        logger.error(f"⚠️ 关闭时出错: {str(e)}")


# ==================== Models ====================

class EmailQueryRequest(BaseModel):
    email: str
    timeout: int = 60
    use_async: bool = True  # 是否使用异步任务

class PhoneQueryRequest(BaseModel):
    phone: str
    timeout: int = 60
    use_async: bool = True  # 是否使用异步任务

class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    status: str
    progress: int
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== Authentication Routes (保持不变) ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    session_token: Optional[str] = None
    expires_at: Optional[str] = None
    message: str

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db_session: Session = Depends(get_db)):
    """用户登录"""
    result = login_user(db_session, request.username, request.password)
    return LoginResponse(**result)


# ==================== Optimized Query Routes ====================

@api_router.post("/email/query")
async def query_email_optimized(
    request: EmailQueryRequest,
    db_session: Session = Depends(get_db)
):
    """
    优化版邮箱查询 - 支持三层缓存和异步任务
    
    流程:
    1. 检查Redis缓存 (< 10ms)
    2. 检查数据库缓存 (50-100ms)
    3. 如果use_async=True，提交到Celery队列并立即返回任务ID
    4. 如果use_async=False，同步执行查询
    """
    try:
        email = request.email.strip()
        
        # L1 & L2: 检查缓存
        cached_result = await get_cached_result(email, "email", db_session)
        if cached_result:
            logger.info(f"✅ 缓存命中: {email}")
            return cached_result
        
        # 缓存未命中
        if request.use_async:
            # 异步模式: 提交任务到Celery队列
            task = async_query_email.delay(email, request.timeout)
            logger.info(f"🚀 异步任务已提交: {task.id} for {email}")
            
            return {
                "success": True,
                "mode": "async",
                "task_id": task.id,
                "email": email,
                "message": "Query submitted. Use /api/task/status/{task_id} to check progress.",
                "status_url": f"/api/task/status/{task.id}"
            }
        else:
            # 同步模式: 立即执行查询
            logger.info(f"🔍 同步查询邮箱: {email}")
            
            if HAS_EXTERNAL_APIS:
                result = await query_email_comprehensive(email)
                result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
            else:
                result_dict = {"success": True, "email": email, "data": "Mock data"}
            
            # 保存到所有缓存层
            success = result_dict.get('success', False)
            error_msg = result_dict.get('error', None)
            
            save_email_query(db=db_session, email=email, result=result_dict, success=success, error=error_msg)
            await save_cached_result(email, "email", result_dict, db_session, CACHE_TTL_LONG)
            log_search(db_session, email, "email", 1)
            
            logger.info(f"✅ 邮箱查询完成: {email}")
            return result_dict
            
    except Exception as e:
        logger.error(f"❌ 邮箱查询错误: {str(e)}")
        return {
            "success": False,
            "email": request.email,
            "error": f"Internal error: {str(e)}"
        }


@api_router.post("/phone/query")
async def query_phone_optimized(
    request: PhoneQueryRequest,
    db_session: Session = Depends(get_db)
):
    """
    优化版手机号查询 - 支持三层缓存和异步任务
    
    流程:
    1. 检查Redis缓存 (< 10ms)
    2. 检查数据库缓存 (50-100ms)
    3. 如果use_async=True，提交到Celery队列并立即返回任务ID
    4. 如果use_async=False，同步执行查询
    """
    try:
        phone = request.phone.strip()
        
        # L1 & L2: 检查缓存
        cached_result = await get_cached_result(phone, "phone", db_session)
        if cached_result:
            logger.info(f"✅ 缓存命中: {phone}")
            return cached_result
        
        # 缓存未命中
        if request.use_async:
            # 异步模式: 提交任务到Celery队列
            task = async_query_phone.delay(phone, request.timeout)
            logger.info(f"🚀 异步任务已提交: {task.id} for {phone}")
            
            return {
                "success": True,
                "mode": "async",
                "task_id": task.id,
                "phone": phone,
                "message": "Query submitted. Use /api/task/status/{task_id} to check progress.",
                "status_url": f"/api/task/status/{task.id}"
            }
        else:
            # 同步模式: 立即执行查询
            logger.info(f"🔍 同步查询手机号: {phone}")
            
            if HAS_EXTERNAL_APIS:
                result = await query_phone_comprehensive(phone)
                result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
            else:
                result_dict = {"success": True, "phone": phone, "data": "Mock data"}
            
            # 保存到所有缓存层
            success = result_dict.get('success', False)
            error_msg = result_dict.get('error', None)
            
            save_phone_query(db=db_session, phone=phone, result=result_dict, success=success, error=error_msg)
            await save_cached_result(phone, "phone", result_dict, db_session, CACHE_TTL_LONG)
            log_search(db_session, phone, "phone", 1)
            
            logger.info(f"✅ 手机号查询完成: {phone}")
            return result_dict
            
    except Exception as e:
        logger.error(f"❌ 手机号查询错误: {str(e)}")
        return {
            "success": False,
            "phone": request.phone,
            "error": f"Internal error: {str(e)}"
        }


# ==================== Task Management Routes ====================

@api_router.get("/task/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status_route(task_id: str):
    """
    获取异步任务状态
    
    状态说明:
    - PENDING: 任务在队列中等待
    - PROCESSING: 任务正在执行
    - SUCCESS: 任务成功完成
    - FAILURE: 任务执行失败
    - RETRY: 任务正在重试
    """
    try:
        status = get_task_status(task_id)
        return TaskStatusResponse(**status)
    except Exception as e:
        logger.error(f"❌ 获取任务状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/task/{task_id}")
async def cancel_task_route(task_id: str):
    """取消正在执行的任务"""
    try:
        success = cancel_task(task_id)
        if success:
            return {"success": True, "message": f"Task {task_id} cancelled"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel task")
    except Exception as e:
        logger.error(f"❌ 取消任务失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/queue/stats")
async def get_queue_stats_route():
    """获取任务队列统计信息"""
    try:
        stats = get_queue_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"❌ 获取队列统计失败: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== Cache Management Routes ====================

@api_router.get("/cache/stats")
async def get_cache_stats():
    """获取Redis缓存统计信息"""
    try:
        stats = await redis_cache.get_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"❌ 获取缓存统计失败: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@api_router.delete("/cache/{query_type}/{query}")
async def clear_cache(query_type: str, query: str):
    """清除指定查询的缓存"""
    try:
        success = await redis_cache.delete(query, query_type)
        if success:
            return {
                "success": True,
                "message": f"Cache cleared for {query_type}:{query}"
            }
        else:
            return {
                "success": False,
                "message": "Cache not found or already cleared"
            }
    except Exception as e:
        logger.error(f"❌ 清除缓存失败: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@api_router.delete("/cache/clear-all")
async def clear_all_cache(pattern: str = "osint:*"):
    """批量清除缓存"""
    try:
        count = await redis_cache.clear_pattern(pattern)
        return {
            "success": True,
            "message": f"Cleared {count} cache entries",
            "count": count
        }
    except Exception as e:
        logger.error(f"❌ 批量清除缓存失败: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== Admin Routes (保持不变) ====================

def verify_admin_session(session_token: str, db: Session) -> dict:
    """验证管理员会话"""
    result = verify_session(db, session_token)
    if not result.get('valid') or not result.get('is_admin'):
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    return result


@api_router.get("/admin/stats")
async def get_admin_stats(session_token: str = Query(...), db_session: Session = Depends(get_db)):
    """获取管理员统计数据（包含Redis和Celery统计）"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        from db_operations import get_database_stats
        db_stats = get_database_stats(db_session)
        
        # 获取Redis统计
        redis_stats = await redis_cache.get_stats()
        
        # 获取Celery队列统计
        queue_stats = get_queue_stats()
        
        return {
            "success": True,
            "data": {
                "database": db_stats,
                "redis": redis_stats,
                "queue": queue_stats
            },
            "message": "Statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching admin stats: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch statistics"
        }


# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for production
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404)
    
    logger.info(f"✅ Serving frontend from: {FRONTEND_BUILD_DIR}")
else:
    logger.warning(f"⚠️ Frontend build directory not found")
