/**
 * 标志检测工具
 * 用于检测平台数据中的布尔标志
 */

export class FlagDetector {
  /**
   * 真值集合
   */
  static TRUE_VALUES = new Set(['true', 'yes', 'found', 'valid', '1']);

  /**
   * 假值集合
   */
  static FALSE_VALUES = new Set(['false', 'no', 'not_found', 'invalid', '0']);

  /**
   * 规范化值为布尔值
   * @param {any} value - 要规范化的值
   * @returns {boolean|null} 布尔值或null（无法确定）
   */
  static normalizeValue(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value === 1;
    }
    
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (this.TRUE_VALUES.has(normalized)) return true;
      if (this.FALSE_VALUES.has(normalized)) return false;
    }
    
    return null;
  }

  /**
   * 收集候选对象
   * @param {Object} platform - 平台对象
   * @returns {Array} 候选对象数组
   */
  static collectCandidates(platform) {
    const candidates = [];
    
    if (platform && typeof platform === 'object') {
      candidates.push(platform);
    }
    
    if (platform?.data && typeof platform.data === 'object') {
      candidates.push(platform.data);
    }
    
    if (Array.isArray(platform?.spec_format)) {
      const validItems = platform.spec_format.filter(
        item => item && typeof item === 'object'
      );
      candidates.push(...validItems);
    }
    
    return candidates;
  }

  /**
   * 检查是否有指定的标志
   * @param {Object} platform - 平台对象
   * @param {Array<string>} keys - 要检查的键名数组
   * @param {boolean} expectedValue - 期望的值（true或false）
   * @returns {boolean}
   */
  static hasFlag(platform, keys, expectedValue) {
    const candidates = this.collectCandidates(platform);
    
    for (const obj of candidates) {
      for (const key of keys) {
        if (key in obj) {
          const normalized = this.normalizeValue(obj[key]);
          if (normalized === expectedValue) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * 检查是否有真值标志
   * @param {Object} platform - 平台对象
   * @param {Array<string>} keys - 要检查的键名数组
   * @returns {boolean}
   */
  static hasTrueFlag(platform, keys) {
    return this.hasFlag(platform, keys, true);
  }

  /**
   * 检查是否有假值标志
   * @param {Object} platform - 平台对象
   * @param {Array<string>} keys - 要检查的键名数组
   * @returns {boolean}
   */
  static hasFalseFlag(platform, keys) {
    return this.hasFlag(platform, keys, false);
  }

  /**
   * 检查是否有账户存在的证据
   * @param {Object} platform - 平台对象
   * @param {Array<string>} extraKeys - 额外的键名
   * @returns {boolean}
   */
  static hasEvidenceOfAccount(platform, extraKeys = []) {
    const candidates = this.collectCandidates(platform);
    const keys = [
      'profile_url', 'profile', 'url', 'homepage', 'link',
      'username', 'user_name', 'handle', 'account_id', 
      'id', 'user_id',
      ...extraKeys
    ];
    
    for (const obj of candidates) {
      for (const key of keys) {
        const value = obj?.[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 检查消息中是否包含指定子串
   * @param {Object} platform - 平台对象
   * @param {Array<string>} substrings - 要检查的子串数组
   * @returns {boolean}
   */
  static messageIncludes(platform, substrings) {
    const candidates = this.collectCandidates(platform);
    const messageKeys = ['message', 'status_text', 'note', 'error'];
    
    for (const obj of candidates) {
      for (const key of messageKeys) {
        const value = obj?.[key];
        if (typeof value === 'string') {
          const normalized = value.toLowerCase();
          if (substrings.some(sub => normalized.includes(sub.toLowerCase()))) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
}

export default FlagDetector;
