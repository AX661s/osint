/**
 * 平台提取工具
 * 从API结果中提取和规范化平台数据
 */

import { DataNormalizer } from './dataTransformers';
import { PlatformIdentifier } from './platformIdentifier';

export class PlatformExtractor {
  /**
   * 从结果中提取平台列表
   * @param {Object} results - API返回的结果对象
   * @returns {Array} 平台数组
   */
  static extract(results) {
    if (!results?.data || !Array.isArray(results.data)) {
      console.log('❌ [PlatformExtractor] Invalid results structure:', results);
      return [];
    }

    const platforms = [];
    console.log('🔄 [PlatformExtractor] Processing results:', results.data.length);

    results.data.forEach((result, index) => {
      console.log(`📊 [PlatformExtractor] Processing result ${index}:`, result);
      const { data, source } = result;

      // 跳过 external_lookup - 只在简历视图展示
      if (source === 'external_lookup') {
        console.log('⏭️ [PlatformExtractor] Skipping external_lookup');
        return;
      }

      // 处理失败的结果
      if (!result.success || !result.data) {
        this.handleFailedResult(result, index, platforms);
        return;
      }

      // 根据source类型处理
      switch (source) {
        case 'whatsapp':
          this.extractWhatsApp(data, platforms, result.query);
          break;
        case 'social_media_scanner':
          this.extractSocialMedia(data, platforms);
          break;
        case 'osint_industries':
          this.extractOsintIndustries(data, platforms);
          break;
        case 'data_breach':
          this.extractDataBreach(data, platforms);
          break;
        case 'phone_lookup_3008':
          this.extractMelissa(data, platforms, source);
          break;
        default:
          this.extractGeneric(data, source, platforms);
      }
    });

    return platforms;
  }

  /**
   * 处理失败的结果
   */
  static handleFailedResult(result, index, platforms) {
    const maybeData = (result && typeof result.data === 'object') ? result.data : null;
    const hasKeys = maybeData && Object.keys(maybeData).length > 0;
    
    if (hasKeys) {
      console.log(`ℹ️ [PlatformExtractor] Result ${index} marked failed but contains data`);
      platforms.push(DataNormalizer.normalizePlatform({
        ...maybeData,
        module: maybeData.module || result.source || `unknown_${index}`,
        source: result.source || `unknown_${index}`,
        status: 'found'
      }));
      return;
    }

    console.log(`⚠️ [PlatformExtractor] Skipping failed result ${index}:`, result.error);
    platforms.push({
      module: result.source || `unknown_${index}`,
      source: result.source || `unknown_${index}`,
      status: 'error',
      error: result.error || '查询失败',
      data: {}
    });
  }

  /**
   * 提取WhatsApp数据
   */
  static extractWhatsApp(data, platforms, query) {
    const wdata = (data && typeof data === 'object') ? data : {};

    const isWhatsAppFound = DataNormalizer.toBoolean(
      wdata.whatsapp_found ?? wdata.exists ?? wdata.isUser ?? 
      wdata.account_exists ?? wdata.accountExists
    );

    const profilePicUrl = (
      wdata.profilePicUrl || wdata.profilePic || wdata.picture || 
      wdata.avatar || wdata.urlImage
    );

    const phoneNumber = wdata.phone || wdata.number || query;

    let idObj = wdata.id;
    const jid = wdata.jid || wdata.JID || wdata.whatsappJid;
    if (!idObj && typeof jid === 'string') {
      const [userPart, serverPart] = jid.split('@');
      idObj = {
        user: userPart || undefined,
        server: serverPart || undefined,
        _serialized: jid
      };
    }

    const normalized = {
      module: 'whatsapp',
      source: 'whatsapp',
      status: isWhatsAppFound ? 'found' : 'not_found',
      data: {
        ...wdata,
        isUser: DataNormalizer.toBoolean(wdata.isUser ?? isWhatsAppFound),
        profilePicUrl,
        phone: phoneNumber,
        id: idObj || wdata.id
      }
    };

    platforms.push(DataNormalizer.normalizePlatform(normalized));
    console.log(`✅ [PlatformExtractor] Added WhatsApp (status: ${isWhatsAppFound ? 'found' : 'not_found'})`);
  }

