/**
 * LinkedIn 头像获取工具
 * 根据用户名获取LinkedIn头像
 */

// LinkedIn头像API端点
const LINKEDIN_AVATAR_API = 'https://api.linkedin.com/v2/people/';
const PROXY_AVATAR_ENDPOINT = '/api/avatar/linkedin';

/**
 * 根据LinkedIn用户名获取头像URL
 * @param {string} username - LinkedIn用户名 (如: susan-abazia-59108b111)
 * @returns {Promise<string|null>} 头像URL或null
 */
export const getLinkedInAvatarByUsername = async (username) => {
  if (!username) return null;
  
  try {
    console.log(`🔍 [LinkedIn] Fetching avatar for username: ${username}`);
    
    // 构建LinkedIn profile URL
    const profileUrl = `https://www.linkedin.com/in/${username}`;
    console.log(`🔗 [LinkedIn] Profile URL: ${profileUrl}`);
    
    // 方法1: 尝试使用LinkedIn公开API获取头像
    const apiResponse = await fetchLinkedInAvatarFromAPI(username);
    if (apiResponse) {
      console.log(`✅ [LinkedIn] Got avatar from API: ${apiResponse}`);
      return apiResponse;
    }
    
    // 方法2: 尝试从LinkedIn公开页面解析头像
    const scrapedAvatar = await scrapeLinkedInAvatar(profileUrl);
    if (scrapedAvatar) {
      console.log(`✅ [LinkedIn] Got avatar from scraping: ${scrapedAvatar}`);
      return scrapedAvatar;
    }
    
    // 方法3: 使用默认LinkedIn头像生成
    const defaultAvatar = generateDefaultLinkedInAvatar(username);
    console.log(`🎨 [LinkedIn] Using default avatar: ${defaultAvatar}`);
    return defaultAvatar;
    
  } catch (error) {
    console.error('❌ [LinkedIn] Error fetching avatar:', error);
    return null;
  }
};

/**
 * 从LinkedIn API获取头像
 * @param {string} username - LinkedIn用户名
 * @returns {Promise<string|null>}
 */
const fetchLinkedInAvatarFromAPI = async (username) => {
  try {
    // 注意: 这需要LinkedIn API访问权限和OAuth token
    // 在实际生产环境中需要配置LinkedIn开发者应用
    const response = await fetch(`${PROXY_AVATAR_ENDPOINT}?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.avatar_url || null;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ [LinkedIn] API fetch failed:', error);
    return null;
  }
};

/**
 * 从LinkedIn公开页面抓取头像
 * @param {string} profileUrl - LinkedIn profile URL
 * @returns {Promise<string|null>}
 */
const scrapeLinkedInAvatar = async (profileUrl) => {
  try {
    // 使用代理服务抓取LinkedIn页面
    const response = await fetch('/api/avatar/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: profileUrl })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.avatar_url || null;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ [LinkedIn] Scraping failed:', error);
    return null;
  }
};

/**
 * 生成默认LinkedIn风格头像
 * @param {string} username - LinkedIn用户名
 * @returns {string}
 */
const generateDefaultLinkedInAvatar = (username) => {
  // 提取姓名首字母
  const initials = extractInitialsFromUsername(username);
  
  // 使用LinkedIn品牌色生成头像
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0A66C2&color=ffffff&size=200&font-size=0.6&format=png&rounded=true`;
  
  return avatarUrl;
};

/**
 * 从用户名提取姓名首字母
 * @param {string} username - LinkedIn用户名 (如: susan-abazia-59108b111)
 * @returns {string}
 */
const extractInitialsFromUsername = (username) => {
  if (!username) return 'U';
  
  // 移除数字和特殊字符，分割单词
  const words = username
    .replace(/[-_\d]/g, ' ')
    .split(' ')
    .filter(word => word.length > 1 && /^[a-zA-Z]+$/.test(word));
  
  if (words.length >= 2) {
    // 取前两个单词的首字母
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  } else if (words.length === 1) {
    // 取第一个单词的前两个字母
    return words[0].slice(0, 2).toUpperCase();
  } else {
    // 默认返回U
    return 'U';
  }
};

/**
 * 从完整姓名生成头像
 * @param {string} fullName - 完整姓名 (如: Susan Abazia)
 * @returns {string}
 */
export const generateLinkedInAvatarFromName = (fullName) => {
  if (!fullName) return null;
  
  const words = fullName.trim().split(/\s+/);
  let initials = '';
  
  if (words.length >= 2) {
    initials = `${words[0][0]}${words[1][0]}`.toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  } else {
    initials = 'U';
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0A66C2&color=ffffff&size=200&font-size=0.6&format=png&rounded=true`;
};

/**
 * 批量获取LinkedIn头像
 * @param {Array} usernames - LinkedIn用户名数组
 * @returns {Promise<Object>} 用户名到头像URL的映射
 */
export const batchGetLinkedInAvatars = async (usernames) => {
  const avatarMap = {};
  
  const promises = usernames.map(async (username) => {
    const avatar = await getLinkedInAvatarByUsername(username);
    avatarMap[username] = avatar;
  });
  
  await Promise.all(promises);
  return avatarMap;
};

/**
 * LinkedIn头像缓存
 */
const avatarCache = new Map();

/**
 * 带缓存的LinkedIn头像获取
 * @param {string} username - LinkedIn用户名
 * @returns {Promise<string|null>}
 */
export const getCachedLinkedInAvatar = async (username) => {
  if (!username) return null;
  
  // 检查缓存
  if (avatarCache.has(username)) {
    console.log(`💾 [LinkedIn] Using cached avatar for: ${username}`);
    return avatarCache.get(username);
  }
  
  // 获取新头像
  const avatar = await getLinkedInAvatarByUsername(username);
  
  // 缓存结果
  if (avatar) {
    avatarCache.set(username, avatar);
  }
  
  return avatar;
};