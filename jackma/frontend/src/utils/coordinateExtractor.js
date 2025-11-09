/**
 * 坐标提取工具
 * 从平台数据中提取地理坐标
 */

import { PlatformIdentifier } from './platformIdentifier';

export class CoordinateExtractor {
  /**
   * 限制数值范围
   */
  static clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  /**
   * 检查是否为有效数字
   */
  static isFiniteNum(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  /**
   * 解析数值
   */
  static parseNum(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /**
   * 尝试从对象中获取坐标
   * @param {Object} obj - 要提取坐标的对象
   * @returns {Object|null} {lat, lon} 或 null
   */
  static tryGetCoords(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // 1. 直接键
    const lat = this.parseNum(obj.latitude ?? obj.lat ?? obj.y ?? obj.ycoord);
    const lon = this.parseNum(obj.longitude ?? obj.lon ?? obj.lng ?? obj.x ?? obj.xcoord);
    
    if (this.isFiniteNum(lat) && this.isFiniteNum(lon)) {
      const clat = this.clamp(lat, -90, 90);
      const clon = this.clamp(lon, -180, 180);
      // 排除 (0, 0) 坐标
      if (!(clat === 0 && clon === 0)) {
        return { lat: clat, lon: clon };
      }
    }

    // 2. 坐标数组
    const coords = obj.coordinates || obj.coord || obj.center || null;
    if (Array.isArray(coords) && coords.length >= 2) {
      const c0 = this.parseNum(coords[0]);
      const c1 = this.parseNum(coords[1]);
      
      if (this.isFiniteNum(c0) && this.isFiniteNum(c1)) {
        // 自动判断哪个是纬度（-90到90）
        let latGuess = c0;
        let lonGuess = c1;
        if (Math.abs(c0) > 90 && Math.abs(c1) <= 90) {
          latGuess = c1;
          lonGuess = c0;
        }
        
        const clat = this.clamp(latGuess, -90, 90);
        const clon = this.clamp(lonGuess, -180, 180);
        if (!(clat === 0 && clon === 0)) {
          return { lat: clat, lon: clon };
        }
      }
    }

    // 3. 嵌套对象
    const nestedKeys = ['location', 'geo', 'geocode', 'place', 'address'];
    for (const key of nestedKeys) {
      if (obj[key] && typeof obj[key] === 'object') {
        const got = this.tryGetCoords(obj[key]);
        if (got) return got;
      }
    }

    // 4. 任意嵌套遍历（浅层）
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        const got = this.tryGetCoords(value);
        if (got) return got;
      }
    }

    return null;
  }

  /**
   * 从Melissa平台提取坐标
   * @param {Array} platforms - 平台数组
   * @returns {Object|null} {lat, lon} 或 null
   */
  static extractFromMelissa(platforms) {
    if (!Array.isArray(platforms)) return null;

    for (const platform of platforms) {
      if (!PlatformIdentifier.isMelissa(platform)) continue;

      // 尝试从 data 字段提取
      const c1 = this.tryGetCoords(platform.data);
      if (c1) return c1;

      // 尝试从平台本身提取
      const c2 = this.tryGetCoords(platform);
      if (c2) return c2;
    }

    return null;
  }

  /**
   * 从平台列表中提取所有坐标
   * @param {Array} platforms - 平台数组
   * @returns {Array} 坐标数组 [{lat, lon, source}]
   */
  static extractAll(platforms) {
    if (!Array.isArray(platforms)) return [];

    const coordinates = [];

    for (const platform of platforms) {
      const coords = this.tryGetCoords(platform.data) || this.tryGetCoords(platform);
      if (coords) {
        coordinates.push({
          ...coords,
          source: platform.source || platform.module || 'unknown'
        });
      }
    }

    return coordinates;
  }
}

export default CoordinateExtractor;