  /**
   * 提取社交媒体数据
   */
  static extractSocialMedia(data, platforms) {
    console.log(`🎯 [PlatformExtractor] Processing Social Media Scanner data:`, data);
    
    if (typeof data !== 'object' || data === null) {
      console.log('⚠️ [PlatformExtractor] Social Media Scanner has no parsable data');
      return;
    }

    Object.entries(data).forEach(([platform, info]) => {
      const platformLower = String(platform).toLowerCase();
      
      // 跳过 WhatsApp
      if (platformLower === 'whatsapp' || platformLower === 'whats app') {
        console.log(`⏭️ [PlatformExtractor] Skipping WhatsApp from social_media_scanner`);
        return;
      }
      
      if (typeof info === 'object' && info !== null) {
        const isLive = info.live === true;
        if (isLive) {
          platforms.push({
            module: platform,
            platform_name: platform,
            status: 'found',
            live: info.live,
            note: info.note || '',
            source: 'social_media_scanner',
            platform_type: 'social_media',
            detection_result: '检测到账户',
            account_exists: true
          });
          console.log(`✅ [PlatformExtractor] Added social media platform: ${platform}`);
        }
      }
    });
  }

  /**
   * 提取OSINT Industries数据
   */
  static extractOsintIndustries(data, platforms) {
    console.log('🎯 [PlatformExtractor] Processing OSINT Industries data');
    
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          const enrichedPlatforms = value.map(item => {
            const platformModule = item.module || key;
            return DataNormalizer.normalizePlatform({
              ...item,
              module: platformModule,
              platform_name: platformModule,
              source: 'osint_industries',
              status: item.status || (Object.keys(item).length > 2 ? 'found' : 'not_found')
            });
          });
          platforms.push(...enrichedPlatforms);
          console.log(`✅ [PlatformExtractor] Added ${enrichedPlatforms.length} platforms from key: ${key}`);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (Object.keys(value).length > 0) {
          const platformModule = value.module || key;
          platforms.push(DataNormalizer.normalizePlatform({
            ...value,
            module: platformModule,
            platform_name: platformModule,
            source: 'osint_industries',
            status: value.status || 'found'
          }));
          console.log(`✅ [PlatformExtractor] Added single platform: ${platformModule}`);
        }
      }
    });
  }

  /**
   * 提取数据泄露数据
   */
  static extractDataBreach(data, platforms) {
    console.log(`🎯 [PlatformExtractor] Processing data_breach data:`, data);
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('⚠️ [PlatformExtractor] data_breach data is not an array or is empty');
      return;
    }

    data.forEach((dbPlatform) => {
      if (dbPlatform && typeof dbPlatform === 'object') {
        platforms.push(DataNormalizer.normalizePlatform({
          ...dbPlatform,
          module: dbPlatform.database_name || dbPlatform.platform_name || dbPlatform.module || 'Unknown Database',
          platform_name: dbPlatform.database_name || dbPlatform.platform_name || 'Unknown Database',
          source: 'data_breach',
          status: 'found'
        }));
        console.log(`✅ [PlatformExtractor] Added data breach database: ${dbPlatform.database_name || dbPlatform.platform_name}`);
      }
    });
  }

  /**
   * 提取Melissa数据
   */
  static extractMelissa(data, platforms, source) {
    try {
      const pdata = (data && typeof data === 'object') ? data : {};
      const names = Array.isArray(pdata.platform_names)
        ? pdata.platform_names
        : Object.keys(pdata).filter(k => (
            k !== 'platform_names' && k !== 'platform_count' && k !== 'summary' &&
            typeof pdata[k] === 'object' && pdata[k] !== null
          ));
      
      if (Array.isArray(names) && names.length > 0) {
        names.forEach((name) => {
          const info = (pdata.platforms && pdata.platforms[name])
            || pdata[name]
            || (pdata.data && pdata.data[name])
            || {};
          const hasInfo = info && typeof info === 'object' && Object.keys(info).length > 0;
          platforms.push(DataNormalizer.normalizePlatform({
            module: name,
            platform_name: name,
            source: source,
            status: hasInfo ? 'found' : 'not_found',
            data: hasInfo ? info : { platform: name }
          }));
        });
        return;
      }
    } catch (e) {
      console.warn('⚠️ [PlatformExtractor] Melissa extraction failed:', e?.message || e);
    }

    // 回退为单卡片
    this.extractGeneric(data, source, platforms);
  }

  /**
   * 提取通用数据
   */
  static extractGeneric(data, source, platforms) {
    console.log(`🎯 [PlatformExtractor] Processing ${source} data:`, data);
    
    if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
      platforms.push(DataNormalizer.normalizePlatform({
        ...data,
        module: data.module || source,
        source: source,
        status: 'found'
      }));
    }
  }
}

export default PlatformExtractor;
