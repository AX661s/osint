"""
Truecaller API (RapidAPI)
电话号码详细信息查询
返回: 姓名、运营商、位置、垃圾评分
"""
import httpx
import logging
from typing import Dict, Any
from .config import TRUECALLER_RAPIDAPI_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_truecaller(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    RapidAPI: Truecaller
    电话号码详细信息查询
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 电话号码详细信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        # 使用自托管的 Truecaller 服务
        url = "http://47.253.47.192:8080/query"
        headers = {
            "Content-Type": "application/json"
        }
        # 修复：API需要 "phone_number" 参数
        # 确保电话号码格式正确: +1XXXXXXXXXX (无空格)
        clean_phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not clean_phone.startswith('+'):
            # 如果没有国家代码,假设是美国号码
            if clean_phone.startswith('1') and len(clean_phone) == 11:
                formatted_phone = f"+{clean_phone}"
            else:
                formatted_phone = f"+1{clean_phone}"
        else:
            formatted_phone = clean_phone
        
        payload = {
            "phone_number": formatted_phone
        }
        
        logger.info(f"📞 [Truecaller] Formatted phone: {formatted_phone}")
        
        logger.info(f"🔍 [Truecaller] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Truecaller] 查询成功")
                return {
                    "success": True,
                    "data": data,
                    "source": "truecaller"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [Truecaller] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "truecaller"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [Truecaller] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "truecaller"
        }
