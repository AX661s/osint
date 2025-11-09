"""
Social Media Scanner API (RapidAPI)
检查电话号码在社交媒体平台的存在性
"""
import httpx
import logging
import asyncio
from typing import Dict, Any
from .config import RAPIDAPI_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_social_media_scanner(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    RapidAPI: Social Media Scanner
    检查电话号码在社交媒体平台的存在性
    
    增强功能:
    - 自动重试机制（最多3次）
    - 指数退避策略
    - 详细的错误日志
    - 超时保护
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 社交媒体账号信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    max_retries = 3
    base_delay = 1  # 基础延迟（秒）
    
    for attempt in range(max_retries):
        try:
            url = "https://social-media-scanner1.p.rapidapi.com/check"
            headers = {
                "x-rapidapi-key": RAPIDAPI_KEY,
                "x-rapidapi-host": "social-media-scanner1.p.rapidapi.com",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # 格式化电话号码
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            payload = {
                "input": formatted_phone
            }
            
            logger.info(f"🔍 [Social Media Scanner] 尝试 {attempt + 1}/{max_retries} - 查询电话: {formatted_phone}")
            
            # 使用更长的超时时间，因为这个 API 可能比较慢
            client_timeout = httpx.Timeout(timeout, connect=10.0)
            
            async with httpx.AsyncClient(timeout=client_timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                # 记录响应详情
                logger.info(f"📊 [Social Media Scanner] 状态码: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        logger.info(f"✅ [Social Media Scanner] 查询成功 - 数据类型: {type(data)}")
                        
                        # 验证返回数据
                        if data is None:
                            logger.warning(f"⚠️ [Social Media Scanner] 返回数据为空")
                            return {
                                "success": False,
                                "error": "API 返回空数据",
                                "source": "social_media_scanner"
                            }
                        
                        return {
                            "success": True,
                            "data": data,
                            "source": "social_media_scanner"
                        }
                    except Exception as json_error:
                        logger.error(f"❌ [Social Media Scanner] JSON 解析错误: {json_error}")
                        logger.error(f"📄 [Social Media Scanner] 原始响应: {response.text[:500]}")
                        
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt)
                            logger.info(f"⏳ [Social Media Scanner] {delay}秒后重试...")
                            await asyncio.sleep(delay)
                            continue
                        
                        return {
                            "success": False,
                            "error": f"JSON 解析失败: {str(json_error)}",
                            "source": "social_media_scanner"
                        }
                
                elif response.status_code == 429:
                    # 速率限制
                    logger.warning(f"⚠️ [Social Media Scanner] 速率限制 (429)")
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt) * 2  # 速率限制时等待更久
                        logger.info(f"⏳ [Social Media Scanner] 速率限制，{delay}秒后重试...")
                        await asyncio.sleep(delay)
                        continue
                    
                    return {
                        "success": False,
                        "error": "API 速率限制，请稍后再试",
                        "source": "social_media_scanner"
                    }
                
                elif response.status_code == 403:
                    # API 密钥问题
                    logger.error(f"❌ [Social Media Scanner] 认证失败 (403) - 请检查 API 密钥")
                    return {
                        "success": False,
                        "error": "API 认证失败，请检查密钥配置",
                        "source": "social_media_scanner"
                    }
                
                elif response.status_code >= 500:
                    # 服务器错误，可以重试
                    logger.warning(f"⚠️ [Social Media Scanner] 服务器错误 ({response.status_code})")
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.info(f"⏳ [Social Media Scanner] 服务器错误，{delay}秒后重试...")
                        await asyncio.sleep(delay)
                        continue
                    
                    return {
                        "success": False,
                        "error": f"服务器错误 (HTTP {response.status_code})",
                        "source": "social_media_scanner"
                    }
                
                else:
                    # 其他错误
                    error_msg = f"HTTP {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f": {error_detail}"
                    except:
                        error_msg += f": {response.text[:200]}"
                    
                    logger.error(f"❌ [Social Media Scanner] 错误: {error_msg}")
                    
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.info(f"⏳ [Social Media Scanner] {delay}秒后重试...")
                        await asyncio.sleep(delay)
                        continue
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "source": "social_media_scanner"
                    }
        
        except httpx.TimeoutException as e:
            logger.error(f"⏱️ [Social Media Scanner] 超时错误: {str(e)}")
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.info(f"⏳ [Social Media Scanner] 超时，{delay}秒后重试...")
                await asyncio.sleep(delay)
                continue
            
            return {
                "success": False,
                "error": f"请求超时（{timeout}秒）",
                "source": "social_media_scanner"
            }
        
        except httpx.ConnectError as e:
            logger.error(f"🔌 [Social Media Scanner] 连接错误: {str(e)}")
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.info(f"⏳ [Social Media Scanner] 连接失败，{delay}秒后重试...")
                await asyncio.sleep(delay)
                continue
            
            return {
                "success": False,
                "error": "无法连接到 API 服务器",
                "source": "social_media_scanner"
            }
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ [Social Media Scanner] 未知异常: {error_msg}")
            logger.exception(e)  # 记录完整堆栈跟踪
            
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.info(f"⏳ [Social Media Scanner] 异常，{delay}秒后重试...")
                await asyncio.sleep(delay)
                continue
            
            return {
                "success": False,
                "error": f"查询异常: {error_msg}",
                "source": "social_media_scanner"
            }
    
    # 所有重试都失败
    logger.error(f"❌ [Social Media Scanner] 所有 {max_retries} 次尝试均失败")
    return {
        "success": False,
        "error": f"查询失败，已重试 {max_retries} 次",
        "source": "social_media_scanner"
    }
