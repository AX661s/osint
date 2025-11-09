import React from 'react';
import { domainToSlug } from '@/utils/brandMap';
import { 
  Globe, Linkedin, Github, Youtube, Music, Hash, AtSign, 
  Phone, Shield, Send, MessageCircle 
} from 'lucide-react';

/**
 * 域名 Logo 组件（本地安全策略）
 * 为避免跨域 ORB/CORS 带来的报错与闪烁，这里不再请求第三方 favicon。
 * 仅依据常见域名映射到本地/内联图标，其他一律回退为 Globe。
 */
export const DomainLogo = ({ url, className = "w-5 h-5" }) => {
  let domain = '';
  try {
    if (url && url.startsWith('http')) {
      domain = new URL(url).hostname.toLowerCase();
    }
  } catch {}
  const [primaryFailed, setPrimaryFailed] = React.useState(false);
  const [proxyFailed, setProxyFailed] = React.useState(false);

  const domainMap = {
    'facebook.com': 'facebook',
    'www.facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'www.instagram.com': 'instagram',
    'twitter.com': 'twitter',
    'www.twitter.com': 'twitter',
    'x.com': 'x',
    'www.x.com': 'x',
    'linkedin.com': 'linkedin',
    'www.linkedin.com': 'linkedin',
    'github.com': 'github',
    'www.github.com': 'github',
    'youtube.com': 'youtube',
    'www.youtube.com': 'youtube',
    'tiktok.com': 'tiktok',
    'www.tiktok.com': 'tiktok',
    'telegram.org': 'telegram',
    'web.telegram.org': 'telegram',
    't.me': 'telegram',
    'snapchat.com': 'snapchat',
    'www.snapchat.com': 'snapchat',
    'reddit.com': 'reddit',
    'www.reddit.com': 'reddit',
    'discord.com': 'discord',
    'www.discord.com': 'discord',
    // Extended platforms
    'truecaller.com': 'truecaller',
    'www.truecaller.com': 'truecaller',
    'callapp.com': 'callapp',
    'www.callapp.com': 'callapp',
    // 移除 melissa.com 的内联映射，允许通过 /api/logo 显示品牌 Logo
    'microsoft.com': 'microsoft_phone',
    'www.microsoft.com': 'microsoft_phone',
    'ipqualityscore.com': 'ipqualityscore',
    'www.ipqualityscore.com': 'ipqualityscore'
  };
  const normalized = domain.replace(/^www\./, '');
  // 统一常见别名/子域到主域，避免第三方图标失败
  const sanitizeDomain = (dom) => {
    const d = (dom || '').toLowerCase();
    if (!d) return '';
    if (d.endsWith('.whatsapp.net') || d === 'whatsapp.net' || d.includes('whatsapp.net')) return 'whatsapp.com';
    if (d === 't.me' || d.endsWith('.t.me')) return 'telegram.org';
    return d;
  };
  const safeDomain = sanitizeDomain(normalized);
  const platform = domainMap[normalized] || domainMap[domain];
  // 1) 已知平台域名 → 使用内置彩色图标（稳定）
  if (platform) {
    return <PlatformIcon platform={platform} className={className} />;
  }
  // 2) Clearbit Logo API（直接使用，带浅色背景）
  if (safeDomain && !proxyFailed) {
    return (
      <img
        src={`/api/logo/${encodeURIComponent(safeDomain)}`}
        alt={safeDomain}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setProxyFailed(true)}
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
    );
  }
  // 3) Simple Icons CDN 作为最终回退（仅未知域名）
  const slug = domainToSlug(safeDomain || domain);
  if (slug && !primaryFailed) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${encodeURIComponent(slug)}`}
        alt={safeDomain}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setPrimaryFailed(true)}
      />
    );
  }
  return <Globe className={className} />;
};

/**
 * 平台图标组件 - 彩色 SVG 图标
 */
export const PlatformIcon = ({ platform, url, className = "w-5 h-5" }) => {
  const platformLower = platform.toLowerCase();
  
  // 如果有 URL，优先使用域名 logo
  if (url && url.startsWith('http')) {
    return <DomainLogo url={url} className={className} />;
  }
  
  // 彩色图标映射
  const colorIconMap = {
    'facebook': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    ),
    'instagram': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <radialGradient id="ig-gradient" cx="0.5" cy="1" r="1">
          <stop offset="0%" stopColor="#833AB4"/>
          <stop offset="50%" stopColor="#FD1D1D"/>
          <stop offset="100%" stopColor="#FCB045"/>
        </radialGradient>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="url(#ig-gradient)"/>
      </svg>
    ),
    'whatsapp': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787" fill="#25D366"/>
      </svg>
    ),
    'twitter': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" fill="#1DA1F2"/>
      </svg>
    ),
    'x': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000"/>
      </svg>
    ),
    'telegram': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#0088CC"/>
      </svg>
    ),
    'telegram_username': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#0088CC"/>
      </svg>
    ),
    'truecaller': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#0087FF"/>
        <path d="M12 6.5c3.038 0 5.5 2.462 5.5 5.5s-2.462 5.5-5.5 5.5S6.5 15.038 6.5 12 8.962 6.5 12 6.5z" fill="#fff"/>
        <circle cx="12" cy="12" r="2.5" fill="#0087FF"/>
      </svg>
    ),
    'snapchat': (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.957 1.404-5.957s-.359-.719-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.139.888 2.739.097.118.112.221.085.341-.09.394-.297 1.199-.336 1.363-.052.225-.170.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z" fill="#FFFC00"/>
      </svg>
    )
  };
  
  // IPQualityScore - 使用真实品牌图标（通过代理）
  if (!colorIconMap['ipqualityscore']) {
    colorIconMap['ipqualityscore'] = (
      <img
        src="/api/logo/ipqualityscore.com"
        alt="IPQualityScore"
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          // 如果加载失败，回退到自定义图标
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `
            <svg class="${className}" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#4F46E5"/>
              <path d="M12 6l-1.5 4.5h-4.5l3.75 2.75-1.5 4.5L12 15l3.75 2.75-1.5-4.5L18 10.5h-4.5L12 6z" fill="#fff"/>
            </svg>
          `;
        }}
      />
    );
  }
  
  // CallApp 彩色图标
  if (!colorIconMap['callapp']) {
    colorIconMap['callapp'] = (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#00C853"/>
        <path d="M16.5 14.5c-.3 0-.6-.1-.9-.2-1.1-.3-2.2-.9-3.1-1.8-.9-.9-1.5-2-1.8-3.1-.2-.8.1-1.6.7-2.2l.8-.8c.3-.3.3-.8 0-1.1L9.4 3.5c-.3-.3-.8-.3-1.1 0l-.8.8c-1.2 1.2-1.7 2.9-1.3 4.5.4 1.6 1.3 3.1 2.5 4.3 1.2 1.2 2.7 2.1 4.3 2.5 1.6.4 3.3-.1 4.5-1.3l.8-.8c.3-.3.3-.8 0-1.1l-1.8-1.8c-.3-.3-.8-.3-1.1 0l-.8.8c-.6.6-1.4.9-2.2.7z" fill="#fff"/>
      </svg>
    );
  }
  
  // 扩展：加载原始彩色Logo（Microsoft / Telegram / Melissa）
  if (!colorIconMap['microsoft_phone']) {
    colorIconMap['microsoft_phone'] = (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="9" height="9" fill="#F25022" rx="1" />
        <rect x="12" y="3" width="9" height="9" fill="#7FBA00" rx="1" />
        <rect x="3" y="12" width="9" height="9" fill="#00A4EF" rx="1" />
        <rect x="12" y="12" width="9" height="9" fill="#FFB900" rx="1" />
      </svg>
    );
  }
  if (!colorIconMap['telegram_complete']) {
    colorIconMap['telegram_complete'] = (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#0088CC"/>
      </svg>
    );
  }
  if (!colorIconMap['phone_lookup']) {
    colorIconMap['phone_lookup'] = (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="4" fill="#1D4ED8" />
        <path d="M8 16V8h2.5l2 2.8L15 8h2v8h-2v-4.5l-2.5 3.2-2.5-3.2V16H8z" fill="#fff" />
      </svg>
    );
  }
  if (!colorIconMap['phone_lookup_3008']) {
    colorIconMap['phone_lookup_3008'] = (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="4" fill="#1D4ED8" />
        <path d="M8 16V8h2.5l2 2.8L15 8h2v8h-2v-4.5l-2.5 3.2-2.5-3.2V16H8z" fill="#fff" />
      </svg>
    );
  }
  
  // 如果有彩色图标就使用彩色的，否则使用默认的 Lucide 图标
  if (colorIconMap[platformLower]) {
    return colorIconMap[platformLower];
  }
  
  // 默认图标映射
  const iconMap = {
    'linkedin': <Linkedin className={className} />,
    'github': <Github className={className} />,
    'youtube': <Youtube className={className} />,
    'tiktok': <Music className={className} />,
    'discord': <Hash className={className} />,
    'reddit': <AtSign className={className} />,
    'google': <Globe className={className} />,
    'ipqualityscore': <Shield className={className} />,
    'callapp': <Phone className={className} />,
    'microsoft_phone': <Phone className={className} />,
    'phone_lookup': <Phone className={className} />,
    'phone_lookup_3008': <Phone className={className} />,
    'telegram_complete': <Send className={className} />,
    'telegram_username': <Send className={className} />,
    'caller_id': <Phone className={className} />,
    'social_media_scanner': <Globe className={className} />
  };
  
  return iconMap[platformLower] || <Globe className={className} />;
};

export default PlatformIcon;
