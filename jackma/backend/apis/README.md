# API模块说明

## 📁 目录结构

```
backend/apis/
├── __init__.py              # 模块入口，导出所有API函数
├── config.py                # API配置和密钥管理
├── models.py                # 数据模型定义
├── aggregator.py            # API聚合器，整合多个API结果
│
├── osint_industries.py      # OSINT Industries API（综合查询）
├── hibp.py                  # Have I Been Pwned API（邮箱泄露查询）
│
├── social_media_scanner.py  # 社交媒体扫描API
├── caller_id.py             # 来电显示API
├── truecaller.py            # Truecaller API
├── ipqualityscore.py        # IP质量评分API
├── whatsapp.py              # WhatsApp验证API
└── osint_deep.py            # OSINT Deep免费API
```

## 🎯 设计优势

### 1. **模块化设计**
- ✅ 每个API都是独立的文件
- ✅ 易于维护和调试
- ✅ 可以单独测试每个API

### 2. **集中配置管理**
- ✅ 所有API密钥在 `config.py` 统一管理
- ✅ 超时时间可配置
- ✅ 环境变量自动加载

### 3. **标准化接口**
- ✅ 所有API函数返回相同格式的字典
- ✅ 包含 `success`, `data`, `source`, `error` 字段
- ✅ 易于聚合和处理结果

### 4. **完善的日志**
- ✅ 每个API都有独立的日志标识
- ✅ 使用emoji便于快速识别
- ✅ 记录成功、失败和异常信息

## 📝 使用示例

### 导入API

```python
# 导入单个API
from apis.osint_industries import query_osint_industries
from apis.hibp import query_hibp

# 或者从模块导入
from apis import query_email_comprehensive, query_phone_comprehensive
```

### 调用单个API

```python
# 查询邮箱（OSINT Industries）
result = await query_osint_industries("test@example.com", query_type="email")
if result["success"]:
    print(f"数据来源: {result['source']}")
    print(f"数据: {result['data']}")
else:
    print(f"错误: {result['error']}")

# 查询HIBP
result = await query_hibp("test@example.com")
if result["success"]:
    print(f"发现 {len(result['data'])} 个数据泄露事件")
```

### 调用综合查询

```python
# 邮箱综合查询
email_result = await query_email_comprehensive("test@example.com")
print(f"成功: {email_result.success}")
print(f"数据: {email_result.data}")

# 电话综合查询（并行查询多个API）
phone_result = await query_phone_comprehensive("+1234567890")
print(f"成功的API数量: {len(phone_result.data)}")
```

## 🔧 添加新的API

要添加新的API，只需创建一个新文件：

```python
# backend/apis/new_api.py
import httpx
import logging
from typing import Dict, Any
from .config import NEW_API_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

async def query_new_api(query: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    新API的说明
    
    Args:
        query: 查询内容
        timeout: 超时时间
        
    Returns:
        Dict包含 success, data, source, error
    """
    try:
        url = "https://api.example.com/endpoint"
        headers = {"api-key": NEW_API_KEY}
        
        logger.info(f"🔍 [New API] 查询: {query}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"✅ [New API] 查询成功")
                return {
                    "success": True,
                    "data": response.json(),
                    "source": "new_api"
                }
            else:
                logger.warning(f"⚠️ [New API] 错误: {response.status_code}")
                return {
                    "success": False,
                    "error": f"Status {response.status_code}"
                }
    except Exception as e:
        logger.error(f"❌ [New API] 异常: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

然后在 `__init__.py` 中导出：

```python
from .new_api import query_new_api

__all__ = [
    # ... 现有的导出
    'query_new_api',
]
```

## 🧪 测试单个API

创建测试脚本：

```python
# test_single_api.py
import asyncio
from apis.osint_industries import query_osint_industries

async def test():
    result = await query_osint_industries("test@example.com", "email")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"Data: {result['data']}")
    else:
        print(f"Error: {result['error']}")

asyncio.run(test())
```

## 📊 API返回格式

所有API函数返回统一的字典格式：

```python
{
    "success": bool,      # 是否成功
    "data": dict/list,    # 返回的数据（成功时）
    "source": str,        # 数据来源标识
    "error": str,         # 错误信息（失败时）
    "message": str        # 额外信息（可选）
}
```

## 🔑 配置API密钥

在 `backend/.env` 文件中添加：

```env
OSINT_INDUSTRIES_API_KEY=your_key_here
HIBP_API_KEY=your_key_here
RAPIDAPI_KEY=your_key_here
CALLER_ID_RAPIDAPI_KEY=your_key_here
IPQS_API_KEY=your_key_here
WHATSAPP_API_KEY=your_key_here
```

## 📈 性能优化

### 并行查询
`aggregator.py` 使用 `asyncio.gather()` 并行执行多个API调用：

```python
tasks = [
    query_api1(query),
    query_api2(query),
    query_api3(query),
]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

### 超时控制
每个API都有独立的超时设置：
- `DEFAULT_TIMEOUT = 15` 秒（大多数API）
- `LONG_TIMEOUT = 30` 秒（较慢的API）
- `OSINT_INDUSTRIES_TIMEOUT = 110` 秒（需要长时间处理的API）

## 🐛 调试技巧

### 启用详细日志
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 查看API响应
```python
logger.debug(f"API响应: {response.text}")
```

### 测试单个API
```bash
python -c "import asyncio; from apis.osint_industries import query_osint_industries; print(asyncio.run(query_osint_industries('test@example.com', 'email')))"
```

## 📚 相关文档

- [API密钥配置](../API_KEYS_SETUP.md)
- [API文档](../API_DOCUMENTATION.md)
- [快速启动指南](../QUICKSTART.md)
