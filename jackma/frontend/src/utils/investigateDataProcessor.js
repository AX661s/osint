/**
 * Investigate API 数据处理工具
 * 用于处理、整合、去重和格式化 Investigate API 返回的大规模数据
 */

/**
 * 处理 Investigate API 数据
 * @param {Object} investigateData - Investigate API 返回的原始数据
 * @returns {Object} 处理后的结构化数据
 */
export const processInvestigateData = (investigateData) => {
  if (!investigateData || !investigateData.data) {
    return null;
  }

  const data = investigateData.data;
  const personProfile = data.person_profile || {};
  
  return {
    // 基本信息
    basicInfo: extractBasicInfo(personProfile),
    
    // 联系方式（去重）
    contacts: extractAndDeduplicateContacts(personProfile),
    
    // 职业信息
    employment: extractEmployment(personProfile),
    
    // 教育背景
    education: extractEducation(personProfile),
    
    // 社交媒体账户
    socialMedia: extractSocialMedia(personProfile),
    
    // 地址信息（去重）
    addresses: extractAndDeduplicateAddresses(personProfile),
    
    // 亲属关系
    relatives: extractRelatives(personProfile),
    
    // 房产记录
    properties: extractProperties(personProfile),
    
    // 泄露凭证
    leakedCredentials: extractLeakedCredentials(personProfile),
    
    // 地理位置
    geolocation: extractGeolocation(personProfile),
    
    // 元数据
    metadata: {
      investigationId: data.investigation_id,
      phoneNumber: data.phone_number,
      status: data.status,
      duration: data.duration_seconds,
      dataSourcesCount: data.data_sources_count,
      confidenceScore: personProfile.confidence_score,
      sources: personProfile.sources || []
    }
  };
};

/**
 * 提取基本信息
 */
const extractBasicInfo = (profile) => {
  return {
    primaryName: profile.primary_name || '',
    nameVariants: profile.name_variants || [],
    gender: profile.gender || '',
    age: profile.age || 0,
    birthdate: profile.birthdate || '',
    titlePrefix: profile.title_prefix || '',
    middleName: profile.middle_name || '',
    ethnicity: profile.ethnicity || '',
    religion: profile.religion || '',
    languages: profile.languages || [],
    maritalStatus: profile.marital_status || '',
    numberOfChildren: profile.number_of_children || 0
  };
};

/**
 * 提取并去重联系方式
 */
const extractAndDeduplicateContacts = (profile) => {
  // 处理电话号码
  const phones = (profile.phones || [])
    .filter(p => p.number_e164)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .reduce((acc, phone) => {
      // 去重：基于 number_e164
      if (!acc.find(p => p.number === phone.number_e164)) {
        acc.push({
          number: phone.number_e164,
          display: phone.display || phone.number_e164,
          type: phone.type || 'unknown',
          carrier: phone.carrier || 'Unknown',
          location: phone.location || '',
          confidence: phone.confidence || 0,
          sources: phone.source || [],
          sourcesCount: Array.isArray(phone.source) ? phone.source.length : 0
        });
      }
      return acc;
    }, []);

  // 处理邮箱地址
  const emails = (profile.emails || [])
    .filter(e => e.address)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .reduce((acc, email) => {
      // 去重：基于 normalized 或 address
      const key = email.normalized || email.address;
      if (!acc.find(e => e.address === key)) {
        acc.push({
          address: email.address,
          normalized: email.normalized || email.address,
          type: email.type || 'unknown',
          domain: email.domain || '',
          confidence: email.confidence || 0,
          sources: email.source || [],
          sourcesCount: Array.isArray(email.source) ? email.source.length : 0
        });
      }
      return acc;
    }, []);

  return {
    phones: phones.slice(0, 10), // 只取前10个
    emails: emails.slice(0, 15), // 只取前15个
    totalPhones: phones.length,
    totalEmails: emails.length
  };
};

/**
 * 提取职业信息
 */
