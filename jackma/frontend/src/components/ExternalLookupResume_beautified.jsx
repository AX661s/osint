import React from 'react';
import { GlassCard } from './ui/glass-card';
import { Button } from './ui/button';
import { MapPin, Phone, Mail, User, Building2, IdCard, Calendar, CreditCard, Home, Users, Copy } from 'lucide-react';
import { processExternalLookupData } from '../utils/externalLookupProcessor';
import { toast } from 'sonner';

// 美化的信息行组件
const InfoRow = ({ label, value, icon, highlight = false }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
    highlight 
      ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20' 
      : 'bg-background/30 border border-white/5 hover:border-white/10'
  }`}>
    <div className="flex items-center gap-2">
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <span className={`font-medium text-sm ${highlight ? 'text-primary font-bold' : 'text-foreground'}`}>
      {value || '—'}
    </span>
  </div>
);

// 美化的Section组件
const Section = ({ title, icon: Icon, children, gradient = 'from-primary/5 to-secondary/5' }) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 border border-white/10 hover:border-primary/20 transition-all duration-300 shadow-lg`}>
    <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {title}
      </span>
    </h3>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

// 美化的列表组件
const List = ({ items, icon: Icon, copy = false }) => (
  <div className="space-y-2">
    {(items || []).map((v, idx) => (
      <div key={`${v}-${idx}`} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-white/5 hover:border-primary/20 transition-all group">
        <div className="flex items-center gap-2 flex-1">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <span className="text-sm break-all font-mono">{String(v)}</span>
        </div>
        {copy && v && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              navigator.clipboard.writeText(String(v));
              toast.success('已复制到剪贴板');
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
      </div>
    ))}
  </div>
);

const ExternalLookupResume = ({ externalLookupResult, query }) => {
  if (!externalLookupResult || !externalLookupResult.data) return null;
  
  const rawData = externalLookupResult.data.data || externalLookupResult.data;
  console.log('🔍 [ExternalLookupResume] Raw data:', rawData);
  
  const processed = processExternalLookupData(rawData);
  console.log('✅ [ExternalLookupResume] Processed data:', processed);
  
  const headerName = processed.primaryName || (processed.names[0] || '未知');
  const normQueryPhone = String(query || '').replace(/\D/g, '');
  const phones = (processed.contacts.phones && processed.contacts.phones.length > 0)
    ? processed.contacts.phones
    : (normQueryPhone ? [normQueryPhone] : []);
  const emails = processed.contacts.emails || [];
  const firstAddress = (processed.addresses && processed.addresses.length > 0) ? processed.addresses[0] : null;
  const cityFallback = processed.location.cities?.[0] || firstAddress?.city || '—';
  const stateFallback = processed.location.states?.[0] || firstAddress?.state || '—';
  const postcodeFallback = processed.location.postcodes?.[0] || firstAddress?.postcode || '—';

  return (
    <GlassCard className="p-8 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl">
      {/* 标题区域 - 美化 */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gradient-to-r from-primary via-secondary to-accent">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-xl animate-pulse">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-lg">
                个人信息简历
              </h2>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                目标号码：<span className="text-primary font-bold font-mono text-base">{query}</span>
              </p>
            </div>
          </div>
        </div>
        {headerName !== '未知' && (
          <div className="text-right bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-xl border border-primary/20">
            <p className="text-3xl font-bold text-foreground">{headerName}</p>
            <p className="text-sm text-muted-foreground mt-1">主要身份</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧列 */}
        <div className="space-y-6">
          {/* 基本信息 */}
          <Section title="基本信息" icon={User} gradient="from-blue-500/5 to-cyan-500/5">
            <InfoRow label="姓名" value={headerName} icon="👤" highlight />
            {processed.demographics.genders.length > 0 && (
              <InfoRow label="性别" value={processed.demographics.genders[0]} icon="⚧" />
            )}
            {processed.demographics.birthDates.length > 0 && (
              <InfoRow label="出生日期" value={processed.demographics.birthDates[0]} icon="🎂" />
            )}
            {processed.demographics.birthYears.length > 0 && (
              <InfoRow label="出生年份" value={processed.demographics.birthYears[0]} icon="📅" />
            )}
            {processed.demographics.ages.length > 0 && (
              <InfoRow label="年龄" value={`${processed.demographics.ages[0]} 岁`} icon="🎯" />
            )}
            {processed.carriers.length > 0 && (
              <InfoRow label="运营商" value={processed.carriers[0]} icon="📡" />
            )}
          </Section>

          {/* 联系方式 */}
          <Section title="联系方式" icon={Phone} gradient="from-green-500/5 to-emerald-500/5">
            {phones.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  电话号码 ({phones.length})
                </div>
                <List items={phones} icon={Phone} copy />
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg">
                暂无电话信息
              </div>
            )}
            
            {emails.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  邮箱地址 ({emails.length})
                </div>
                <List items={emails} icon={Mail} copy />
              </div>
            )}
          </Section>

          {/* 地址信息 */}
          <Section title="地址信息" icon={Home} gradient="from-purple-500/5 to-pink-500/5">
            {(processed.addresses || []).length > 0 ? (
              (processed.addresses || []).map((a, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-white/10 bg-gradient-to-br from-background/50 to-primary/5 hover:border-primary/30 transition-all">
                  <div className="space-y-2">
                    <InfoRow label="地址" value={a.address} icon="🏠" />
                    <div className="grid grid-cols-3 gap-2">
                      <InfoRow label="城市" value={a.city} icon="🏙" />
                      <InfoRow label="州/省" value={a.state} icon="🗺" />
                      <InfoRow label="邮编" value={a.postcode} icon="📮" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg">
                暂无地址信息
              </div>
            )}
          </Section>
        </div>

        {/* 右侧列 */}
        <div className="space-y-6">
          {/* 地理位置 */}
          <Section title="地理位置" icon={MapPin} gradient="from-orange-500/5 to-red-500/5">
            <div className="grid grid-cols-3 gap-2">
              <InfoRow label="城市" value={cityFallback} icon="🏙" />
              <InfoRow label="州/省" value={stateFallback} icon="🗺" />
              <InfoRow label="邮编" value={postcodeFallback} icon="📮" />
            </div>
            {(processed.location.coordinates || []).slice(0, 3).map((c, idx) => (
              <div key={`coord-${idx}`} className="p-3 bg-background/30 rounded-lg border border-white/5 text-sm font-mono">
                <span className="text-muted-foreground">坐标：</span>
                <span className="text-primary ml-2">lat {c.lat}, lon {c.lon}</span>
              </div>
            ))}
          </Section>

          {/* 就业信息 */}
          <Section title="就业信息" icon={Building2} gradient="from-indigo-500/5 to-violet-500/5">
            {(processed.employment.companies || []).length > 0 || (processed.employment.titles || []).length > 0 ? (
              <>
                {(processed.employment.companies || []).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      公司 ({processed.employment.companies.length})
                    </div>
                    <List items={processed.employment.companies} icon={Building2} />
                  </div>
                )}
                {(processed.employment.titles || []).length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <IdCard className="w-3 h-3" />
                      职位 ({processed.employment.titles.length})
                    </div>
                    <List items={processed.employment.titles} icon={IdCard} />
                  </div>
                )}
                {(processed.employment.records || []).map((r, idx) => (
                  <div key={`emp-${idx}`} className="p-4 rounded-lg border border-white/10 bg-gradient-to-br from-background/50 to-secondary/5 mt-4">
                    <div className="space-y-2">
                      <InfoRow label="公司" value={r.company} icon="🏢" />
                      <InfoRow label="职位" value={r.title} icon="💼" />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <InfoRow label="开始日期" value={r.start_date} icon="📅" />
                        <InfoRow label="地区" value={r.region} icon="🌍" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg">
                暂无就业信息
              </div>
            )}
          </Section>

          {/* 财务与资产 */}
          <Section title="财务与资产" icon={CreditCard} gradient="from-yellow-500/5 to-amber-500/5">
            {(processed.financial.bankNames || []).length > 0 ? (
              <List items={processed.financial.bankNames} icon={CreditCard} />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg">
                暂无银行信息
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <InfoRow label="收入代码" value={processed.financial.incomeCodes?.[0]} icon="💰" />
              <InfoRow label="年收入" value={processed.financial.annualRevenues?.[0]} icon="💵" />
              <InfoRow label="房屋年份" value={processed.property.homeBuiltYears?.[0]} icon="🏡" />
            </div>
          </Section>

          {/* 亲属信息 */}
          {(processed.relatives || []).length > 0 && (
            <Section title="亲属信息" icon={Users} gradient="from-pink-500/5 to-rose-500/5">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" />
                亲属 ({processed.relatives.length})
              </div>
              <List items={processed.relatives} icon={Users} />
            </Section>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default ExternalLookupResume;
