"""
OSINT Deep API
综合数据泄露和社交媒体信息查询
返回: 邮箱泄露、社交媒体账户、数据库泄露信息
"""
import httpx
import logging
from typing import Dict, Any
from .config import LONG_TIMEOUT

logger = logging.getLogger(__name__)


async def query_osint_deep_phone(phone: str, timeout: int = LONG_TIMEOUT) -> Dict[str, Any]:
    """
    OSINT Deep: 综合数据泄露和社交媒体信息查询
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 综合OSINT数据
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        # 使用 OSINT Deep Vercel API (原始API)
        url = "https://osint-deep.vercel.app/api/search"
        params = {
            "request": "phone",
            "number": phone
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        logger.info(f"🔍 [OSINT Deep] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                # 处理和格式化返回数据
                if data.get('success', False):
                    processed_data = {
                        "phone": phone,
                        "keywords": data.get('keywords', []),
                        "data_leaks": data.get('data', {}).get('results', []),
                        "leak_databases": data.get('data', {}).get('List', {}),
                        "summary": {
                            "total_leaks": len(data.get('data', {}).get('results', [])),
                            "database_count": len(data.get('data', {}).get('List', {})),
                            "has_email_leaks": any('email' in str(k).lower() for k in data.get('keywords', []))
                        }
                    }
                    
                    logger.info(f"✅ [OSINT Deep] 查询成功 - 发现 {processed_data['summary']['total_leaks']} 个泄露记录")
                    return {
                        "success": True,
                        "data": processed_data,
                        "source": "osint_deep"
                    }
                else:
                    logger.info(f"📊 [OSINT Deep] 无泄露数据")
                    return {
                        "success": True,
                        "data": {
                            "phone": phone,
                            "message": "未发现相关数据泄露信息",
                            "clean_status": True
                        },
                        "source": "osint_deep"
                    }
            else:
                error_msg = f"Status {response.status_code}"
                logger.warning(f"⚠️ [OSINT Deep] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "osint_deep"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [OSINT Deep] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "osint_deep"
        }