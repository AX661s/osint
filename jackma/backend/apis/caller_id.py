"""
Caller ID API (RapidAPI - Eyecon)
来电显示和社交搜索
"""
import httpx
import logging
from typing import Dict, Any
from .config import CALLER_ID_RAPIDAPI_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_caller_id(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    RapidAPI: Caller ID (Eyecon)
    来电显示和社交搜索
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 来电显示信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = "https://caller-id-social-search-eyecon.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": CALLER_ID_RAPIDAPI_KEY,
            "x-rapidapi-host": "caller-id-social-search-eyecon.p.rapidapi.com"
        }
        # 尝试不同的参数格式（有些实现不接受加号或不同参数名）
        digits = ''.join(ch for ch in phone if ch.isdigit())
        candidates = [
            {"phone": digits},
            {"phone": f"+{digits}"},
            {"mobile_number": digits},
        ]
        
        logger.info(f"🔍 [Caller ID] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = None
            for params in candidates:
                try:
                    response = await client.get(url, headers=headers, params=params)
                    if response.status_code == 200:
                        break
                except Exception:
                    continue

            if response and response.status_code == 200:
                payload = response.json() or {}
                info = payload.get("data", {}) or {}
                fb = info.get("fb", {}) or {}

                # 规范化为统一展示结构，便于 ResultsPage 显示头像与链接
                normalized = {
                    # 平台识别与展示名
                    "module": "caller_id",
                    "platform_name": "Facebook",
                    # 优先用于头像/链接展示的规格化数组
                    "spec_format": [{
                        "name": info.get("name") or None,
                        "profile_url": fb.get("profile_url") or None,
                        "image_url": fb.get("image_url") or None,
                        "id": fb.get("fb") or None,
                    }],
                    # 摘要数据（含原始响应供调试/扩展）
                    "data": {
                        "name": info.get("name") or None,
                        "profile_url": fb.get("profile_url") or None,
                        "image_url": fb.get("image_url") or None,
                        "facebook_id": fb.get("fb") or None,
                        "raw": payload,
                    },
                }

                logger.info("✅ [Caller ID] 查询成功，已规范化返回字段用于前端展示")
                return {
                    "success": True,
                    "data": normalized,
                    "source": "caller_id"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [Caller ID] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [Caller ID] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
