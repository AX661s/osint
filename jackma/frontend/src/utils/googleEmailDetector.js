/**
 * Google邮箱检测和数据处理工具
 */

/**
 * 检测是否为Google邮箱
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为Google邮箱
 */
export const isGoogleEmail = (email) => {
  if (!email) return false;
  
  const googleDomains = [
    'gmail.com',
    'googlemail.com',
    'google.com'
  ];
  
  const domain = email.toLowerCase().split('@')[1];
  return googleDomains.includes(domain);
};

/**
 * 从综合身份信息档案中提取Google邮箱
 * @param {Object} profileData - 档案数据
 * @returns {Array} Google邮箱列表
 */
export const extractGoogleEmails = (profileData) => {
  if (!profileData) return [];
  
  const emails = [];
  
  // 从emails字段提取
  if (profileData.emails && Array.isArray(profileData.emails)) {
    profileData.emails.forEach(emailObj => {
      const email = typeof emailObj === 'string' ? emailObj : emailObj.email;
      if (email && isGoogleEmail(email)) {
        emails.push(email);
      }
    });
  }
  
  // 从其他可能的字段提取
  if (profileData.email && isGoogleEmail(profileData.email)) {
    emails.push(profileData.email);
  }
  
  // 从社交媒体账户中提取
  if (profileData.social_media && Array.isArray(profileData.social_media)) {
    profileData.social_media.forEach(social => {
      if (social.email && isGoogleEmail(social.email)) {
        emails.push(social.email);
      }
    });
  }
  
  // 从联系信息中提取
  if (profileData.contact_info) {
    const contact = profileData.contact_info;
    if (contact.email && isGoogleEmail(contact.email)) {
      emails.push(contact.email);
    }
    if (contact.emails && Array.isArray(contact.emails)) {
      contact.emails.forEach(email => {
        const emailStr = typeof email === 'string' ? email : email.email;
        if (emailStr && isGoogleEmail(emailStr)) {
          emails.push(emailStr);
        }
      });
    }
  }
  
  // 去重并返回
  return [...new Set(emails)];
};

/**
 * 检查搜索结果中是否包含Google邮箱
 * @param {Object} searchResults - 搜索结果数据
 * @returns {Object} 包含Google邮箱信息的对象
 */
export const checkForGoogleEmails = (searchResults) => {
  if (!searchResults || !searchResults.data) {
    return { hasGoogleEmails: false, emails: [] };
  }
  
  const emails = [];
  
  // 检查主要数据
  const mainData = searchResults.data;
  emails.push(...extractGoogleEmails(mainData));
  
  // 检查external_lookup数据
  if (mainData.external_lookup) {
    emails.push(...extractGoogleEmails(mainData.external_lookup));
  }
  
  // 检查其他数据源
  if (mainData.sources && Array.isArray(mainData.sources)) {
    mainData.sources.forEach(source => {
      emails.push(...extractGoogleEmails(source));
    });
  }
  
  const uniqueEmails = [...new Set(emails)];
  
  return {
    hasGoogleEmails: uniqueEmails.length > 0,
    emails: uniqueEmails,
    count: uniqueEmails.length
  };
};