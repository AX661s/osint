// Domain -> Simple Icons slug mapping and helpers

const DOMAIN_TO_SLUG = {
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'twitter.com': 'twitter',
  'x.com': 'x',
  'linkedin.com': 'linkedin',
  'github.com': 'github',
  'youtube.com': 'youtube',
  'tiktok.com': 'tiktok',
  'reddit.com': 'reddit',
  'telegram.org': 'telegram',
  't.me': 'telegram',
  'whatsapp.com': 'whatsapp',
  'discord.com': 'discord',
  'truecaller.com': 'truecaller',
  'callapp.com': 'callapp',
  'melissa.com': 'melissadata',
  'microsoft.com': 'microsoft',
};

export const domainToSlug = (domain = '') => {
  const d = String(domain || '').toLowerCase().replace(/^www\./, '');
  if (!d) return '';
  // 仅返回我们确认存在于 Simple Icons 的映射，避免产生无效 slug（如 punycode xn--*）
  if (DOMAIN_TO_SLUG[d]) return DOMAIN_TO_SLUG[d];
  const base = d.split('.').slice(-2).join('.');
  if (DOMAIN_TO_SLUG[base]) return DOMAIN_TO_SLUG[base];
  // 拦截 punycode / 未知域名：返回空字符串以跳过 CDN 加载
  if (d.startsWith('xn--')) return '';
  return '';
};