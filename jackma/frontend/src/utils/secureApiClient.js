/**
 * 安全的API客户端
 * 包含：错误处理、请求拦截、响应拦截、超时控制、重试机制
 */

import DOMPurify from 'dompurify';
import { toast } from 'sonner';

class SecureApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
    this.timeout = config.timeout || 30000; // 30秒超时
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.sessionToken = null;
    this.csrfToken = null;
    
    // 请求拦截器
    this.requestInterceptors = [];
    // 响应拦截器
    this.responseInterceptors = [];
    
    // 添加默认拦截器
    this.addDefaultInterceptors();
  }

  /**
   * 设置Session Token
   */
  setSessionToken(token) {
    this.sessionToken = token;
  }

  /**
   * 设置CSRF Token
   */
  setCsrfToken(token) {
    this.csrfToken = token;
  }

  /**
   * 清除所有Token
   */
  clearTokens() {
    this.sessionToken = null;
    this.csrfToken = null;
  }

  /**
   * 添加默认拦截器
   */
  addDefaultInterceptors() {
    // 请求拦截：添加认证头
    this.requestInterceptors.push((config) => {
      const headers = config.headers || {};
      
      // 添加Session Token（通过Header而非URL）
      if (this.sessionToken) {
        headers['Authorization'] = `Bearer ${this.sessionToken}`;
      }
      
      // 添加CSRF Token
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
      
      // 添加请求ID用于追踪
      headers['X-Request-ID'] = this.generateRequestId();
      
      return { ...config, headers };
    });

    // 响应拦截：统一错误处理
    this.responseInterceptors.push((response) => {
      // 检查响应状态
      if (response.status === 401) {
        this.handleUnauthorized();
      }
      
      return response;
    });
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理未授权
   */
  handleUnauthorized() {
    this.clearTokens();
    toast.error('会话已过期，请重新登录');
    // 触发登出事件
    window.dispatchEvent(new CustomEvent('unauthorized'));
  }

  /**
   * 输入清理
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  /**
   * 输入验证
   */
  validateInput(input, type) {
    const validators = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /^\+?[1-9]\d{1,14}$/,
      username: /^[a-zA-Z0-9_-]{3,50}$/,
      password: /^.{8,128}$/,
      wallet: /^(0x)?[0-9a-fA-F]{40}$/
    };
    
    if (!validators[type]) {
      return true; // 未知类型，跳过验证
    }
    
    return validators[type].test(input);
  }

  /**
   * 超时控制
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 核心请求方法
   */
  async request(endpoint, options = {}, retryCount = 0) {
    try {
      // 构建完整URL
      const url = `${this.baseURL}${endpoint}`;
      
      // 应用请求拦截器
      let config = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };
      
      for (const interceptor of this.requestInterceptors) {
        config = interceptor(config);
      }
      
      // 清理请求体中的输入
      if (config.body) {
        const bodyData = JSON.parse(config.body);
        const sanitizedData = this.sanitizeInput(bodyData);
        config.body = JSON.stringify(sanitizedData);
      }
      
      // 发起请求（带超时控制）
      const fetchPromise = fetch(url, config);
      const timeoutPromise = this.createTimeoutPromise(this.timeout);
      
      let response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // 应用响应拦截器
      for (const interceptor of this.responseInterceptors) {
        response = interceptor(response);
      }
      
      // 检查HTTP状态
      if (!response.ok) {
        // 如果是5xx错误且还有重试次数，进行重试
        if (response.status >= 500 && retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * (retryCount + 1));
          return this.request(endpoint, options, retryCount + 1);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      return data;
      
    } catch (error) {
      // 错误处理
      return this.handleError(error, endpoint, options, retryCount);
    }
  }

  /**
   * 错误处理
   */
  handleError(error, endpoint, options, retryCount) {
    // 网络错误重试
    if (error.message === 'Failed to fetch' && retryCount < this.maxRetries) {
      return this.delay(this.retryDelay * (retryCount + 1))
        .then(() => this.request(endpoint, options, retryCount + 1));
    }
    
    // 超时错误重试
    if (error.message === 'Request timeout' && retryCount < this.maxRetries) {
      return this.delay(this.retryDelay * (retryCount + 1))
        .then(() => this.request(endpoint, options, retryCount + 1));
    }
    
    // 记录错误（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        endpoint,
        error: error.message,
        retryCount
      });
    }
    
    // 生成错误ID
    const errorId = this.generateRequestId();
    
    // 向用户显示友好的错误信息
    const userMessage = this.getUserFriendlyError(error);
    toast.error(`${userMessage} (错误ID: ${errorId})`);
    
    // 抛出错误供调用者处理
    throw error;
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserFriendlyError(error) {
    const errorMessages = {
      'Failed to fetch': '网络连接失败，请检查网络',
      'Request timeout': '请求超时，请稍后重试',
      'HTTP 400': '请求参数错误',
      'HTTP 401': '未授权，请重新登录',
      'HTTP 403': '权限不足',
      'HTTP 404': '请求的资源不存在',
      'HTTP 500': '服务器错误，请稍后重试',
      'HTTP 503': '服务暂时不可用'
    };
    
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        return message;
      }
    }
    
    return '操作失败，请稍后重试';
  }

  /**
   * GET请求
   */
  async get(endpoint, params = {}) {
    // 构建查询字符串
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST请求
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT请求
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * PATCH请求
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE请求
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * 文件上传
   */
  async upload(endpoint, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 上传进度
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }
      
      // 完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      });
      
      // 错误
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      // 超时
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });
      
      // 发送请求
      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.timeout = this.timeout;
      
      if (this.sessionToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.sessionToken}`);
      }
      
      xhr.send(formData);
    });
  }
}

// 创建单例实例
export const apiClient = new SecureApiClient();

// 导出类供自定义实例使用
export default SecureApiClient;
