/**
 * 字段和模块名称映射配置
 * 用于友好显示字段名称和平台名称
 */

// 字段名称映射
export const FIELD_DISPLAY_MAP = {
  // OSINT Industries 特有字段
  'category': '分类',
  'front_schemas': '前端架构',
  'front_schema': '前端架构',
  'spec_format': '规格格式',
  'query': '查询内容',
  'from': '数据来源',
  'reliable_source': '可靠来源',
  'registered': '已注册',
  'data': '数据详情',
  'note': '备注',
  'proper_key': '键名',
  'type': '类型',
  'value': '值',
  'body': '正文',
  'tags': '标签',
  'timeline': '时间线',
  'last_seen': '最后出现',
  'image': '图片',
  'platform_variables': '平台变量',
  
  // 基本信息
  'username': '用户名',
  'user_name': '用户名',
  'display_name': '显示名称',
  'full_name': '全名',
  'first_name': '名',
  'last_name': '姓',
  'name': '名称',
  'nickname': '昵称',
  'title': '标题',
  'description': '描述',
  
  // 联系方式
  'email': '邮箱',
  'email_address': '邮箱地址',
  'phone': '电话号码',
  'phone_number': '电话号码',
  'mobile': '手机号码',
  'website': '网站',
  'url': '链接',
  'link': '链接',
  'homepage': '主页',
  
  // 个人资料
  'bio': '个人简介',
  'about': '关于',
  'profile': '个人资料',
  'avatar': '头像',
  'profile_picture': '头像',
  'profile_pic': '头像',
  'photo': '照片',
  'image_url': '图片链接',
  'picture': '图片',
  'cover_photo': '封面照片',
  
  // 社交媒体特定
  'followers': '粉丝数',
  'followers_count': '粉丝数',
  'following': '关注数',
  'following_count': '关注数',
  'friends_count': '好友数',
  'posts_count': '帖子数',
  'tweets_count': '推文数',
  'likes_count': '点赞数',
  'posts': '帖子',
  'tweets': '推文',
  'statuses_count': '状态数',
  'media_count': '媒体数',
  'listed_count': '列表数',
  'favourites_count': '收藏数',
  'verified': '已认证',
  'is_verified': '已认证',
  'verification': '认证状态',
  'private': '私密账户',
  'is_private': '私密账户',
  'protected': '受保护',
  'public': '公开',
  'is_public': '公开',
  
  // 位置信息
  'location': '位置',
  'address': '地址',
  'city': '城市',
  'country': '国家',
  'region': '地区',
  'state': '州/省',
  'coordinates': '坐标',
  'latitude': '纬度',
  'longitude': '经度',
  'timezone': '时区',
  'locale': '区域设置',
  
  // 时间相关
  'created_at': '创建时间',
  'updated_at': '更新时间',
  'last_active': '最后活跃',
  'join_date': '加入日期',
  'registration_date': '注册日期',
  'member_since': '加入时间',
  'account_created': '账户创建',
  'date_joined': '加入日期',
  
  // 平台特定
  'platform': '平台',
  'source': '来源',
  'service': '服务',
  'provider': '提供商',
  'site': '网站',
  'domain': '域名',
  'handle': '用户名',
  'screen_name': '显示名称',
  'slug': '标识符',
  'id': 'ID',
  'user_id': '用户ID',
  'profile_id': '个人资料ID',
  'account_id': '账户ID',
  'external_id': '外部ID',
  
  // 状态和设置
  'status': '状态',
  'active': '活跃',
  'inactive': '不活跃',
  'online': '在线',
  'offline': '离线',
  'available': '可用',
  'busy': '忙碌',
  'away': '离开',
  'settings': '设置',
  'preferences': '偏好',
  'privacy': '隐私',
  'visibility': '可见性',
  
  // TrueCaller特有字段
  'spamInfo': '垃圾信息',
  'spamScore': '垃圾评分',
  'spamType': '垃圾类型',
  'numberType': '号码类型',
  'nationalFormat': '国内格式',
  'dialingCode': '拨号代码',
  'countryCode': '国家代码',
  'carrier': '运营商',
  'internetAddress': '网络地址',
  'addresses': '地址信息',
  'emailId': '邮箱ID',
  'twitterId': 'Twitter ID',
  'facebookId': 'Facebook ID',
  'access': '访问权限',
  'enhanced': '增强信息',
  'advancedInfo': '高级信息',
  'badges': '徽章',
  'sources': '数据源',
  'phoneNumbers': '电话号码',
  'altNumbers': '备用号码',
  
  // IPQualityScore 字段
  'valid': '有效性',
  'fraud_score': '欺诈评分',
  'recent_abuse': '近期滥用',
  'VOIP': 'VOIP电话',
  'prepaid': '预付费',
  'risky': '高风险',
  'line_type': '线路类型',
  'zip_code': '邮编',
  'dialing_code': '区号',
  'active_status': '活跃状态',
  'user_activity': '用户活动',
  'associated_email_addresses': '关联邮箱',
  'sms_domain': '短信域名',
  'mcc': '移动国家代码',
  'mnc': '移动网络代码',
  'leaked': '已泄露',
  'spammer': '垃圾信息发送者',
  'do_not_call': '拒接来电',
  'request_id': '请求ID',
  'success': '成功',
  'message': '消息',
  'formatted': '格式化号码',
  'local_format': '本地格式',
  'international_format': '国际格式',
  'country_code': '国家代码',
  'area_code': '区号',
};

