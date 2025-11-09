from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi import Response
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
from sqlalchemy import Integer
import httpx
# 外部搜索模块
from apis.external_search import query_external_search
HAS_EXTERNAL_SEARCH = True

# LinkedIn头像API
from apis.linkedin_avatar import router as linkedin_avatar_router

# Logo API
from apis.logo_api import router as logo_router

# Google API
from apis.google_api import router as google_router

# Google API
from apis.google_api import router as google_router





# Configure logging FIRST before using logger
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
    print("⚠️ Warning: external_apis module not found, queries will use mock data")


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize SQLite database
try:
    init_db()
    # Initialize default users on startup
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
        client = None
except Exception as e:
    print(f"⚠️ MongoDB connection skipped: {str(e)}")
    db = None
    client = None

# Lifespan context manager for startup/shutdown events
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Server starting up...")
    yield
    # Shutdown
    if client:
        client.close()
        logger.info("MongoDB connection closed")
    logger.info("✅ Server shutdown complete")

# Create the main app with lifespan
app = FastAPI(
    title="OSINT Tracker API",
    description="Comprehensive OSINT data gathering platform",
    version="1.0.0",
    lifespan=lifespan
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ==================== Authentication Models ====================
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

class VerifySessionRequest(BaseModel):
    session_token: str

class VerifySessionResponse(BaseModel):
    valid: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    message: str

class LogoutRequest(BaseModel):
    session_token: str

class UserInfoResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    email: Optional[str] = None
    points: Optional[int] = None
    created_at: Optional[str] = None
    message: Optional[str] = None

# ==================== Query Models ====================
class EmailQueryRequest(BaseModel):
    email: str
    timeout: int = 60

class PhoneQueryRequest(BaseModel):
    phone: str
    timeout: int = 60

class TelegramUsernameQueryRequest(BaseModel):
    username: str
    timeout: int = 30

# Add your routes to the router instead of directly to app
# ==================== Authentication Routes ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db_session: Session = Depends(get_db)):
    """用户登录 - 验证用户名密码并返回会话token"""
    result = login_user(db_session, request.username, request.password)
    return LoginResponse(**result)


@api_router.post("/auth/verify", response_model=VerifySessionResponse)
async def verify_session_endpoint(request: VerifySessionRequest, db_session: Session = Depends(get_db)):
    """验证会话token是否有效"""
    result = verify_session(db_session, request.session_token)
    return VerifySessionResponse(**result)


@api_router.post("/auth/logout")
async def logout(request: LogoutRequest, db_session: Session = Depends(get_db)):
    """用户登出 - 销毁会话"""
    result = logout_user(db_session, request.session_token)
    return result


@api_router.get("/auth/user/{user_id}", response_model=UserInfoResponse)
async def get_user(user_id: int, db_session: Session = Depends(get_db)):
    """获取用户信息"""
    result = get_user_info(db_session, user_id)
    return UserInfoResponse(**result)


@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    if not db:
        return []
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/email/query")
async def query_email(request: EmailQueryRequest, db_session: Session = Depends(get_db)):
    """
    Query email information using multiple OSINT APIs
    Saves results to SQLite database for history and caching
    """
    try:
        # 清理邮箱地址,去除前后空格
        email = request.email.strip()
        
        # Check cache first
        cache_key = f"email_{email}"
        cached_result = get_cache(db_session, cache_key, "email")
        if cached_result:
            logger.info(f"✅ Cache hit for email: {email}")
            return cached_result
        
        # Query comprehensive email data
        logger.info(f"🔍 Querying email: {email}")
        
        if HAS_EXTERNAL_APIS:
            result = await query_email_comprehensive(email)
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        else:
            result_dict = {"success": True, "email": email, "data": "Mock data"}
        
        # Save to database
        success = result_dict.get('success', False)
        error_msg = result_dict.get('error', None)
        
        save_email_query(
            db=db_session,
            email=email,
            result=result_dict,
            success=success,
            error=error_msg
        )
        
        # Cache the result
        save_cache(
            db=db_session,
            query=email,
            query_type="email",
            result_data=result_dict
        )
        
        # Log search
        log_search(db_session, request.email, "email", 1)
        
        logger.info(f"✅ Email query completed for: {request.email}")
        return result_dict
    except Exception as e:
        logger.error(f"❌ Error querying email {request.email}: {str(e)}")
        error_result = {
            "success": False,
            "email": request.email,
            "error": f"Internal error: {str(e)}"
        }
        save_email_query(
            db=db_session,
            email=request.email,
            result={},
            success=False,
            error=str(e)
        )
        return error_result

@api_router.post("/phone/query")
async def query_phone(request: PhoneQueryRequest, db_session: Session = Depends(get_db)):
    """
    Query phone number information using multiple OSINT APIs
    Saves results to SQLite database for history and caching
    """
    try:
        # 清理手机号,去除前后空格
        phone = request.phone.strip()
        
        # Check cache first
        cache_key = f"phone_{phone}"
        cached_result = get_cache(db_session, cache_key, "phone")
        if cached_result:
            logger.info(f"✅ Cache hit for phone: {phone}")
            return cached_result
        
        # Query comprehensive phone data
        logger.info(f"🔍 Querying phone: {phone}")
        
        if HAS_EXTERNAL_APIS:
            result = await query_phone_comprehensive(phone)
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        else:
            result_dict = {"success": True, "phone": phone, "data": "Mock data"}
        
        # Save to database
        success = result_dict.get('success', False)
        error_msg = result_dict.get('error', None)
        
        save_phone_query(
            db=db_session,
            phone=phone,
            result=result_dict,
            success=success,
            error=error_msg
        )
        
        # Cache the result
        save_cache(
            db=db_session,
            query=phone,
            query_type="phone",
            result_data=result_dict
        )
        
        # Log search
        log_search(db_session, request.phone, "phone", 1)
        
        logger.info(f"✅ Phone query completed for: {request.phone}")
        return result_dict
    except Exception as e:
        logger.error(f"❌ Error querying phone {request.phone}: {str(e)}")
        error_result = {
            "success": False,
            "phone": request.phone,
            "error": f"Internal error: {str(e)}"
        }
        save_phone_query(
            db=db_session,
            phone=request.phone,
            result={},
            success=False,
            error=str(e)
        )
        return error_result

# 已移除：/phone/lookup3008 独立路由（不再使用）


# ==================== Telegram Username Query ====================

@api_router.get("/telegram/username/{username}")
async def query_telegram_username(username: str, timeout: int = 30):
    """按用户名查询 Telegram 信息（用于获取高清头像等）"""
    try:
        from apis import query_telegram_by_username
        result = await query_telegram_by_username(username, timeout=timeout)
        return result
    except Exception as e:
        logger.error(f"❌ Error querying Telegram username {username}: {str(e)}")
        return {"success": False, "username": username, "error": str(e)}


# ==================== Logo Proxy Endpoint ====================

@api_router.get("/logo/{domain}")
async def get_logo(domain: str):
    """Fetch platform logo via same-origin proxy to display authentic brand icons.
    Tries Clearbit first, then falls back to /favicon.ico on the target domain.
    """
    try:
        dom = (domain or "").strip().lower()
        if dom.startswith("www."):
            dom = dom[4:]
        candidates = [
            # 1) Clearbit 品牌 Logo
            f"https://logo.clearbit.com/{dom}",
            # 2) 站点 favicon
            f"https://{dom}/favicon.ico",
            # 3) DuckDuckGo 图标服务（覆盖率更高）
            f"https://icons.duckduckgo.com/ip3/{dom}.ico",
        ]
        async with httpx.AsyncClient(timeout=5) as client:
            for url in candidates:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200 and resp.content:
                        media_type = resp.headers.get("Content-Type", "image/png")
                        return Response(content=resp.content, media_type=media_type)
                except Exception:
                    continue
        raise HTTPException(status_code=404, detail="Logo not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo fetch error: {str(e)}")


@api_router.get("/avatar")
async def get_avatar(url: str):
    """Proxy external avatar images through same-origin to avoid CSP/CORS/ORB issues.
    Only http/https schemes are allowed.
    """
    try:
        if not url or not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid URL")
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.content:
                media_type = resp.headers.get("Content-Type", "image/jpeg")
                return Response(content=resp.content, media_type=media_type)
        raise HTTPException(status_code=404, detail="Avatar not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Avatar fetch error: {str(e)}")


# ==================== Admin Routes ====================

def verify_admin_session(session_token: str, db: Session) -> dict:
    """验证管理员会话"""
    result = verify_session(db, session_token)
    logger.info(f"🔍 verify_admin_session - Token: {session_token[:20]}...")
    logger.info(f"🔍 verify_session result: {result}")
    logger.info(f"🔍 valid: {result.get('valid')}, is_admin: {result.get('is_admin')}")
    
    if not result.get('valid'):
        logger.warning(f"⚠️ Session not valid")
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    
    if not result.get('is_admin'):
        logger.warning(f"⚠️ User is not admin")
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    
    logger.info(f"✅ Admin session verified successfully")
    return result


@api_router.get("/admin/stats")
async def get_admin_stats(session_token: str = Query(...), db_session: Session = Depends(get_db)):
    """获取管理员统计数据"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        from db_operations import get_database_stats
        stats = get_database_stats(db_session)
        
        return {
            "success": True,
            "data": stats,
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


@api_router.get("/admin/users")
async def get_admin_users(session_token: str = Query(...), db_session: Session = Depends(get_db)):
    """获取所有用户列表"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        from db_operations import get_all_users
        users = get_all_users(db_session)
        
        user_list = []
        for user in users:
            user_list.append({
                "id": user.id,
                "username": user.username,
                "email": getattr(user, 'email', None),
                "points": getattr(user, 'points', 0),
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            })
        
        return {
            "success": True,
            "data": user_list,
            "message": f"Retrieved {len(user_list)} users"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching users: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch users"
        }


class UpdateUserRequest(BaseModel):
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    points: Optional[int] = None


@api_router.patch("/admin/users/{user_id}")
async def update_admin_user(
    user_id: int,
    request: UpdateUserRequest,
    session_token: str = Query(...),
    db_session: Session = Depends(get_db)
):
    """更新用户信息"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        from db_operations import (
            get_user_by_id,
            update_user_admin_status,
            update_user_active_status,
            update_user_points
        )
        
        user = get_user_by_id(db_session, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent admin from disabling themselves
        if verify_result.get('user_id') == user_id and request.is_active == False:
            raise HTTPException(status_code=400, detail="Cannot disable your own account")
        
        if request.is_admin is not None:
            update_user_admin_status(db_session, user_id, request.is_admin)
        
        if request.is_active is not None:
            update_user_active_status(db_session, user_id, request.is_active)

        if request.points is not None:
            update_user_points(db_session, user_id, int(request.points))
        
        return {
            "success": True,
            "message": "User updated successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error updating user: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to update user"
        }


@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(
    user_id: int,
    session_token: str = Query(...),
    db_session: Session = Depends(get_db)
):
    """删除用户"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        # Prevent admin from deleting themselves
        if verify_result.get('user_id') == user_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        from db_operations import delete_user
        success = delete_user(db_session, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": "User deleted successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error deleting user: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to delete user"
        }


# ==================== Points Management APIs ====================

@api_router.get("/admin/points/stats")
async def get_points_stats(session_token: str = Query(...), db_session: Session = Depends(get_db)):
    """获取积分统计数据"""
    try:
        verify_admin_session(session_token, db_session)
        
        from models import User
        from sqlalchemy import func
        
        # 计算积分统计
        total_points = db_session.query(func.sum(User.points)).scalar() or 0
        avg_points = db_session.query(func.avg(User.points)).scalar() or 0
        users_with_points = db_session.query(func.count(User.id)).filter(User.points > 0).scalar() or 0
        
        # 模拟数据（实际应该从交易记录表获取）
        stats = {
            "total_recharge": 1057,  # 累计充值
            "total_consumption": 10753,  # 累计消费
            "today_consumption": 17,  # 今日消费
            "total_rewards": 0,  # 累计奖励
            "total_points": int(total_points),  # 当前总积分
            "avg_points": round(float(avg_points), 2),  # 平均积分
            "users_with_points": users_with_points,  # 有积分的用户数
        }
        
        return {
            "success": True,
            "data": stats,
            "message": "Points statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching points stats: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch points statistics"
        }


@api_router.get("/admin/points/transactions")
async def get_points_transactions(
    session_token: str = Query(...),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db_session: Session = Depends(get_db)
):
    """获取积分交易记录"""
    try:
        verify_admin_session(session_token, db_session)
        
        # 模拟交易记录（实际应该从专门的交易记录表获取）
        transactions = [
            {
                "id": 1,
                "time": "2024-01-15 10:21:00",
                "user": "testuser",
                "user_id": 3,
                "delta": "+50",
                "type": "recharge",
                "reason": "Admin recharge",
                "balance": 50,
                "operator": "admin"
            },
            {
                "id": 2,
                "time": "2024-01-15 09:58:00",
                "user": "user2",
                "user_id": 5,
                "delta": "-1",
                "type": "consumption",
                "reason": "Phone search query: +13473553937",
                "balance": 4,
                "operator": "system"
            },
        ]
        
        # 应用分页
        paginated = transactions[offset:offset + limit]
        
        return {
            "success": True,
            "data": paginated,
            "total": len(transactions),
            "limit": limit,
            "offset": offset,
            "message": "Transactions retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching transactions: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch transactions"
        }


# ==================== Query Logs APIs ====================

@api_router.get("/admin/logs/queries")
async def get_query_logs(
    session_token: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    query_type: Optional[str] = Query(None),
    db_session: Session = Depends(get_db)
):
    """获取查询日志"""
    try:
        verify_admin_session(session_token, db_session)
        
        from models import SearchHistory
        from sqlalchemy import desc
        
        # 构建查询
        query = db_session.query(SearchHistory)
        
        if query_type:
            query = query.filter(SearchHistory.query_type == query_type)
        
        # 获取总数
        total = query.count()
        
        # 应用分页和排序
        logs = query.order_by(desc(SearchHistory.created_at)).offset(offset).limit(limit).all()
        
        log_list = []
        for log in logs:
            log_list.append({
                "id": log.id,
                "query": log.query,
                "query_type": log.query_type,
                "user_id": log.user_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })
        
        return {
            "success": True,
            "data": log_list,
            "total": total,
            "limit": limit,
            "offset": offset,
            "message": "Query logs retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching query logs: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch query logs"
        }


@api_router.get("/admin/logs/activities")
async def get_activity_logs(
    session_token: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db_session: Session = Depends(get_db)
):
    """获取活动日志"""
    try:
        verify_admin_session(session_token, db_session)
        
        from models import SearchHistory, User
        from sqlalchemy import desc
        
        # 获取最近的搜索活动
        searches = db_session.query(SearchHistory).order_by(desc(SearchHistory.created_at)).limit(limit).all()
        
        activities = []
        for search in searches:
            user = db_session.query(User).filter(User.id == search.user_id).first()
            username = user.username if user else "Unknown"
            
            activities.append({
                "id": search.id,
                "time": search.created_at.strftime("%Y-%m-%d %H:%M:%S") if search.created_at else "Unknown",
                "action": f"{username} queried {search.query_type}: {search.query}",
                "user": username,
                "user_id": search.user_id,
                "type": "query"
            })
        
        return {
            "success": True,
            "data": activities,
            "total": len(activities),
            "limit": limit,
            "offset": offset,
            "message": "Activity logs retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching activity logs: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch activity logs"
        }


# ==================== API Keys Management ====================

@api_router.get("/admin/apikeys")
async def get_api_keys(session_token: str = Query(...), db_session: Session = Depends(get_db)):
    """获取API密钥列表"""
    try:
        verify_admin_session(session_token, db_session)
        
        # 从配置文件读取API密钥（脱敏显示）
        from apis.config import (
            RAPIDAPI_KEY,
            OSINT_INDUSTRIES_API_KEY,
            IPQS_API_KEY,
            WHATSAPP_API_KEY,
            HIBP_API_KEY,
            TRUECALLER_RAPIDAPI_KEY,
            CALLER_ID_RAPIDAPI_KEY
        )
        
        def mask_key(key: str) -> str:
            """脱敏显示密钥"""
            if not key or len(key) < 8:
                return "Not configured"
            return f"{key[:8]}...{key[-4:]}"
        
        api_keys = [
            {
                "id": 1,
                "name": "OSINT Industries",
                "key": mask_key(OSINT_INDUSTRIES_API_KEY),
                "status": "active" if OSINT_INDUSTRIES_API_KEY and len(OSINT_INDUSTRIES_API_KEY) > 10 else "inactive",
                "usage": "Email queries",
                "last_used": "2024-01-15 10:30:00"
            },
            {
                "id": 2,
                "name": "RapidAPI (General)",
                "key": mask_key(RAPIDAPI_KEY),
                "status": "active" if RAPIDAPI_KEY and len(RAPIDAPI_KEY) > 10 else "inactive",
                "usage": "Multiple APIs",
                "last_used": "2024-01-15 10:25:00"
            },
            {
                "id": 3,
                "name": "IPQualityScore",
                "key": mask_key(IPQS_API_KEY),
                "status": "active" if IPQS_API_KEY and len(IPQS_API_KEY) > 10 else "inactive",
                "usage": "Phone validation",
                "last_used": "2024-01-15 10:20:00"
            },
            {
                "id": 4,
                "name": "WhatsApp API",
                "key": mask_key(WHATSAPP_API_KEY),
                "status": "active" if WHATSAPP_API_KEY and len(WHATSAPP_API_KEY) > 10 else "inactive",
                "usage": "WhatsApp verification",
                "last_used": "2024-01-15 10:15:00"
            },
            {
                "id": 5,
                "name": "Have I Been Pwned",
                "key": mask_key(HIBP_API_KEY),
                "status": "active" if HIBP_API_KEY and len(HIBP_API_KEY) > 10 else "inactive",
                "usage": "Breach detection",
                "last_used": "2024-01-15 10:10:00"
            },
            {
                "id": 6,
                "name": "Truecaller",
                "key": mask_key(TRUECALLER_RAPIDAPI_KEY),
                "status": "active" if TRUECALLER_RAPIDAPI_KEY and len(TRUECALLER_RAPIDAPI_KEY) > 10 else "inactive",
                "usage": "Phone lookup",
                "last_used": "2024-01-15 10:05:00"
            },
            {
                "id": 7,
                "name": "Caller ID",
                "key": mask_key(CALLER_ID_RAPIDAPI_KEY),
                "status": "active" if CALLER_ID_RAPIDAPI_KEY and len(CALLER_ID_RAPIDAPI_KEY) > 10 else "inactive",
                "usage": "Caller identification",
                "last_used": "2024-01-15 10:00:00"
            },
        ]
        
        active_count = sum(1 for key in api_keys if key["status"] == "active")
        
        return {
            "success": True,
            "data": api_keys,
            "total": len(api_keys),
            "active": active_count,
            "inactive": len(api_keys) - active_count,
            "message": "API keys retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching API keys: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch API keys"
        }


@api_router.get("/admin/apikeys/usage")
async def get_api_usage(
    session_token: str = Query(...),
    days: int = Query(7, ge=1, le=90),
    db_session: Session = Depends(get_db)
):
    """获取API使用统计"""
    try:
        verify_admin_session(session_token, db_session)
        
        from models import APIUsageLog
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # 计算日期范围
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # 查询API使用统计
        usage_stats = db_session.query(
            APIUsageLog.api_name,
            func.count(APIUsageLog.id).label('total_calls'),
            func.sum(func.cast(APIUsageLog.success, Integer)).label('successful_calls'),
            func.avg(APIUsageLog.response_time_ms).label('avg_response_time')
        ).filter(
            APIUsageLog.created_at >= start_date
        ).group_by(APIUsageLog.api_name).all()
        
        usage_list = []
        for stat in usage_stats:
            success_rate = (stat.successful_calls / stat.total_calls * 100) if stat.total_calls > 0 else 0
            usage_list.append({
                "api_name": stat.api_name,
                "total_calls": stat.total_calls,
                "successful_calls": stat.successful_calls or 0,
                "success_rate": round(success_rate, 2),
                "avg_response_time": round(stat.avg_response_time or 0, 2)
            })
        
        # 总计
        total_calls = sum(u["total_calls"] for u in usage_list)
        total_successful = sum(u["successful_calls"] for u in usage_list)
        
        return {
            "success": True,
            "data": usage_list,
            "summary": {
                "total_calls": total_calls,
                "successful_calls": total_successful,
                "success_rate": round((total_successful / total_calls * 100) if total_calls > 0 else 0, 2),
                "period_days": days
            },
            "message": "API usage statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching API usage: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch API usage statistics"
        }


# 创建用户请求模型
class CreateUserRequest(BaseModel):
    username: str
    password: str
    is_admin: Optional[bool] = False
    email: Optional[str] = None
    points: Optional[int] = 0

@api_router.post("/auth/create-user")
async def create_user_endpoint(
    request: CreateUserRequest,
    session_token: Optional[str] = Query(None),
    db_session: Session = Depends(get_db)
    ):
    """创建新用户（兼容当前前端，无需token；如提供token则校验管理员）"""
    try:
        # 如果提供了session_token，则必须是管理员
        if session_token:
            verify_admin_session(session_token, db_session)

        result = create_user(
            db_session,
            request.username,
            request.password,
            request.is_admin or False,
            email=request.email,
            points=request.points or 0
        )
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('message', 'Create user failed'))
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error creating user: {str(e)}")
        return {"success": False, "message": f"创建用户失败: {str(e)}"}


