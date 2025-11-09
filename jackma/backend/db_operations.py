"""
Database operations helper functions
"""
import json
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import (
    EmailQuery,
    PhoneQuery,
    SearchHistory,
    APIUsageLog,
    CachedResult,
)
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


# ==================== Email Query Operations ====================

def save_email_query(db: Session, email: str, result: Dict[str, Any], success: bool = True, error: str = None):
    """保存或更新邮箱查询结果"""
    try:
        # 检查是否已存在
        existing = db.query(EmailQuery).filter(EmailQuery.email == email).first()
        
        if existing:
            # 更新现有记录
            existing.query_result = json.dumps(result)
            existing.success = success
            existing.error_message = error
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"✅ Email query updated: {email}")
            return existing
        else:
            # 创建新记录
            db_query = EmailQuery(
                email=email,
                query_result=json.dumps(result),
                success=success,
                error_message=error
            )
            db.add(db_query)
            db.commit()
            db.refresh(db_query)
            logger.info(f"✅ Email query saved: {email}")
            return db_query
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving email query: {str(e)}")
        raise


def get_email_query(db: Session, email: str) -> Optional[EmailQuery]:
    """获取邮箱查询记录"""
    return db.query(EmailQuery).filter(EmailQuery.email == email).first()


def get_email_query_history(db: Session, limit: int = 10) -> list:
    """获取邮箱查询历史"""
    return db.query(EmailQuery).order_by(EmailQuery.created_at.desc()).limit(limit).all()


# ==================== Phone Query Operations ====================

def save_phone_query(db: Session, phone: str, result: Dict[str, Any], success: bool = True, error: str = None):
    """保存或更新手机号查询结果"""
    try:
        # 检查是否已存在
        existing = db.query(PhoneQuery).filter(PhoneQuery.phone == phone).first()
        
        if existing:
            # 更新现有记录
            existing.query_result = json.dumps(result)
            existing.success = success
            existing.error_message = error
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"✅ Phone query updated: {phone}")
            return existing
        else:
            # 创建新记录
            db_query = PhoneQuery(
                phone=phone,
                query_result=json.dumps(result),
                success=success,
                error_message=error
            )
            db.add(db_query)
            db.commit()
            db.refresh(db_query)
            logger.info(f"✅ Phone query saved: {phone}")
            return db_query
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving phone query: {str(e)}")
        raise


def get_phone_query(db: Session, phone: str) -> Optional[PhoneQuery]:
    """获取手机号查询记录"""
    return db.query(PhoneQuery).filter(PhoneQuery.phone == phone).first()


def get_phone_query_history(db: Session, limit: int = 10) -> list:
    """获取手机号查询历史"""
    return db.query(PhoneQuery).order_by(PhoneQuery.created_at.desc()).limit(limit).all()


# ==================== Search History Operations ====================

def log_search(db: Session, query: str, query_type: str, results_count: int = 0):
    """记录搜索历史"""
    try:
        history = SearchHistory(
            query=query,
            query_type=query_type,
            results_count=results_count
        )
        db.add(history)
        db.commit()
        logger.info(f"✅ Search logged: {query_type} - {query}")
        return history
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error logging search: {str(e)}")


def get_search_history(db: Session, query_type: Optional[str] = None, limit: int = 50) -> list:
    """获取搜索历史"""
    query = db.query(SearchHistory)
    if query_type:
        query = query.filter(SearchHistory.query_type == query_type)
    return query.order_by(SearchHistory.created_at.desc()).limit(limit).all()


# ==================== API Usage Log Operations ====================

def log_api_call(
    db: Session,
    api_name: str,
    endpoint: str,
    status_code: int,
    response_time_ms: int,
    success: bool = True,
    error: str = None
):
    """记录 API 调用"""
    try:
        log = APIUsageLog(
            api_name=api_name,
            endpoint=endpoint,
            status_code=status_code,
            response_time_ms=response_time_ms,
            success=success,
            error_message=error
        )
        db.add(log)
        db.commit()
        logger.debug(f"✅ API call logged: {api_name} - {status_code}")
        return log
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error logging API call: {str(e)}")


def get_api_usage_stats(db: Session, api_name: str, hours: int = 24) -> Dict[str, Any]:
    """获取 API 使用统计"""
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    logs = db.query(APIUsageLog).filter(
        APIUsageLog.api_name == api_name,
        APIUsageLog.created_at >= time_threshold
    ).all()

    if not logs:
        return {
            "api_name": api_name,
            "total_calls": 0,
            "success_count": 0,
            "error_count": 0,
            "avg_response_time_ms": 0
        }

    total_calls = len(logs)
    success_count = sum(1 for log in logs if log.success)
    error_count = total_calls - success_count
    avg_response_time = sum(log.response_time_ms for log in logs) / total_calls

    return {
        "api_name": api_name,
        "total_calls": total_calls,
        "success_count": success_count,
        "error_count": error_count,
        "avg_response_time_ms": round(avg_response_time, 2),
        "success_rate": round((success_count / total_calls * 100), 2)
    }


