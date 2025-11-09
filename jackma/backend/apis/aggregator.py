"""
API聚合器
整合多个API的查询结果
"""
import asyncio
import logging
from typing import List, Dict, Any
from .models import PhoneQueryResult, EmailQueryResult
from .osint_industries import query_osint_industries
from .hibp import query_hibp
from .social_media_scanner import query_social_media_scanner
from .caller_id import query_caller_id
from .truecaller import query_truecaller
from .ipqualityscore import query_ipqualityscore
from .whatsapp import query_whatsapp
# from .osint_deep import query_osint_deep_phone  # 已删除
from .callapp import query_callapp
from .microsoft_phone import query_microsoft_phone
from .phone_lookup import query_phone_lookup
from .data_breach import query_data_breach
from .telegram_complete import query_telegram_complete
from .investigate_api import query_investigate_api
from .phone_lookup import query_phone_lookup
from .telegram_complete import query_telegram_complete
from .investigate_api import query_investigate_api
from .external_lookup import query_external_lookup
from .config import OSINT_INDUSTRIES_API_KEY

logger = logging.getLogger(__name__)


async def query_phone_comprehensive(phone: str) -> PhoneQueryResult:
    """
    综合电话号码查询（使用多个API）
    
    Args:
        phone: 电话号码
        
    Returns:
        PhoneQueryResult: 包含所有成功API的结果
    """
    try:
        logger.info(f"📞 开始综合电话查询: {phone}")
        results = []
        
        # 为 WhatsApp API 设置独立的超时包装
        async def query_whatsapp_with_timeout(phone: str, timeout: int = 45):
            """WhatsApp API 带超时控制"""
            try:
                return await asyncio.wait_for(query_whatsapp(phone), timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning(f"⚠️ [WhatsApp] 查询超时 ({timeout}秒)")
                return {
                    "success": False,
                    "error": f"Query timeout after {timeout} seconds",
                    "source": "whatsapp"
                }
        
        # 并行运行所有电话API（包括新的 Investigate API、Data Breach API 和 External Lookup API）
        tasks = [
            query_social_media_scanner(phone),
            query_caller_id(phone), 
            query_truecaller(phone),
            query_ipqualityscore(phone),
            query_whatsapp_with_timeout(phone, timeout=45),  # 使用带超时的版本
            # query_osint_deep_phone(phone),  # 已删除
            query_callapp(phone),
            query_microsoft_phone(phone),
            query_phone_lookup(phone),
            query_telegram_complete(phone),
            query_investigate_api(phone, timeout=120),  # 新增：Investigate API（120秒超时）
            query_data_breach(phone, timeout=120),  # 新增：Data Breach API（120秒超时）
            query_external_lookup(phone, mode="medium", timeout=120),  # 新增：External Lookup API（120秒超时）
        ]
        
        api_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 收集所有结果（包括失败的）
        for result in api_results:
            if isinstance(result, dict):
                # 添加所有结果，不管成功与否
                results.append(result)
            elif isinstance(result, Exception):
                # 如果有异常，转换为失败结果
                results.append({
                    "success": False,
                    "data": None,
                    "error": str(result),
                    "source": "unknown"
                })
        
        successful_count = len([r for r in results if r.get("success", False)])
        logger.info(f"✅ 电话查询完成: {successful_count}/{len(results)} 个API返回成功")
        
        return PhoneQueryResult(
            success=len(results) > 0,
            phone=phone,
            data=results if results else None,
            error=None if results else "所有API查询均失败"
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 综合电话查询异常: {error_msg}")
        return PhoneQueryResult(
            success=False,
            phone=phone,
            data=None,
            error=error_msg
        )


async def query_email_comprehensive(email: str) -> EmailQueryResult:
    """
    综合邮箱查询（仅使用 OSINT Industries API）
    
    Args:
        email: 邮箱地址
        
    Returns:
        EmailQueryResult: 查询结果
    """
    try:
        logger.info(f"📧 开始邮箱查询: {email}")
        
        # 检查 API 密钥是否配置
        if not OSINT_INDUSTRIES_API_KEY or len(OSINT_INDUSTRIES_API_KEY) < 10:
            error_msg = "OSINT Industries API key 未配置。请在 .env 文件中添加 OSINT_INDUSTRIES_API_KEY。"
            logger.error(f"❌ {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                data=None,
                error=error_msg
            )
        
        # 调用 OSINT Industries API
        result = await query_osint_industries(email, query_type="email")
        
        if result.get("success"):
            logger.info(f"✅ 邮箱查询成功: {email}")
            return EmailQueryResult(
                success=True,
                email=email,
                data=[result],
                error=None
            )
        else:
            error_msg = result.get("error", "未知错误")
            
            # 如果是 401 错误，提供更详细的说明
            if "401" in str(error_msg):
                error_msg = "API认证失败 (401)。API密钥可能无效、过期，或账户已达到使用限制。请检查您的 OSINT Industries 账户: https://osint.industries/"
            
            logger.warning(f"⚠️ 邮箱查询失败 {email}: {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                data=None,
                error=error_msg
            )
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 邮箱查询异常 {email}: {error_msg}")
        return EmailQueryResult(
            success=False,
            email=email,
            data=None,
            error=error_msg
        )
