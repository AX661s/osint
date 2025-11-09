import React, { useState } from 'react';
import { domainToSlug } from '../utils/brandMap';

/**
 * UniversalLogo - 简化版品牌 Logo 显示组件
 * 直接使用 Clearbit API 显示品牌 Logo
 */
const UniversalLogo = ({
  platform = '',
  module = '',
  label = '',
  url = '',
  className = 'w-5 h-5',
}) => {
  const [failed, setFailed] = useState(false);

  // 从 URL 提取域名
  const getDomain = (urlString) => {
    try {
      if (!urlString) return '';
      const normalized = urlString.startsWith('http') ? urlString : `https://${urlString}`;
      const hostname = new URL(normalized).hostname.toLowerCase();
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  // 规范化/修正域名（处理常见子域或别名）
  const sanitizeDomain = (dom) => {
    if (!dom) return '';
    let d = dom.trim().toLowerCase();
    d = d.replace(/^www\./, '');
    // 统一子域到主域，提升 Clearbit 命中率（如 monitor.mozilla.org → mozilla.org）
    const collapseToBase = (host) => {
      try {
        const parts = host.split('.');
        if (parts.length <= 2) return host;
        const lastTwo = parts.slice(-2).join('.');
        // 常见多级TLD例外：co.uk, com.cn, com.au 等，保留最后三段
        const lastThree = parts.slice(-3).join('.');
        const multiTLDs = new Set(['co.uk', 'com.cn', 'com.au', 'com.br', 'co.jp']);
        if (multiTLDs.has(lastTwo)) return lastThree;
        return lastTwo;
      } catch { return host; }
    };
    // 修正 WhatsApp 子域到主域，避免 Clearbit/图标失败
    if (d.endsWith('.whatsapp.net') || d === 'whatsapp.net' || d.includes('whatsapp.net')) {
      return 'whatsapp.com';
    }
    // t.me 统一到 telegram.org
    if (d === 't.me' || d.endsWith('.t.me')) {
      return 'telegram.org';
    }
    return collapseToBase(d);
  };

  // 从模块名映射到域名
  const moduleToDomain = (mod) => {
    const map = {
      // 常见平台与服务
      vivino: 'vivino.com',
      firefox: 'mozilla.org',
      instagram: 'instagram.com',
      facebook: 'facebook.com',
      snapchat: 'snapchat.com',
      spotify: 'spotify.com',
      linkedin: 'linkedin.com',
      google: 'google.com',
      maps: 'google.com',
      twitter: 'twitter.com',
      x: 'twitter.com',
      telegram: 'telegram.org',
      whatsapp: 'whatsapp.com',
      youtube: 'youtube.com',
      tiktok: 'tiktok.com',
      reddit: 'reddit.com',
      pinterest: 'pinterest.com',
      tumblr: 'tumblr.com',
      medium: 'medium.com',
      github: 'github.com',
      gitlab: 'gitlab.com',
      discord: 'discord.com',
      apple: 'apple.com',
      microsoft: 'microsoft.com',
      adobe: 'adobe.com',
      amazon: 'amazon.com',
      netflix: 'netflix.com',
      dropbox: 'dropbox.com',
      etsy: 'etsy.com',
      ebay: 'ebay.com',
      paypal: 'paypal.com',
      picsart: 'picsart.com',
      giphy: 'giphy.com',
      vimeo: 'vimeo.com',
      quora: 'quora.com',
      yelp: 'yelp.com',
      goodreads: 'goodreads.com',
      fitbit: 'fitbit.com',
      strava: 'strava.com',
      eventbrite: 'eventbrite.com',
      nextdoor: 'nextdoor.com',
      instacart: 'instacart.com',
      bible: 'bible.com',
      pray: 'pray.com',
      ted: 'ted.com',
      espn: 'espn.com',
      disney: 'disney.com',
      houzz: 'houzz.com',
      care2: 'care2.com',
      anydo: 'any.do',
      bitmoji: 'bitmoji.com',
      classpass: 'classpass.com',
      fiton: 'fitonapp.com',
      loseit: 'loseit.com',
      mindbody: 'mindbody.com',
      fetch: 'fetchrewards.com',
      hibp: 'haveibeenpwned.com',
      newyorktimes: 'nytimes.com',
      generalmotors: 'gm.com',

      // 新增：ApexSMS / Melissa / MGM 映射
      // ApexSMS：优先使用 .io 域（Clearbit 与 favicon 覆盖更好）
      apexsms: 'apexsms.io',
      'apex sms': 'apexsms.io',
      'apex-sms': 'apexsms.io',

      // Melissa 品牌（Melissadata 同指向 melissa.com）
      melissa: 'melissa.com',
      melissadata: 'melissa.com',

      // MGM 品牌与常见别名
      mgm: 'mgmgrand.com',
      'mgm grand': 'mgmgrand.com',
      mgm_grand: 'mgmgrand.com',
      mgmgrand: 'mgmgrand.com',
      'mgm grand hotels': 'mgmgrand.com',
      mgmresorts: 'mgmresorts.com',
    };
    return map[mod.toLowerCase()] || '';
  };

  // 获取最佳域名并修正
  const rawDomain = getDomain(url) || moduleToDomain(module || platform || label);
  const domain = sanitizeDomain(rawDomain);

  // Hooks 必须无条件声明在组件顶层，避免“Rendered fewer hooks than expected”错误
  const [srcUrl, setSrcUrl] = React.useState('');
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    if (domain) {
      setSrcUrl(`/api/logo/${encodeURIComponent(domain)}`);
      setStage(0);
      setFailed(false);
    } else {
      setSrcUrl('');
    }
  }, [domain]);

  const handleError = () => {
    if (stage === 0) {
      console.warn(`Logo proxy failed for ${domain}, falling back to Clearbit`);
      setSrcUrl(`https://logo.clearbit.com/${domain}`);
      setStage(1);
      return;
    }
    if (stage === 1) {
      console.warn(`Clearbit failed for ${domain}, falling back to favicon`);
      setSrcUrl(`https://${domain}/favicon.ico`);
      setStage(2);
      return;
    }
    if (stage === 2) {
      console.warn(`Favicon failed for ${domain}, falling back to DuckDuckGo icons`);
      setSrcUrl(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      setStage(3);
      return;
    }
    if (stage === 3) {
      // Try Simple Icons CDN using known slug mapping
      const slug = domainToSlug(domain);
      if (slug) {
        console.warn(`DuckDuckGo icons failed; trying Simple Icons slug: ${slug}`);
        setSrcUrl(`https://cdn.simpleicons.org/${encodeURIComponent(slug)}`);
        setStage(4);
        return;
      }
    }
    console.warn(`All logo fallbacks failed for ${domain}, using letter placeholder`);
    setFailed(true);
  };
  // 如果没有域名或已失败，显示首字母占位
  if (!domain || failed || !srcUrl) {
    const letter = (label || platform || module || '?')[0].toUpperCase();
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold rounded-lg`}>
        {letter}
      </div>
    );
  }

  return (
    <img
      src={srcUrl}
      alt={label || platform || module}
      className={className}
      style={{ objectFit: 'cover', objectPosition: 'center' }}
      onError={handleError}
      loading="lazy"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
    />
  );
};

export default UniversalLogo;