# Include the router in the main app
app.include_router(api_router)
app.include_router(linkedin_avatar_router)
app.include_router(logo_router)
app.include_router(google_router)
app.include_router(google_router)

# ==================== Person Summary (External Search) ====================
@app.get("/api/person/summary")
async def get_person_summary(phone: str, timeout: int = 30):
    """调用外部搜索服务并对返回的字段进行去重整合，输出个人信息摘要。"""
    try:
        result = await query_external_search(phone, timeout=timeout) if HAS_EXTERNAL_SEARCH else {"success": False, "error": "External search module not available"}
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Unknown error")}

        # external_search.py 返回 {"success": True, "data": {...}}
        # data 字段包含所有提取和整合的字段
        data = result.get("data") or {}
        
        # 计算数据源数量
        sources = data.get("sources", [])
        source_count = len(sources) if isinstance(sources, list) else 0
        
        # 如果没有sources字段，尝试从其他字段推断
        if source_count == 0:
            # 从total_sources或total_sources_checked获取
            source_count = data.get("total_sources") or data.get("total_sources_checked") or 0
        
        logger.info(f"📊 [PersonSummary] Extracted {len(data)} fields, {source_count} sources")
        
        return {
            "success": True,
            "phone": phone,
            "summary": data,  # data包含所有提取的字段
            "count": source_count,
            "raw": data,  # 保留完整数据
        }
    except Exception as e:
        logger.error(f"❌ [PersonSummary] Error: {str(e)}")
        return {"success": False, "error": str(e)}


