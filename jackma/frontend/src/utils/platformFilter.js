/**
 * 平台过滤工具
 * 用于判断平台是否应该显示
 */

import { PlatformIdentifier } from './platformIdentifier';
import { FlagDetector } from './flagDetector';
import { NameExtractor } from './nameExtractor';

export class PlatformFilter {
  /**
   * 检查平台是否有有效数据
   * @param {Object} platform - 平台对象
   * @returns {boolean}
   */
  static hasValidData(platform) {
    // 如果状态不是 found，直接返回 false
    if (platform.status !== 'found') {
      return false;
    }

    // 检查 spec_format 是否有数据
    if (Array.isArray(platform.spec_format) && platform.spec_format.length > 0) {
      const specItem = platform.spec_format[0];
      if (specItem && typeof specItem === 'object') {
        if (this.hasNonEmptyData(specItem)) return true;
      }
    }

    // 检查 data 字段是否有数据
    if (platform.data && typeof platform.data === 'object') {
      if (this.hasNonEmptyData(platform.data)) return true;
    }

    // 检查平台本身是否有除了元数据外的其他字段
    const platformKeys = Object.keys(platform).filter(k => 
      !['module', 'source', 'status', 'platform_name', 'platform_type', 'data', 'spec_format', 'error'].includes(k)
    );
    
    if (platformKeys.length > 0) {
      const obj = {};
      platformKeys.forEach(k => obj[k] = platform[k]);
      if (this.hasNonEmptyData(obj)) return true;
    }

    return false;
  }

  /**
   * 检查对象是否有非空数据
   * @param {Object} obj - 要检查的对象
   * @returns {boolean}
   */
  static hasNonEmptyData(obj) {
    const dataKeys = Object.keys(obj).filter(k => 
      !['module', 'source', 'status', 'platform_name', 'platform_type'].includes(k)
    );
    
    if (dataKeys.length === 0) return false;
    
    return dataKeys.some(k => {
      const val = obj[k];
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'object' && 'value' in val) {
        return val.value !== null && val.value !== undefined && val.value !== '';
      }
      return true;
    });
  }

  /**
   * 根据平台规则判断是否应该隐藏
   * @param {Object} platform - 平台对象
   * @returns {boolean}
   */
  static isHideByPlatformRules(platform) {
    // Microsoft 平台：仅当明确不存在才隐藏
    if (PlatformIdentifier.isMicrosoft(platform)) {
      if (FlagDetector.hasTrueFlag(platform, ['exists', 'account_exists'])) return false;
      if (FlagDetector.hasEvidenceOfAccount(platform, ['email'])) return false;
      if (FlagDetector.hasFalseFlag(platform, ['exists', 'account_exists'])) return true;
    }

    // IPQualityScore：validity/valid/is_valid 为 false 则隐藏
    if (PlatformIdentifier.isIPQS(platform)) {
      if (FlagDetector.hasFalseFlag(platform, ['validity', 'valid', 'is_valid'])) return true;
    }

    // Telegram：未找到账户则隐藏
    if (PlatformIdentifier.isTelegram(platform)) {
      if (FlagDetector.hasTrueFlag(platform, ['telegram_found', 'exists', 'account_exists', 'live'])) return false;
      if (FlagDetector.hasEvidenceOfAccount(platform, ['telegram_url'])) return false;
      if (platform.status === 'not_found') return true;
      
      // 明确的否定提示文案
      if (FlagDetector.messageIncludes(platform, [
        '未找到关联的 telegram 账户',
        '未找到关联的telegram账户',
        '未找到 telegram 账户',
        'no associated telegram account',
        'no telegram account',
        'not found',
        'no account'
      ])) return true;
      
      // 否定的布尔标志
      if (FlagDetector.hasFalseFlag(platform, ['telegram_found', 'exists', 'account_exists'])) return true;
    }

    return false;
  }

  /**
   * 判断平台是否应该显示
   * @param {Object} platform - 平台对象
   * @returns {boolean}
   */
  static shouldDisplay(platform) {
    // WhatsApp单独渲染，不在列表中显示
    if (PlatformIdentifier.isWhatsApp(platform)) {
      return false;
    }

    // 保留错误和未找到的平台
    if (['error', 'quota_exceeded', 'no_data', 'not_found'].includes(platform.status)) {
      // 但要检查平台级隐藏规则
      if (this.isHideByPlatformRules(platform)) return false;
      return true;
    }

    // 对严格姓名平台：未检测到姓名则不展示
    if (platform.status === 'found' && 
        PlatformIdentifier.isStrictName(platform) && 
        !NameExtractor.hasDetectedName(platform)) {
      return false;
    }

    // 平台级隐藏规则
    if (this.isHideByPlatformRules(platform)) {
      return false;
    }

    // 对于 found 状态的平台，检查是否有有效数据
    return this.hasValidData(platform);
  }

  /**
   * 过滤平台列表
   * @param {Array} platforms - 平台数组
   * @returns {Object} 分类后的平台对象
   */
  static filterPlatforms(platforms) {
    const regular = platforms.filter(p => this.shouldDisplay(p));
    
    const found = regular.filter(p => 
      p.status === 'found' && this.hasValidData(p)
    );
    
    const errors = regular.filter(p => 
      ['error', 'quota_exceeded', 'no_data'].includes(p.status)
    );
    
    const notFound = regular.filter(p => 
      p.status === 'not_found'
    );

    return {
      regular,
      found,
      errors,
      notFound
    };
  }
}

export default PlatformFilter;
