/**
 * Investigate API 数据标准化工具
 * 处理海量数据的深度清洗、去重、合并和优化
 */

/**
 * 深度数据清洗 - 处理嵌套的原始数据
 */
export class InvestigateDataNormalizer {
  constructor(rawData) {
    this.rawData = rawData;
    this.normalized = null;
  }

  /**
   * 执行完整的数据标准化流程
   */
  normalize() {
    if (!this.rawData || !this.rawData.data) {
      return null;
    }

    const data = this.rawData.data;
    const personProfile = data.person_profile || {};
    const pipelineResult = data.pipeline_result || {};
    
    this.normalized = {
      // 元数据
      meta: this.extractMetadata(data),
      
      // 核心身份
      identity: this.extractIdentity(personProfile),
      
      // 联系方式（深度去重）
      contacts: this.normalizeContacts(personProfile),
      
      // 职业信息（合并重复）
      professional: this.normalizeProfessional(personProfile),
      
      // 社交媒体（智能分组）
      social: this.normalizeSocial(personProfile),
      
      // 地理信息（合并地址）
      geographic: this.normalizeGeographic(personProfile),
      
      // 关系网络（去重）
      network: this.normalizeNetwork(personProfile),
      
      // 财务信息
      financial: this.normalizeFinancial(personProfile),
      
      // 安全信息
      security: this.normalizeSecurity(personProfile),
      
      // 数据质量指标
      quality: this.calculateQuality(personProfile)
    };

    return this.normalized;
  }

