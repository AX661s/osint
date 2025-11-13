#!/usr/bin/env python3
import asyncio
import sys
import os

# 添加后端路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from apis.aggregator import query_phone_comprehensive

async def test_full_search():
    phone = '+14403828826'
    print(f"🔍 测试完整电话搜索 - 电话: {phone}")
    
    try:
        result = await query_phone_comprehensive(phone)
        print(f"\n✅ 搜索结果:")
        print(f"Success: {result.success}")
        print(f"Phone: {result.phone}")
        print(f"总API数量: {len(result.data) if result.data else 0}")
        
        if result.data:
            for i, api_result in enumerate(result.data):
                source = api_result.get('source', 'unknown')
                success = api_result.get('success', False)
                print(f"\n📊 API {i+1} - {source}:")
                print(f"  Success: {success}")
                
                if source == 'telegram_complete' and success:
                    data = api_result.get('data', {})
                    if data.get('telegram_found'):
                        user_info = data.get('user_info', {})
                        print(f"  ✅ 找到Telegram账户!")
                        print(f"  用户名: {user_info.get('username')}")
                        print(f"  显示名: {user_info.get('display_name')}")
                        print(f"  头像: {user_info.get('avatar_url')}")
                        print(f"  高清头像: {user_info.get('avatar_url_hd')}")
                    else:
                        print(f"  ❌ 未找到Telegram账户")
                elif not success:
                    print(f"  ❌ 错误: {api_result.get('error', '未知错误')}")
                else:
                    print(f"  ℹ️  其他API结果")
    except Exception as e:
        print(f"❌ 异常: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_full_search())