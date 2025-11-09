"""
SQLite Database Models using SQLAlchemy ORM
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, create_engine, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database configuration
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./osint_tracker.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# ==================== Authentication Models ====================

class User(Base):
    """用户账户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    # 新增字段：邮箱与积分
    email = Column(String(255), index=True, nullable=True)
    points = Column(Integer, default=0)
    is_admin = Column(Boolean, default=False)  # 管理员标志
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(username='{self.username}', is_admin={self.is_admin})>"


class LoginSession(Base):
    """用户登录会话表"""
    __tablename__ = "login_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    username = Column(String(50), index=True, nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    is_admin = Column(Boolean, default=False)  # 缓存管理员标志用于快速查询
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, index=True, nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<LoginSession(user_id={self.user_id}, username='{self.username}')>"


# ==================== Query Models ====================

class EmailQuery(Base):
    """邮箱查询记录表"""
    __tablename__ = "email_queries"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, unique=True)
    query_result = Column(Text)  # JSON string
    success = Column(Boolean, default=False)
    error_message = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<EmailQuery(email='{self.email}', success={self.success})>"


class PhoneQuery(Base):
    """手机号查询记录表"""
    __tablename__ = "phone_queries"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), index=True, unique=True)
    query_result = Column(Text)  # JSON string
    success = Column(Boolean, default=False)
    error_message = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<PhoneQuery(phone='{self.phone}', success={self.success})>"


class SearchHistory(Base):
    """搜索历史记录表"""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), index=True)
    query_type = Column(String(20))  # 'email' or 'phone'
    user_id = Column(Integer, index=True, nullable=True)  # 添加user_id字段
    results_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<SearchHistory(query='{self.query}', type='{self.query_type}')>"


class APIUsageLog(Base):
    """API 使用日志表"""
    __tablename__ = "api_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    api_name = Column(String(50), index=True)  # 'hibp', 'osint_industries', 'truecaller', etc.
    endpoint = Column(String(255))
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=False)
    error_message = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<APIUsageLog(api='{self.api_name}', status={self.status_code})>"


class CachedResult(Base):
    """缓存查询结果表"""
    __tablename__ = "cached_results"

    id = Column(Integer, primary_key=True, index=True)
    query_hash = Column(String(64), unique=True, index=True)  # MD5/SHA256 of query
    query_type = Column(String(20))  # 'email' or 'phone'
    result_data = Column(Text)  # JSON string
    expires_at = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<CachedResult(type='{self.query_type}', expires_at='{self.expires_at}')>"


# ==================== Database Initialization ====================

def init_db():
    """初始化数据库 - 创建所有表，并确保新增列存在"""
    Base.metadata.create_all(bind=engine)

    # 对SQLite进行兼容性迁移，确保新增列存在
    try:
        if "sqlite" in DATABASE_URL:
            with engine.connect() as conn:
                # 获取users表现有列
                res = conn.exec_driver_sql("PRAGMA table_info(users)")
                existing_cols = [row[1] for row in res]
                # 补充缺失的email列
                if 'email' not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
                # 补充缺失的points列，默认0
                if 'points' not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0")
                
                # 获取search_history表现有列
                res = conn.exec_driver_sql("PRAGMA table_info(search_history)")
                existing_cols = [row[1] for row in res]
                # 补充缺失的user_id列
                if 'user_id' not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE search_history ADD COLUMN user_id INTEGER")
                    print("✅ Added user_id column to search_history table")
    except Exception as e:
        print(f"⚠️ Schema migration skipped or failed: {e}")

    print("✅ Database initialized successfully!")


def get_db():
    """获取数据库会话 - 用于 FastAPI 依赖注入"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    # 直接运行此文件来初始化数据库
    init_db()
