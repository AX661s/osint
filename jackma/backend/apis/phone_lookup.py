"""
Phone Lookup API (自建)
详细电话查询、用户信息
返回: SUSAN ABAZIA 等详细用户信息
"""
import httpx
import logging
from typing import Dict, Any
from .config import DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_phone_lookup(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Phone Lookup API: 自建电话查询服务
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 详细用户信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = "http://47.253.47.192:3000/api/v1/phone-lookup"
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        # 清理电话号码
        clean_phone = phone.lstrip('+')
        
        data = {
            'phone_number': clean_phone
        }
        
        logger.info(f"🔍 [Phone Lookup] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"✅ [Phone Lookup] 查询成功")
                return {
                    "success": True,
                    "data": response_data,
                    "source": "phone_lookup"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [Phone Lookup] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "phone_lookup"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [Phone Lookup] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "phone_lookup"
        }