/**
 * 姓名提取工具
 * 使用策略模式从各种数据结构中提取姓名
 */

export class NameExtractor {
  /**
   * 检查是否为有效字符串
   */
  static isValidString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * 组合姓名字段
   */
  static combineName(first, last, middle) {
    const parts = [first, middle, last]
      .filter(part => this.isValidString(part))
      .map(part => part.trim());
    
    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * 提取策略列表
   */
  static STRATEGIES = [
    // 策略1：直接字段匹配
    (obj) => {
      const directFields = [
        'name', 'full_name', 'fullname', 'display_name', 'real_name',
        'profile_name', 'account_name', 'person_name', 'owner_name',
        'username', 'Name', 'FullName', 'DisplayName'
      ];
      
      for (const field of directFields) {
        const value = obj[field];
        if (NameExtractor.isValidString(value)) {
          return value.trim();
        }
      }
      return null;
    },

    // 策略2：组合字段（first + last + middle）
    (obj) => {
      const first = obj.first_name || obj.FirstName || obj.first || obj.FName;
      const last = obj.last_name || obj.LastName || obj.last || obj.LName;
      const middle = obj.middle_name || obj.MiddleName || obj.mname || obj.MName;
      
      return NameExtractor.combineName(first, last, middle);
    },

    // 策略3：嵌套name对象
    (obj) => {
      if (obj.name && typeof obj.name === 'object') {
        // 尝试从name对象中提取
        const fromNameObj = NameExtractor.combineName(
          obj.name.first || obj.name.first_name,
          obj.name.last || obj.name.last_name,
          obj.name.middle || obj.name.middle_name
        );
        
        if (fromNameObj) return fromNameObj;
        
        // 尝试name.full或name.value
        if (NameExtractor.isValidString(obj.name.full)) {
          return obj.name.full.trim();
        }
        if (NameExtractor.isValidString(obj.name.value)) {
          return obj.name.value.trim();
        }
      }
      return null;
    },

    // 策略4：数组字段（names, aliases, aka）
    (obj) => {
      const arrayFields = ['names', 'aliases', 'aka', 'people', 'individuals'];
      
      for (const field of arrayFields) {
        const arr = obj[field];
        if (Array.isArray(arr) && arr.length > 0) {
          for (const item of arr) {
            if (NameExtractor.isValidString(item)) {
              return item.trim();
            }
            if (item && typeof item === 'object') {
              const nested = NameExtractor.extract(item);
              if (nested) return nested;
            }
          }
        }
      }
      return null;
    },

    // 策略5：嵌套容器对象
    (obj) => {
      const containers = [
        'user_info', 'person', 'owner', 'individual', 
        'user', 'contact', 'profile'
      ];
      
      for (const container of containers) {
        if (obj[container] && typeof obj[container] === 'object') {
          const nested = NameExtractor.extract(obj[container]);
          if (nested) return nested;
        }
      }
      return null;
    }
  ];

  /**
   * 从对象中提取姓名
   * @param {Object} obj - 要提取姓名的对象
   * @returns {string|null} 提取到的姓名，如果没有则返回null
   */
  static extract(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    // 依次尝试每个策略
    for (const strategy of this.STRATEGIES) {
      try {
        const result = strategy(obj);
        if (result) return result;
      } catch (error) {
        // 策略失败，继续下一个
        console.warn('Name extraction strategy failed:', error);
      }
    }

    return null;
  }

  /**
   * 检查平台是否检测到姓名
   * @param {Object} platform - 平台对象
   * @returns {boolean}
   */
  static hasDetectedName(platform) {
    if (!platform || typeof platform !== 'object') {
      return false;
    }

    // 检查顶层
    if (this.extract(platform)) return true;

    // 检查data字段
    if (this.extract(platform.data)) return true;

    // 检查spec_format数组
    if (Array.isArray(platform.spec_format)) {
      for (const item of platform.spec_format) {
        if (this.extract(item)) return true;
      }
    }

    return false;
  }
}

export default NameExtractor;