const extractEmployment = (profile) => {
  const employment = profile.employment || [];
  
  return employment
    .filter(job => job.company || job.title)
    .sort((a, b) => {
      // 按开始日期排序（最新的在前）
      const dateA = a.start_date || '0000-00-00';
      const dateB = b.start_date || '0000-00-00';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 10) // 只取前10个
    .map(job => ({
      company: job.company || 'Unknown',
      title: job.title || 'Unknown',
      startDate: job.start_date || '',
      endDate: job.end_date || '',
      location: job.location || '',
      source: job.source || '',
      confidence: job.confidence || 0
    }));
};

/**
 * 提取教育背景
 */
const extractEducation = (profile) => {
  const education = profile.education || [];
  
  return education
    .filter(edu => edu.degree || edu.institution)
    .map(edu => ({
      degree: edu.degree || '',
      institution: edu.institution || '',
      year: edu.year || '',
      source: edu.source || ''
    }));
};

/**
 * 提取社交媒体账户
 */
const extractSocialMedia = (profile) => {
  const registrations = profile.account_registrations || [];
  
  // 按平台分组并去重
  const platformMap = new Map();
  
  registrations.forEach(account => {
    const platform = account.platform;
    if (!platform) return;
    
    if (!platformMap.has(platform)) {
      platformMap.set(platform, {
        platform: platform,
        accounts: []
      });
    }
    
    platformMap.get(platform).accounts.push({
      email: account.email || '',
      registrationDate: account.registration_date || '',
      lastActive: account.last_active || '',
      status: account.status || ''
    });
  });
  
  // 转换为数组并排序
  return Array.from(platformMap.values())
    .sort((a, b) => b.accounts.length - a.accounts.length)
    .slice(0, 20) // 只取前20个平台
    .map(item => ({
      platform: item.platform,
      accountCount: item.accounts.length,
      accounts: item.accounts.slice(0, 3), // 每个平台只显示前3个账户
      totalAccounts: item.accounts.length
    }));
};

/**
 * 提取并去重地址信息
 */
const extractAndDeduplicateAddresses = (profile) => {
  const addresses = profile.addresses || [];
  
  return addresses
    .filter(addr => addr.street || addr.city || addr.postal_code)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .reduce((acc, addr) => {
      // 去重：基于 street + city + postal_code 组合
      const key = `${addr.street || ''}_${addr.city || ''}_${addr.postal_code || ''}`;
      if (!acc.find(a => `${a.street}_${a.city}_${a.postalCode}` === key)) {
        acc.push({
          street: addr.street || '',
          city: addr.city || '',
          state: addr.state || '',
          postalCode: addr.postal_code || '',
          country: addr.country || 'US',
          role: addr.role || 'unknown',
          confidence: addr.confidence || 0,
          sources: addr.source || [],
          sourcesCount: Array.isArray(addr.source) ? addr.source.length : 0
        });
      }
      return acc;
    }, [])
    .slice(0, 10); // 只取前10个
};

/**
 * 提取亲属关系
 */
const extractRelatives = (profile) => {
  const relatives = profile.relatives || [];
  
  return relatives
    .filter(rel => rel.name)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 15) // 只取前15个
    .map(rel => ({
      name: rel.name,
      relationship: rel.relationship || 'unknown',
      confidence: rel.confidence || 0,
      sources: rel.sources || [],
      sourcesCount: Array.isArray(rel.sources) ? rel.sources.length : 0
    }));
};

/**
 * 提取房产记录
 */
const extractProperties = (profile) => {
  const properties = profile.property_records || [];
  
  return properties
    .filter(prop => prop.address)
    .sort((a, b) => {
      // 按购买年份排序（最新的在前）
      const yearA = prop.purchase_year || 0;
      const yearB = prop.purchase_year || 0;
      return yearB - yearA;
    })
    .slice(0, 10) // 只取前10个
    .map(prop => ({
      address: prop.address,
      city: prop.city || '',
      state: prop.state || '',
      postalCode: prop.postal_code || '',
      purchaseYear: prop.purchase_year || '',
      builtYear: prop.built_year || '',
      estimatedValue: prop.estimated_value || '',
      bedrooms: prop.bedrooms || 0,
      bathrooms: prop.bathrooms || 0,
      propertyType: prop.property_type || '',
      sources: prop.sources || [],
      confidence: prop.confidence || 0
    }));
};

/**
 * 提取泄露凭证
 */
