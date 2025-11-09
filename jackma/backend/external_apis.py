"""
External API integrations for OSINT data gathering
"""
import httpx
import os
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# API Keys
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', 'b491571bafmsh04f7fa840b92045p1a8db2jsn4c5d1dbd653d')
CALLER_ID_RAPIDAPI_KEY = os.environ.get('CALLER_ID_RAPIDAPI_KEY', '59b6ae749emsh27b3fc9269cda7dp170a62jsndd963e55c2fc')
IPQS_API_KEY = os.environ.get('IPQS_API_KEY', '1AiiTsegJdCbtGuxUtSIluBmEEnRLJdK')
WHATSAPP_API_KEY = os.environ.get('WHATSAPP_API_KEY', '6cfb089b-e8ed-4b64-9536-5d7f99dfdf28')
HIBP_API_KEY = os.environ.get('HIBP_API_KEY', '9fc63c67d4bc450db92b0a67da9cbd0d')
OSINT_INDUSTRIES_API_KEY = os.environ.get('OSINT_INDUSTRIES_API_KEY', '74f8eefa65ae3b910f2655977a2dae1c')


class PhoneQueryResult(BaseModel):
    success: bool
    phone: str
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class EmailQueryResult(BaseModel):
    success: bool
    email: str
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


# ==================== Phone Number APIs ====================

async def query_social_media_scanner(phone: str, timeout: int = 15) -> Dict[str, Any]:
    """
    RapidAPI: Social Media Scanner
    检查电话号码在社交媒体平台的存在性
    """
    try:
        url = "https://social-media-scanner1.p.rapidapi.com/check"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "social-media-scanner1.p.rapidapi.com",
            "Content-Type": "application/json"
        }
        payload = {
            "programs": ["facebook", "twitter", "instagram", "linkedin"],
            "input": phone
        }
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "social_media_scanner"}
            else:
                logger.error(f"Social Media Scanner error: {response.status_code}")
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"Social Media Scanner error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_caller_id(phone: str, timeout: int = 15) -> Dict[str, Any]:
    """
    RapidAPI: Caller ID (Eyecon)
    来电显示和社交搜索
    """
    try:
        url = "https://caller-id-social-search-eyecon.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": CALLER_ID_RAPIDAPI_KEY,
            "x-rapidapi-host": "caller-id-social-search-eyecon.p.rapidapi.com"
        }
        params = {"mobile_number": phone}
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "caller_id"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"Caller ID error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_truecaller(phone: str, timeout: int = 15) -> Dict[str, Any]:
    """
    RapidAPI: Truecaller
    电话号码详细信息查询
    返回: 姓名、运营商、位置、垃圾评分
    """
    try:
        url = "https://truecaller4.p.rapidapi.com/api/v1/getDetails"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "truecaller4.p.rapidapi.com"
        }
        params = {"phone": phone}
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "truecaller"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"Truecaller error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_ipqualityscore(phone: str, timeout: int = 15) -> Dict[str, Any]:
    """
    IPQualityScore: Phone Number Validation
    电话号码质量评分、欺诈检测
    返回: 有效性、活跃状态、运营商、风险评分
    """
    try:
        url = f"https://www.ipqualityscore.com/api/json/phone/{IPQS_API_KEY}/{phone}"
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "ipqualityscore"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"IPQualityScore error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_whatsapp(phone: str, timeout: int = 15) -> Dict[str, Any]:
    """
    WhatsApp (CheckLeaked): Account Verification
    WhatsApp账户验证、头像获取
    """
    try:
        phone_formatted = f"{phone}@s.whatsapp.net"
        url = f"https://whatsapp-proxy.checkleaked.cc/"
        headers = {"apikey": WHATSAPP_API_KEY}
        params = {
            "jid": phone_formatted,
            "fetchProfilePicture": "true"
        }
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "whatsapp"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"WhatsApp error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_osint_deep_phone(phone: str, timeout: int = 30) -> Dict[str, Any]:
    """
    OSINT Deep: Free Phone OSINT
    免费电话号码OSINT数据
    """
    try:
        url = "https://osint.rest/phone"
        params = {"query": phone}
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "osint_deep"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"OSINT Deep error: {str(e)}")
        return {"success": False, "error": str(e)}


# ==================== Email APIs ====================

