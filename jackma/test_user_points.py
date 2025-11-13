#!/usr/bin/env python3
import asyncio
import sys
import os

# 添加后端路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from models import User, SessionLocal

def test_user_points():
    """测试数据库中用户的积分"""
    db = SessionLocal()
    try:
        # 查找ceshi001用户
        user = db.query(User).filter(User.username == 'ceshi001').first()
        if user:
            print(f"✅ 找到用户: {user.username}")
            print(f"  用户ID: {user.id}")
            print(f"  邮箱: {user.email}")
            print(f"  积分: {user.points}")
            print(f"  管理员: {user.is_admin}")
            print(f"  活跃: {user.is_active}")
            print(f"  创建时间: {user.created_at}")
        else:
            print("❌ 找不到用户 ceshi001")
            # 列出所有用户
            print("\n现有用户:")
            all_users = db.query(User).all()
            for u in all_users:
                print(f"  - {u.username} (积分: {u.points})")
    finally:
        db.close()

if __name__ == "__main__":
    test_user_points()
