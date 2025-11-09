/**
 * 输入验证和清理工具
 * 防止XSS、SQL注入等安全问题
 */

import DOMPurify from 'dompurify';

/**
 * 输入验证规则
 */
export const ValidationRules = {
  // 邮箱验证
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    minLength: 5,
    maxLength: 100,
    errorMessage: '请输入有效的邮箱地址'
  },
  
  // 电话号码验证（E.164格式）
  phone: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    minLength: 10,
    maxLength: 15,
    errorMessage: '请输入有效的电话号码'
  },
  
  // 用户名验证
  username: {
    pattern: /^[a-zA-Z0-9_-]{3,50}$/,
    minLength: 3,
    maxLength: 50,
    errorMessage: '用户名只能包含字母、数字、下划线和连字符，长度3-50个字符'
  },
  
  // 密码验证
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
    minLength: 8,
    maxLength: 128,
    errorMessage: '密码必须包含大小写字母、数字和特殊字符，长度8-128个字符'
  },
  
  // 简单密码验证（用于创建用户）
  passwordSimple: {
    pattern: /^.{6,128}$/,
    minLength: 6,
    maxLength: 128,
    errorMessage: '密码长度必须在6-128个字符之间'
  },
  
  // 钱包地址验证（以太坊）
  wallet: {
    pattern: /^(0x)?[0-9a-fA-F]{40}$/,
    minLength: 40,
    maxLength: 42,
    errorMessage: '请输入有效的钱包地址'
  },
  
  // ID验证
  id: {
    pattern: /^[a-zA-Z0-9-_]{1,50}$/,
    minLength: 1,
    maxLength: 50,
    errorMessage: '请输入有效的ID'
  },
  
  // 通用文本验证
  text: {
    pattern: /^[\s\S]{1,1000}$/,
    minLength: 1,
    maxLength: 1000,
    errorMessage: '文本长度必须在1-1000个字符之间'
  },
  
  // URL验证
  url: {
    pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    minLength: 10,
    maxLength: 2048,
    errorMessage: '请输入有效的URL'
  }
};

/**
 * 验证输入
 * @param {string} input - 输入值
 * @param {string} type - 验证类型
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateInput = (input, type) => {
  // 检查输入是否为空
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      error: '输入不能为空'
    };
  }
  
  // 获取验证规则
  const rule = ValidationRules[type];
  if (!rule) {
    return {
      valid: true,
      error: null
    };
  }
  
  // 去除首尾空格
  const trimmedInput = input.trim();
  
  // 检查长度
  if (trimmedInput.length < rule.minLength || trimmedInput.length > rule.maxLength) {
    return {
      valid: false,
      error: `长度必须在${rule.minLength}-${rule.maxLength}个字符之间`
    };
  }
  
  // 检查格式
  if (!rule.pattern.test(trimmedInput)) {
    return {
      valid: false,
      error: rule.errorMessage
    };
  }
  
  return {
    valid: true,
    error: null
  };
};

/**
 * 批量验证
 * @param {Object} inputs - { field: value }
 * @param {Object} types - { field: type }
 * @returns {Object} { valid: boolean, errors: Object }
 */
export const validateMultiple = (inputs, types) => {
  const errors = {};
  let valid = true;
  
  for (const [field, value] of Object.entries(inputs)) {
    const type = types[field];
    if (type) {
      const result = validateInput(value, type);
      if (!result.valid) {
        errors[field] = result.error;
        valid = false;
      }
    }
  }
  
  return { valid, errors };
};

/**
 * 清理HTML输入（防止XSS）
 * @param {string} input - 输入值
 * @param {Object} options - DOMPurify选项
 * @returns {string} 清理后的输入
 */
export const sanitizeHtml = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  const defaultOptions = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  };
  
  return DOMPurify.sanitize(input, { ...defaultOptions, ...options });
};

/**
 * 清理对象中的所有字符串
 * @param {Object} obj - 对象
 * @returns {Object} 清理后的对象
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * 检查密码强度
 * @param {string} password - 密码
 * @returns {Object} { strength: string, score: number, feedback: array }
 */
export const checkPasswordStrength = (password) => {
  if (!password) {
    return {
      strength: 'none',
      score: 0,
      feedback: ['请输入密码']
    };
  }
  
  let score = 0;
  const feedback = [];
  
  // 长度检查
  if (password.length >= 8) score += 1;
  else feedback.push('密码长度至少8个字符');
  
  if (password.length >= 12) score += 1;
  
  // 包含小写字母
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('添加小写字母');
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('添加大写字母');
  
  // 包含数字
  if (/\d/.test(password)) score += 1;
  else feedback.push('添加数字');
  
  // 包含特殊字符
  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('添加特殊字符 (@$!%*?&)');
  
  // 不包含常见密码
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score -= 2;
    feedback.push('避免使用常见密码');
  }
  
  // 确定强度
  let strength;
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else strength = 'strong';
  
  return {
    strength,
    score: Math.max(0, score),
    feedback: feedback.length > 0 ? feedback : ['密码强度良好']
  };
};

