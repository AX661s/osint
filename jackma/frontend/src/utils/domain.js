// 智能域名提取与映射工具

// 安全解码，避免URI错误
const safeDecode = (s = "") => {
  try {
    // 兼容百分号编码与加号空格
    return decodeURIComponent(String(s).replace(/\+/g, "%20"));
  } catch {
    return String(s || "");
  }
};

// 简单清理：去空白与包裹字符
const clean = (s = "") => String(s || "").trim().replace(/[`"'\s]+$/g, "").replace(/^[`"'\s]+/g, "");

// 从URL字符串提取域名（自动补https）
export const domainFromUrl = (url = "") => {
  try {
    const input = String(url || "").trim();
    if (!input) return "";
    const normalized = /^https?:\/\//.test(input) ? input : `https://${input}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
};

// 从邮箱提取域名
export const domainFromEmail = (email = "") => (
  (String(email).toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/) || [])[1] || ""
);

// 根据标签智能推测域名
export const hintDomainFromLabel = (label = "") => {
  const s = safeDecode(label).toLowerCase();

  // 若自身看起来就是域名，直接返回清理后的
  if (/\.[a-z]{2,}/.test(s) && !/\s/.test(s)) {
    return s.replace(/^https?:\/\//, "");
  }

  const pairs = [
    [/youtube|yt\b/, "youtube.com"],
    [/twitter|x\.com\b/, "twitter.com"],
    [/instagram/, "instagram.com"],
    [/facebook/, "facebook.com"],
    [/tiktok/, "tiktok.com"],
    [/reddit/, "reddit.com"],
    [/telegram/, "telegram.org"],
    [/whatsapp/, "whatsapp.com"],
    [/discord/, "discord.com"],
    [/linkedin/, "linkedin.com"],
    [/github/, "github.com"],
    [/spotify/, "spotify.com"],
  ];

  for (const [re, dom] of pairs) {
    if (re.test(s)) return dom;
  }

  const token = s.replace(/[%_\-]+/g, " ").trim().split(/\s+/)[0] || "";
  return token ? `${token}.com` : "";
};

// 模块名映射至域名
export const moduleToDomain = (m = "") => {
  const s = String(m || "").toLowerCase();
  const map = {
    // 社交媒体
    facebook: "facebook.com",
    instagram: "instagram.com",
    twitter: "twitter.com",
    x: "twitter.com",
    tiktok: "tiktok.com",
    reddit: "reddit.com",
    linkedin: "linkedin.com",
    pinterest: "pinterest.com",
    tumblr: "tumblr.com",
    flickr: "flickr.com",
    snapchat: "snapchat.com",
    
    // 开发平台
    github: "github.com",
    gitlab: "gitlab.com",
    bitbucket: "bitbucket.org",
    stackoverflow: "stackoverflow.com",
    
    // 通讯工具
    telegram: "telegram.org",
    telegram_phone_check: "telegram.org",
    telegram_complete: "telegram.org",
    telegram_username: "telegram.org",
    whatsapp: "whatsapp.com",
    whatsapp_data: "whatsapp.com",
    discord: "discord.com",
    skype: "skype.com",
    
    // 视频/流媒体
    youtube: "youtube.com",
    vimeo: "vimeo.com",
    twitch: "twitch.tv",
    spotify: "spotify.com",
    soundcloud: "soundcloud.com",
    netflix: "netflix.com",
    hulu: "hulu.com",
    vivino: "vivino.com",
    
    // OSINT 工具
    truecaller: "truecaller.com",
    ipqualityscore: "ipqualityscore.com",
    callapp: "callapp.com",
    caller_id: "eyecon.com",
    phone_validate_simple: "melissa.com",
    phone_lookup: "melissa.com",
    phone_lookup_3008: "melissa.com",
    osint_deep: "osint.industries",
    osint_industries: "osint.industries",
    
    // 科技公司
    microsoft: "microsoft.com",
    microsoft_phone: "microsoft.com",
    apple: "apple.com",
    google: "google.com",
    maps: "google.com",
    amazon: "amazon.com",
    adobe: "adobe.com",
    
    // 健康/健身
    fitbit: "fitbit.com",
    strava: "strava.com",
    myfitnesspal: "myfitnesspal.com",
    
    // 社区/邻里
    nextdoor: "nextdoor.com",
    meetup: "meetup.com",
    
    // 购物/服务
    instacart: "instacart.com",
    doordash: "doordash.com",
    uber: "uber.com",
    lyft: "lyft.com",
    airbnb: "airbnb.com",
    etsy: "etsy.com",
    
    // 媒体/内容
    giphy: "giphy.com",
    medium: "medium.com",
    substack: "substack.com",
    picsart: "picsart.com",
    
    // 新闻/出版
    newyorktimes: "nytimes.com",
    washingtonpost: "washingtonpost.com",
    theguardian: "theguardian.com",
    bbc: "bbc.com",
    cnn: "cnn.com",
    reuters: "reuters.com",
    
    // 汽车
    generalmotors: "gm.com",
    ford: "ford.com",
    tesla: "tesla.com",
    
    // 浏览器/工具
    firefox: "mozilla.org",
    chrome: "google.com",
    safari: "apple.com",
    edge: "microsoft.com",
    
    // 公益/社区
    care2: "care2.com",
    change: "change.org",
    
    // 活动/票务
    eventbrite: "eventbrite.com",
    ticketmaster: "ticketmaster.com",
    stubhub: "stubhub.com",
    
    // 其他
    goodreads: "goodreads.com",
    challenges: "challenges.app",
    fetchrewards: "fetchrewards.com",
    couponmom: "couponmom.com",
    armorgames: "armorgames.com"
  };
  return map[s] || (s ? `${s}.com` : "");
};

// 域名清理
export const labelFromDomain = (d = "") => (
  clean(d)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .toLowerCase()
);

// 在多来源字段中挑选最佳域名
export const pickBestDomain = (row = {}, label = "", module = "") => {
  // 1) 直接从潜在URL字段提取
  const urlCandidates = [
    row?.Url,
    row?.Avatar,
    row?.profile,
    row?.Profile,
    row?.Image,
    row?.Cover,
    row?.website,
    row?.link,
    row?.homepage,
    row?.profile_url,
    row?.profile_link,
    row?.domain,
    row?.url,
  ];
  for (const u of urlCandidates) {
    const d = domainFromUrl(u || "");
    if (d) return d;
  }

  // 2) 邮箱域名
  const emailDomain = domainFromEmail(row?.Email || row?.email || "");
  if (emailDomain) return emailDomain;

  // 3) 标签推断
  const labelDomain = hintDomainFromLabel(label || row?.label || "");
  if (labelDomain) return labelDomain;

  // 4) 扫描任意字段值中的 URL/域名（含 mainFields）
  const isProbablyDomain = (s = "") => {
    const str = String(s || "").toLowerCase().trim();
    if (!str) return false;
    // 形如 example.com 或子域名；排除空格与非域名字符
    return /[a-z0-9-]+\.[a-z]{2,}/.test(str) && !/\s/.test(str);
  };
  const tryExtractDomain = (s = "") => {
    const byUrl = domainFromUrl(s);
    if (byUrl) return byUrl;
    if (isProbablyDomain(s)) {
      return labelFromDomain(s);
    }
    return "";
  };
  const scanObject = (obj) => {
    if (!obj || typeof obj !== 'object') return "";
    // mainFields: [{label, value}]
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const got = scanObject(item);
        if (got) return got;
      }
      return "";
    }
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (typeof v === 'string') {
        const d = tryExtractDomain(v);
        if (d) return d;
      } else if (typeof v === 'object') {
        // 如果是 { value: '...' } 节点，优先取 value
        if ('value' in v && typeof v.value === 'string') {
          const d = tryExtractDomain(v.value);
          if (d) return d;
        }
        const got = scanObject(v);
        if (got) return got;
      }
    }
    return "";
  };
  // 先扫通用 row
  const scannedDomain = scanObject(row) || (Array.isArray(row?.Fields) ? scanObject(row.Fields) : "");
  if (scannedDomain) return scannedDomain;

  // 5) 模块名映射
  const moduleDomain = moduleToDomain(module || row?.module || row?.platform || "");
  if (moduleDomain) return moduleDomain;

  return "";
};

export default {
  domainFromUrl,
  domainFromEmail,
  hintDomainFromLabel,
  moduleToDomain,
  labelFromDomain,
  pickBestDomain,
};