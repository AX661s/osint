"""
Have I Been Pwned API
邮箱数据泄露查询
文档: https://haveibeenpwned.com/API/v3
"""
import httpx
import logging
from typing import Dict, Any
from .config import HIBP_API_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_hibp(email: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Have I Been Pwned: Breached Account Check
    查询邮箱是否出现在数据泄露事件中
    
    Args:
        email: 邮箱地址
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: list - 泄露事件列表
        - source: str - 数据来源标识
        - message: str - 额外信息
        - error: str - 错误信息（如果失败）
    """
    try:
        url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
        headers = {
            "hibp-api-key": HIBP_API_KEY,
            "User-Agent": "OSINT-Tracker"
        }
        
        logger.info(f"🔍 [HIBP] 查询邮箱: {email}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [HIBP] 发现 {len(data)} 个泄露事件")
                return {
                    "success": True,
                    "data": data,
                    "source": "hibp"
                }
            elif response.status_code == 404:
                logger.info(f"✅ [HIBP] 未发现数据泄露")
                return {
                    "success": True,
                    "data": [],
                    "source": "hibp",
                    "message": "No breaches found"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [HIBP] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [HIBP] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