# ==================== Cache Operations ====================

def generate_query_hash(query: str, query_type: str) -> str:
    """生成查询哈希值"""
    query_string = f"{query_type}:{query}"
    return hashlib.sha256(query_string.encode()).hexdigest()


def save_cache(db: Session, query: str, query_type: str, result_data: Dict[str, Any], ttl_hours: int = 24):
    """保存缓存结果"""
    try:
        query_hash = generate_query_hash(query, query_type)
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)

        # 检查是否已存在
        existing = db.query(CachedResult).filter(CachedResult.query_hash == query_hash).first()
        if existing:
            existing.result_data = json.dumps(result_data)
            existing.expires_at = expires_at
            db.commit()
        else:
            cache = CachedResult(
                query_hash=query_hash,
                query_type=query_type,
                result_data=json.dumps(result_data),
                expires_at=expires_at
            )
            db.add(cache)
            db.commit()

        logger.info(f"✅ Cache saved: {query_type} - {query}")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving cache: {str(e)}")


def get_cache(db: Session, query: str, query_type: str) -> Optional[Dict[str, Any]]:
    """获取缓存结果"""
    try:
        query_hash = generate_query_hash(query, query_type)
        cache = db.query(CachedResult).filter(
            CachedResult.query_hash == query_hash,
            CachedResult.expires_at > datetime.utcnow()
        ).first()

        if cache:
            logger.info(f"✅ Cache hit: {query_type} - {query}")
            return json.loads(cache.result_data)
        
        logger.info(f"❌ Cache miss or expired: {query_type} - {query}")
        return None
    except Exception as e:
        logger.error(f"❌ Error retrieving cache: {str(e)}")
        return None


def clear_expired_cache(db: Session):
    """清理过期缓存"""
    try:
        db.query(CachedResult).filter(CachedResult.expires_at <= datetime.utcnow()).delete()
        db.commit()
        logger.info("✅ Expired cache cleared")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error clearing cache: {str(e)}")


# ==================== Statistics ====================

def get_database_stats(db: Session) -> Dict[str, Any]:
    """获取数据库统计信息"""
    from models import User, LoginSession
    import os
    
    # Get database file size
    db_file = os.path.join(os.path.dirname(__file__), 'osint_tracker.db')
    db_size = 0
    if os.path.exists(db_file):
        db_size = os.path.getsize(db_file) / (1024 * 1024)  # Convert to MB
    
    return {
        "total_email_queries": db.query(EmailQuery).count(),
        "total_phone_queries": db.query(PhoneQuery).count(),
        "total_searches": db.query(SearchHistory).count(),
        "total_api_calls": db.query(APIUsageLog).count(),
        "cached_results": db.query(CachedResult).filter(
            CachedResult.expires_at > datetime.utcnow()
        ).count(),
        "successful_email_queries": db.query(EmailQuery).filter(EmailQuery.success == True).count(),
        "successful_phone_queries": db.query(PhoneQuery).filter(PhoneQuery.success == True).count(),
        "total_users": db.query(User).count(),
        "active_sessions": db.query(LoginSession).filter(LoginSession.is_active == True).count(),
        "database_size_mb": round(db_size, 2),
    }


# ==================== User Management ====================

def get_all_users(db: Session) -> list:
    """获取所有用户列表"""
    from models import User
    return db.query(User).order_by(User.created_at.desc()).all()


def get_user_by_id(db: Session, user_id: int):
    """按ID获取用户"""
    from models import User
    return db.query(User).filter(User.id == user_id).first()


def delete_user(db: Session, user_id: int) -> bool:
    """删除用户"""
    from models import User, LoginSession
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Delete associated sessions
        db.query(LoginSession).filter(LoginSession.user_id == user_id).delete()
        
        # Delete the user
        db.delete(user)
        db.commit()
        logger.info(f"✅ User deleted: {user.username} (ID: {user_id})")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting user: {str(e)}")
        raise


def update_user_admin_status(db: Session, user_id: int, is_admin: bool) -> bool:
    """更新用户管理员状态"""
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_admin = is_admin
        user.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ User admin status updated: {user.username} -> is_admin={is_admin}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user admin status: {str(e)}")
        raise


def update_user_active_status(db: Session, user_id: int, is_active: bool) -> bool:
    """更新用户活跃状态"""
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_active = is_active
        user.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ User active status updated: {user.username} -> is_active={is_active}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user active status: {str(e)}")
        raise


def update_user_points(db: Session, user_id: int, points: int) -> bool:
    """更新用户积分"""
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.points = int(points or 0)
        user.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ User points updated: {user.username} -> points={user.points}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user points: {str(e)}")
        raise