# ==================== GPT-5 OSINT Data Analysis ====================
@app.post("/api/osint/gpt5-analyze")
async def analyze_osint_with_gpt5(
    results: List[Dict[str, Any]],
    query: str,
    main_person: Optional[str] = None
):
    """
    使用 GPT-5 分析 OSINT Industries 数据
    
    Args:
        results: OSINT Industries 返回的结果列表
        query: 查询的邮箱或电话
        main_person: 主要人物姓名（可选）
    
    Returns:
        AI 分析结果，包含提取的字段和摘要
    """
    try:
        from apis.gpt5_analyzer import analyze_osint_data_with_gpt5
        
        logger.info(f"🤖 [GPT-5 Analysis] Analyzing {len(results)} records for {query}")
        
        result = await analyze_osint_data_with_gpt5(results, query, main_person)
        
        if result.get("success"):
            logger.info(f"✅ [GPT-5 Analysis] Analysis completed successfully")
            return {
                "success": True,
                "query": query,
                "main_person": main_person,
                "analyzed_data": result.get("data"),
                "raw_response": result.get("raw_response")
            }
        else:
            logger.error(f"❌ [GPT-5 Analysis] Analysis failed: {result.get('error')}")
            return {
                "success": False,
                "error": result.get("error"),
                "raw_response": result.get("raw_response")
            }
    
    except Exception as e:
        logger.error(f"❌ [GPT-5 Analysis] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== Celery Task Status ====================
@app.get("/api/tasks/status")
async def get_task_status_endpoint(task_id: str):
    try:
        from celery_tasks import get_task_status
        return get_task_status(task_id)
    except Exception as e:
        logger.error(f"❌ [Tasks] Failed to get status for {task_id}: {str(e)}")
        return {"success": False, "error": str(e), "task_id": task_id}


# ==================== AI Analysis (ChatGPT) ====================
@app.get("/api/person/ai-analysis")
async def get_ai_analysis(phone: str, timeout: int = 120):
    """
    使用AI分析OSINT数据，提取主要人物资料
    
    流程:
    1. 调用外部搜索获取OSINT数据
    2. 使用ChatGPT API分析数据
    3. 提取结构化的人物档案
    """
    try:
        # 1. 获取OSINT数据
        logger.info(f"🔍 [AI Analysis] Step 1: Fetching OSINT data for {phone}")
        osint_result = await query_external_search(phone, timeout=60) if HAS_EXTERNAL_SEARCH else {"success": False, "error": "External search module not available"}
        
        if not osint_result.get("success"):
            return {
                "success": False,
                "error": f"Failed to fetch OSINT data: {osint_result.get('error', 'Unknown error')}"
            }
        
        osint_data = {
            "summary": osint_result.get("data", {})
        }
        
        # 2. 使用AI分析数据
        logger.info(f"🤖 [AI Analysis] Step 2: Analyzing data with ChatGPT")
        from apis.ai_analyzer import analyze_person_data, generate_person_summary
        
        ai_result = await analyze_person_data(osint_data)
        
        if not ai_result.get("success"):
            return {
                "success": False,
                "error": f"AI analysis failed: {ai_result.get('error', 'Unknown error')}",
                "osint_data": osint_data  # 返回原始数据以便调试
            }
        
        # 3. 生成简洁摘要
        person_profile = ai_result.get("person_profile", {})
        summary_text = await generate_person_summary(person_profile)
        
        logger.info(f"✅ [AI Analysis] Analysis completed successfully")
        
        return {
            "success": True,
            "phone": phone,
            "ai_analysis": ai_result.get("analysis"),  # AI的完整分析文本
            "person_profile": person_profile,  # 结构化的人物档案
            "summary": summary_text,  # 简洁的中文摘要
            "osint_data": osint_data,  # 原始OSINT数据
            "raw_response": ai_result.get("raw_response")  # ChatGPT原始响应
        }
        
    except Exception as e:
        logger.error(f"❌ [AI Analysis] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# ==================== Security Headers: Content-Security-Policy ====================
# 为前端构建（React）统一添加 CSP，允许 Mapbox/Esri、data/blob 资源，以及 mapbox-gl 需要的 unsafe-eval 与 worker/blob。
@app.middleware("http")
async def add_csp_headers(request, call_next):
    response = await call_next(request)
    csp = "; ".join([
        "default-src 'self'",
        # Mapbox 样式与事件上报、Esri 影像、同源接口
        "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://server.arcgisonline.com https://assets.emergent.sh https://unpkg.com https://d2adkz2s9zrlge.cloudfront.net http://127.0.0.1:8000 http://localhost:8000 http://47.253.47.192:8001",
        # 图片允许 data/blob 以及地图相关域、WhatsApp 头像、Facebook图片等
        "img-src 'self' data: blob: https://*.mapbox.com https://*.tiles.mapbox.com https://server.arcgisonline.com https://staticmap.openstreetmap.de https://cdn.simpleicons.org https://pps.whatsapp.net https://whatsapp-db.checkleaked.com https://avatars.githubusercontent.com https://graph.facebook.com https://*.fbcdn.net https://*.xx.fbcdn.net",
        # 样式允许行内（Tailwind/动态注入）以及 Mapbox CSS
        "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com https://cdn.jsdelivr.net",
        # 字体来源
        "font-src 'self' data: https://fonts.gstatic.com",
        # Mapbox GL 需要的 unsafe-eval（内部使用 new Function/worker bootstrap），谨慎开启
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://assets.emergent.sh https://unpkg.com https://d2adkz2s9zrlge.cloudfront.net https://cdn.jsdelivr.net",
        # 允许跨域 iframe 嵌入 Mapbox/OSM 预览 - 修复：添加所有Mapbox子域名
        "frame-src 'self' https://*.mapbox.com https://api.mapbox.com https://www.openstreetmap.org",
        # Web Worker 允许 blob:
        "worker-src 'self' blob:",
        # 媒体允许 data/blob
        "media-src 'self' data: blob:",
        # 禁用不必要对象资源
        "object-src 'none'",
    ])
    response.headers["Content-Security-Policy"] = csp
    # 其它安全头（可选）
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response

# CORS middleware - now allowing same-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://0.0.0.0:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        # Keep development ports for local development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Frontend dev server alternative port
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        # Additional dev port for current session
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        # Current active dev port
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for production (frontend build)
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    # Mount static assets (JS, CSS, images, etc.)
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="static")
    
    # Serve other static files (favicon, manifest, etc.)
    @app.get("/favicon.ico")
    async def favicon():
        from fastapi import Response
        favicon_path = FRONTEND_BUILD_DIR / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(favicon_path)
        # 返回 204 No Content，避免控制台 404 噪音
        return Response(status_code=204)
    
    @app.get("/manifest.json")
    async def manifest():
        manifest_path = FRONTEND_BUILD_DIR / "manifest.json"
        if manifest_path.exists():
            return FileResponse(manifest_path)
        raise HTTPException(status_code=404)
    
    @app.get("/logo192.png")
    async def logo192():
        logo_path = FRONTEND_BUILD_DIR / "logo192.png"
        if logo_path.exists():
            return FileResponse(logo_path)
        raise HTTPException(status_code=404)
    
    @app.get("/logo512.png")
    async def logo512():
        logo_path = FRONTEND_BUILD_DIR / "logo512.png"
        if logo_path.exists():
            return FileResponse(logo_path)
        raise HTTPException(status_code=404)
    
    # Catch-all route for React Router (SPA support)
    # This must be the last route to avoid conflicts with API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """
        Serve the React app for all non-API routes.
        This enables client-side routing to work properly.
        """
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend build not found. Please run 'yarn build' in the frontend directory.")
    
    logger.info(f"✅ Serving frontend from: {FRONTEND_BUILD_DIR}")
else:
    logger.warning(f"⚠️ Frontend build directory not found at: {FRONTEND_BUILD_DIR}")
    logger.warning("⚠️ Please run 'yarn build' in the frontend directory to enable single-port deployment")

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting OSINT API server...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

