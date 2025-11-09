"""
IPQualityScore API
电话号码质量评分、欺诈检测
返回: 有效性、活跃状态、运营商、风险评分
"""
import httpx
import logging
from typing import Dict, Any
from .config import IPQS_API_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_ipqualityscore(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    IPQualityScore: Phone Number Validation
    电话号码质量评分、欺诈检测
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 电话号码质量评分信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        url = f"https://www.ipqualityscore.com/api/json/phone/{IPQS_API_KEY}/{phone}"
        
        logger.info(f"🔍 [IPQualityScore] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # 检查是否返回了配额错误
                if isinstance(data, dict) and data.get('message'):
                    message = data.get('message', '')
                    if 'exceeded your request quota' in message or 'quota' in message.lower():
                        logger.warning(f"⚠️ [IPQualityScore] 配额已达上限: {message}")
                        return {
                            "success": True,  # 仍然返回成功，但包含错误信息
                            "data": {
                                **data,
                                "status": "quota_exceeded",
                                "error_type": "quota_limit"
                            },
                            "source": "ipqualityscore"
                        }
                
                logger.info(f"✅ [IPQualityScore] 查询成功")
                return {
                    "success": True,
                    "data": data,
                    "source": "ipqualityscore"
                }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [IPQualityScore] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [IPQualityScore] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
