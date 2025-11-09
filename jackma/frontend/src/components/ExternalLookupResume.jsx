import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/glass-card';
import { Button } from './ui/button';
import { 
  MapPin, Phone, Mail, User, Building2, IdCard, Calendar, CreditCard, Home, Users, Copy,
  UserCircle, UserCheck, Cake, Hash, Target, Radio, MapPinned, Navigation, Package,
  Briefcase, DollarSign, Banknote, HouseIcon, TrendingUp, Landmark, Globe, Network, Linkedin, 
  ExternalLink, Shield, Eye, EyeOff, Clock, Award, FileText, MapPinHouse, Check
} from 'lucide-react';
import { processExternalLookupData } from '../utils/externalLookupProcessor';
import { getCachedLinkedInAvatar, generateLinkedInAvatarFromName } from '../utils/linkedinAvatarFetcher';
import { toast } from 'sonner';

// 美化的信息行组件 - 现代化设计
const InfoRow = ({ label, value, icon: Icon, highlight = false }) => (
  <div className={`group flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
    highlight 
      ? 'bg-gradient-to-r from-primary/15 to-secondary/15 border-2 border-primary/30 shadow-md shadow-primary/10' 
      : 'backdrop-blur-sm border hover:border-primary/30 hover:shadow-md'
  }`} style={{
    backgroundColor: highlight ? undefined : 'hsl(222 40% 8%)',
    borderColor: highlight ? undefined : 'hsl(222 30% 18%)',
    color: 'hsl(180 5% 95%)'
  }}>
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
          highlight 
            ? 'bg-gradient-to-br from-primary to-secondary shadow-lg' 
            : 'group-hover:from-primary/20 group-hover:to-secondary/20'
        }`} style={highlight ? {} : {
          background: 'linear-gradient(135deg, hsl(222 40% 15%), hsl(222 40% 20%))'
        }}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
        </div>
      )}
      <span className={`font-medium ${highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors duration-300`}>
        {label}
      </span>
    </div>
    <span className={`font-semibold ${
      highlight 
        ? 'text-primary font-black text-lg' 
        : 'text-foreground group-hover:text-primary'
    } transition-colors duration-300`}>
      {value || '—'}
    </span>
  </div>
);

// 美化的Section组件 - 现代化设计
const Section = ({ title, icon: Icon, children, gradient = 'from-slate-800/50 to-slate-700/30' }) => (
  <div className={`group relative backdrop-blur-sm rounded-2xl p-6 border hover:border-primary/30 transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-primary/5`} style={{
    background: 'linear-gradient(135deg, hsl(222 40% 8% / 0.8), hsl(222 40% 12% / 0.6))',
    borderColor: 'hsl(222 30% 18%)',
    color: 'hsl(180 5% 95%)'
  }}>
    {/* 背景装饰 */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    
    <div className="relative z-10">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <span className="text-foreground font-black text-xl group-hover:text-primary transition-colors duration-300">
          {title}
        </span>
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  </div>
);

// 美化的列表组件 - 现代化设计
const List = ({ items, icon: Icon, copy = false }) => (
  <div className="space-y-3">
    {(items || []).map((v, idx) => (
      <div key={`${v}-${idx}`} className="group flex items-center justify-between p-4 bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-600/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        <div className="flex items-center gap-4 flex-1">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-center group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <span className="text-sm break-all font-mono font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
            {String(v)}
          </span>
        </div>
        {copy && v && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              navigator.clipboard.writeText(String(v));
              toast.success('已复制到剪贴板', {
                style: {
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none'
                }
              });
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
      </div>
    ))}
  </div>
);

// LinkedIn头像组件
const LinkedInAvatar = ({ profile, size = 'w-12 h-12' }) => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!profile) return;
      
      setLoading(true);
      setError(false);
      
      try {
        // 尝试从用户名获取头像
        let avatar = null;
        if (profile.username) {
          console.log(`🔍 [LinkedInAvatar] Fetching avatar for username: ${profile.username}`);
          avatar = await getCachedLinkedInAvatar(profile.username);
        }
        
        // 如果没有用户名或获取失败，使用姓名生成头像
        if (!avatar && profile.name) {
          console.log(`🎨 [LinkedInAvatar] Generating avatar for name: ${profile.name}`);
          avatar = generateLinkedInAvatarFromName(profile.name);
        }
        
        setAvatarUrl(avatar);
      } catch (err) {
        console.error('❌ [LinkedInAvatar] Error fetching avatar:', err);
        setError(true);
        // 使用默认头像
        if (profile.name) {
          setAvatarUrl(generateLinkedInAvatarFromName(profile.name));
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvatar();
  }, [profile]);
  
  // 加载中显示
  if (loading) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center animate-pulse`}>
        <Linkedin className="w-4 h-4 text-blue-500" />
      </div>
    );
  }
  
  // 有头像时显示
  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        alt={profile.name || 'LinkedIn Profile'}
        className={`${size} rounded-full object-cover border-2 border-blue-500/30 shadow-lg`}
        onError={() => {
          console.warn(`❌ [LinkedInAvatar] Failed to load avatar: ${avatarUrl}`);
          setError(true);
        }}
        loading="lazy"
      />
    );
  }
  
  // 默认显示LinkedIn图标
  const initials = profile.name 
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'LI';
    
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500/30 flex items-center justify-center shadow-lg`}>
      <span className="text-white font-bold text-sm">{initials}</span>
    </div>
  );
};

// 统计卡片组件 - 现代化设计
const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorMap = {
    blue: {
      bg: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-teal-500/10',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/20'
    },
    violet: {
      bg: 'from-violet-500/10 to-purple-500/10',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      text: 'text-violet-600 dark:text-violet-400',
      icon: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/20'
    },
    amber: {
      bg: 'from-amber-500/10 to-orange-500/10',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20'
    },
    indigo: {
      bg: 'from-indigo-500/10 to-blue-500/10',
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      text: 'text-indigo-600 dark:text-indigo-400',
      icon: 'from-indigo-500 to-blue-500',
      shadow: 'shadow-indigo-500/20'
    },
    cyan: {
      bg: 'from-cyan-500/10 to-sky-500/10',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      text: 'text-cyan-600 dark:text-cyan-400',
      icon: 'from-cyan-500 to-sky-500',
      shadow: 'shadow-cyan-500/20'
    },
    // 保持兼容性
    green: {
      bg: 'from-green-500/10 to-emerald-500/10',
      border: 'border-green-500/20 hover:border-green-500/40',
      text: 'text-green-600 dark:text-green-400',
      icon: 'from-green-500 to-emerald-500',
      shadow: 'shadow-green-500/20'
    },
    purple: {
      bg: 'from-purple-500/10 to-pink-500/10',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/20'
    },
    orange: 'from-orange-500/10 to-red-500/10 border-orange-500/20 text-orange-500',
    indigo: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20 text-indigo-500',
    sky: 'from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-600'
  };
  
  const styles = colorMap[color] || colorMap.blue;
  
  return (
    <div className={`group relative backdrop-blur-sm border rounded-2xl p-6 text-center hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer`} style={{
      background: 'linear-gradient(135deg, hsl(222 40% 8% / 0.8), hsl(222 40% 12% / 0.6))',
      borderColor: 'hsl(222 30% 18%)',
      color: 'hsl(180 5% 95%)'
    }}>
      {/* 图标背景 */}
      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br ${styles.icon} shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      {/* 数值 */}
      <p className={`text-3xl font-black mb-1 group-hover:scale-110 transition-transform duration-300`} style={{color: 'hsl(180 100% 42%)'}}>
        {value}
      </p>
      
      {/* 标签 */}
      <p className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{color: 'hsl(180 5% 65%)'}}>
        {label}
      </p>
      
      {/* 悬停效果 */}
      <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

const ExternalLookupResume = React.memo(({ externalLookupResult, query }) => {
  if (!externalLookupResult || !externalLookupResult.data) return null;
  
  // 对于 investigate_api，数据在 externalLookupResult.data
  // 对于 external_lookup，数据在 externalLookupResult.data.data
  const rawData = React.useMemo(() => externalLookupResult.data, [externalLookupResult.data]);
  
  console.log('🔍 [ExternalLookupResume] Raw data:', rawData);
  console.log('🔍 [ExternalLookupResume] Source:', externalLookupResult.source);
  
  const processed = React.useMemo(() => {
    const result = processExternalLookupData(rawData);
    console.log('✅ [ExternalLookupResume] Processed data:', result);
    console.log('🔍 [ExternalLookupResume] LinkedIn profiles:', result.digital?.linkedin);
    console.log('🔍 [ExternalLookupResume] LinkedIn count:', result.digital?.linkedin?.length || 0);
    return result;
  }, [rawData]);
  
  const headerName = React.useMemo(() => 
    processed.primaryName || (processed.names[0] || '未知'),
    [processed.primaryName, processed.names]
  );
  
  const normQueryPhone = React.useMemo(() => 
    String(query || '').replace(/\D/g, ''),
    [query]
  );
  
  const phones = React.useMemo(() => 
    (processed.contacts.phones && processed.contacts.phones.length > 0)
      ? processed.contacts.phones
      : (normQueryPhone ? [normQueryPhone] : []),
    [processed.contacts.phones, normQueryPhone]
  );
  
  const emails = React.useMemo(() => 
    processed.contacts.emails || [],
    [processed.contacts.emails]
  );
  
  // 地址去重和优化 - 智能去重算法
  const normalizeAddress = React.useCallback((addr) => {
    // 标准化地址字符串用于比较
    const normalize = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // 多个空格变成一个
        .replace(/\bstreet\b/gi, 'st')
        .replace(/\bavenue\b/gi, 'ave')
        .replace(/\bcourt\b/gi, 'ct')
        .replace(/\broad\b/gi, 'rd')
        .replace(/\bdrive\b/gi, 'dr')
        .replace(/\blane\b/gi, 'ln')
        .replace(/\bboulevard\b/gi, 'blvd')
        .replace(/[.,#]/g, '');  // 移除标点符号
    };
    
    return {
      address: normalize(addr.address),
      city: normalize(addr.city),
      state: normalize(addr.state),
      postcode: normalize(addr.postcode)
    };
  }, []);
  
  const uniqueAddresses = React.useMemo(() => (processed.addresses || []).reduce((acc, addr) => {
    // 跳过空地址
    if (!addr.address && !addr.city && !addr.state && !addr.postcode) {
      return acc;
    }
    
    const normalized = normalizeAddress(addr);
    const key = `${normalized.address}|${normalized.city}|${normalized.state}|${normalized.postcode}`;
    
    // 检查是否已存在相似地址
    const exists = acc.some(existing => {
      const existingNorm = normalizeAddress(existing);
      const existingKey = `${existingNorm.address}|${existingNorm.city}|${existingNorm.state}|${existingNorm.postcode}`;
      return existingKey === key;
    });
    
    if (!exists) {
      acc.push(addr);
    }
    
    return acc;
  }, []).sort((a, b) => {
    // 按完整度排序（有地址 > 只有城市）
    const scoreA = (a.address ? 4 : 0) + (a.city ? 2 : 0) + (a.state ? 1 : 0) + (a.postcode ? 1 : 0);
    const scoreB = (b.address ? 4 : 0) + (b.city ? 2 : 0) + (b.state ? 1 : 0) + (b.postcode ? 1 : 0);
    return scoreB - scoreA;
  }), [processed.addresses, normalizeAddress]);
  
  const firstAddress = React.useMemo(() => uniqueAddresses[0] || null, [uniqueAddresses]);
  
  const cityFallback = React.useMemo(() => 
    processed.location.cities?.[0] || firstAddress?.city || '—',
    [processed.location.cities, firstAddress]
  );
  
  const stateFallback = React.useMemo(() => 
    processed.location.states?.[0] || firstAddress?.state || '—',
    [processed.location.states, firstAddress]
  );
  
  const postcodeFallback = React.useMemo(() => 
    processed.location.postcodes?.[0] || firstAddress?.postcode || '—',
    [processed.location.postcodes, firstAddress]
  );
  
  // 计算数据统计
  const dataStats = React.useMemo(() => ({
    phones: phones.length,
    emails: emails.length,
    addresses: uniqueAddresses.length,
    relatives: (processed.relatives || []).length,
    companies: (processed.employment.companies || []).length,
    linkedin: (processed.digital?.linkedin || []).length,
  }), [phones, emails, uniqueAddresses, processed.relatives, processed.employment.companies, processed.digital]);

  return (
    <GlassCard className="p-0 overflow-hidden shadow-2xl border-0" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* 顶部横幅 - 现代化设计 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-8 text-white overflow-hidden">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse delay-500"></div>
        </div>
        
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* 个性化头像区域 */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-2xl flex-shrink-0 transform transition-all duration-300 group-hover:scale-105">
                {/* 如果有LinkedIn信息，显示LinkedIn头像 */}
                {processed.digital?.linkedin?.length > 0 ? (
                  <LinkedInAvatar profile={processed.digital.linkedin[0]} size="w-24 h-24" />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-3xl font-black text-white">
                      {headerName !== '未知' ? headerName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
              </div>
              {/* 状态指示器 */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-3 border-white flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
            
            {/* 主要信息区域 */}
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <h1 className="text-5xl font-black text-white drop-shadow-2xl mb-1 tracking-tight">
                  {headerName !== '未知' ? headerName : '身份调查报告'}
                </h1>
                <p className="text-xl text-blue-100 font-medium">
                  综合身份信息档案
                </p>
              </div>
              
              {/* 关键信息标签 */}
              <div className="flex items-center gap-4 text-white/95">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                  <Phone className="w-4 h-4" />
                  <span className="font-mono font-bold text-lg">{query}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full border border-white/20">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{new Date().toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              
              {/* 快速标签 - 重新设计 */}
              <div className="flex flex-wrap gap-3 mt-4">
                {processed.demographics.ages.length > 0 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-emerald-300/30 flex items-center gap-2">
                    <Cake className="w-4 h-4" />
                    {processed.demographics.ages[0]} 岁
                  </span>
                )}
                {processed.demographics.genders.length > 0 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-pink-400/20 to-rose-500/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-pink-300/30 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    {processed.demographics.genders[0] === 'F' || processed.demographics.genders[0] === 'FEMALE' ? '女性' : '男性'}
                  </span>
                )}
                {processed.location.states.length > 0 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-blue-300/30 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {processed.location.states[0]}
                  </span>
                )}
                {processed.carriers.length > 0 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-400/20 to-indigo-500/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-purple-300/30 flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    {processed.carriers[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 右侧状态面板 - 重新设计 */}
          <div className="text-right space-y-4">
            {/* 数据完整度指示器 */}
            <div className="inline-flex flex-col items-end gap-3">
              <div className="px-6 py-4 bg-gradient-to-br from-white/25 to-white/15 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-white/80 font-medium">数据完整度</div>
                    <div className="text-2xl font-black text-white">{Math.min(95, 60 + dataStats.phones * 5 + dataStats.emails * 3)}%</div>
                  </div>
                </div>
              </div>
              
              {/* 验证状态 */}
              <div className="px-4 py-2 bg-gradient-to-r from-green-400/20 to-emerald-500/20 backdrop-blur-sm rounded-xl border border-green-300/30">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  已验证
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className="p-8" style={{ backgroundColor: 'hsl(var(--background))' }}>
        {/* 数据统计卡片 - 现代化设计 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={Phone} label="电话" value={dataStats.phones} color="blue" />
          <StatCard icon={Mail} label="邮箱" value={dataStats.emails} color="emerald" />
          <StatCard icon={MapPinHouse} label="地址" value={dataStats.addresses} color="violet" />
          <StatCard icon={Users} label="亲属" value={dataStats.relatives} color="amber" />
          <StatCard icon={Building2} label="公司" value={dataStats.companies} color="indigo" />
          <StatCard icon={Linkedin} label="LinkedIn" value={dataStats.linkedin} color="cyan" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧列 */}
        <div className="space-y-6">
          {/* 基本信息 */}
          <Section title="基本信息" icon={User} gradient="from-blue-500/5 to-cyan-500/5">
            <InfoRow label="姓名" value={headerName} icon={UserCircle} highlight />
            {processed.demographics.genders.length > 0 && (
              <InfoRow label="性别" value={processed.demographics.genders[0]} icon={UserCheck} />
            )}
            {processed.demographics.birthDates.length > 0 && (
              <InfoRow label="出生日期" value={processed.demographics.birthDates[0]} icon={Cake} />
            )}
            {processed.demographics.birthYears.length > 0 && (
              <InfoRow label="出生年份" value={processed.demographics.birthYears[0]} icon={Calendar} />
            )}
            {processed.demographics.ages.length > 0 && (
              <InfoRow label="年龄" value={`${processed.demographics.ages[0]} 岁`} icon={Target} />
            )}
            {processed.carriers.length > 0 && (
              <InfoRow label="运营商" value={processed.carriers[0]} icon={Radio} />
            )}
          </Section>

          {/* 联系方式 */}
          <Section title="联系方式" icon={Phone} gradient="from-green-500/5 to-emerald-500/5">
            {phones.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    电话号码 ({phones.length})
                  </span>
                  <span className="text-xs text-green-500">可点击复制</span>
                </div>
                <List items={phones} icon={Phone} copy />
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8 bg-background/30 rounded-lg border border-dashed border-white/10">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>暂无电话信息</p>
              </div>
            )}
            
            {emails.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    邮箱地址 ({emails.length})
                  </span>
                  <span className="text-xs text-green-500">可点击复制</span>
                </div>
                <List items={emails} icon={Mail} copy />
              </div>
            )}
          </Section>

          {/* 地址信息 */}
          <Section title="地址信息" icon={Home} gradient="from-purple-500/5 to-pink-500/5">
            {uniqueAddresses.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  找到 {uniqueAddresses.length} 个地址（已去重）
                </div>
                <div className="space-y-4">
                  {uniqueAddresses.map((a, idx) => {
                    // 构建完整地址字符串用于复制
                    const fullAddress = [a.address, a.city, a.state, a.postcode]
                      .filter(part => part && part !== '—')
                      .join(', ');
                    
                    // 检查是否有有效内容
                    const hasAddress = a.address && a.address !== '—';
                    const hasCity = a.city && a.city !== '—';
                    const hasState = a.state && a.state !== '—';
                    const hasPostcode = a.postcode && a.postcode !== '—';
                    const hasDetails = hasCity || hasState || hasPostcode;
                    
                    // 如果完全没有内容，跳过
                    if (!hasAddress && !hasDetails) return null;
                    
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-background/50 to-purple/5 hover:border-purple-500/30 transition-all shadow-md hover:shadow-lg">
                        <div className="space-y-3">
                          {/* 完整地址 */}
                          {hasAddress && (
                            <div className="flex items-start gap-3 pb-3 border-b border-white/10">
                              <Home className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground leading-relaxed">{a.address}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(fullAddress);
                                  toast.success('完整地址已复制到剪贴板');
                                }}
                                className="flex-shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          
                          {/* 详细信息 - 只显示有内容的字段 */}
                          {hasDetails && (
                            <div className={`grid ${[hasCity, hasState, hasPostcode].filter(Boolean).length === 1 ? 'grid-cols-1' : [hasCity, hasState, hasPostcode].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                              {hasCity && (
                                <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg">
                                  <MapPinned className="w-3.5 h-3.5 text-purple-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">城市</p>
                                    <p className="text-sm font-medium truncate">{a.city}</p>
                                  </div>
                                </div>
                              )}
                              {hasState && (
                                <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg">
                                  <Navigation className="w-3.5 h-3.5 text-purple-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">州/省</p>
                                    <p className="text-sm font-medium truncate">{a.state}</p>
                                  </div>
                                </div>
                              )}
                              {hasPostcode && (
                                <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg">
                                  <Package className="w-3.5 h-3.5 text-purple-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">邮编</p>
                                    <p className="text-sm font-medium truncate">{a.postcode}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8 bg-background/30 rounded-lg border border-dashed border-white/10">
                <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>暂无地址信息</p>
              </div>
            )}
          </Section>

          {/* 车辆信息 */}
          {(processed.vehicles || []).length > 0 && (
            <Section title="车辆信息" icon={Package} gradient="from-cyan-500/5 to-blue-500/5">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <Package className="w-3 h-3" />
                找到 {processed.vehicles.length} 辆车辆
              </div>
              <div className="space-y-3">
                {processed.vehicles.map((vehicle, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-background/50 to-cyan-500/5 rounded-lg border border-white/5 hover:border-cyan-500/20 transition-all">
                    <div className="grid grid-cols-2 gap-3">
                      {vehicle.brand && (
                        <div>
                          <p className="text-xs text-muted-foreground">品牌</p>
                          <p className="text-sm font-medium text-foreground capitalize">{vehicle.brand}</p>
                        </div>
                      )}
                      {vehicle.model && (
                        <div>
                          <p className="text-xs text-muted-foreground">型号</p>
                          <p className="text-sm font-medium text-foreground capitalize">{vehicle.model}</p>
                        </div>
                      )}
                      {vehicle.year && (
                        <div>
                          <p className="text-xs text-muted-foreground">年份</p>
                          <p className="text-sm font-medium text-foreground">{vehicle.year}</p>
                        </div>
                      )}
                      {vehicle.vin && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">VIN</p>
                          <p className="text-xs font-mono text-foreground uppercase">{vehicle.vin}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 职业许可证 */}
          {(processed.licenses || []).length > 0 && (
            <Section title="职业许可证" icon={Award} gradient="from-amber-500/5 to-orange-500/5">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <Award className="w-3 h-3" />
                找到 {processed.licenses.length} 个许可证
              </div>
              <div className="space-y-3">
                {processed.licenses.map((license, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-background/50 to-amber-500/5 rounded-lg border border-white/5 hover:border-amber-500/20 transition-all">
                    {license.type && (
                      <div className="mb-2">
                        <span className="px-2 py-1 bg-amber-500/20 rounded text-xs font-medium text-amber-600">
                          {license.type}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {license.document && (
                        <div>
                          <p className="text-xs text-muted-foreground">证书号</p>
                          <p className="font-mono text-foreground">{license.document}</p>
                        </div>
                      )}
                      {license.id && (
                        <div>
                          <p className="text-xs text-muted-foreground">ID</p>
                          <p className="font-mono text-foreground">{license.id}</p>
                        </div>
                      )}
                      {license.issued && (
                        <div>
                          <p className="text-xs text-muted-foreground">颁发日期</p>
                          <p className="text-foreground">{license.issued}</p>
                        </div>
                      )}
                      {license.category && (
                        <div>
                          <p className="text-xs text-muted-foreground">类别</p>
                          <p className="text-foreground">{license.category}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* 右侧列 */}
        <div className="space-y-6">
          {/* 地理位置 */}
          <Section title="地理位置" icon={MapPin} gradient="from-orange-500/5 to-red-500/5">
            <div className="grid grid-cols-3 gap-3">
              {(cityFallback !== '—') && (
                <div className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                  <MapPinned className="w-4 h-4 text-orange-500 mb-2" />
                  <p className="text-xs text-muted-foreground">城市</p>
                  <p className="text-sm font-bold text-foreground mt-1">{cityFallback}</p>
                </div>
              )}
              {(stateFallback !== '—') && (
                <div className="p-3 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-lg border border-red-500/20">
                  <Navigation className="w-4 h-4 text-red-500 mb-2" />
                  <p className="text-xs text-muted-foreground">州/省</p>
                  <p className="text-sm font-bold text-foreground mt-1">{stateFallback}</p>
                </div>
              )}
              {(postcodeFallback !== '—') && (
                <div className="p-3 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
                  <Package className="w-4 h-4 text-pink-500 mb-2" />
                  <p className="text-xs text-muted-foreground">邮编</p>
                  <p className="text-sm font-bold text-foreground mt-1">{postcodeFallback}</p>
                </div>
              )}
            </div>
            {(processed.location.coordinates || []).length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  GPS 坐标 ({processed.location.coordinates.length})
                </div>
                <div className="space-y-2">
                  {(processed.location.coordinates || []).slice(0, 3).map((c, idx) => (
                    <div key={`coord-${idx}`} className="flex items-center justify-between p-3 bg-gradient-to-br from-background/50 to-orange-500/5 rounded-lg border border-white/5 hover:border-orange-500/20 transition-all group">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-mono text-foreground">
                          {c.lat}, {c.lon}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          navigator.clipboard.writeText(`${c.lat}, ${c.lon}`);
                          toast.success('坐标已复制到剪贴板');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 就业信息 */}
          <Section title="就业信息" icon={Building2} gradient="from-indigo-500/5 to-violet-500/5">
            {(processed.employment.companies || []).length > 0 || (processed.employment.titles || []).length > 0 || (processed.employment.records || []).length > 0 ? (
              <>
                {(processed.employment.companies || []).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      公司 ({processed.employment.companies.length})
                    </div>
                    <List items={processed.employment.companies} icon={Building2} />
                  </div>
                )}
                {(processed.employment.titles || []).length > 0 && (
                  <div className={`${(processed.employment.companies || []).length > 0 ? 'mt-6 pt-6 border-t border-white/10' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <IdCard className="w-3 h-3" />
                      职位 ({processed.employment.titles.length})
                    </div>
                    <List items={processed.employment.titles} icon={IdCard} />
                  </div>
                )}
                {(processed.employment.records || []).length > 0 && (
                  <div className={`${((processed.employment.companies || []).length > 0 || (processed.employment.titles || []).length > 0) ? 'mt-6 pt-6 border-t border-white/10' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-3 h-3" />
                      详细就业记录 ({processed.employment.records.length})
                    </div>
                    <div className="space-y-3">
                      {processed.employment.records.map((r, idx) => (
                        <div key={`emp-${idx}`} className="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-background/50 to-indigo/5 hover:border-indigo-500/30 transition-all shadow-md">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-foreground">{r.company || '—'}</p>
                                <p className="text-sm text-muted-foreground">{r.title || '—'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(r.start_date && r.start_date !== '—') && (
                                <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">开始日期</p>
                                    <p className="text-sm font-medium">{r.start_date}</p>
                                  </div>
                                </div>
                              )}
                              {(r.region && r.region !== '—') && (
                                <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">地区</p>
                                    <p className="text-sm font-medium">{r.region}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8 bg-background/30 rounded-lg border border-dashed border-white/10">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>暂无就业信息</p>
              </div>
            )}
          </Section>

          {/* 财务与资产 */}
          <Section title="财务与资产" icon={CreditCard} gradient="from-yellow-500/5 to-amber-500/5">
            {(() => {
              const hasSSN = (processed.digital?.ssns || []).length > 0;
              const hasBanks = (processed.financial.bankNames || []).length > 0;
              const hasRevenue = (processed.financial.annualRevenues || []).length > 0;
              const hasIncome = (processed.financial.incomeCodes || []).length > 0;
              const hasProperty = (processed.property.homeBuiltYears || []).length > 0;
              const hasAnyData = hasSSN || hasBanks || hasRevenue || hasIncome || hasProperty;
              
              console.log('💰 [Financial] SSNs:', processed.digital?.ssns);
              console.log('💰 [Financial] Annual Revenues:', processed.financial.annualRevenues);
              console.log('💰 [Financial] hasSSN:', hasSSN, 'hasRevenue:', hasRevenue);
              
              if (!hasAnyData) {
                return (
                  <div className="text-sm text-muted-foreground text-center py-8 bg-background/30 rounded-lg border border-dashed border-white/10">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>暂无财务信息</p>
                  </div>
                );
              }
              
              return (
                <>
                  {/* SSN - 社会安全号码（不脱敏） */}
                  {hasSSN && (
                    <div className="mb-6 p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <IdCard className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-500">社会安全号码 (SSN)</span>
                      </div>
                      <div className="space-y-2">
                        {processed.digital.ssns.map((ssn, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all group">
                            <span className="text-base font-mono font-bold text-red-400">{ssn}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(ssn);
                                toast.success('SSN已复制到剪贴板');
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 银行信息 */}
                  {hasBanks && (
                    <>
                      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                        <Landmark className="w-3 h-3" />
                        银行信息 ({processed.financial.bankNames.length})
                      </div>
                      <List items={processed.financial.bankNames} icon={Landmark} />
                    </>
                  )}
                  
                  {/* 财务指标卡片 */}
                  {(hasIncome || hasRevenue || hasProperty) && (
                    <div className={`${hasBanks ? 'mt-6 pt-6 border-t border-white/10' : ''}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {hasIncome && (
                          <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20">
                            <DollarSign className="w-4 h-4 text-yellow-500 mb-2" />
                            <p className="text-xs text-muted-foreground">收入代码</p>
                            <p className="text-sm font-bold text-foreground mt-1">{processed.financial.incomeCodes[0]}</p>
                          </div>
                        )}
                        {hasRevenue && (
                          <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                            <TrendingUp className="w-4 h-4 text-green-500 mb-2" />
                            <p className="text-xs text-muted-foreground">年收入</p>
                            <p className="text-sm font-bold text-foreground mt-1">{processed.financial.annualRevenues[0]}</p>
                          </div>
                        )}
                        {hasProperty && (
                          <div className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                            <HouseIcon className="w-4 h-4 text-purple-500 mb-2" />
                            <p className="text-xs text-muted-foreground">房屋年份</p>
                            <p className="text-sm font-bold text-foreground mt-1">{processed.property.homeBuiltYears[0]}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </Section>

          {/* 亲属信息 */}
          {(processed.relatives || []).length > 0 && (
            <Section title="亲属信息" icon={Users} gradient="from-pink-500/5 to-rose-500/5">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-3 h-3" />
                找到 {processed.relatives.length} 位关联人员
              </div>
              <div className="space-y-2">
                {processed.relatives.map((rel, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-br from-background/50 to-pink-500/5 rounded-lg border border-white/5 hover:border-pink-500/20 transition-all">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{rel}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* LinkedIn 档案 */}
          {(processed.digital?.linkedin?.length > 0) && (
            <Section title="LinkedIn 档案" icon={Linkedin} gradient="from-blue-600/5 to-blue-400/5">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <Linkedin className="w-3 h-3" />
                找到 {processed.digital.linkedin.length} 个档案
              </div>
              <div className="space-y-4">
                {processed.digital.linkedin.map((profile, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-white/10 bg-gradient-to-br from-background/50 to-blue-500/5 hover:border-blue-500/30 transition-all">
                    <div className="space-y-3">
                      {/* 姓名和职位 */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* LinkedIn 头像 */}
                          <LinkedInAvatar profile={profile} size="w-14 h-14" />
                          
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                              <Linkedin className="w-4 h-4 text-blue-500" />
                              {profile.name || '未知'}
                            </h4>
                            {profile.title && (
                              <p className="text-sm text-muted-foreground mt-1">{profile.title}</p>
                            )}
                            {profile.company && !profile.title && (
                              <p className="text-sm text-muted-foreground mt-1">@{profile.company}</p>
                            )}
                            {profile.username && (
                              <p className="text-xs text-blue-500 mt-1 font-mono">@{profile.username}</p>
                            )}
                          </div>
                        </div>
                        {profile.profile_url && (
                          <a
                            href={profile.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                          >
                            查看档案
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {!profile.profile_url && (
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/50 text-muted-foreground text-xs rounded-lg">
                            <Linkedin className="w-3 h-3" />
                            无链接
                          </div>
                        )}
                      </div>

                      {/* 详细信息 */}
                      {(profile.email || profile.company || profile.industry || profile.start_date || profile.city || profile.state || profile.country) && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {profile.email && (
                            <InfoRow label="邮箱" value={profile.email} icon={Mail} />
                          )}
                          {profile.company && (
                            <InfoRow label="公司" value={profile.company} icon={Building2} />
                          )}
                          {profile.industry && (
                            <InfoRow label="行业" value={profile.industry} icon={Briefcase} />
                          )}
                          {profile.start_date && (
                            <InfoRow label="开始日期" value={profile.start_date} icon={Calendar} />
                          )}
                          {profile.city && (
                            <InfoRow label="城市" value={profile.city} icon={MapPinned} />
                          )}
                          {profile.state && (
                            <InfoRow label="州/省" value={profile.state} icon={Navigation} />
                          )}
                          {profile.country && (
                            <InfoRow label="国家" value={profile.country} icon={Globe} />
                          )}
                        </div>
                      )}

                      {/* 描述 */}
                      {profile.description && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs text-muted-foreground">{profile.description}</p>
                        </div>
                      )}

                      {/* 数据来源 */}
                      {profile.dataset && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                          <span className="px-2 py-0.5 bg-background/50 rounded">
                            数据源: {profile.dataset}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 数字足迹 - IP 和域名 */}
          {(processed.digital?.ips?.length > 0 || processed.digital?.urls?.length > 0) && (
            <Section title="数字足迹" icon={Network} gradient="from-cyan-500/5 to-blue-500/5">
              {processed.digital.ips.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <Network className="w-3 h-3" />
                    IP 地址 ({processed.digital.ips.length})
                  </div>
                  <List items={processed.digital.ips} icon={Network} copy />
                </div>
              )}
              
              {processed.digital.urls.length > 0 && (
                <div className={processed.digital.ips.length > 0 ? "mt-6 pt-6 border-t border-white/10" : ""}>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    个人域名/网站 ({processed.digital.urls.length})
                  </div>
                  <div className="space-y-2">
                    {processed.digital.urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5 hover:border-cyan/20 transition-all group">
                        <div className="flex items-center gap-2 flex-1">
                          <Globe className="w-4 h-4 text-primary" />
                          <a 
                            href={`https://${url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm break-all font-mono text-cyan-500 hover:text-cyan-400 hover:underline"
                          >
                            {url}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast.success('已复制到剪贴板');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
        </div>
      </div>
    </GlassCard>
  );
});

ExternalLookupResume.displayName = 'ExternalLookupResume';

export default ExternalLookupResume;
