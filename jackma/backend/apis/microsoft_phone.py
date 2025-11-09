"""
Microsoft Phone Checker API
微软电话验证、企业账户检测
返回: 微软账户、Xbox、Skype、企业账户信息
"""
import httpx
import logging
from typing import Dict, Any
from .config import DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_microsoft_phone(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Microsoft Phone Checker: 微软电话验证
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 微软账户信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = "https://ms-roan-chi.vercel.app/api/check/phone"
        
        # 确保号码以+开头
        formatted_phone = phone if phone.startswith('+') else f'+{phone}'
        
        params = {
            'value': formatted_phone
        }
        
        logger.info(f"🔍 [Microsoft Phone] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Microsoft Phone] 查询成功")
                return {
                    "success": True,
                    "data": data,
                    "source": "microsoft_phone"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [Microsoft Phone] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "microsoft_phone"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [Microsoft Phone] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "microsoft_phone"
        }