  /**
   * 提取元数据
   */
  extractMetadata(data) {
    return {
      investigationId: data.investigation_id || '',
      phoneNumber: data.phone_number || '',
      status: data.status || 'unknown',
      startTime: data.start_time || '',
      endTime: data.end_time || '',
      duration: data.duration_seconds || 0,
      dataSourcesCount: data.data_sources_count || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 提取核心身份信息
   */
  extractIdentity(profile) {
    const nameVariants = profile.name_variants || [];
    const uniqueNames = [...new Set(nameVariants)]; // 去重姓名变体

    return {
      primaryName: profile.primary_name || '',
      nameVariants: uniqueNames,
      nameCount: uniqueNames.length,
      gender: profile.gender || '',
      age: profile.age || 0,
      birthdate: profile.birthdate || '',
      titlePrefix: profile.title_prefix || '',
      middleName: profile.middle_name || '',
      ethnicity: profile.ethnicity || '',
      religion: profile.religion || '',
      languages: this.deduplicateArray(profile.languages || []),
      maritalStatus: profile.marital_status || '',
      numberOfChildren: profile.number_of_children || 0,
      confidenceScore: profile.confidence_score || 0
    };
  }

  /**
   * 标准化联系方式 - 深度去重和合并
   */
  normalizeContacts(profile) {
    // 电话号码处理
    const phonesMap = new Map();
    (profile.phones || []).forEach(phone => {
      const key = phone.number_e164;
      if (!key) return;

      if (!phonesMap.has(key)) {
        phonesMap.set(key, {
          number: key,
          display: phone.display || key,
          type: phone.type || 'unknown',
          carrier: phone.carrier || 'Unknown',
          location: phone.location || '',
          confidence: phone.confidence || 0,
          sources: new Set(phone.source || []),
          lastSeen: phone.last_seen || null
        });
      } else {
        // 合并来源
        const existing = phonesMap.get(key);
        (phone.source || []).forEach(s => existing.sources.add(s));
        // 更新置信度（取最高值）
        existing.confidence = Math.max(existing.confidence, phone.confidence || 0);
      }
    });

    const phones = Array.from(phonesMap.values())
      .map(p => ({ ...p, sources: Array.from(p.sources), sourcesCount: p.sources.size }))
      .sort((a, b) => b.confidence - a.confidence);

    // 邮箱地址处理
    const emailsMap = new Map();
    (profile.emails || []).forEach(email => {
      const key = (email.normalized || email.address || '').toLowerCase();
      if (!key) return;

      if (!emailsMap.has(key)) {
        emailsMap.set(key, {
          address: email.address,
          normalized: email.normalized || email.address,
          type: email.type || 'unknown',
          domain: email.domain || '',
          confidence: email.confidence || 0,
          sources: new Set(email.source || []),
          lastSeen: email.last_seen || null
        });
      } else {
        // 合并来源
        const existing = emailsMap.get(key);
        (email.source || []).forEach(s => existing.sources.add(s));
        existing.confidence = Math.max(existing.confidence, email.confidence || 0);
      }
    });

    const emails = Array.from(emailsMap.values())
      .map(e => ({ ...e, sources: Array.from(e.sources), sourcesCount: e.sources.size }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      phones: {
        all: phones,
        high: phones.filter(p => p.confidence >= 0.8),
        medium: phones.filter(p => p.confidence >= 0.5 && p.confidence < 0.8),
        low: phones.filter(p => p.confidence < 0.5),
        total: phones.length,
        primary: phones[0] || null
      },
      emails: {
        all: emails,
        high: emails.filter(e => e.confidence >= 0.8),
        medium: emails.filter(e => e.confidence >= 0.5 && e.confidence < 0.8),
        low: emails.filter(e => e.confidence < 0.5),
        total: emails.length,
        primary: emails[0] || null
      }
    };
  }

  /**
   * 标准化职业信息 - 合并重复公司
   */
  normalizeProfessional(profile) {
    const employment = profile.employment || [];
    const education = profile.education || [];

    // 按公司分组
    const companyMap = new Map();
    employment.forEach(job => {
      const company = job.company || 'Unknown';
      if (!companyMap.has(company)) {
        companyMap.set(company, []);
      }
      companyMap.get(company).push(job);
    });

    // 合并同公司的职位
    const consolidatedJobs = Array.from(companyMap.entries()).map(([company, jobs]) => {
      // 按开始日期排序
      jobs.sort((a, b) => {
        const dateA = a.start_date || '0000-00-00';
        const dateB = b.start_date || '0000-00-00';
        return dateB.localeCompare(dateA);
      });

      return {
        company: company,
        positions: jobs.map(j => ({
          title: j.title || 'Unknown',
          startDate: j.start_date || '',
          endDate: j.end_date || '',
          location: j.location || '',
          confidence: j.confidence || 0,
          source: j.source || ''
        })),
        totalPositions: jobs.length,
        latestPosition: jobs[0]?.title || '',
        confidence: Math.max(...jobs.map(j => j.confidence || 0))
      };
    }).sort((a, b) => b.confidence - a.confidence);

    return {
      employment: consolidatedJobs.slice(0, 15),
      education: education.slice(0, 10),
      incomeBracket: profile.income_bracket || '',
      totalJobs: employment.length,
      totalEducation: education.length
    };
  }

  /**
   * 标准化社交媒体 - 智能分组和去重
   */
  normalizeSocial(profile) {
    const registrations = profile.account_registrations || [];
    const socialProfiles = profile.social_profiles || [];

    // 按平台分组
    const platformMap = new Map();
    
    registrations.forEach(account => {
      const platform = account.platform;
      if (!platform) return;

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          platform: platform,
          accounts: [],
          emails: new Set(),
          registrationDates: []
        });
      }

      const platformData = platformMap.get(platform);
      platformData.accounts.push(account);
      if (account.email) platformData.emails.add(account.email);
      if (account.registration_date) platformData.registrationDates.push(account.registration_date);
    });

    // 转换为数组并排序
    const platforms = Array.from(platformMap.values())
      .map(p => ({
        platform: p.platform,
        accountCount: p.accounts.length,
        uniqueEmails: Array.from(p.emails),
        emailCount: p.emails.size,
        earliestRegistration: p.registrationDates.sort()[0] || '',
        latestActivity: p.accounts
          .map(a => a.last_active)
          .filter(Boolean)
          .sort()
          .reverse()[0] || '',
        accounts: p.accounts.slice(0, 5) // 每个平台最多5个账户
      }))
      .sort((a, b) => b.accountCount - a.accountCount);

    return {
      platforms: platforms.slice(0, 30), // 最多30个平台
      totalPlatforms: platforms.length,
      totalAccounts: registrations.length,
      socialProfiles: socialProfiles
    };
  }