// 模块名称映射
export const MODULE_DISPLAY_MAP = {
  // API 模块
  'osint_industries': 'OSINT Industries',
  'social_media_scanner': '社交媒体扫描',
  'caller_id': '来电显示',
  'truecaller': 'TrueCaller',
  'ipqualityscore': 'IPQualityScore',
  'whatsapp': 'WhatsApp',
  'callapp': 'CallApp',
  'microsoft_phone': 'Microsoft',
  'phone_lookup': 'Melissa',
  'phone_lookup_3008': 'Melissa v2',
  'telegram_complete': 'Telegram',
  'telegram_username': 'Telegram',
  
  // 社交媒体平台
  'facebook': 'Facebook',
  'instagram': 'Instagram',
  'snapchat': 'Snapchat',
  'x': 'X (Twitter)',
  'google': 'Google',
  'twitter': 'Twitter',
  'linkedin': 'LinkedIn',
  'tiktok': 'TikTok',
  'youtube': 'YouTube',
  'discord': 'Discord',
  'reddit': 'Reddit',
  'pinterest': 'Pinterest',
  'tumblr': 'Tumblr',
  'vk': 'VKontakte',
  'ok': 'Odnoklassniki',
  'telegram': 'Telegram',
  'skype': 'Skype',
  'viber': 'Viber',
  'wechat': 'WeChat',
  'line': 'LINE',
  'kik': 'Kik',
  'twitch': 'Twitch',
  'steam': 'Steam',
  'spotify': 'Spotify',
  'github': 'GitHub',
  'gitlab': 'GitLab',
};

/**
 * 获取字段的友好显示名称
 * @param {string} fieldName - 字段名
 * @returns {string} 友好名称
 */
export const getFieldDisplayName = (fieldName) => {
  return FIELD_DISPLAY_MAP[fieldName] || fieldName;
};

/**
 * 获取模块的友好显示名称
 * @param {string} moduleName - 模块名
 * @returns {string} 友好名称
 */
export const getModuleDisplayName = (moduleName) => {
  return MODULE_DISPLAY_MAP[moduleName.toLowerCase()] || moduleName;
};

/**
 * 格式化数值显示
 * @param {any} value - 要格式化的值
 * @returns {any} 格式化后的值
 */
export const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  
  if (typeof value === 'number') {
    // 格式化大数字
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  return JSON.stringify(value);
};

/**
 * 提取网站URL
 * @param {object} data - 数据对象
 * @returns {string|null} URL或null
 */
