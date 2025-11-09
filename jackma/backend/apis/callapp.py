"""
CallApp API
来电显示、用户信息查询
返回: 用户名、头像、社交媒体资料、企业信息
"""
import httpx
import logging
from typing import Dict, Any
from .config import DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

# CallApp API配置
CALLAPP_API_KEY = "b491571bafmsh04f7fa840b92045p1a8db2jsn4c5d1dbd653d"
CALLAPP_HOST = "callapp.p.rapidapi.com"


async def query_callapp(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    CallApp: 来电显示和用户信息查询
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 用户信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = "https://callapp.p.rapidapi.com/api/v1/search"
        
        # 提取国家代码和号码
        clean_phone = phone.lstrip('+')
        if clean_phone.startswith('1'):
            country_code = '1'
            number = clean_phone[1:]
        else:
            country_code = '1'  # 默认美国
            number = clean_phone
            
        headers = {
            'x-rapidapi-host': CALLAPP_HOST,
            'x-rapidapi-key': CALLAPP_API_KEY
        }
        
        params = {
            'code': country_code,
            'number': number
        }
        
        logger.info(f"🔍 [CallApp] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [CallApp] 查询成功")
                return {
                    "success": True,
                    "data": data,
                    "source": "callapp"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [CallApp] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "callapp"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [CallApp] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "callapp"
        }