"""
OSINT Industries API
综合OSINT数据查询（支持邮箱和电话）
文档: https://osint.industries/
"""
import httpx
import logging
from typing import Dict, Any
from .config import OSINT_INDUSTRIES_API_KEY, OSINT_INDUSTRIES_TIMEOUT

logger = logging.getLogger(__name__)


async def query_osint_industries(query: str, query_type: str = "email", timeout: int = OSINT_INDUSTRIES_TIMEOUT) -> Dict[str, Any]:
    """
    OSINT Industries: Comprehensive OSINT Query
    综合OSINT数据查询（支持邮箱和电话）
    
    Args:
        query: 查询内容（邮箱或电话）
        query_type: 查询类型 "email" 或 "phone"
        timeout: 超时时间（秒），默认110秒
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - API返回的数据
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = "https://api.osint.industries/v2/request"
        params = {
            "type": query_type,
            "query": query,
            "timeout": 100  # API 内部超时(100秒)
        }
        headers = {
            "accept": "application/json",
            "api-key": OSINT_INDUSTRIES_API_KEY
        }
        
        logger.info(f"🔍 [OSINT Industries] 查询 {query_type}: {query}")
        logger.debug(f"API Key: {OSINT_INDUSTRIES_API_KEY[:8]}...{OSINT_INDUSTRIES_API_KEY[-4:] if len(OSINT_INDUSTRIES_API_KEY) > 12 else '***'}")
        
        # 使用110秒客户端超时
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=15.0)) as client:
            response = await client.get(url, params=params, headers=headers)
            logger.info(f"📡 [OSINT Industries] 响应状态: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"✅ [OSINT Industries] 成功: {len(str(response_data))} 字符")
                return {
                    "success": True,
                    "data": response_data,
                    "source": "osint_industries"
                }
            else:
                error_msg = f"Status {response.status_code}: {response.text[:200]}"
                logger.warning(f"⚠️ [OSINT Industries] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
                
    except httpx.TimeoutException as e:
        error_msg = f"API timeout after {timeout}s"
        logger.error(f"⏱️ [OSINT Industries] 超时: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [OSINT Industries] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
