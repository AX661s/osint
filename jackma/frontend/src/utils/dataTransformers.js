/**
 * 数据转换和规范化工具
 * 用于统一处理API返回的数据格式
 */

export class DataNormalizer {
  /**
   * 规范化值 - 递归解包嵌套的 {type, proper_key, value} 结构
   * @param {any} value - 要规范化的值
   * @returns {any} 规范化后的值
   */
  static normalizeValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => this.normalizeValue(v));
    }
    
    if (typeof value === 'object') {
      // 如果对象有 value 字段，解包它
      if ('value' in value) {
        return this.normalizeValue(value.value);
      }
      
      // 递归处理对象的所有字段
      const normalized = {};
      for (const [key, val] of Object.entries(value)) {
        normalized[key] = this.normalizeValue(val);
      }
      return normalized;
    }
    
    return value;
  }

  /**
   * 规范化平台数据
   * @param {Object} platform - 平台对象
   * @returns {Object} 规范化后的平台对象
   */
  static normalizePlatform(platform) {
    if (!platform || typeof platform !== 'object') {
      return platform;
    }

    const normalized = { ...platform };
    
    // 规范化 data 字段
    if (normalized.data) {
      normalized.data = this.normalizeValue(normalized.data);
    }
    
    // 规范化 spec_format 数组
    if (Array.isArray(normalized.spec_format)) {
      normalized.spec_format = normalized.spec_format.map(obj => 
        this.normalizeValue(obj)
      );
    }
    
    // 规范化其他顶层字段
    for (const [key, value] of Object.entries(normalized)) {
      if (key !== 'data' && key !== 'spec_format') {
        normalized[key] = this.normalizeValue(value);
      }
    }
    
    return normalized;
  }

  /**
   * 转换布尔值
   * @param {any} value - 要转换的值
   * @returns {boolean} 布尔值
   */
  static toBoolean(value) {
    if (value === true) return true;
    if (value === false) return false;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n', 'none'].includes(normalized)) return false;
      return Boolean(value);
    }
    return !!value;
  }
}

export default DataNormalizer;