  /**
   * 标准化地理信息 - 合并地址
   */
  normalizeGeographic(profile) {
    const addresses = profile.addresses || [];
    const geolocation = profile.geolocation || {};

    // 地址去重和合并
    const addressMap = new Map();
    addresses.forEach(addr => {
      // 创建地址键（忽略大小写和空格）
      const key = [
        (addr.street || '').toLowerCase().trim(),
        (addr.city || '').toLowerCase().trim(),
        (addr.postal_code || '').toLowerCase().trim()
      ].filter(Boolean).join('|');

      if (!key) return;

      if (!addressMap.has(key)) {
        addressMap.set(key, {
          street: addr.street || '',
          city: addr.city || '',
          state: addr.state || '',
          postalCode: addr.postal_code || '',
          country: addr.country || 'US',
          role: addr.role || 'unknown',
          confidence: addr.confidence || 0,
          sources: new Set(addr.source || []),
          geolocation: addr.geolocation || null
        });
      } else {
        // 合并来源
        const existing = addressMap.get(key);
        (addr.source || []).forEach(s => existing.sources.add(s));
        existing.confidence = Math.max(existing.confidence, addr.confidence || 0);
      }
    });

    const normalizedAddresses = Array.from(addressMap.values())
      .map(a => ({ ...a, sources: Array.from(a.sources), sourcesCount: a.sources.size }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      addresses: {
        all: normalizedAddresses,
        high: normalizedAddresses.filter(a => a.confidence >= 0.8),
        medium: normalizedAddresses.filter(a => a.confidence >= 0.5 && a.confidence < 0.8),
        low: normalizedAddresses.filter(a => a.confidence < 0.5),
        total: normalizedAddresses.length,
        current: normalizedAddresses[0] || null
      },
      geolocation: {
        latitude: geolocation.latitude || null,
        longitude: geolocation.longitude || null,
        precision: geolocation.precision || '',
        metroArea: geolocation.metro_area || '',
        region: geolocation.region || '',
        timezone: geolocation.timezone || '',
        sourcesCount: geolocation.sources_count || 0
      }
    };
  }

  /**
   * 标准化关系网络 - 去重亲属
   */
  normalizeNetwork(profile) {
    const relatives = profile.relatives || [];
    const associates = profile.associates || [];
    const householdMembers = profile.household_members || [];

    // 亲属去重（基于姓名）
    const relativesMap = new Map();
    relatives.forEach(rel => {
      const name = (rel.name || '').trim();
      if (!name) return;

      if (!relativesMap.has(name)) {
        relativesMap.set(name, {
          name: name,
          relationship: rel.relationship || 'unknown',
          confidence: rel.confidence || 0,
          sources: new Set(rel.sources || [])
        });
      } else {
        // 合并来源
        const existing = relativesMap.get(name);
        (rel.sources || []).forEach(s => existing.sources.add(s));
        existing.confidence = Math.max(existing.confidence, rel.confidence || 0);
      }
    });

    const normalizedRelatives = Array.from(relativesMap.values())
      .map(r => ({ ...r, sources: Array.from(r.sources), sourcesCount: r.sources.size }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      relatives: normalizedRelatives.slice(0, 20),
      associates: associates.slice(0, 10),
      householdMembers: householdMembers.slice(0, 10),
      totalRelatives: normalizedRelatives.length,
      totalAssociates: associates.length,
      totalHousehold: householdMembers.length
    };
  }

  /**
   * 标准化财务信息
   */
  normalizeFinancial(profile) {
    const properties = profile.property_records || [];
    const bankAffiliations = profile.bank_affiliations || [];
    const creditCapacity = profile.credit_capacity || {};

    // 房产去重（基于地址）
    const propertyMap = new Map();
    properties.forEach(prop => {
      const key = `${prop.address}_${prop.city}_${prop.postal_code}`.toLowerCase();
      if (!key || key === '__') return;

      if (!propertyMap.has(key)) {
        propertyMap.set(key, {
          address: prop.address || '',
          city: prop.city || '',
          state: prop.state || '',
          postalCode: prop.postal_code || '',
          purchaseYear: prop.purchase_year || null,
          builtYear: prop.built_year || null,
          estimatedValue: prop.estimated_value || '',
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          squareFeet: prop.square_feet || 0,
          propertyType: prop.property_type || '',
          sources: new Set(prop.sources || []),
          confidence: prop.confidence || 0
        });
      } else {
        // 合并来源
        const existing = propertyMap.get(key);
        (prop.sources || []).forEach(s => existing.sources.add(s));
        existing.confidence = Math.max(existing.confidence, prop.confidence || 0);
      }
    });

    const normalizedProperties = Array.from(propertyMap.values())
      .map(p => ({ ...p, sources: Array.from(p.sources), sourcesCount: p.sources.size }))
      .sort((a, b) => (b.purchaseYear || 0) - (a.purchaseYear || 0));

    return {
      properties: normalizedProperties.slice(0, 15),
      totalProperties: normalizedProperties.length,
      bankAffiliations: bankAffiliations,
      creditCapacity: {
        amount: creditCapacity.amount || '',
        range: creditCapacity.range || '',
        confidence: creditCapacity.confidence || 0
      },
      incomeBracket: profile.income_bracket || ''
    };
  }

  /**
   * 标准化安全信息
   */
  normalizeSecurity(profile) {
    const leakedCredentials = profile.leaked_credentials || [];
    const ipHistory = profile.ip_history || [];

    // 按泄露源分组
    const leakSourceMap = new Map();
    leakedCredentials.forEach(cred => {
      const source = cred.leak_source || 'Unknown';
      if (!leakSourceMap.has(source)) {
        leakSourceMap.set(source, {
          source: source,
          count: 0,
          emails: new Set(),
          leakDates: [],
          hasPlaintext: false
        });
      }

      const sourceData = leakSourceMap.get(source);
      sourceData.count++;
      if (cred.email) sourceData.emails.add(cred.email);
      if (cred.leak_date) sourceData.leakDates.push(cred.leak_date);
      if (cred.plaintext_available) sourceData.hasPlaintext = true;
    });

    const leakSources = Array.from(leakSourceMap.values())
      .map(s => ({
        ...s,
        emails: Array.from(s.emails),
        emailCount: s.emails.size,
        latestLeak: s.leakDates.sort().reverse()[0] || ''
      }))
      .sort((a, b) => b.count - a.count);

    // IP去重
    const uniqueIPs = this.deduplicateArray(
      ipHistory.map(ip => ip.ip).filter(Boolean)
    );

    return {
      leakedCredentials: {
        total: leakedCredentials.length,
        sources: leakSources.slice(0, 20),
        totalSources: leakSources.length,
        hasPlaintext: leakSources.some(s => s.hasPlaintext),
        affectedEmails: [...new Set(leakedCredentials.map(c => c.email).filter(Boolean))]
      },
      ipHistory: {
        ips: ipHistory.slice(0, 20),
        uniqueIPs: uniqueIPs.slice(0, 20),
        total: ipHistory.length,
        uniqueCount: uniqueIPs.length
      },
      ssn: profile.ssn || null,
      driversLicense: profile.drivers_license || null,
      passportNumbers: profile.passport_numbers || [],
      nationalId: profile.national_id || []
    };
  }

  /**
   * 计算数据质量指标
   */
  calculateQuality(profile) {
    const fieldConfidences = profile.field_confidences || {};
    const sources = profile.sources || [];

    return {
      overallConfidence: profile.confidence_score || 0,
      fieldConfidences: {
        name: fieldConfidences.name || 0,
        phones: fieldConfidences.phones || 0,
        emails: fieldConfidences.emails || 0,
        addresses: fieldConfidences.addresses || 0
      },
      dataCompleteness: this.calculateCompleteness(profile),
      sourcesCount: sources.length,
      sources: sources,
      lastUpdated: profile.last_updated || ''
    };
  }

  /**
   * 计算数据完整性
   */
  calculateCompleteness(profile) {
    const fields = {
      hasName: !!profile.primary_name,
      hasAge: !!profile.age,
      hasGender: !!profile.gender,
      hasPhones: (profile.phones || []).length > 0,
      hasEmails: (profile.emails || []).length > 0,
      hasAddresses: (profile.addresses || []).length > 0,
      hasEmployment: (profile.employment || []).length > 0,
      hasEducation: (profile.education || []).length > 0,
      hasSocial: (profile.account_registrations || []).length > 0,
      hasRelatives: (profile.relatives || []).length > 0
    };

    const totalFields = Object.keys(fields).length;
    const filledFields = Object.values(fields).filter(Boolean).length;
    const percentage = Math.round((filledFields / totalFields) * 100);

    return {
      percentage: percentage,
      fields: fields,
      filledCount: filledFields,
      totalCount: totalFields
    };
  }

  /**
   * 工具函数：数组去重
   */
  deduplicateArray(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  /**
   * 获取标准化后的数据
   */
  getNormalized() {
    if (!this.normalized) {
      this.normalize();
    }
    return this.normalized;
  }

  /**
   * 导出为简化版本（用于前端展示）
   */
  exportSimplified() {
    const normalized = this.getNormalized();
    if (!normalized) return null;

    return {
      meta: normalized.meta,
      identity: normalized.identity,
      contacts: {
        phones: normalized.contacts.phones.high.slice(0, 5),
        emails: normalized.contacts.emails.high.slice(0, 5),
        totalPhones: normalized.contacts.phones.total,
        totalEmails: normalized.contacts.emails.total
      },
      professional: {
        employment: normalized.professional.employment.slice(0, 5),
        totalJobs: normalized.professional.totalJobs
      },
      social: {
        platforms: normalized.social.platforms.slice(0, 10),
        totalPlatforms: normalized.social.totalPlatforms
      },
      geographic: {
        currentAddress: normalized.geographic.addresses.current,
        totalAddresses: normalized.geographic.addresses.total
      },
      security: {
        leakedAccounts: normalized.security.leakedCredentials.total,
        hasLeaks: normalized.security.leakedCredentials.total > 0
      },
      quality: normalized.quality
    };
  }
}

/**
 * 快速处理函数（向后兼容）
 */
export const normalizeInvestigateData = (rawData) => {
  const normalizer = new InvestigateDataNormalizer(rawData);
  return normalizer.normalize();
};

/**
 * 导出简化版本
 */
export const getSimplifiedData = (rawData) => {
  const normalizer = new InvestigateDataNormalizer(rawData);
  return normalizer.exportSimplified();
};