export const extractWebsiteUrl = (data) => {
  if (!data || typeof data !== 'object') return null;
  
  const urlFields = ['url', 'website', 'homepage', 'link', 'profile_url', 'site_url', 'web_url'];
  
  for (const field of urlFields) {
    if (data[field] && typeof data[field] === 'string' && data[field].startsWith('http')) {
      return data[field];
    }
  }

  // 支持 OSINT Industries 的 spec_format：尝试第一项中的 URL 字段
  if (Array.isArray(data.spec_format) && data.spec_format.length > 0) {
    const spec = data.spec_format[0] || {};
    for (const field of urlFields) {
      const val = spec[field];
      if (typeof val === 'string' && val.startsWith('http')) {
        return val;
      }
    }
  }
  
  // 递归检查嵌套对象
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedUrl = extractWebsiteUrl(value);
      if (nestedUrl) return nestedUrl;
    }
  }
  
  // 智能域名映射：如果无法提取到 URL，根据平台/模块/来源返回品牌域名
  const platformName = (data.platform_name || data.module || data.source || '').toLowerCase();
  const platformDomainMap = {
    // OSINT 工具
    'ipqualityscore': 'https://www.ipqualityscore.com',
    'truecaller': 'https://www.truecaller.com',
    'callapp': 'https://www.callapp.com',
    'caller_id': 'https://www.eyecon.com',
    
    // 通讯工具
    'whatsapp': 'https://www.whatsapp.com',
    'telegram': 'https://telegram.org',
    'telegram_complete': 'https://telegram.org',
    'telegram_username': 'https://telegram.org',
    'discord': 'https://discord.com',
    'skype': 'https://www.skype.com',
    
    // 社交媒体
    'facebook': 'https://www.facebook.com',
    'instagram': 'https://www.instagram.com',
    'twitter': 'https://twitter.com',
    'x': 'https://x.com',
    'linkedin': 'https://www.linkedin.com',
    'tiktok': 'https://www.tiktok.com',
    'snapchat': 'https://www.snapchat.com',
    'reddit': 'https://www.reddit.com',
    'pinterest': 'https://www.pinterest.com',
    'tumblr': 'https://www.tumblr.com',
    'flickr': 'https://www.flickr.com',
    
    // 开发平台
    'github': 'https://github.com',
    'gitlab': 'https://gitlab.com',
    'bitbucket': 'https://bitbucket.org',
    'stackoverflow': 'https://stackoverflow.com',
    
    // 视频/流媒体
    'youtube': 'https://www.youtube.com',
    'vimeo': 'https://vimeo.com',
    'twitch': 'https://www.twitch.tv',
    'spotify': 'https://www.spotify.com',
    'soundcloud': 'https://soundcloud.com',
    'netflix': 'https://www.netflix.com',
    'hulu': 'https://www.hulu.com',
    'vivino': 'https://www.vivino.com',
    
    // 科技公司
    'microsoft_phone': 'https://www.microsoft.com',
    'microsoft': 'https://www.microsoft.com',
    'apple': 'https://www.apple.com',
    'google': 'https://www.google.com',
    'amazon': 'https://www.amazon.com',
    'adobe': 'https://www.adobe.com',
    
    // 健康/健身
    'fitbit': 'https://www.fitbit.com',
    'strava': 'https://www.strava.com',
    'myfitnesspal': 'https://www.myfitnesspal.com',
    
    // 社区/邻里
    'nextdoor': 'https://nextdoor.com',
    'meetup': 'https://www.meetup.com',
    
    // 购物/服务
    'instacart': 'https://www.instacart.com',
    'doordash': 'https://www.doordash.com',
    'uber': 'https://www.uber.com',
    'lyft': 'https://www.lyft.com',
    'airbnb': 'https://www.airbnb.com',
    
    // 媒体/内容
    'giphy': 'https://giphy.com',
    'medium': 'https://medium.com',
    'substack': 'https://substack.com',
    
    // 新闻/出版
    'newyorktimes': 'https://www.nytimes.com',
    'washingtonpost': 'https://www.washingtonpost.com',
    'theguardian': 'https://www.theguardian.com',
    'bbc': 'https://www.bbc.com',
    'cnn': 'https://www.cnn.com',
    'reuters': 'https://www.reuters.com',
    
    // 汽车
    'generalmotors': 'https://www.gm.com',
    'ford': 'https://www.ford.com',
    'tesla': 'https://www.tesla.com',
    
    // 浏览器/工具
    'firefox': 'https://www.mozilla.org/firefox',
    'chrome': 'https://www.google.com/chrome',
    'safari': 'https://www.apple.com/safari',
    'edge': 'https://www.microsoft.com/edge',
    
    // 公益/社区
    'care2': 'https://www.care2.com',
    'change': 'https://www.change.org',
    
    // 活动/票务
    'eventbrite': 'https://www.eventbrite.com',
    'ticketmaster': 'https://www.ticketmaster.com',
    'stubhub': 'https://www.stubhub.com'
  };
  
  if (platformDomainMap[platformName]) {
    return platformDomainMap[platformName];
  }
  
  return null;
};

