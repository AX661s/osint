// External Lookup data processor
// Deduplicate and normalize payload into resume-style sections

const uniq = (arr = []) => {
  const set = new Set();
  const out = [];
  for (const v of arr || []) {
    const s = typeof v === 'string' ? v.trim() : v;
    const key = typeof s === 'string' ? s.toLowerCase() : JSON.stringify(s);
    if (!set.has(key) && s !== '' && s != null) {
      set.add(key);
      out.push(s);
    }
  }
  return out;
};

const dedupObjects = (arr = [], keys = ['address','city','state','postcode']) => {
  const set = new Set();
  const out = [];
  for (const obj of arr || []) {
    if (!obj || typeof obj !== 'object') continue;
    const k = keys.map(k => (obj[k] ?? '')).join('|').toLowerCase();
    if (!set.has(k)) { set.add(k); out.push(obj); }
  }
  return out;
};

const normPhone = (p) => (String(p || '').replace(/\D/g, ''));

// 处理 investigate_api 的 processed 数据
const processInvestigateData = (processed, rawData) => {
  // 从 processed 数据中提取信息
  const identity = processed.identity || {};
  const contacts = processed.contacts || {};
  const geographic = processed.geographic || {};
  const professional = processed.professional || {};
  const social = processed.social || {};
  const network = processed.network || {};
  const financial = processed.financial || {};
  const security = processed.security || {};
  const meta = processed.meta || {};
  
  // 提取姓名
  const primaryName = identity.primary_name || null;
  const names = identity.name_variants || [];
  const allNames = uniq([primaryName, ...names].filter(Boolean));
  
  // 提取联系方式
  const phonesData = contacts.phones || {};
  const emailsData = contacts.emails || {};
  
  const phones = uniq((phonesData.all || []).map(p => {
    if (typeof p === 'string') return normPhone(p);
    return normPhone(p.number || p.display || p.number_e164 || '');
  }).filter(Boolean));
  
  const emails = uniq((emailsData.all || []).map(e => {
    if (typeof e === 'string') return e;
    return e.address || e.normalized || '';
  }).filter(Boolean));
  
  // 提取地址
  const addresses = (geographic.addresses || []).map(addr => ({
    address: addr.street || addr.address || '',
    city: addr.city || '',
    state: addr.state || '',
    postcode: addr.postal_code || addr.postcode || ''
  }));
  
  // 提取地理位置
  const geolocation = geographic.geolocation || {};
  const cities = uniq([geolocation.metro_area, ...(addresses.map(a => a.city))].filter(Boolean));
  const states = uniq(addresses.map(a => a.state).filter(Boolean));
  const postcodes = uniq(addresses.map(a => a.postcode).filter(Boolean));
  
  // 提取坐标
  const coordinates = [];
  if (geolocation.latitude && geolocation.longitude) {
    coordinates.push({
      lat: geolocation.latitude,
      lon: geolocation.longitude
    });
  }
  
  // 提取就业信息
  const employmentRecords = professional.employment || [];
  const companies = uniq(employmentRecords.map(e => e.company).filter(Boolean));
  const titles = uniq(employmentRecords.flatMap(e => 
    (e.positions || []).map(p => p.title)
  ).filter(Boolean));
  
  // 提取财务信息
  const bankNames = uniq(financial.bank_affiliations || []);
  const incomeCodes = financial.income_bracket ? [financial.income_bracket] : [];
  
  // 提取房产信息
  const properties = financial.properties || [];
  const homeBuiltYears = uniq(properties.map(p => p.built_year).filter(Boolean));
  
  // 提取亲属
  const relatives = uniq((network.relatives || []).map(r => {
    if (typeof r === 'string') return r;
    return r.name || '';
  }).filter(Boolean));
  
  // 提取人口统计信息
  const genders = identity.gender ? [identity.gender] : [];
  const birthDates = identity.birthdate ? [identity.birthdate] : [];
  const birthYears = identity.birthdate ? [identity.birthdate.split('-')[0]] : [];
  const ages = identity.age ? [identity.age] : [];
  
  // 提取运营商
  const carriers = [];
  if (phonesData.primary && phonesData.primary.carrier) {
    carriers.push(phonesData.primary.carrier);
  }
  (phonesData.all || []).forEach(p => {
    if (p.carrier) carriers.push(p.carrier);
  });
  
  // 提取 LinkedIn 档案 - 从 social.platforms 中查找
  const linkedinProfiles = [];
  const ips = [];
  const urls = [];
  
  console.log('🔍 [Processor] social object:', social);
  console.log('🔍 [Processor] platforms:', social.platforms);
  
  // 从社交媒体平台提取 LinkedIn
  const platforms = social.platforms || [];
  const linkedinPlatform = platforms.find(p => 
    p.platform && p.platform.toLowerCase().includes('linkedin')
  );
  
  console.log('🔍 [Processor] Found LinkedIn platform:', linkedinPlatform);
  
  if (linkedinPlatform && linkedinPlatform.accounts) {
    console.log('🔍 [Processor] LinkedIn accounts:', linkedinPlatform.accounts);
    linkedinPlatform.accounts.forEach(account => {
      if (account) {
        // 提取LinkedIn用户名
        const profileUrl = account.profile_url || account.url || '';
        let username = account.username || '';
        
        // 从URL中提取用户名 (如: https://www.linkedin.com/in/susan-abazia-59108b111)
        if (!username && profileUrl) {
          const match = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/i);
          if (match) {
            username = match[1];
          }
        }
        
        console.log('🔍 [Processor] Extracted LinkedIn username from platform:', username);
        
        linkedinProfiles.push({
          name: account.name || account.username || '',
          username: username, // 添加用户名字段
          title: account.job_title || account.title || '',
          email: account.email || '',
          company: account.company || account.organization || '',
          industry: account.industry || '',
          start_date: account.registration_date || '',
          city: account.city || '',
          state: account.state || '',
          country: account.country || '',
          profile_url: profileUrl,
          description: account.bio || account.description || '',
          dataset: account.source || account.dataset || ''
        });
      }
    });
  }
  
  // 也从原始数据的 account_registrations 提取
  const accountRegistrations = rawData?.person_profile?.account_registrations || [];
  console.log('🔍 [Processor] account_registrations:', accountRegistrations);
  console.log('🔍 [Processor] account_registrations count:', accountRegistrations.length);
  
  accountRegistrations.forEach(account => {
    if (account && account.platform) {
      console.log('🔍 [Processor] Checking account platform:', account.platform);
      if (account.platform.toLowerCase().includes('linkedin')) {
        console.log('✅ [Processor] Found LinkedIn account:', account);
        
        // 提取LinkedIn用户名
        const profileUrl = account.profile_url || account.url || '';
        let username = account.username || '';
        
        // 从URL中提取用户名 (如: https://www.linkedin.com/in/susan-abazia-59108b111)
        if (!username && profileUrl) {
          const match = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/i);
          if (match) {
            username = match[1];
          }
        }
        
        console.log('🔍 [Processor] Extracted LinkedIn username:', username);
        
        linkedinProfiles.push({
          name: account.name || account.username || '',
          username: username, // 添加用户名字段
          title: account.job_title || account.title || '',
          email: account.email || '',
          company: account.company || account.organization || '',
          industry: account.industry || '',
          start_date: account.registration_date || '',
          city: account.city || '',
          state: account.state || '',
          country: account.country || '',
          profile_url: profileUrl,
          description: account.bio || account.description || '',
          dataset: account.source || account.dataset || ''
        });
      }
    }
    
    // 提取其他数字足迹
    if (account && account.ip_address) {
      ips.push(account.ip_address);
    }
    if (account && account.website) {
      urls.push(account.website);
    }
  });
  
  console.log('✅ [Processor] Total LinkedIn profiles found:', linkedinProfiles.length);
  
  return {
    primaryName,
    names: allNames,
    contacts: { phones, emails },
    location: { cities, states, postcodes, coordinates },
    addresses,
    employment: { 
      companies, 
      titles, 
      records: employmentRecords.map(e => ({
        company: e.company || '',
        title: e.latest_position || (e.positions && e.positions[0] && e.positions[0].title) || '',
        start_date: e.positions && e.positions[0] && e.positions[0].start_date || '',
        region: e.positions && e.positions[0] && e.positions[0].location || ''
      }))
    },
    financial: { 
      incomeCodes, 
      bankNames, 
      annualRevenues: [] 
    },
    property: { 
      homeBuiltYears, 
      houseNumbers: [] 
    },
    voter: { records: [] },
    demographics: { 
      genders, 
      birthDates, 
      birthYears, 
      birthMonths: [], 
      birthDays: [], 
      ages 
    },
    carriers: uniq(carriers),
    relatives,
    digital: { 
      ips: uniq(ips), 
      urls: uniq(urls),
      linkedin: linkedinProfiles // LinkedIn 档案（去重）
    },
    raw: rawData,
  };
};

