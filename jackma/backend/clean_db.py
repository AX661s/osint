"""
清理数据库中的重复邮箱记录
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'osint_tracker.db')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 删除email_queries表中的所有记录
    cursor.execute("DELETE FROM email_queries")
    
    # 删除phone_queries表中的所有记录  
    cursor.execute("DELETE FROM phone_queries")
    
    # 删除search_history表中的所有记录
    cursor.execute("DELETE FROM search_history")
    
    # 删除cached_results表中的所有记录
    cursor.execute("DELETE FROM cached_results")
    
    conn.commit()
    print("✅ 数据库清理成功!")
    print(f"   - 已清空 email_queries 表")
    print(f"   - 已清空 phone_queries 表")
    print(f"   - 已清空 search_history 表")
    print(f"   - 已清空 cached_results 表")
    
except Exception as e:
    print(f"❌ 清理失败: {str(e)}")
finally:
    if conn:
        conn.close()
