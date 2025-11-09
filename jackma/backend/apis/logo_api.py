"""
Logo API - 获取品牌Logo
提供统一的品牌logo获取服务
"""

from fastapi import APIRouter, HTTPException, Query, Response
import httpx
import logging
from urllib.parse import quote

router = APIRouter(prefix="/api/logo", tags=["Logo"])
logger = logging.getLogger(__name__)

# 预定义的logo映射
LOGO_OVERRIDES = {
    'melissa.com': 'https://www.melissa.com/sites/default/files/MelissaLogo.png',
    'truecaller.com': 'https://truecaller.com/favicon.ico',
    'callapp.com': 'https://www.callapp.com/favicon.ico',
    'whatsapp.com': 'https://static.whatsapp.net/rsrc.php/v3/yP/r/rYZqPCBaG70.png',
    'telegram.org': 'https://telegram.org/favicon.ico',
    'linkedin.com': 'https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    'facebook.com': 'https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico',
    'instagram.com': 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png',
    'twitter.com': 'https://abs.twimg.com/favicons/twitter.2.ico',
    'x.com': 'https://abs.twimg.com/favicons/twitter.2.ico'
}

@router.get("/{domain}")
async def get_logo(domain: str):
    """
    获取指定域名的logo
    """
    try:
        if not domain:
            raise HTTPException(status_code=400, detail="域名不能为空")
        
        # 清理域名
        clean_domain = domain.lower().strip()
        logger.info(f"Getting logo for domain: {clean_domain}")
        
        # 检查预定义映射
        if clean_domain in LOGO_OVERRIDES:
            logo_url = LOGO_OVERRIDES[clean_domain]
            logger.info(f"Using override logo for {clean_domain}: {logo_url}")
            
            # 代理返回图片
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(logo_url)
                if response.status_code == 200:
                    return Response(
                        content=response.content,
                        media_type=response.headers.get("content-type", "image/png")
                    )
        
        # 尝试Clearbit logo API
        clearbit_url = f"https://logo.clearbit.com/{clean_domain}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(clearbit_url)
            if response.status_code == 200:
                logger.info(f"Got logo from Clearbit for {clean_domain}")
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "image/png")
                )
        
        # 备用：尝试favicon
        favicon_url = f"https://{clean_domain}/favicon.ico"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(favicon_url)
            if response.status_code == 200:
                logger.info(f"Got favicon for {clean_domain}")
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "image/x-icon")
                )
        
        # 如果都失败，返回404
        raise HTTPException(status_code=404, detail="Logo not found")
        
    except Exception as e:
        logger.error(f"Error getting logo for {domain}: {e}")
        raise HTTPException(status_code=500, detail="获取logo失败")

@router.get("/info/{domain}")
async def get_logo_info(domain: str):
    """
    获取logo信息（不返回图片内容）
    """
    try:
        clean_domain = domain.lower().strip()
        
        # 检查是否有预定义映射
        if clean_domain in LOGO_OVERRIDES:
            return {
                "domain": clean_domain,
                "logo_url": LOGO_OVERRIDES[clean_domain],
                "source": "override"
            }
        
        # 返回Clearbit URL
        return {
            "domain": clean_domain,
            "logo_url": f"https://logo.clearbit.com/{clean_domain}",
            "source": "clearbit"
        }
        
    except Exception as e:
        logger.error(f"Error getting logo info for {domain}: {e}")
        raise HTTPException(status_code=500, detail="获取logo信息失败")