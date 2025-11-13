#!/usr/bin/env python3
import asyncio
import sys
import os

# 添加后端路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from apis.telegram_complete import query_telegram_complete

async def test_telegram():
    phone = '+14403828826'
    print(f"🔍 测试 Telegram Complete API - 电话: {phone}")
    
    try:
        result = await query_telegram_complete(phone)
        print(f"\n✅ Telegram Complete 结果:")
        print(f"Success: {result.get('success')}")
        print(f"Source: {result.get('source')}")
        
        if result.get('success') and result.get('data'):
            data = result['data']
            print(f"找到账户: {data.get('telegram_found')}")
            if data.get('user_info'):
                user_info = data['user_info']
                print(f"用户名: {user_info.get('username')}")
                print(f"显示名称: {user_info.get('display_name')}")
                print(f"头像URL: {user_info.get('avatar_url')}")
                print(f"高清头像URL: {user_info.get('avatar_url_hd')}")
        else:
            print(f"❌ 错误: {result.get('error')}")
    except Exception as e:
        print(f"❌ 异常: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_telegram())