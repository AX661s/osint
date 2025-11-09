/**
 * 平台识别工具
 * 用于识别和分类不同的OSINT平台
 */

export class PlatformIdentifier {
  /**
   * 平台类型定义
   */
  static PLATFORM_TYPES = {
    WHATSAPP: ['whatsapp', 'whats app'],
    TELEGRAM: ['telegram', 'telegram_complete', 't.me'],
    STRICT_NAME: ['truecaller', 'callapp', 'melissa', 'phone_lookup', 'phone_lookup_3008', 'mei'],
    MICROSOFT: ['microsoft', 'microsoft_phone'],
    IPQS: ['ipqualityscore'],
    SOCIAL_MEDIA: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'],
    DATA_BREACH: ['data_breach', 'hibp', 'haveibeenpwned']
  };

  /**
   * 获取平台ID
   * @param {Object} platform - 平台对象
   * @returns {string} 平台ID（小写）
   */
  static getId(platform) {
    if (!platform) return '';
    return String(
      platform.platform_name || 
      platform.module || 
      platform.source || 
      ''
    ).toLowerCase();
  }

  /**
   * 检查平台是否属于指定类型
   * @param {Object} platform - 平台对象
   * @param {string} type - 类型名称（PLATFORM_TYPES的键）
   * @returns {boolean}
   */
  static isType(platform, type) {
    const id = this.getId(platform);
    const patterns = this.PLATFORM_TYPES[type];
    
    if (!patterns) return false;
    
    return patterns.some(pattern => 
      id === pattern || id.includes(pattern)
    );
  }

  /**
   * 便捷方法：检查是否为WhatsApp
   */
  static isWhatsApp(platform) {
    return this.isType(platform, 'WHATSAPP');
  }

  /**
   * 便捷方法：检查是否为Telegram
   */
  static isTelegram(platform) {
    return this.isType(platform, 'TELEGRAM');
  }

  /**
   * 便捷方法：检查是否为严格姓名平台
   * （这些平台必须检测到姓名才显示）
   */
  static isStrictName(platform) {
    return this.isType(platform, 'STRICT_NAME');
  }

  /**
   * 便捷方法：检查是否为Microsoft平台
   */
  static isMicrosoft(platform) {
    return this.isType(platform, 'MICROSOFT');
  }

  /**
   * 便捷方法：检查是否为IPQualityScore
   */
  static isIPQS(platform) {
    return this.isType(platform, 'IPQS');
  }

  /**
   * 便捷方法：检查是否为社交媒体平台
   */
  static isSocialMedia(platform) {
    return this.isType(platform, 'SOCIAL_MEDIA');
  }

  /**
   * 便捷方法：检查是否为数据泄露平台
   */
  static isDataBreach(platform) {
    return this.isType(platform, 'DATA_BREACH');
  }

  /**
   * 检查是否为Melissa相关平台
   */
  static isMelissa(platform) {
    const id = this.getId(platform);
    return id.includes('melissa') || 
           id === 'phone_lookup' || 
           id === 'phone_lookup_3008';
  }
}

export default PlatformIdentifier;
