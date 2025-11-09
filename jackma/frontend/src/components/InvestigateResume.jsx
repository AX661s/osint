import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  User, Phone, Mail, MapPin, Briefcase, GraduationCap,
  Users, Link as LinkIcon, Globe, Shield, Database, Clock
} from 'lucide-react';

const L = ({ children }) => (
  <span className="text-xs text-muted-foreground">{children}</span>
);

/**
 * InvestigateResume - 简历式人物信息视图
 * 展示身份、简介、联系方式、社交链接、工作经历、教育、地址/房产、亲属、泄露信息等
 * processed（后端处理）优先，raw（原始）兜底
 */
const InvestigateResume = ({ investigateData, query }) => {
  if (!investigateData || !investigateData.data) return null;
  const raw = investigateData.data;
  const processed = raw.processed || null;

  // 元信息
  const meta = (processed && processed.meta) || {};
  const dataSourcesCount = meta.dataSourcesCount ?? meta.data_sources_count ?? meta.data_sources ?? raw.data_sources_count ?? 0;
  const durationSeconds = meta.duration ?? meta.response_time ?? raw.duration_seconds ?? 0;

  // 身份与概要
  const identity = processed ? processed.identity || {} : {};
  const name = identity.primary_name || identity.name || '';
  const nameVariants = identity.name_variants || [];
  const headline = (processed && processed.quality && processed.quality.lastUpdated) ? `更新于 ${processed.quality.lastUpdated}` : '';
  const location = (processed && processed.geographic && processed.geographic.geolocation && processed.geographic.geolocation.metro_area) || '';
  const gender = identity.gender || '';
  const age = identity.age || '';
  const languages = identity.languages || [];

  // 联系方式
  const contacts = processed ? processed.contacts || {} : {};
  const phones = (contacts.phones && (contacts.phones.all || contacts.phones)) || contacts.phones || [];
  const emails = (contacts.emails && (contacts.emails.all || contacts.emails)) || contacts.emails || [];

  // 社交媒体
  const social = processed ? processed.social || {} : {};
  const platforms = social.platforms || [];

  // 工作与教育
  const professional = processed ? processed.professional || {} : {};
  const employment = professional.employment || [];
  const education = professional.education || [];

  // 地址 / 房产
  const geographic = processed ? processed.geographic || {} : {};
  const addresses = (geographic.addresses && (geographic.addresses.all || geographic.addresses)) || geographic.addresses || [];
  const financial = processed ? processed.financial || {} : {};
  const properties = financial.properties || [];

  // 亲属
  const network = processed ? processed.network || {} : {};
  const relatives = network.relatives || [];

  // 泄露 / 安全
  const security = processed ? processed.security || {} : {};

  if (!processed) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle>简历视图不可用</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            后端未返回处理后的人物数据（processed/summary）。请稍后重试或使用其他号码。
          </div>
        </CardContent>
      </Card>
    );
  }
  const leaked = security.leaked_credentials || { total: 0, sources: [] };

  const Section = ({ icon: Icon, title, extra, children }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            <CardTitle>{title}</CardTitle>
          </div>
          {extra}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const FieldRow = ({ label, value }) => (
    <div className="flex items-start gap-3 py-1">
      <L>{label}</L>
      <div className="text-sm text-foreground/90 break-words">{value || <span className="opacity-50">—</span>}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 头部概要 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">{name || query}</CardTitle>
                {nameVariants?.length > 0 && (
                  <Badge variant="secondary" className="text-xs">别名 {nameVariants.length}</Badge>
                )}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {[age ? `${age}岁` : '', gender ? (gender === 'MALE' ? '男性' : gender === 'FEMALE' ? '女性' : gender) : '', location].filter(Boolean).join(' · ')}
              </div>
              {languages?.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">语言：{languages.join(', ')}</div>
              )}
              {headline && (<div className="mt-1 text-xs text-muted-foreground">{headline}</div>)}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{dataSourcesCount} 个数据源</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">耗时：{Number(durationSeconds).toFixed(1)} 秒</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 联系方式 */}
      <Section icon={Phone} title="联系方式" extra={<Badge>{(phones?.length || 0) + (emails?.length || 0)}</Badge>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-2">电话</div>
            {(phones || []).slice(0, 10).map((p, i) => (
              <FieldRow key={`phone-${i}`} label={p.type || '号码'} value={(p.display || p.number || p)} />
            ))}
            {(!phones || phones.length === 0) && <div className="text-sm opacity-50">—</div>}
          </div>
          <div>
            <div className="font-semibold mb-2">邮箱</div>
            {(emails || []).slice(0, 10).map((e, i) => (
              <FieldRow key={`email-${i}`} label={e.type || '邮箱'} value={(e.address || e)} />
            ))}
            {(!emails || emails.length === 0) && <div className="text-sm opacity-50">—</div>}
          </div>
        </div>
      </Section>

      {/* 社交链接 */}
      <Section icon={Globe} title="社交链接" extra={<Badge>{platforms.length}</Badge>}>
        {platforms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {platforms.slice(0, 20).map((pl, i) => (
              <div key={`soc-${i}`} className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                <div className="text-sm font-mono truncate">{pl.platform || '未知平台'} · {pl.accountCount || pl.totalAccounts || 0} 个账户</div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm opacity-50">—</div>}
      </Section>

      {/* 工作经历 */}
      <Section icon={Briefcase} title="工作经历" extra={<Badge>{employment.length}</Badge>}>
        {employment.length > 0 ? (
          <div className="space-y-3">
            {employment.slice(0, 12).map((job, i) => (
              <div key={`job-${i}`} className="p-3 rounded-lg bg-muted/50">
                <div className="font-semibold">{job.title || '未知职位'}</div>
                <div className="text-sm text-muted-foreground">{job.company || '未知公司'}</div>
                <div className="text-xs text-muted-foreground mt-1">{[job.startDate, job.endDate].filter(Boolean).join(' - ')}</div>
                {job.location && (<div className="text-xs text-muted-foreground">{job.location}</div>)}
              </div>
            ))}
          </div>
        ) : <div className="text-sm opacity-50">—</div>}
      </Section>

      {/* 教育经历 */}
      <Section icon={GraduationCap} title="教育经历" extra={<Badge>{education.length}</Badge>}>
        {education.length > 0 ? (
          <div className="space-y-3">
            {education.slice(0, 12).map((edu, i) => (
              <div key={`edu-${i}`} className="p-3 rounded-lg bg-muted/50">
                <div className="font-semibold">{edu.school || '未知学校'}</div>
                <div className="text-sm text-muted-foreground">{edu.degree || edu.major || '未知学位'}</div>
                {edu.year && (<div className="text-xs text-muted-foreground mt-1">{edu.year}</div>)}
              </div>
            ))}
          </div>
        ) : <div className="text-sm opacity-50">—</div>}
      </Section>

      {/* 地址与房产 */}
      <Section icon={MapPin} title="地址与房产" extra={<Badge>{addresses.length + properties.length}</Badge>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-2">地址</div>
            {addresses.slice(0, 12).map((addr, i) => (
              <FieldRow key={`addr-${i}`} label="地址" value={addr.address || [addr.street, addr.city, addr.postalCode || addr.postal_code].filter(Boolean).join(', ')} />
            ))}
            {addresses.length === 0 && <div className="text-sm opacity-50">—</div>}
          </div>
          <div>
            <div className="font-semibold mb-2">房产</div>
            {properties.slice(0, 12).map((prop, i) => (
              <FieldRow key={`prop-${i}`} label="房产" value={[prop.address, prop.city, prop.state, prop.postalCode].filter(Boolean).join(', ')} />
            ))}
            {properties.length === 0 && <div className="text-sm opacity-50">—</div>}
          </div>
        </div>
      </Section>

      {/* 亲属关系 */}
      <Section icon={Users} title="亲属关系" extra={<Badge>{relatives.length}</Badge>}>
        {relatives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {relatives.slice(0, 12).map((rel, i) => (
              <div key={`rel-${i}`} className="p-2 rounded-lg bg-muted/50 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{rel.name || '未知'}</div>
                  <div className="text-xs text-muted-foreground">{rel.relationship || ''}</div>
                </div>
                {typeof rel.confidence === 'number' && (<Badge variant="secondary" className="text-xs">{Math.round(rel.confidence * 100)}%</Badge>)}
              </div>
            ))}
          </div>
        ) : <div className="text-sm opacity-50">—</div>}
      </Section>

      {/* 数据泄露 / 安全 */}
      <Section icon={Shield} title="数据泄露" extra={<Badge variant={leaked.total > 0 ? 'destructive' : 'secondary'}>{leaked.total || 0}</Badge>}>
        {leaked.total > 0 ? (
          <div className="space-y-2">
            {(leaked.sources || []).slice(0, 20).map((src, i) => (
              <div key={`leak-${i}`} className="p-2 rounded bg-muted/50 text-sm">
                <div className="font-semibold">{src.source || '未知来源'}</div>
                <div className="text-xs text-muted-foreground">{(src.count || 0)} 个凭证{src.leakDate ? ` · ${String(src.leakDate).split('T')[0]}` : ''}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm opacity-50">—</div>}
      </Section>
    </div>
  );
};

export default InvestigateResume;