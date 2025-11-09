"""
GHunt API 封装模块
提供统一的GHunt查询接口
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


async def query_ghunt_email(email: str, timeout: int = 120) -> Dict[str, Any]:
    """
    使用GHunt查询Google账户信息
    
    Args:
        email: 邮箱地址
        timeout: 超时时间（秒）
    
    Returns:
        查询结果字典
    """
    try:
        # 导入GHunt服务
        from ghunt_service import run_ghunt_email_python, is_ghunt_authenticated
        
        # 检查GHunt是否已认证
        if not is_ghunt_authenticated():
            logger.warning("⚠️ [GHunt] Not authenticated, skipping query")
            return {
                "success": False,
                "source": "ghunt",
                "error": "GHunt not authenticated. Run 'ghunt login' first.",
                "authenticated": False
            }
        
        logger.info(f"🔎 [GHunt] Querying email: {email}")
        
        # 执行查询
        result = run_ghunt_email_python(email, timeout=timeout)
        
        if result.get("success"):
            logger.info(f"✅ [GHunt] Query successful for: {email}")
        else:
            logger.warning(f"⚠️ [GHunt] Query failed for {email}: {result.get('error')}")
        
        return result
        
    except ImportError as e:
        logger.error(f"❌ [GHunt] Import error: {str(e)}")
        return {
            "success": False,
            "source": "ghunt",
            "error": f"GHunt module not found: {str(e)}. Install with: pip install ghunt"
        }
    except Exception as e:
        logger.error(f"❌ [GHunt] Unexpected error: {str(e)}")
        return {
            "success": False,
            "source": "ghunt",
            "error": f"GHunt query error: {str(e)}"
        }


def format_ghunt_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    格式化GHunt返回的数据，提取关键信息
    
    Args:
        raw_data: GHunt原始数据
    
    Returns:
        格式化后的数据
    """
    if not raw_data or not isinstance(raw_data, dict):
        return {}
    
    formatted = {
        "source": "ghunt",
        "platform": "Google",
    }
    
    # 提取基本信息
    if "name" in raw_data:
        formatted["name"] = raw_data["name"]
    
    if "gaia_id" in raw_data:
        formatted["gaia_id"] = raw_data["gaia_id"]
    
    if "profile_pic" in raw_data or "profile_picture" in raw_data:
        formatted["avatar"] = raw_data.get("profile_pic") or raw_data.get("profile_picture")
    
    # 提取服务列表
    if "services" in raw_data and isinstance(raw_data["services"], list):
        formatted["services"] = raw_data["services"]
    
    # 提取最后编辑时间
    if "last_edit" in raw_data:
        formatted["last_edit"] = raw_data["last_edit"]
    
    # 提取其他可用信息
    for key in ["email", "phone", "location", "bio", "url"]:
        if key in raw_data and raw_data[key]:
            formatted[key] = raw_data[key]
    
    return formatted


async def query_ghunt_with_fallback(email: str, timeout: int = 120) -> Dict[str, Any]:
    """
    带降级的GHunt查询
    如果GHunt不可用，返回友好的错误信息而不是抛出异常
    
    Args:
        email: 邮箱地址
        timeout: 超时时间
    
    Returns:
        查询结果
    """
    try:
        result = await query_ghunt_email(email, timeout)
        
        # 如果查询成功，格式化数据
        if result.get("success") and result.get("data"):
            formatted_data = format_ghunt_data(result["data"])
            result["formatted_data"] = formatted_data
        
        return result
    except Exception as e:
        logger.error(f"❌ [GHunt] Fallback error: {str(e)}")
        return {
            "success": False,
            "source": "ghunt",
            "error": f"GHunt unavailable: {str(e)}",
            "fallback": True
        }
