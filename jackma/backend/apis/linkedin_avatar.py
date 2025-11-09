"""
LinkedIn 头像获取 API
提供LinkedIn用户头像的代理服务
"""
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse, JSONResponse
import httpx
import re
from typing import Optional
import logging
from urllib.parse import quote, unquote
import asyncio
import json
import io

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/avatar", tags=["Avatar"])

# LinkedIn公开API配置
LINKEDIN_PUBLIC_API = "https://www.linkedin.com/in/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async def get_linkedin_avatar_from_username(username: str) -> Optional[str]:
    """
    从LinkedIn用户名获取头像URL
    """
    try:
        profile_url = f"{LINKEDIN_PUBLIC_API}{username}"
        
        async with httpx.AsyncClient(
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive"
            },
            timeout=10.0,
            follow_redirects=True
        ) as client:
            response = await client.get(profile_url)
            
            if response.status_code == 200:
                html_content = response.text
                
                # 尝试多种正则表达式提取头像
                avatar_patterns = [
                    r'"https://media\.licdn\.com/dms/image/[^"]*profile-displayphoto[^"]*"',
                    r'"https://media-exp\d+\.licdn\.com/dms/image/[^"]*profile[^"]*"',
                    r'data-delayed-url="(https://media[^"]*profile[^"]*)"',
                    r'img.*?src="(https://media[^"]*profile[^"]*)"',
                ]
                
                for pattern in avatar_patterns:
                    matches = re.findall(pattern, html_content, re.IGNORECASE)
                    if matches:
                        avatar_url = matches[0].strip('"')
                        logger.info(f"Found LinkedIn avatar for {username}: {avatar_url}")
                        return avatar_url
                
                logger.warning(f"No avatar found in LinkedIn page for: {username}")
                return None
                
            else:
                logger.warning(f"Failed to fetch LinkedIn page for {username}: {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching LinkedIn avatar for {username}: {e}")
        return None

@router.get("/linkedin")
async def get_linkedin_avatar(username: str = Query(..., description="LinkedIn用户名")):
    """
    获取LinkedIn用户头像
    """
    try:
        if not username:
            raise HTTPException(status_code=400, detail="用户名不能为空")
        
        # 清理用户名
        clean_username = username.strip().replace('@', '').replace('https://www.linkedin.com/in/', '')
        if '/' in clean_username:
            clean_username = clean_username.split('/')[0]
        
        logger.info(f"Fetching LinkedIn avatar for: {clean_username}")
        
        # 获取头像URL
        avatar_url = await get_linkedin_avatar_from_username(clean_username)
        
        if avatar_url:
            return {"avatar_url": avatar_url, "username": clean_username}
        else:
            # 返回默认头像
            initials = extract_initials_from_username(clean_username)
            default_avatar = f"https://ui-avatars.com/api/?name={quote(initials)}&background=0A66C2&color=ffffff&size=200&font-size=0.6&format=png&rounded=true"
            return {"avatar_url": default_avatar, "username": clean_username, "default": True}
            
    except Exception as e:
        logger.error(f"Error in get_linkedin_avatar: {e}")
        raise HTTPException(status_code=500, detail="获取头像失败")

@router.get("/proxy")
async def proxy_avatar_image(url: str = Query(..., description="头像图片URL")):
    """
    代理头像图片，解决跨域问题
    """
    try:
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="无效的图片URL")
        
        async with httpx.AsyncClient(
            headers={
                "User-Agent": USER_AGENT,
                "Referer": "https://www.linkedin.com/"
            },
            timeout=10.0
        ) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "image/jpeg")
                
                return StreamingResponse(
                    io.BytesIO(response.content),
                    media_type=content_type,
                    headers={
                        "Cache-Control": "public, max-age=3600",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            else:
                raise HTTPException(status_code=response.status_code, detail="获取图片失败")
                
    except httpx.RequestError as e:
        logger.error(f"Network error proxying image {url}: {e}")
        raise HTTPException(status_code=502, detail="网络错误")
    except Exception as e:
        logger.error(f"Error proxying image {url}: {e}")
        raise HTTPException(status_code=500, detail="代理图片失败")

@router.post("/scrape")
async def scrape_avatar_from_url(request: Request):
    """
    从社交媒体页面抓取头像
    """
    try:
        body = await request.json()
        url = body.get("url")
        
        if not url:
            raise HTTPException(status_code=400, detail="URL不能为空")
        
        # 只支持LinkedIn URL
        if "linkedin.com" not in url.lower():
            raise HTTPException(status_code=400, detail="目前仅支持LinkedIn URL")
        
        # 提取用户名
        username_match = re.search(r'linkedin\.com/in/([^/?]+)', url)
        if not username_match:
            raise HTTPException(status_code=400, detail="无法从URL提取用户名")
        
        username = username_match.group(1)
        
        # 获取头像
        avatar_url = await get_linkedin_avatar_from_username(username)
        
        if avatar_url:
            return {"avatar_url": avatar_url, "source": "scraped"}
        else:
            return {"avatar_url": None, "error": "未找到头像"}
            
    except Exception as e:
        logger.error(f"Error in scrape_avatar_from_url: {e}")
        raise HTTPException(status_code=500, detail="抓取头像失败")

def extract_initials_from_username(username: str) -> str:
    """
    从用户名提取首字母
    """
    if not username:
        return "U"
    
    # 移除数字和特殊字符，分割单词
    words = re.sub(r'[-_\d]', ' ', username).split()
    words = [word for word in words if len(word) > 1 and word.isalpha()]
    
    if len(words) >= 2:
        # 取前两个单词的首字母
        return f"{words[0][0]}{words[1][0]}".upper()
    elif len(words) == 1:
        # 取第一个单词的前两个字母
        return words[0][:2].upper()
    else:
        return "U"

# 批量获取头像
@router.post("/batch")
async def batch_get_linkedin_avatars(request: Request):
    """
    批量获取LinkedIn头像
    """
    try:
        body = await request.json()
        usernames = body.get("usernames", [])
        
        if not isinstance(usernames, list) or not usernames:
            raise HTTPException(status_code=400, detail="用户名列表不能为空")
        
        results = {}
        
        # 并发获取头像（限制并发数）
        semaphore = asyncio.Semaphore(5)  # 最多5个并发请求
        
        async def fetch_avatar(username):
            async with semaphore:
                clean_username = username.strip().replace('@', '')
                avatar_url = await get_linkedin_avatar_from_username(clean_username)
                
                if not avatar_url:
                    # 生成默认头像
                    initials = extract_initials_from_username(clean_username)
                    avatar_url = f"https://ui-avatars.com/api/?name={quote(initials)}&background=0A66C2&color=ffffff&size=200&font-size=0.6&format=png&rounded=true"
                
                return clean_username, avatar_url
        
        tasks = [fetch_avatar(username) for username in usernames[:10]]  # 限制最多10个
        avatar_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in avatar_results:
            if isinstance(result, Exception):
                logger.error(f"Error in batch fetch: {result}")
                continue
            
            username, avatar_url = result
            results[username] = avatar_url
        
        return {"avatars": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Error in batch_get_linkedin_avatars: {e}")
        raise HTTPException(status_code=500, detail="批量获取头像失败")