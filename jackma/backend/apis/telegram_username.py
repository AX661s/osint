"""
Telegram Username API (RapidAPI)
通过用户名查询Telegram资料，提取高清头像等信息
"""
import httpx
import logging
from typing import Dict, Any
import re
from .config import RAPIDAPI_KEY, DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_telegram_by_username(username: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    使用 RapidAPI 的 telegram-api8 服务按用户名查询 Telegram 信息

    Args:
        username: Telegram 用户名（不含@）
        timeout: 超时时间（秒）

    Returns:
        统一格式字典，包含 success/data/source/error
    """
    try:
        if not username:
            return {"success": False, "error": "username is required", "source": "telegram_username"}

        url = "https://telegram-api8.p.rapidapi.com/tg"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "telegram-api8.p.rapidapi.com",
            "Accept": "application/json",
        }
        params = {"username": username}

        logger.info(f"🔍 [Telegram Username] 查询用户名: {username}")

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)

        if response.status_code != 200:
            logger.warning(f"⚠️ [Telegram Username] 错误状态码: {response.status_code}")
            return {
                "success": False,
                "error": f"Status {response.status_code}: {response.text}",
                "source": "telegram_username"
            }

        data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"raw": response.text}

        # 尽可能兼容提取常见字段
        def pick(*keys):
            for k in keys:
                v = data.get(k)
                if v:
                    return v
            return None

        # 头像字段（优先高清）
        avatar_hd = pick("profile_pic_url_hd", "image_hd", "photo_hd", "avatar_hd")
        avatar = pick("profile_pic", "profile_pic_url", "avatar_url", "avatar", "image_url", "photo", "picture")

        username_val = pick("username", "user_name") or username
        display_name = pick("name", "display_name", "full_name")
        user_id = pick("id", "user_id")
        bio = pick("bio", "about")
        followers = pick("followers", "followers_count")
        following = pick("following", "following_count")
        profile_url = pick("profile_url", "url", "link") or (f"https://t.me/{username_val}" if username_val else None)

        user_info = {
            "user_id": user_id,
            "username": username_val,
            "display_name": display_name,
            "bio": bio,
            "followers": followers,
            "following": following,
            # 同时返回普通和高清头像字段，前端优先使用高清
            "avatar_url_hd": avatar_hd,
            "avatar_url": avatar_hd or avatar,
            "profile_url": profile_url,
        }

        # 如果头像缺失且存在公开主页链接，尝试从 t.me 页面解析 og:image
        if (not user_info.get("avatar_url_hd") and not user_info.get("avatar_url")) and profile_url:
            try:
                logger.info(f"🌐 [Telegram Username] 尝试抓取公开页面头像: {profile_url}")
                async with httpx.AsyncClient(timeout=timeout, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
                }) as client:
                    page_resp = await client.get(profile_url)
                    if page_resp.status_code == 200:
                        html = page_resp.text
                        # 解析 og:image 或 image_src
                        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
                        if not m:
                            m = re.search(r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']', html, re.IGNORECASE)
                        if m:
                            img_url = m.group(1)
                            if img_url and img_url.startswith("http"):
                                user_info["avatar_url_hd"] = img_url
                                user_info["avatar_url"] = img_url
                                logger.info("🖼️ [Telegram Username] 已解析到头像链接")
            except Exception as scrape_err:
                logger.warning(f"⚠️ [Telegram Username] 抓取头像失败: {scrape_err}")

        # 标记是否找到有效资料（有用户名或头像/ID即认为找到了）
        telegram_found = bool(username_val or user_id or avatar_hd or avatar)

        logger.info(f"✅ [Telegram Username] 查询成功 - 用户: {username_val}")
        return {
            "success": True,
            "data": {
                "telegram_found": telegram_found,
                "username": username_val,
                "user_info": user_info,
            },
            "source": "telegram_username",
        }

    except Exception as e:
        logger.error(f"❌ [Telegram Username] 异常: {str(e)}")
        return {"success": False, "error": str(e), "source": "telegram_username"}