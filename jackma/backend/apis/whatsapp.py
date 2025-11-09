"""
WhatsApp API (CheckLeaked)
WhatsApp账户验证、头像获取
"""
import httpx
import logging
import base64
from typing import Dict, Any
from .config import WHATSAPP_API_KEY, WHATSAPP_RAPIDAPI_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def download_image_as_base64(url: str, timeout: int = 30) -> str:
    """
    下载图片并转换为Base64编码
    
    Args:
        url: 图片URL
        timeout: 超时时间
        
    Returns:
        Base64编码的图片字符串，格式: data:image/jpeg;base64,xxx
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            if response.status_code == 200:
                # 获取内容类型
                content_type = response.headers.get('content-type', 'image/jpeg')
                # 转换为Base64
                image_base64 = base64.b64encode(response.content).decode('utf-8')
                # 返回Data URL格式
                return f"data:{content_type};base64,{image_base64}"
            else:
                logger.warning(f"⚠️ [WhatsApp] 头像下载失败: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"❌ [WhatsApp] 头像下载异常: {str(e)}")
        return None


async def query_whatsapp(phone: str, timeout: int = 60) -> Dict[str, Any]:
    """
    WhatsApp API: Account Verification
    WhatsApp账户验证、头像获取（Base64编码）
    
    Args:
        phone: 电话号码（格式：14403828826，不带+号）
        timeout: 超时时间（秒），默认60秒
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - WhatsApp账户信息（头像已转换为Base64）
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    # Normalize phone
    clean_phone = (phone or "").replace('+', '').replace('-', '').replace(' ', '')
    
    # 1) Try RapidAPI WhatsApp Data (whatsapp-data1.p.rapidapi.com) - Most comprehensive
    rapidapi_key = WHATSAPP_RAPIDAPI_KEY or '09088adf21msh374858f106c99a2p1b9addjsn5d8c3e3ae117'
    if rapidapi_key:
        try:
            headers = {
                'x-rapidapi-host': 'whatsapp-data1.p.rapidapi.com',
                'x-rapidapi-key': rapidapi_key
            }
            url = f"https://whatsapp-data1.p.rapidapi.com/number/{clean_phone}"
            logger.info(f"🔍 [WhatsApp] RapidAPI WhatsApp Data for {clean_phone}")
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                payload = resp.json()
                # Normalize fields for frontend
                carrier = payload.get('carrierData', {})
                data = {
                    'phone': payload.get('phone') or payload.get('number') or clean_phone,
                    'number': payload.get('number') or clean_phone,
                    'isUser': payload.get('isUser', False),
                    'isWAContact': payload.get('isWAContact', False),
                    'whatsapp_found': payload.get('isUser', False) or payload.get('exists', False),
                    'profilePicUrl': payload.get('profilePic') or payload.get('urlImage'),
                    'id': payload.get('id', {}),
                    'countryCode': payload.get('countryCode', ''),
                    'type': payload.get('type', ''),
                    'about': payload.get('about', ''),
                    'aboutSetAt': payload.get('aboutSetAt'),
                    'image_status': payload.get('image_status'),
                    'aboutHistory': payload.get('aboutHistory') or [],
                    'pictureHistory': payload.get('pictureHistory') or [],
                    'date': payload.get('date'),
                    'fbLeak': payload.get('fbLeak'),
                    'isBusiness': payload.get('isBusiness', False),
                    'isVerified': payload.get('isVerified', False),
                    'isEnterprise': payload.get('isEnterprise', False),
                    'isBlocked': payload.get('isBlocked', False),
                    'md5Image': payload.get('md5Image'),
                    # Face analysis data
                    'faceAnalysis': payload.get('faceAnalysis'),
                    # Carrier data
                    'carrierData': carrier,
                    'carrierCountry': carrier.get('country'),
                    'carrierLocation': carrier.get('location'),
                    'carrierLineType': carrier.get('lineType'),
                    'carrierValid': carrier.get('valid'),
                    'carrierFormatted': carrier.get('formatted'),
                    'rawResponse': payload,
                }
                logger.info(f"✅ [WhatsApp] RapidAPI success: isUser={data['isUser']}, faceAnalysis={bool(data.get('faceAnalysis'))}")
                return { 'success': True, 'data': data, 'source': 'whatsapp' }
            else:
                logger.warning(f"⚠️ [WhatsApp] RapidAPI HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ [WhatsApp] RapidAPI error: {e}")
    
    # 2) Try CheckLeaked proxy as fallback
    api_key = WHATSAPP_API_KEY
    if api_key:
        try:
            headers = { 'x-rapidapi-key': api_key }
            url = f"https://whatsapp-proxy.checkleaked.cc/number/{clean_phone}"
            logger.info(f"🔍 [WhatsApp] CheckLeaked proxy for {clean_phone}")
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                payload = resp.json()
                # Normalize fields for frontend
                data = {
                    'phone': payload.get('phone') or payload.get('number') or clean_phone,
                    'number': payload.get('number') or clean_phone,
                    'isUser': payload.get('isUser', False),
                    'isWAContact': payload.get('isWAContact', False),
                    'whatsapp_found': payload.get('isUser', False),
                    'profilePicUrl': payload.get('profilePic') or payload.get('urlImage'),
                    'id': payload.get('id', {}),
                    'countryCode': payload.get('countryCode', ''),
                    'type': payload.get('type', ''),
                    'about': payload.get('about', ''),
                    'aboutSetAt': payload.get('aboutSetAt'),
                    'image_status': payload.get('image_status'),
                    'aboutHistory': payload.get('aboutHistory') or [],
                    'pictureHistory': payload.get('pictureHistory') or [],
                    'date': payload.get('date'),
                    'fbLeak': payload.get('fbLeak'),
                    'rawResponse': payload,
                }
                logger.info(f"✅ [WhatsApp] CheckLeaked success: isUser={data['isUser']}")
                return { 'success': True, 'data': data, 'source': 'whatsapp' }
            else:
                logger.warning(f"⚠️ [WhatsApp] CheckLeaked HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ [WhatsApp] CheckLeaked error: {e}")

    # 3) Fallback to internal endpoint
    max_retries = 2
    retry_count = 0
    while retry_count <= max_retries:
        try:
            url = "http://47.253.47.192:8088/api/osint/phone"
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "OSINT-Tracker/1.0"
            }
            payload = { "phone": clean_phone, "device": "business", "use_proxy": True }
            if retry_count > 0:
                logger.info(f"🔄 [WhatsApp] Retry {retry_count}/{max_retries} - {clean_phone}")
            else:
                logger.info(f"🔍 [WhatsApp] Fallback query {clean_phone}")
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                api_response = response.json()
                if api_response.get('success') and api_response.get('best_result'):
                    best_result = api_response['best_result']
                    result_data = best_result.get('data', {})
                    has_whatsapp = result_data.get('hasWhatsapp', False)
                    phone_number = result_data.get('phone_number', clean_phone)
                    device_type = result_data.get('device_type', 'unknown')
                    data = {
                        'phone': phone_number,
                        'number': phone_number,
                        'isUser': has_whatsapp,
                        'hasWhatsapp': has_whatsapp,
                        'whatsapp_found': has_whatsapp,
                        'deviceType': device_type,
                        'deviceOS': result_data.get('device_os', ''),
                        'type': device_type,
                        'countryCode': result_data.get('country_code', ''),
                        'language': result_data.get('language', ''),
                        'locale': result_data.get('locale', ''),
                        'processingTime': best_result.get('processing_time', 0),
                        'timestamp': best_result.get('timestamp', ''),
                        'rawResponse': result_data
                    }
                    logger.info(f"✅ [WhatsApp] Fallback success - hasWhatsapp: {has_whatsapp}")
                    return { "success": True, "data": data, "source": "whatsapp" }
                else:
                    error_msg = api_response.get('error', 'Unknown error from API')
                    logger.warning(f"⚠️ [WhatsApp] Fallback API failed: {error_msg}")
                    return { "success": False, "error": error_msg, "source": "whatsapp" }
            elif response.status_code == 404:
                data = response.json()
                logger.info(f"📱 [WhatsApp] Fallback 404 - account not found")
                return { "success": True, "data": data, "source": "whatsapp" }
            else:
                if response.status_code >= 500:
                    error_msg = f"Server error {response.status_code}"
                    return { "success": False, "error": error_msg, "source": "whatsapp", "status_code": response.status_code }
                if retry_count < max_retries:
                    retry_count += 1
                    continue
                return { "success": False, "error": f"HTTP {response.status_code}", "source": "whatsapp", "status_code": response.status_code }
        except httpx.ReadTimeout:
            if retry_count < max_retries:
                retry_count += 1
                logger.warning(f"⚠️ [WhatsApp] Timeout, retry {retry_count}/{max_retries}")
                continue
            return { "success": False, "error": "ReadTimeout", "source": "whatsapp" }
        except Exception as e:
            if retry_count < max_retries:
                retry_count += 1
                logger.warning(f"⚠️ [WhatsApp] Exception, retry {retry_count}/{max_retries}: {e}")
                continue
            logger.error(f"❌ [WhatsApp] Exception: {e}")
            return { "success": False, "error": str(e), "source": "whatsapp" }
    return { "success": False, "error": "All retry attempts failed", "source": "whatsapp" }