/**
 * 防止SQL注入的字符串转义
 * @param {string} input - 输入值
 * @returns {string} 转义后的字符串
 */
export const escapeSql = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
};

/**
 * 限制输入长度
 * @param {string} input - 输入值
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的字符串
 */
export const limitLength = (input, maxLength) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  if (input.length <= maxLength) {
    return input;
  }
  
  return input.substring(0, maxLength);
};

/**
 * 移除危险字符
 * @param {string} input - 输入值
 * @returns {string} 清理后的字符串
 */
export const removeDangerousChars = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // 移除控制字符和特殊字符
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // 控制字符
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // script标签
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // iframe标签
    .replace(/javascript:/gi, '') // javascript协议
    .replace(/on\w+\s*=/gi, ''); // 事件处理器
};

/**
 * 验证并清理邮箱
 * @param {string} email - 邮箱地址
 * @returns {Object} { valid: boolean, cleaned: string, error: string }
 */
export const validateAndCleanEmail = (email) => {
  const validation = validateInput(email, 'email');
  
  if (!validation.valid) {
    return {
      valid: false,
      cleaned: null,
      error: validation.error
    };
  }
  
  const cleaned = email.trim().toLowerCase();
  
  return {
    valid: true,
    cleaned,
    error: null
  };
};

/**
 * 验证并清理电话号码
 * @param {string} phone - 电话号码
 * @returns {Object} { valid: boolean, cleaned: string, error: string }
 */
export const validateAndCleanPhone = (phone) => {
  // 移除所有非数字字符（除了+号）
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // 如果没有+号，添加+号
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  const validation = validateInput(cleaned, 'phone');
  
  if (!validation.valid) {
    return {
      valid: false,
      cleaned: null,
      error: validation.error
    };
  }
  
  return {
    valid: true,
    cleaned,
    error: null
  };
};

/**
 * 验证并清理用户名
 * @param {string} username - 用户名
 * @returns {Object} { valid: boolean, cleaned: string, error: string }
 */
export const validateAndCleanUsername = (username) => {
  const cleaned = username.trim();
  const validation = validateInput(cleaned, 'username');
  
  if (!validation.valid) {
    return {
      valid: false,
      cleaned: null,
      error: validation.error
    };
  }
  
  return {
    valid: true,
    cleaned,
    error: null
  };
};

/**
 * Rate Limiter类
 * 用于限制请求频率
 */
export class RateLimiter {
  constructor(maxAttempts, timeWindow) {
    this.maxAttempts = maxAttempts; // 最大尝试次数
    this.timeWindow = timeWindow; // 时间窗口（毫秒）
    this.attempts = []; // 尝试记录
  }
  
  /**
   * 检查是否可以尝试
   * @returns {boolean}
   */
  canAttempt() {
    const now = Date.now();
    
    // 移除过期的尝试记录
    this.attempts = this.attempts.filter(
      time => now - time < this.timeWindow
    );
    
    // 检查是否超过限制
    if (this.attempts.length >= this.maxAttempts) {
      return false;
    }
    
    // 记录本次尝试
    this.attempts.push(now);
    return true;
  }
  
  /**
   * 获取剩余等待时间
   * @returns {number} 毫秒
   */
  getRemainingTime() {
    if (this.attempts.length < this.maxAttempts) {
      return 0;
    }
    
    const oldestAttempt = Math.min(...this.attempts);
    const remainingTime = this.timeWindow - (Date.now() - oldestAttempt);
    
    return Math.max(0, remainingTime);
  }
  
  /**
   * 重置限制器
   */
  reset() {
    this.attempts = [];
  }
}

/**
 * 创建常用的Rate Limiter实例
 */
export const createLoginLimiter = () => new RateLimiter(5, 60000); // 5次/分钟
export const createSearchLimiter = () => new RateLimiter(10, 60000); // 10次/分钟
export const createApiLimiter = () => new RateLimiter(30, 60000); // 30次/分钟

export default {
  ValidationRules,
  validateInput,
  validateMultiple,
  sanitizeHtml,
  sanitizeObject,
  checkPasswordStrength,
  escapeSql,
  limitLength,
  removeDangerousChars,
  validateAndCleanEmail,
  validateAndCleanPhone,
  validateAndCleanUsername,
  RateLimiter,
  createLoginLimiter,
  createSearchLimiter,
  createApiLimiter
};