/**
 * 提取头像URL（兼容多平台字段）
 * @param {object} data - 数据对象
 * @returns {string|null} 头像URL或null
 */
export const extractAvatarUrl = (data) => {
  if (!data || typeof data !== 'object') return null;

  // 常见头像字段名，按优先级排列（高清优先）
  const avatarFields = [
    'avatar_url_hd', 'profile_pic_url_hd', 'image_hd', 'photo_hd',  // 高清头像优先
    'avatar_url', 'avatar',
    'profile_image_url', 'profile_image', 'profile_picture', 'profile_pic', 'profile_pic_url',
    'image_url', 'image',
    'photo_url', 'photo',
    'picture_url', 'picture',
    'icon_url', 'thumbnail_url', 'thumb'
  ];

  const normalize = (url) => {
    const s = String(url || '').trim();
    if (!s) return null;
    if (s.startsWith('//')) return `https:${s}`;
    if (/^(https?:\/\/|data:image\/|blob:)/i.test(s)) return s;
    return null;
  };
  const readVal = (val) => {
    if (val == null) return null;
    if (typeof val === 'string') return normalize(val);
    if (typeof val === 'object') {
      // OSINT node { type, proper_key, value }
      if ('value' in val && typeof val.value === 'string') return normalize(val.value);
      // 可能是 { url: ... }
      if (val.url && typeof val.url === 'string') return normalize(val.url);
    }
  if (Array.isArray(val)) {
      // 优先字符串，其次对象的 value/url
      for (const item of val) {
        if (typeof item === 'string') {
          const got = normalize(item);
          if (got) return got;
        } else if (item && typeof item === 'object') {
          if ('value' in item && typeof item.value === 'string') {
            const got = normalize(item.value);
            if (got) return got;
          }
          if (item.url && typeof item.url === 'string') {
            const got = normalize(item.url);
            if (got) return got;
          }
        }
      }
      return null;
    }
    return null;
  };

  for (const field of avatarFields) {
    const val = data[field];
    const got = readVal(val);
    if (got) return got;
  }

   // 支持 OSINT Industries 的 spec_format：尝试第一项中的头像/图片字段
  if (Array.isArray(data.spec_format) && data.spec_format.length > 0) {
    // 优先查找第一项中的高清字段，再查常规字段
    for (const spec of data.spec_format) {
      for (const field of avatarFields) {
        const val = spec?.[field];
        const got = readVal(val);
        if (got) return got;
      }
    }
  }

  // 支持 front_schemas 的图片作为平台形象图
  if (Array.isArray(data.front_schemas) && data.front_schemas.length > 0) {
    const image = data.front_schemas[0]?.image;
    const got = readVal(image);
    if (got) return got;
  }

  // 某些平台可能把头像放在对象里，如 { profile: { image_url: ... } }
  const nestedCandidates = ['profile', 'user', 'account', 'data'];
  for (const k of nestedCandidates) {
    const v = data[k];
    if (v && typeof v === 'object') {
      const nested = extractAvatarUrl(v);
      if (nested) return nested;
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = extractAvatarUrl(value);
      if (nested) return nested;
    }
  }

  return null;
};