async def query_hibp(email: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Have I Been Pwned: Breached Account Check
    邮箱数据泄露查询
    """
    try:
        url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}"
        headers = {"hibp-api-key": HIBP_API_KEY, "User-Agent": "OSINT-Tracker"}
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "source": "hibp"}
            elif response.status_code == 404:
                return {"success": True, "data": [], "source": "hibp", "message": "No breaches found"}
            else:
                return {"success": False, "error": f"Status {response.status_code}"}
    except Exception as e:
        logger.error(f"HIBP error: {str(e)}")
        return {"success": False, "error": str(e)}


async def query_osint_industries(query: str, query_type: str = "email", timeout: int = 110) -> Dict[str, Any]:
    """
    OSINT Industries: Comprehensive OSINT Query
    综合OSINT数据查询（支持邮箱和电话）
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
        
        logger.info(f"🔍 Calling OSINT Industries API for {query_type}: {query}")
        logger.debug(f"API Key: {OSINT_INDUSTRIES_API_KEY[:8]}...{OSINT_INDUSTRIES_API_KEY[-4:] if len(OSINT_INDUSTRIES_API_KEY) > 12 else '***'}")
        
        # 使用110秒客户端超时
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=15.0)) as client:
            response = await client.get(url, params=params, headers=headers)
            logger.info(f"📡 OSINT Industries Response: Status {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"✅ OSINT Industries Success: {len(str(response_data))} chars")
                return {"success": True, "data": response_data, "source": "osint_industries"}
            else:
                error_msg = f"Status {response.status_code}: {response.text[:200]}"
                logger.warning(f"⚠️ OSINT Industries Error: {error_msg}")
                return {"success": False, "error": error_msg}
    except httpx.TimeoutException as e:
        error_msg = f"API timeout after {timeout}s"
        logger.error(f"⏱️ OSINT Industries Timeout: {error_msg}")
        return {"success": False, "error": error_msg}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ OSINT Industries Exception: {error_msg}")
        return {"success": False, "error": error_msg}


# ==================== Aggregated Query Functions ====================

async def query_phone_comprehensive(phone: str) -> PhoneQueryResult:
    """
    Comprehensive phone number query using multiple APIs
    """
    try:
        results = []
        
        # Run all phone APIs in parallel
        import asyncio
        tasks = [
            query_social_media_scanner(phone),
            query_caller_id(phone),
            query_truecaller(phone),
            query_ipqualityscore(phone),
            query_whatsapp(phone),
            query_osint_deep_phone(phone),
        ]
        
        api_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in api_results:
            if isinstance(result, dict) and result.get("success"):
                results.append(result)
        
        return PhoneQueryResult(
            success=len(results) > 0,
            phone=phone,
            data=results
        )
    except Exception as e:
        logger.error(f"Comprehensive phone query error: {str(e)}")
        return PhoneQueryResult(
            success=False,
            phone=phone,
            error=str(e)
        )


async def query_email_comprehensive(email: str) -> EmailQueryResult:
    """
    Email query using OSINT Industries API only
    仅使用 OSINT Industries API 进行邮箱查询
    """
    try:
        logger.info(f"📧 Starting email query for: {email}")
        
        # 检查 API 密钥是否配置
        if not OSINT_INDUSTRIES_API_KEY or len(OSINT_INDUSTRIES_API_KEY) < 10:
            error_msg = "OSINT Industries API key is not configured. Please add it to the .env file."
            logger.error(f"❌ {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                error=error_msg
            )
        
        # 调用 OSINT Industries API (110秒超时)
        result = await query_osint_industries(email, query_type="email", timeout=110)
        
        if result.get("success"):
            logger.info(f"✅ Email query successful for: {email}")
            return EmailQueryResult(
                success=True,
                email=email,
                data=[result]
            )
        else:
            error_msg = result.get("error", "Unknown error")
            
            # 如果是 401 错误,提供更详细的说明
            if "401" in str(error_msg):
                error_msg = "API Authentication Failed (401). The API key may be invalid, expired, or the account may have reached its usage limit. Please check your OSINT Industries account at https://osint.industries/"
            
            logger.warning(f"⚠️ Email query failed for {email}: {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                error=error_msg
            )
    except Exception as e:
        logger.error(f"❌ Email query exception for {email}: {str(e)}")
        return EmailQueryResult(
            success=False,
            email=email,
            error=str(e)
        )
