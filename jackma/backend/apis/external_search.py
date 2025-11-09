import httpx
import asyncio
from typing import Any, Dict

# 使用 OSINT Deep Vercel API
BASE_URL = "https://osint-deep.vercel.app/api/search"

# 字段别名映射：把常见变体统一成标准键
FIELD_ALIASES = {
    "city": ["city", "town", "locality", "settlement"],
    "state": ["state", "region", "province", "state_province"],
    "country": ["country", "country_code", "nation"],
    "email": ["email", "emails", "mail", "e_mail"],
    "phone": ["phone", "phones", "mobile", "tel", "telephone"],
    "name": ["name", "full_name", "display_name", "first_name", "last_name"],
    "gender": ["gender", "sex"],
    "dob": ["dob", "birthday", "birth_date", "date_of_birth"],
    "lat": ["lat", "latitude"],
    "lon": ["lon", "lng", "longitude"],
}

def normalize_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """将嵌套或别名字段扁平化并统一键名"""
    flat = {}
    def _flatten(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                _flatten(v, f"{prefix}{k}." if prefix else k)
        elif isinstance(obj, list) and obj and isinstance(obj[0], (str, int, float)):
            # 简单列表值直接加入
            flat[prefix.rstrip(".")] = obj
        elif prefix:
            flat[prefix.rstrip(".")] = obj
    _flatten(data)
    # 别名统一
    unified = {}
    for std_key, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in flat:
                unified[std_key] = flat.pop(alias)
                break
    unified.update(flat)  # 剩余字段保持原名
    return unified

async def query_external_search(request_value: str, timeout: int = 10) -> Dict[str, Any]:
    """带重试与字段归一化的外部搜索查询"""
    # 使用查询参数
    url = f"{BASE_URL}?request={request_value}"
    retries, delay = 3, 1
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                raw = resp.json()
                
                # 处理OSINT Deep API响应结构
                # 响应格式: {"success": true, "keywords": [...], "data": {"results": [], "List": {...}}}
                if isinstance(raw, dict) and raw.get("success"):
                    unified = {}
                    
                    # 1. 提取关键词（包含邮箱、电话等）
                    keywords = raw.get("keywords", [])
                    if keywords:
                        unified["keywords"] = keywords
                        unified["raw_keywords"] = keywords
                        
                        # 从关键词中提取邮箱和电话
                        import re
                        email_re = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.I)
                        phone_re = re.compile(r"^\+?\d[\d\-()\s]{5,}$")
                        emails = [k for k in keywords if isinstance(k, str) and email_re.match(k)]
                        phones = [k for k in keywords if isinstance(k, str) and phone_re.match(k)]
                        if emails:
                            unified["email"] = emails
                        if phones:
                            unified["phone"] = phones
                    
                    # 2. 处理数据源列表 (data.List)
                    data = raw.get("data", {})
                    data_list = data.get("List", {})
                    
                    if data_list and isinstance(data_list, dict):
                        # 收集所有数据源名称
                        source_names = list(data_list.keys())
                        unified["sources"] = source_names
                        unified["source_name"] = source_names
                        unified["total_sources"] = len(source_names)
                        unified["sources_with_results"] = len(source_names)
                        unified["total_sources_checked"] = len(source_names)
                        
                        # 提取所有记录并转换为字符串数组（保持原格式）
                        results = []
                        for source_name, source_data in data_list.items():
                            if isinstance(source_data, dict):
                                data_records = source_data.get("Data", [])
                                if isinstance(data_records, list) and data_records:
                                    # 将每个数据源的记录转换为字符串
                                    results.append(str(data_records))
                        
                        if results:
                            unified["results"] = results
                        
                        # 统计识别的实体数量
                        unified["identified_entities"] = len(keywords) if keywords else 0
                    
                    # 3. 添加时间戳
                    from datetime import datetime
                    unified["timestamp"] = datetime.utcnow().isoformat()
                    
                    return {"success": True, "data": unified}
                else:
                    # 旧格式或其他格式的兼容处理
                    unified = normalize_fields(raw) if isinstance(raw, dict) else {}
                    return {"success": True, "data": unified}
        except Exception as e:
            if attempt == retries:
                return {"success": False, "error": str(e)}
            await asyncio.sleep(delay * (2 ** (attempt - 1)))  # 指数退避
