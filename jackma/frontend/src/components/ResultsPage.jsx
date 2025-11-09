import React, { useState } from 'react';
import { 
  ArrowLeft, Download, Shield, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import ThemeSwitcher from './ThemeSwitcher';
import { GlassCard } from './ui/glass-card';
import { PlatformCard } from './PlatformCard';
import { WhatsAppDisplay } from './WhatsAppDisplay';
import { StatsCards } from './StatsCards';
import GeoMap from './GeoMap';
import ExternalLookupResume from './ExternalLookupResume';
import GoogleAccountCard from './GoogleAccountCard';
import { checkForGoogleEmails } from '../utils/googleEmailDetector';

/**
 * 结果页面主组件
 * 显示 OSINT 查询结果
 */
const ResultsPage = ({ results, query, onBack }) => {
  const [showNotFound, setShowNotFound] = useState(false);
  const isEmailQuery = typeof query === 'string' && /@/.test(query);

  // 统一规范化：将形如 { type, proper_key, value } 的节点对象解包为其 value
  const sanitizeNode = (v) => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(sanitizeNode);
    if (typeof v === 'object') {
      if ('value' in v) return sanitizeNode(v.value);
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = sanitizeNode(val);
      }
      return out;
    }
    return v;
  };
  const sanitizePlatform = (p) => {
    if (!p || typeof p !== 'object') return p;
    const out = { ...p };
    out.data = sanitizeNode(out.data);
    // 规范化 spec_format：数组中的每个对象按键解包
    if (Array.isArray(out.spec_format)) {
      out.spec_format = out.spec_format.map(obj => sanitizeNode(obj));
    }
    // 其它顶层字段也解包一次（以防模块直接放在根）
    for (const [k, v] of Object.entries(out)) {
      out[k] = sanitizeNode(v);
    }
    return out;
  };

  // 提取平台数据
  const extractPlatforms = () => {
    if (!results?.data || !Array.isArray(results.data)) {
      console.log('❌ [ResultsPage] Invalid results structure:', results);
      return [];
    }

    const platforms = [];

    const toBool = (val) => {
      if (val === true) return true;
      if (val === false) return false;
      if (typeof val === 'number') return val === 1;
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(s)) return true;
        if (['false', '0', 'no', 'n', 'none'].includes(s)) return false;
        return Boolean(val);
      }
      return !!val;
    };

    console.log('🔄 [ResultsPage] Processing results:', results.data.length);

    results.data.forEach((result, index) => {
      console.log(`📊 [ResultsPage] Processing result ${index}:`, result);
      const { data, source } = result;

      // 跳过 external_lookup 和 investigate_api - 只在简历视图展示，不渲染平台卡片
      if (source === 'external_lookup' || source === 'investigate_api') {
        console.log(`⏭️ [ResultsPage] Skipping ${source} (rendered in resume view only)`);
        return;
      }

      // 聚合型接口预处理
      if (source === 'social_media_scanner') {
        console.log(`🎯 [ResultsPage] Processing Social Media Scanner data (pre-check):`, data);
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([platform, info]) => {
            // 跳过 WhatsApp - 它已经在顶部单独显示
            const platformLower = String(platform).toLowerCase();
            if (platformLower === 'whatsapp' || platformLower === 'whats app') {
              console.log(`⏭️ [ResultsPage] Skipping WhatsApp from social_media_scanner (displayed separately at top)`);
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
                console.log(`✅ [ResultsPage] Added social media platform: ${platform} (account found)`);
              }
            }
          });
        } else {
          console.log('⚠️ [ResultsPage] Social Media Scanner has no parsable data. Skip aggregator error card.');
        }
        return;
      }

      if (!result.success || !result.data) {
        // 若接口标记失败但仍携带有效数据，优先转为 found 卡片展示
        const maybeData = (result && typeof result.data === 'object') ? result.data : null;
        const hasKeys = maybeData && Object.keys(maybeData).length > 0;
        if (hasKeys) {
          console.log(`ℹ️ [ResultsPage] Result ${index} marked failed but contains data; converting to found card.`);
          platforms.push(sanitizePlatform({
            ...maybeData,
            module: maybeData.module || result.source || `unknown_${index}`,
            source: result.source || `unknown_${index}`,
            status: 'found'
          }));
          return;
        }
        console.log(`⚠️ [ResultsPage] Skipping failed result ${index}:`, result.error);
        platforms.push({
          module: result.source || `unknown_${index}`,
          source: result.source || `unknown_${index}`,
          status: 'error',
          error: result.error || '查询失败',
          data: {}
        });
        return;
      }

      // WhatsApp 专用（统一字段与回退）
      if (source === 'whatsapp') {
        const wdata = (data && typeof data === 'object') ? data : {};

        // 统一判断是否存在账号
        const isWhatsAppFound = toBool(
          wdata.whatsapp_found ?? wdata.exists ?? wdata.isUser ?? wdata.account_exists ?? wdata.accountExists
        );

        // 统一头像字段
        const profilePicUrl = (
          wdata.profilePicUrl || wdata.profilePic || wdata.picture || wdata.avatar || wdata.urlImage
        );

        // 统一号码字段
        const phoneNumber = wdata.phone || wdata.number || query;

        // 统一 JID 到 id 结构（可选）
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
            isUser: toBool(wdata.isUser ?? isWhatsAppFound),
            profilePicUrl,
            phone: phoneNumber,
            id: idObj || wdata.id
          }
        };

        platforms.push(sanitizePlatform(normalized));
        console.log(`✅ [ResultsPage] Added WhatsApp platform (status: ${isWhatsAppFound ? 'found' : 'not_found'})`);
        return;
      }

      if (source === 'osint_industries') {
        console.log('🎯 [ResultsPage] Processing OSINT Industries data');
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const enrichedPlatforms = value.map(item => {
                // 确保每个平台都有正确的 module 和 platform_name
                const platformModule = item.module || key;
                return sanitizePlatform({
                  ...item,
                  module: platformModule,
                  platform_name: platformModule,
                  source: 'osint_industries',
                  status: item.status || (Object.keys(item).length > 2 ? 'found' : 'not_found')
                });
              });
              platforms.push(...enrichedPlatforms);
              console.log(`✅ [ResultsPage] Added ${enrichedPlatforms.length} platforms from key: ${key}`);
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (Object.keys(value).length > 0) {
              const platformModule = value.module || key;
              platforms.push(sanitizePlatform({
                ...value,
                module: platformModule,
                platform_name: platformModule,
                source: 'osint_industries',
                status: value.status || 'found'
              }));
              console.log(`✅ [ResultsPage] Added single platform: ${platformModule}`);
            }
          }
        });
      } else if (source === 'social_media_scanner') {
        console.log(`🎯 [ResultsPage] Processing Social Media Scanner data:`, data);
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([platform, info]) => {
            // 跳过 WhatsApp - 它已经在顶部单独显示
            const platformLower = String(platform).toLowerCase();
            if (platformLower === 'whatsapp' || platformLower === 'whats app') {
              console.log(`⏭️ [ResultsPage] Skipping WhatsApp from social_media_scanner (displayed separately at top)`);
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
              }
            }
          });
        }
      } else if (source === 'data_breach') {
        // Data Breach API: data 是一个数组，每个元素是一个数据库
        console.log(`🎯 [ResultsPage] Processing data_breach data:`, data);
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((dbPlatform) => {
            if (dbPlatform && typeof dbPlatform === 'object') {
              platforms.push(sanitizePlatform({
                ...dbPlatform,
                module: dbPlatform.database_name || dbPlatform.platform_name || dbPlatform.module || 'Unknown Database',
                platform_name: dbPlatform.database_name || dbPlatform.platform_name || 'Unknown Database',
                source: 'data_breach',
                status: 'found'
              }));
              console.log(`✅ [ResultsPage] Added data breach database: ${dbPlatform.database_name || dbPlatform.platform_name}`);
            }
          });
        } else {
          console.log('⚠️ [ResultsPage] data_breach data is not an array or is empty');
        }
      } else {
        console.log(`🎯 [ResultsPage] Processing ${source} data:`, data);
        // Melissa v2：拆分多个平台
        if (source === 'phone_lookup_3008') {
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
                platforms.push(sanitizePlatform({
                  module: name,
                  platform_name: name,
                  source: 'phone_lookup_3008',
                  status: hasInfo ? 'found' : 'not_found',
                  data: hasInfo ? info : { platform: name }
                }));
              });
              return;
            }
          } catch (e) {
            console.warn('⚠️ [ResultsPage] Melissa v2 拆分失败，回退为单卡片:', e?.message || e);
          }
        }

        if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
          platforms.push(sanitizePlatform({
            ...data,
            module: data.module || source,
            source: source,
            status: 'found'
          }));
        }
      }
    });

    return platforms;
  };

  // 检查平台是否有有效数据
  const hasValidData = (platform) => {
    // 如果状态不是 found，直接返回 false
    if (platform.status !== 'found') {
      return false;
    }

    // 检查 spec_format 是否有数据
    if (Array.isArray(platform.spec_format) && platform.spec_format.length > 0) {
      const specItem = platform.spec_format[0];
      if (specItem && typeof specItem === 'object') {
        // 过滤掉只有 module/source/status 等元数据的对象
        const dataKeys = Object.keys(specItem).filter(k => 
          !['module', 'source', 'status', 'platform_name', 'platform_type'].includes(k)
        );
        if (dataKeys.length > 0) {
          // 检查是否有非空值
          const hasNonEmptyValue = dataKeys.some(k => {
            const val = specItem[k];
            if (val === null || val === undefined || val === '') return false;
            if (typeof val === 'object' && 'value' in val) {
              return val.value !== null && val.value !== undefined && val.value !== '';
            }
            return true;
          });
          if (hasNonEmptyValue) return true;
        }
      }
    }

    // 检查 data 字段是否有数据
    if (platform.data && typeof platform.data === 'object') {
      const dataKeys = Object.keys(platform.data).filter(k => 
        !['module', 'source', 'status', 'platform_name', 'platform_type'].includes(k)
      );
      if (dataKeys.length > 0) {
        const hasNonEmptyValue = dataKeys.some(k => {
          const val = platform.data[k];
          if (val === null || val === undefined || val === '') return false;
          if (typeof val === 'object' && 'value' in val) {
            return val.value !== null && val.value !== undefined && val.value !== '';
          }
          return true;
        });
        if (hasNonEmptyValue) return true;
      }
    }

    // 检查平台本身是否有除了元数据外的其他字段
    const platformKeys = Object.keys(platform).filter(k => 
      !['module', 'source', 'status', 'platform_name', 'platform_type', 'data', 'spec_format', 'error'].includes(k)
    );
    if (platformKeys.length > 0) {
      const hasNonEmptyValue = platformKeys.some(k => {
        const val = platform[k];
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === 'object' && 'value' in val) {
          return val.value !== null && val.value !== undefined && val.value !== '';
        }
        return true;
      });
      if (hasNonEmptyValue) return true;
    }

    return false;
  };

  // 检测是否为需要严格“有姓名才显示”的平台
  const isStrictNamePlatform = (p) => {
    const id = String(p.platform_name || p.module || p.source || '').toLowerCase();
    // 包含 Melissa 的别名与电话查询模块
    const strict = new Set(['truecaller', 'callapp', 'melissa', 'phone_lookup', 'phone_lookup_3008', 'mei']);
    return strict.has(id);
  };

  // 提取对象中的姓名字段（更鲁棒，适配 Melissa 等多样结构）
  const getNameFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;

    const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
    const combine = (first, last, middle) => {
      const parts = [first, middle, last].filter(isStr);
      return parts.length ? parts.map(s => s.trim()).join(' ') : null;
    };
    const nameKeyPatterns = [
      'name','full_name','fullname','display_name','real_name','profile_name','account_name',
      'person_name','owner_name','username',
      'first_name','last_name','given_name','surname','middle_name',
      'fname','lname','mname','first','last'
    ];
    const extraCapitalized = [
      'Name','FullName','DisplayName','RealName','ProfileName','AccountName','PersonName','OwnerName',
      'FirstName','LastName','GivenName','Surname','MiddleName','FName','LName','MName'
    ];

    // 1) 直接字符串字段命中
    for (const k of [...nameKeyPatterns, ...extraCapitalized]) {
      const v = obj[k];
      if (isStr(v)) return v.trim();
    }

    // 2) 组合式字段（first/last/middle）
    const combo = combine(
      obj.first_name || obj.FirstName || obj.first || obj.FName,
      obj.last_name || obj.LastName || obj.last || obj.LName,
      obj.middle_name || obj.MiddleName || obj.mname || obj.MName
    );
    if (isStr(combo)) return combo;

    // 3) 嵌套 name 对象
    if (obj.name && typeof obj.name === 'object') {
      const fromNameObj = combine(obj.name.first || obj.name.first_name, obj.name.last || obj.name.last_name, obj.name.middle || obj.name.middle_name)
        || (isStr(obj.name.full) ? obj.name.full : null)
        || (isStr(obj.name.value) ? obj.name.value : null);
      if (isStr(fromNameObj)) return fromNameObj.trim();
    }

    // 4) 别名/姓名数组
    const arrays = [obj.names, obj.aliases, obj.aka, obj.people, obj.individuals];
    for (const arr of arrays) {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (isStr(item)) return item.trim();
          if (item && typeof item === 'object') {
            const nested = getNameFromObject(item);
            if (nested) return nested;
          }
        }
      }
    }

    // 5) 常见嵌套容器
    const containers = ['user_info','person','owner','individual','user','contact','profile'];
    for (const key of containers) {
      if (obj[key] && typeof obj[key] === 'object') {
        const nested = getNameFromObject(obj[key]);
        if (nested) return nested;
      }
    }

    // 6) 兜底：遍历对象层级（有限深度）
    const MAX_DEPTH = 3;
    const deepScan = (o, depth) => {
      if (!o || depth > MAX_DEPTH) return null;
      if (typeof o === 'string') return isStr(o) ? o.trim() : null;
      if (Array.isArray(o)) {
        for (const it of o) {
          const got = deepScan(it, depth + 1);
          if (got) return got;
        }
        return null;
      }
      if (typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) {
          const kl = k.toLowerCase();
          if (nameKeyPatterns.some(p => kl.includes(p))) {
            if (isStr(v)) return v.trim();
            if (v && typeof v === 'object') {
              const got = deepScan(v, depth + 1);
              if (got) return got;
            }
          } else {
            const got = deepScan(v, depth + 1);
            if (got) return got;
          }
        }
      }
      return null;
    };
    return deepScan(obj, 0);
  };

  // 判断平台是否检测到姓名（在 data 或 spec_format 中）
  const hasDetectedName = (p) => {
    if (!p || typeof p !== 'object') return false;
    // 顶层与 data
    if (getNameFromObject(p)) return true;
    if (getNameFromObject(p.data)) return true;
    // spec_format 数组中寻找姓名
    if (Array.isArray(p.spec_format)) {
      for (const item of p.spec_format) {
        if (getNameFromObject(item)) return true;
      }
    }
    return false;
  };

  const platforms = extractPlatforms();
  // 过滤掉没有有效数据的平台
  // 平台级隐藏规则：根据平台与字段值隐藏卡片
  const getPlatformId = (p) => String(p.platform_name || p.module || p.source || '').toLowerCase();
  const isTelegramLike = (id) => id === 'telegram' || id === 'telegram_complete' || id === 't.me' || id.includes('telegram');
  const collectCandidates = (p) => {
    const arr = [];
    if (p && typeof p === 'object') arr.push(p);
    if (p?.data && typeof p.data === 'object') arr.push(p.data);
    if (Array.isArray(p?.spec_format)) {
      for (const item of p.spec_format) {
        if (item && typeof item === 'object') arr.push(item);
      }
    }
    return arr;
  };
  const hasTrueFlag = (p, keys) => {
    const cands = collectCandidates(p);
    for (const obj of cands) {
      for (const k of keys) {
        if (k in obj) {
          const v = obj[k];
          if (typeof v === 'boolean' && v === true) return true;
          if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (['true', 'yes', 'found', 'valid'].includes(s)) return true;
          }
          if (typeof v === 'number' && v === 1) return true;
        }
      }
    }
    return false;
  };
  const hasFalseFlag = (p, keys) => {
    const cands = collectCandidates(p);
    for (const obj of cands) {
      for (const k of keys) {
        if (k in obj) {
          const v = obj[k];
          if (typeof v === 'boolean') {
            if (v === false) return true;
          } else if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (['false', 'no', 'not_found', 'invalid'].includes(s)) return true;
          } else if (typeof v === 'number') {
            if (v === 0) return true;
          }
        }
      }
    }
    return false;
  };
  const hasEvidenceOfAccount = (p, extraKeys = []) => {
    const cands = collectCandidates(p);
    const keys = [
      'profile_url','profile','url','homepage','link','username','user_name','handle','account_id','id','user_id'
    , ...extraKeys];
    for (const obj of cands) {
      for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === 'string' && v.trim().length > 0) return true;
      }
    }
    return false;
  };
  const messageIncludes = (p, substrings) => {
    const cands = collectCandidates(p);
    const messageKeys = ['message', 'status_text', 'note', 'error'];
    for (const obj of cands) {
      for (const k of messageKeys) {
        const v = obj?.[k];
        if (typeof v === 'string') {
          const s = v.toLowerCase();
          if (substrings.some(sub => s.includes(sub.toLowerCase()))) return true;
        }
      }
    }
    return false;
  };
  const isHideByPlatformRules = (p) => {
    const id = getPlatformId(p);
    // Microsoft 平台：仅当明确不存在才隐藏；若有正向证据，优先显示
    if (id === 'microsoft' || id === 'microsoft_phone') {
      if (hasTrueFlag(p, ['exists','account_exists'])) return false;
      if (hasEvidenceOfAccount(p, ['email'])) return false;
      if (hasFalseFlag(p, ['exists','account_exists'])) return true;
    }
    // IPQualityScore：validity/valid/is_valid 为 false 则隐藏
    if (id === 'ipqualityscore') {
      if (hasFalseFlag(p, ['validity', 'valid', 'is_valid'])) return true;
    }
    // Telegram：未找到账户的文案或状态则隐藏；若有正向证据，优先显示
    if (isTelegramLike(id)) {
      if (hasTrueFlag(p, ['telegram_found','exists','account_exists','live'])) return false;
      if (hasEvidenceOfAccount(p, ['telegram_url'])) return false;
      if (p.status === 'not_found') return true;
      // 明确的否定提示文案（仅在没有正向信号时）
      if (messageIncludes(p, [
        '未找到关联的 telegram 账户',
        '未找到关联的telegram账户',
        '未找到 telegram 账户',
        'no associated telegram account',
        'no telegram account',
        'not found',
        'no account'
      ])) return true;
      // 否定的布尔标志（包括 telegram_found）
      if (hasFalseFlag(p, ['telegram_found', 'exists', 'account_exists'])) return true;
    }
    return false;
  };

  const regularPlatforms = platforms.filter(p => {
    // 单独渲染 WhatsApp，不计入“发现数据的平台”统计与列表
    if (getPlatformId(p) === 'whatsapp') return false;
    // 保留错误和未找到的平台（用户可能想看到这些信息）
    if (['error', 'quota_exceeded', 'no_data', 'not_found'].includes(p.status)) {
      // 平台级隐藏规则优先生效
      if (isHideByPlatformRules(p)) return false;
      return true;
    }
    // 对 TrueCaller / CallApp / Melissa / MEI 平台：未检测到姓名则不展示卡片
    if (p.status === 'found' && isStrictNamePlatform(p) && !hasDetectedName(p)) {
      return false;
    }
    // 平台级隐藏规则
    if (isHideByPlatformRules(p)) return false;
    // 对于 found 状态的平台，检查是否有有效数据
    return hasValidData(p);
  });
  
  const foundPlatforms = regularPlatforms.filter(p => p.status === 'found' && hasValidData(p));
  const errorPlatforms = regularPlatforms.filter(p => ['error', 'quota_exceeded', 'no_data'].includes(p.status));
  const notFoundPlatforms = regularPlatforms.filter(p => p.status === 'not_found');

  // 从 Melissa/Melissa v2 提取坐标
  const extractMelissaCoords = (plats) => {
    if (!Array.isArray(plats)) return null;

    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));
    const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);
    const parseNum = (v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    const tryGetCoords = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      // 直接键
      const lat = parseNum(obj.latitude ?? obj.lat ?? obj.y ?? obj.ycoord);
      const lon = parseNum(obj.longitude ?? obj.lon ?? obj.lng ?? obj.x ?? obj.xcoord);
      if (isFiniteNum(lat) && isFiniteNum(lon)) {
        const clat = clamp(lat, -90, 90);
        const clon = clamp(lon, -180, 180);
        if (!(clat === 0 && clon === 0)) return { lat: clat, lon: clon };
      }
      // 坐标数组
      const coords = obj.coordinates || obj.coord || obj.center || null;
      if (Array.isArray(coords) && coords.length >= 2) {
        const c0 = parseNum(coords[0]);
        const c1 = parseNum(coords[1]);
        if (isFiniteNum(c0) && isFiniteNum(c1)) {
          let latGuess = c0; let lonGuess = c1;
          if (Math.abs(c0) > 90 && Math.abs(c1) <= 90) { latGuess = c1; lonGuess = c0; }
          const clat = clamp(latGuess, -90, 90);
          const clon = clamp(lonGuess, -180, 180);
          if (!(clat === 0 && clon === 0)) return { lat: clat, lon: clon };
        }
      }
      // 嵌套对象
      const nestedKeys = ['location', 'geo', 'geocode', 'place', 'address'];
      for (const k of nestedKeys) {
        if (obj[k] && typeof obj[k] === 'object') {
          const got = tryGetCoords(obj[k]);
          if (got) return got;
        }
      }
      // 任意嵌套遍历（浅）
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object') {
          const got = tryGetCoords(v);
          if (got) return got;
        }
      }
      return null;
    };

    const isMelissaLike = (p) => {
      const m = String(p.module || '').toLowerCase();
      const s = String(p.source || '').toLowerCase();
      // 同时支持老版本 phone_lookup 与新版本 phone_lookup_3008，以及模块名包含 melissa 的情况
      return s === 'phone_lookup_3008' || s === 'phone_lookup' || m.includes('melissa') || m === 'phone_lookup';
    };

    for (const p of plats) {
      if (!isMelissaLike(p)) continue;
      const c1 = tryGetCoords(p.data);
      if (c1) return c1;
      const c2 = tryGetCoords(p);
      if (c2) return c2;
    }
    return null;
  };

  const melissaCoords = React.useMemo(() => extractMelissaCoords(regularPlatforms), [regularPlatforms]);

  const handleExport = () => {
    const exportData = {
      query,
      timestamp: new Date().toISOString(),
      summary: {
        total: platforms.length,
        found: foundPlatforms.length,
        errors: errorPlatforms.length,
        notFound: notFoundPlatforms.length
      },
      platforms: platforms,
      rawResults: results
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `osint-results-${query}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const whatsappData = [...platforms].reverse().find(p => p.source === 'whatsapp');
  // 优先使用 external_lookup（数据更完整），如果没有则使用 investigate_api
  const externalLookupData = results?.data?.find(r => r.source === 'external_lookup');
  const investigateData = results?.data?.find(r => r.source === 'investigate_api');
  const resumeData = externalLookupData || investigateData;
  const socialMediaData = results?.data?.find(r => r.source === 'social_media_scanner');
  
  // 检测Google邮箱
  const googleEmailCheck = checkForGoogleEmails(results);
  const hasGoogleEmails = googleEmailCheck.hasGoogleEmails;
  const googleEmails = googleEmailCheck.emails;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/10 dark:hover:bg-black/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">OSINT 查询结果</h1>
                <p className="text-sm text-muted-foreground font-mono mt-1">查询目标: <span className="text-primary font-semibold">{query}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 backdrop-blur-sm bg-white/5 border-white/20">
                <Download className="w-4 h-4" />
                导出 JSON
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* WhatsApp 结果展示 - 只合并 Social Media Scanner 的设备信息，不包含 External Lookup */}
        <WhatsAppDisplay 
          whatsappData={whatsappData} 
          socialMediaData={socialMediaData}
          query={query} 
          melissaCoords={melissaCoords}
        />

        <StatsCards 
          regularPlatforms={regularPlatforms}
          foundPlatforms={foundPlatforms}
          errorPlatforms={errorPlatforms}
        />

        {/* 个人简历视图 - 优先显示 investigate_api，否则显示 external_lookup */}
        {resumeData && (
          <div className="mt-12">
            <ExternalLookupResume externalLookupResult={resumeData} query={query} />
          </div>
        )}

        {/* Google账户信息卡片 - 如果检测到Google邮箱则显示 */}
        {hasGoogleEmails && (
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">G</span>
                </div>
                Google账户分析
                <span className="text-sm text-muted-foreground font-normal">
                  ({googleEmails.length}个Google邮箱)
                </span>
              </h2>
              <p className="text-muted-foreground mt-2">
                在综合身份信息档案中发现Google邮箱，正在获取详细分析...
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {googleEmails.map((email, index) => (
                <GoogleAccountCard 
                  key={`google-${index}`}
                  email={email}
                />
              ))}
            </div>
          </div>
        )}

        {isEmailQuery && Array.isArray(melissaCoords) && melissaCoords.length > 0 && (
          <div className="mb-12">
            <GeoMap coords={melissaCoords} title="地图线索" />
          </div>
        )}

        {regularPlatforms.length > 0 ? (
          <div className="space-y-12">
            {foundPlatforms.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  发现数据的平台 ({foundPlatforms.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 auto-rows-max">
                  {foundPlatforms.map((platform, index) => (
                    <PlatformCard key={`found-${index}`} platform={platform} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* 隐藏"错误或限制的平台"部分 - 直接不显示错误卡片 */}
            {/* 隐藏"未发现数据的平台"部分 */}
          </div>
        ) : (
          <GlassCard className="p-12 text-center" hover={false}>
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">暂无数据</h3>
            <p className="text-muted-foreground">未找到任何平台数据，请尝试其他查询</p>
          </GlassCard>
        )}
      </main>
    </div>
  );
};

export default ResultsPage;
