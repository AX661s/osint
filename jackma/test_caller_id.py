#!/usr/bin/env python3
import asyncio
import sys
import os

# 添加后端路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from apis.caller_id import query_caller_id

async def test_caller_id():
    phone = '+14403828826'
    print(f"🔍 测试 Caller ID API - 电话: {phone}")
    
    try:
        result = await query_caller_id(phone)
        print(f"\n✅ Caller ID 结果:")
        print(f"Success: {result.get('success')}")
        print(f"Source: {result.get('source')}")
        
        if result.get('success'):
            import json
            print(f"数据结构:")
            print(json.dumps(result.get('data', {}), indent=2, ensure_ascii=False))
        else:
            print(f"❌ 错误: {result.get('error')}")
    except Exception as e:
        print(f"❌ 异常: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_caller_id())