export const processExternalLookupData = (payload = {}) => {
  const data = payload?.data ?? payload;
  
  console.log('🔍 [Processor] Processing data, has consolidated?', !!data?.consolidated);
  console.log('🔍 [Processor] Processing data, has processed?', !!data?.processed);
  
  // 判断数据来源：如果有 consolidated 字段，说明是 external_lookup
  // 如果有 processed 字段但没有 consolidated，说明是 investigate_api
  const hasConsolidated = data?.consolidated && typeof data.consolidated === 'object';
  const hasProcessed = data?.processed && typeof data.processed === 'object';
  
  // 优先使用 investigate_api 的 processed 格式（但仅当没有 consolidated 时）
  if (hasProcessed && !hasConsolidated) {
    console.log('✅ [Processor] Using investigate_api processing logic');
    return processInvestigateData(data.processed, data);
  }
  
  // 使用 consolidated 格式（external_lookup API）
  console.log('✅ [Processor] Using external_lookup (consolidated) processing logic');
  const consolidated = data?.consolidated || {};
  const primary = data?.primary || {};
  
  // Names - 支持多种格式
  const namesFromConsolidated = consolidated?.names?.full_names || [];
  const namesFromData = data?.names || data?.name_variants || [];
  const primaryNameFromPrimary = primary?.caller_id_name || '';
  
  const allNames = uniq([...namesFromConsolidated, ...namesFromData, primaryNameFromPrimary].filter(Boolean));
  const primaryName = allNames[0] || null;

  // Contacts - 支持 consolidated 格式
  const phonesFromConsolidated = consolidated?.contact?.phones || [];
  const phonesFromData = data?.contact?.phones || [];
  const phonesRaw = uniq([...phonesFromConsolidated, ...phonesFromData]);
  const phones = uniq(phonesRaw.map(normPhone).filter(Boolean));
  
  const emailsFromConsolidated = consolidated?.contact?.emails || [];
  const emailsFromData = data?.contact?.emails || [];
  const emails = uniq([...emailsFromConsolidated, ...emailsFromData]);

  // Location - 支持 consolidated 格式
  const citiesFromPrimary = primary?.city ? [primary.city] : [];
  const cities = uniq([...citiesFromPrimary, ...(data?.location?.cities || [])]);
  
  const statesFromPrimary = primary?.state ? [primary.state] : [];
  const states = uniq([...statesFromPrimary, ...(data?.location?.states || [])]);
  
  const postcodes = uniq(data?.location?.postcodes || []);
  
  const coordsFromConsolidated = consolidated?.location?.coordinates || [];
  const coordsFromData = data?.location?.coordinates || [];
  const coordinates = [...coordsFromConsolidated, ...coordsFromData].filter(c => c && typeof c === 'object');

  // Addresses - 支持 consolidated 格式
  const addressesFromConsolidated = consolidated?.address?.addresses || [];
  const addressesFromData = data?.address?.addresses || [];
  const addresses = dedupObjects([...addressesFromConsolidated, ...addressesFromData], ['address','city','state','postcode']);

  // Employment - 支持 consolidated 格式
  const companiesFromConsolidated = (consolidated?.employment?.records || []).map(r => r.company).filter(Boolean);
  const companiesFromData = data?.employment?.companies || [];
  const companies = uniq([...companiesFromConsolidated, ...companiesFromData]);
  
  const titlesFromConsolidated = (consolidated?.employment?.records || []).map(r => r.title).filter(Boolean);
  const titlesFromData = data?.employment?.titles || [];
  const titles = uniq([...titlesFromConsolidated, ...titlesFromData]);
  
  const employmentRecordsFromConsolidated = consolidated?.employment?.records || [];
  const employmentRecordsFromData = data?.employment?.records || [];
  const employmentRecords = [...employmentRecordsFromConsolidated, ...employmentRecordsFromData].filter(r => r && typeof r === 'object');

  // Financial - 支持 consolidated 格式
  const incomeCodesFromConsolidated = consolidated?.financial?.income_codes || [];
  const incomeCodesFromData = data?.financial?.income_codes || [];
  const incomeCodes = uniq([...incomeCodesFromConsolidated, ...incomeCodesFromData]);
  
  const bankNamesFromConsolidated = consolidated?.financial?.bank_names || [];
  const bankNamesFromData = data?.financial?.bank_names || [];
  const bankNames = uniq([...bankNamesFromConsolidated, ...bankNamesFromData]);
  
  const annualRevenuesFromConsolidated = consolidated?.financial?.annual_revenues || [];
  const annualRevenuesFromData = data?.financial?.annual_revenues || [];
  const annualRevenues = uniq([...annualRevenuesFromConsolidated, ...annualRevenuesFromData]);
  
  console.log('💰 [Processor] Annual revenues from consolidated:', annualRevenuesFromConsolidated);
  console.log('💰 [Processor] Annual revenues from data:', annualRevenuesFromData);
  console.log('💰 [Processor] Final annual revenues:', annualRevenues);

  // Property - 支持 consolidated 格式
  const homeBuiltYears = uniq(data?.property?.home_built_years || []);
  const houseNumbers = uniq(data?.property?.house_numbers || []);

  // Voter - 支持 consolidated 格式
  const voterRecordsFromConsolidated = consolidated?.voter?.records || [];
  const voterRecordsFromData = data?.voter?.records || [];
  const voterRecords = [...voterRecordsFromConsolidated, ...voterRecordsFromData].filter(r => r && typeof r === 'object');

  // Demographics - 支持 consolidated 格式
  const gendersFromConsolidated = consolidated?.demographics?.genders || [];
  const gendersFromData = data?.demographics?.genders || [];
  const genders = uniq([...gendersFromConsolidated, ...gendersFromData]);
  
  const birthDatesFromConsolidated = consolidated?.demographics?.birth_dates || [];
  const birthDatesFromData = data?.demographics?.birth_dates || [];
  const birthDates = uniq([...birthDatesFromConsolidated, ...birthDatesFromData]);
  
  const birthYearsFromConsolidated = consolidated?.demographics?.birth_years || [];
  const birthYearsFromData = data?.demographics?.birth_years || [];
  const birthYears = uniq([...birthYearsFromConsolidated, ...birthYearsFromData]);
  
  const birthMonths = uniq(data?.demographics?.birth_months || []);
  const birthDays = uniq(data?.demographics?.birth_days || []);
  const ages = uniq(data?.demographics?.ages || []);

  // Carriers & Relatives - 支持 consolidated 格式
  const carriersFromPrimary = primary?.carrier ? [primary.carrier] : [];
  const carriersFromData = data?.carriers || [];
  const carriers = uniq([...carriersFromPrimary, ...carriersFromData]);
  
  const relativesFromConsolidated = consolidated?.relatives || [];
  const relativesFromData = data?.relatives || [];
  const relatives = uniq([...relativesFromConsolidated, ...relativesFromData]);
  
  // 从 consolidated.linkedin 提取 LinkedIn 档案
  const linkedinFromConsolidated = consolidated?.linkedin?.profiles || [];

  // 提取额外信息 - 从多个来源提取
  const sourcesData = data?.sources || {};
  console.log('🔍 [Processor] sources data:', sourcesData);
  console.log('🔍 [Processor] sources keys:', Object.keys(sourcesData));
  
  const ips = [];
  const urls = [];
  const ssns = []; // 社会安全号码
  const linkedinProfiles = [];
  const vehicles = []; // 车辆信息
  const licenses = []; // 职业许可证
  const ethnicGroups = []; // 种族信息
  const religions = []; // 宗教信息
  const languages = []; // 语言信息
  const childrenCounts = []; // 子女数量
  
  // 1. 从 sources 中提取所有额外信息
  Object.entries(sourcesData).forEach(([sourceName, sourceData]) => {
    console.log(`🔍 [Processor] Processing source: ${sourceName}, type:`, typeof sourceData);
    
    // 处理嵌套对象（如 acelogix_name_filtered）
    if (sourceData && typeof sourceData === 'object' && !Array.isArray(sourceData)) {
      // 遍历嵌套对象的所有数据库
      Object.values(sourceData).forEach(dbRecords => {
        if (Array.isArray(dbRecords)) {
          dbRecords.forEach(record => {
            if (record.SSN) {
              console.log(`✅ [Processor] Found SSN in ${sourceName}:`, record.SSN);
              ssns.push(record.SSN);
            }
            if (record.IP) ips.push(record.IP);
            if (record.Url) urls.push(record.Url);
            if (record.Site) urls.push(record.Site);
            
            // 提取其他字段...
            if (record.VIN || record.AutoBrand || record.AutoModel) {
              vehicles.push({
                vin: record.VIN || '',
                brand: record.AutoBrand || '',
                model: record.AutoModel || '',
                year: record.IssueYear || '',
                amount: record.Amount || ''
              });
            }
            
            if (record.DocType || record.Document) {
              licenses.push({
                type: record.DocType || '',
                document: record.Document || '',
                id: record.ID || '',
                issued: record.IssuedAt || '',
                category: record.Category || ''
              });
            }
            
            if (record.EthnicGroup) ethnicGroups.push(record.EthnicGroup);
            if (record.EthnicCode) ethnicGroups.push(record.EthnicCode);
            if (record.Religion) religions.push(record.Religion);
            if (record.Lang) languages.push(record.Lang);
            if (record.NumberOfChildren && record.NumberOfChildren !== 'U') childrenCounts.push(record.NumberOfChildren);
            if (record.AmountKids) childrenCounts.push(record.AmountKids);
          });
        }
      });
    }
    
    // 处理数组格式
    if (Array.isArray(sourceData)) {
      sourceData.forEach(record => {
        // 基础数字足迹
        if (record.IP) ips.push(record.IP);
        if (record.Url) urls.push(record.Url);
        if (record.Site) urls.push(record.Site);
        if (record.SSN) {
          console.log(`✅ [Processor] Found SSN in ${sourceName}:`, record.SSN);
          ssns.push(record.SSN);
        }
        
        // 车辆信息
        if (record.VIN || record.AutoBrand || record.AutoModel) {
          vehicles.push({
            vin: record.VIN || '',
            brand: record.AutoBrand || '',
            model: record.AutoModel || '',
            year: record.IssueYear || '',
            amount: record.Amount || ''
          });
        }
        
        // 职业许可证
        if (record.DocType || record.Document) {
          licenses.push({
            type: record.DocType || '',
            document: record.Document || '',
            id: record.ID || '',
            issued: record.IssuedAt || '',
            category: record.Category || ''
          });
        }
        
        // 人口统计扩展信息
        if (record.EthnicGroup) ethnicGroups.push(record.EthnicGroup);
        if (record.EthnicCode) ethnicGroups.push(record.EthnicCode);
        if (record.Religion) religions.push(record.Religion);
        if (record.Lang) languages.push(record.Lang);
        if (record.NumberOfChildren && record.NumberOfChildren !== 'U') childrenCounts.push(record.NumberOfChildren);
        if (record.AmountKids) childrenCounts.push(record.AmountKids);
      });
    }
  });
  
  // 2. 从 account_registrations 提取其他数字足迹（IP、website）
  const accountRegistrations = data?.account_registrations || [];
  accountRegistrations.forEach(account => {
    if (account && account.ip_address) {
      ips.push(account.ip_address);
    }
    if (account && account.website) {
      urls.push(account.website);
    }
  });
  
  // 3. LinkedIn提取 - 只从 consolidated.linkedin 提取（避免冗余）
  console.log('🔍 [Processor] Extracting LinkedIn profiles...');
  console.log('🔍 [Processor] consolidated object:', consolidated);
  console.log('🔍 [Processor] consolidated.linkedin:', consolidated?.linkedin);
  console.log('🔍 [Processor] linkedinFromConsolidated:', linkedinFromConsolidated);
  
  // 3.1 先从 nicknames 中查找 LinkedIn 用户名
  const nicknames = consolidated?.names?.nicknames || [];
  console.log('🔍 [Processor] nicknames:', nicknames);
  const linkedinNickname = nicknames.find(nickname => 
    nickname && typeof nickname === 'string' && nickname.includes('-') && /[a-z0-9]{8,}$/.test(nickname)
  );
  
  if (linkedinNickname) {
    console.log('✅ [Processor] Found LinkedIn nickname:', linkedinNickname);
  }
  
  // 3.2 从 consolidated.linkedin.profiles 提取（最可靠的数据源）
  console.log('🔍 [Processor] Checking consolidated.linkedin.profiles, count:', linkedinFromConsolidated.length);
  linkedinFromConsolidated.forEach(profile => {
    if (profile) {
      console.log('✅ [Processor] Found LinkedIn profile:', profile);
      
      // 构建 profile_url（优先使用 nickname）
      let profileUrl = profile.profile_url || '';
      if (!profileUrl && linkedinNickname) {
        profileUrl = `https://www.linkedin.com/in/${linkedinNickname}`;
      }
      if (!profileUrl && profile.nickname) {
        profileUrl = `https://www.linkedin.com/in/${profile.nickname}`;
      }
      
      // 提取用户名（从多个可能的来源）
      const username = profile.nickname || linkedinNickname || 
        (profileUrl ? profileUrl.split('/in/')[1]?.replace('/', '') : '') || '';
      
      console.log('🔗 [Processor] LinkedIn username extracted:', username);
      
      linkedinProfiles.push({
        name: profile.name || '',
        title: profile.title || '',
        email: profile.email || '',
        company: profile.company || '',
        industry: profile.industry || '',
        start_date: profile.start_date || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        username: username, // 添加用户名字段
        profile_url: profileUrl,
        description: profile.description || '',
        dataset: profile._dataset || 'consolidated'
      });
    }
  });
  
  console.log('✅ [Processor] Total LinkedIn profiles found:', linkedinProfiles.length);
  console.log('✅ [Processor] Total SSNs found:', ssns.length, 'SSNs:', ssns);
  console.log('✅ [Processor] Total vehicles found:', vehicles.length);
  console.log('✅ [Processor] Annual revenues:', annualRevenues);

  return {
    primaryName,
    names: allNames,
    contacts: { phones, emails },
    location: { cities, states, postcodes, coordinates },
    addresses,
    employment: { companies, titles, records: employmentRecords },
    financial: { incomeCodes, bankNames, annualRevenues },
    property: { homeBuiltYears, houseNumbers },
    voter: { records: voterRecords },
    demographics: { 
      genders, 
      birthDates, 
      birthYears, 
      birthMonths, 
      birthDays, 
      ages,
      ethnicGroups: uniq(ethnicGroups),
      religions: uniq(religions),
      languages: uniq(languages),
      childrenCounts: uniq(childrenCounts)
    },
    carriers,
    relatives,
    digital: { 
      ips: uniq(ips), 
      urls: uniq(urls),
      linkedin: linkedinProfiles,
      ssns: uniq(ssns)
    },
    vehicles: vehicles.filter(v => v.vin || v.brand), // 只返回有效车辆
    licenses: licenses.filter(l => l.document || l.type), // 只返回有效许可证
    raw: data,
  };
};