const extractLeakedCredentials = (profile) => {
  const credentials = profile.leaked_credentials || [];
  
  // 按泄露源分组
  const leakSourceMap = new Map();
  
  credentials.forEach(cred => {
    const source = cred.leak_source || 'Unknown';
    if (!leakSourceMap.has(source)) {
      leakSourceMap.set(source, {
        source: source,
        count: 0,
        leakDate: cred.leak_date || ''
      });
    }
    leakSourceMap.get(source).count++;
  });
  
  return {
    total: credentials.length,
    sources: Array.from(leakSourceMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10), // 只显示前10个泄露源
    hasPlaintext: credentials.some(c => c.plaintext_available)
  };
};

/**
 * 提取地理位置
 */
const extractGeolocation = (profile) => {
  const geo = profile.geolocation || {};
  
  return {
    latitude: geo.latitude || null,
    longitude: geo.longitude || null,
    precision: geo.precision || '',
    metroArea: geo.metro_area || '',
    region: geo.region || '',
    timezone: geo.timezone || '',
    sourcesCount: geo.sources_count || 0
  };
};

/**
 * 生成数据摘要
 */
export const generateInvestigateSummary = (processedData) => {
  if (!processedData) return null;
  
  const { basicInfo, contacts, employment, socialMedia, addresses, relatives, properties, leakedCredentials, metadata } = processedData;
  
  return {
    // 核心身份信息
    identity: {
      name: basicInfo.primaryName,
      age: basicInfo.age,
      gender: basicInfo.gender,
      location: addresses[0] ? `${addresses[0].city}, ${addresses[0].state}` : ''
    },
    
    // 数据统计
    stats: {
      phones: contacts.totalPhones,
      emails: contacts.totalEmails,
      addresses: addresses.length,
      employment: employment.length,
      socialMedia: socialMedia.length,
      relatives: relatives.length,
      properties: properties.length,
      leakedAccounts: leakedCredentials.total,
      dataSources: metadata.dataSourcesCount,
      confidenceScore: Math.round((metadata.confidenceScore || 0) * 100)
    },
    
    // 高置信度数据
    highConfidence: {
      primaryPhone: contacts.phones.find(p => p.confidence >= 0.9),
      primaryEmail: contacts.emails.find(e => e.confidence >= 0.9),
      currentAddress: addresses.find(a => a.confidence >= 0.9),
      currentJob: employment[0] // 最新的工作
    },
    
    // 风险指标
    risks: {
      hasLeakedCredentials: leakedCredentials.total > 0,
      leakedAccountsCount: leakedCredentials.total,
      hasPlaintextPasswords: leakedCredentials.hasPlaintext
    }
  };
};

/**
 * 按置信度过滤数据
 */
export const filterByConfidence = (data, minConfidence = 0.7) => {
  if (!data) return null;
  
  return {
    ...data,
    contacts: {
      phones: data.contacts.phones.filter(p => p.confidence >= minConfidence),
      emails: data.contacts.emails.filter(e => e.confidence >= minConfidence),
      totalPhones: data.contacts.totalPhones,
      totalEmails: data.contacts.totalEmails
    },
    addresses: data.addresses.filter(a => a.confidence >= minConfidence),
    relatives: data.relatives.filter(r => r.confidence >= minConfidence)
  };
};

/**
 * 格式化显示文本
 */
export const formatInvestigateDisplay = {
  phone: (phone) => {
    if (!phone) return '';
    return `${phone.display} (${phone.carrier}, ${phone.location})`;
  },
  
  email: (email) => {
    if (!email) return '';
    return `${email.address} (${email.domain})`;
  },
  
  address: (addr) => {
    if (!addr) return '';
    const parts = [
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode
    ].filter(Boolean);
    return parts.join(', ');
  },
  
  employment: (job) => {
    if (!job) return '';
    const parts = [job.title, job.company, job.location].filter(Boolean);
    return parts.join(' @ ');
  },
  
  confidence: (score) => {
    if (typeof score !== 'number') return 'N/A';
    const percentage = Math.round(score * 100);
    if (percentage >= 90) return `${percentage}% ⭐⭐⭐`;
    if (percentage >= 70) return `${percentage}% ⭐⭐`;
    if (percentage >= 50) return `${percentage}% ⭐`;
    return `${percentage}%`;
  }
};

/**
 * 导出为可下载的JSON
 */
export const exportInvestigateData = (processedData, query) => {
  const exportData = {
    query: query,
    timestamp: new Date().toISOString(),
    summary: generateInvestigateSummary(processedData),
    fullData: processedData
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `investigate-${query}-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
