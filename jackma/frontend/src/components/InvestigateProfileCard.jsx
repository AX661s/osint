import React, { useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  Users, Home, Shield, Database, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, TrendingUp, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  processInvestigateData, 
  generateInvestigateSummary,
  formatInvestigateDisplay 
} from '../utils/investigateDataProcessor';
import { InvestigateDataNormalizer } from '../utils/investigateDataNormalizer';

/**
 * Investigate API 数据展示组件
 * 展示来自99个数据源的综合人物档案
 */
const InvestigateProfileCard = ({ investigateData, query }) => {
  const [expandedSections, setExpandedSections] = useState({
    contacts: true,
    employment: false,
    socialMedia: false,
    addresses: false,
    relatives: false,
    properties: false,
    security: false
  });

  if (!investigateData || !investigateData.data) {
    return null;
  }

  // 优先使用后端处理的数据
  let processedData, summary;
  
  if (investigateData.data.processed) {
    // 使用后端已处理的数据
    console.log('✅ [InvestigateProfileCard] 使用后端处理的数据');
    processedData = investigateData.data.processed;
    summary = investigateData.data.summary;
  }

  if (!processedData) {
    console.error('❌ [InvestigateProfileCard] 数据处理失败');
    return null;
  }
  // 提供安全的摘要回退，避免空对象导致渲染异常
  summary = summary || { identity: {}, stats: {}, risks: {} };

  // 统一摘要字段命名（后端与前端可能不一致）
  const normalizeSummary = (s) => {
    const stats = s.stats || {};
    const risks = s.risks || {};
    return {
      identity: s.identity || {},
      stats: {
        phones: stats.phones ?? 0,
        emails: stats.emails ?? 0,
        employment: stats.employment ?? stats.companies ?? (processedData?.professional?.employment?.length ?? 0),
        relatives: stats.relatives ?? 0,
        properties: stats.properties ?? 0,
        confidenceScore: stats.confidenceScore ?? stats.confidence ?? (processedData?.quality?.overall_confidence ? Math.round(processedData.quality.overall_confidence * 100) : 0)
      },
      risks: {
        hasLeakedCredentials: risks.hasLeakedCredentials ?? risks.has_leaks ?? false,
        leakedAccountsCount: risks.leakedAccountsCount ?? risks.leak_count ?? 0,
        hasPlaintextPasswords: risks.hasPlaintextPasswords ?? risks.has_plaintext ?? false
      }
    };
  };
  summary = normalizeSummary(summary);

  // 适配数据结构（后端和前端处理的数据结构可能略有不同）
  const identity = processedData.identity || {};
  const contacts = processedData.contacts || {};
  const professional = processedData.professional || {};
  const social = processedData.social || {};
  const geographic = processedData.geographic || {};
  const network = processedData.network || {};
  const financial = processedData.financial || {};
  const security = processedData.security || {};
  const metadata = processedData.meta || investigateData.metadata || {};
  const dataSourcesCount = metadata.dataSourcesCount ?? metadata.data_sources_count ?? metadata.data_sources ?? 0;
  const durationSeconds = metadata.duration ?? metadata.response_time ?? 0;
  
  // 统一数据访问
  const basicInfo = identity;
  const employment = professional.employment || [];
  const socialMedia = social.platforms || [];
  const addresses = geographic.addresses?.all || geographic.addresses || [];
  const relatives = network.relatives || [];
  const properties = financial.properties || [];
  const leakedCredentials = security.leaked_credentials || { total: 0, sources: [] };
  const geolocation = geographic.geolocation || {};
  
  // 联系方式适配
  const phonesList = contacts.phones?.all || contacts.phones || [];
  const emailsList = contacts.emails?.all || contacts.emails || [];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 置信度颜色
  const getConfidenceColor = (score) => {
    if (score >= 0.9) return 'text-green-500';
    if (score >= 0.7) return 'text-blue-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // 置信度徽章
  const ConfidenceBadge = ({ score }) => {
    const percentage = Math.round((score || 0) * 100);
    let variant = 'secondary';
    if (percentage >= 90) variant = 'default';
    else if (percentage >= 70) variant = 'secondary';
    else variant = 'outline';
    
    return (
      <Badge variant={variant} className="text-xs">
        {percentage}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 头部卡片 - 人物摘要 */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{summary.identity?.name || basicInfo.primary_name || basicInfo.name || query}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {(basicInfo.age || 0)}岁 · {basicInfo.gender === 'MALE' ? '男性' : basicInfo.gender === 'FEMALE' ? '女性' : '未知'} · {(summary.identity?.location || '')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{dataSourcesCount} 个数据源</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm">置信度: {(summary.stats?.confidenceScore ?? 0)}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 快速统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <Phone className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">{summary.stats.phones || 0}</div>
              <div className="text-xs text-muted-foreground">电话号码</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <Mail className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold">{summary.stats.emails || 0}</div>
              <div className="text-xs text-muted-foreground">邮箱地址</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <Briefcase className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold">{summary.stats.employment || 0}</div>
              <div className="text-xs text-muted-foreground">职业记录</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold">{summary.stats.relatives || 0}</div>
              <div className="text-xs text-muted-foreground">亲属关系</div>
            </div>
          </div>

          {/* 风险提示 */}
          {summary.risks?.hasLeakedCredentials && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-500">安全警告</div>
                <div className="text-sm text-muted-foreground mt-1">
                  发现 {(summary.risks?.leakedAccountsCount ?? 0)} 个账户在数据泄露中被发现
                  {summary.risks?.hasPlaintextPasswords && ' (包含明文密码)'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 联系方式 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('contacts')}>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <CardTitle>联系方式</CardTitle>
              <Badge>{(contacts.totalPhones || 0) + (contacts.totalEmails || 0)}</Badge>
            </div>
            {expandedSections.contacts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSections.contacts && (
          <CardContent className="space-y-4">
            {/* 电话号码 */}
            {phonesList.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  电话号码 ({phonesList.length})
                </h4>
                <div className="space-y-2">
                  {phonesList.map((phone, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1">
                        <div className="font-mono font-semibold">{phone.display}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {phone.carrier} · {phone.location} · {phone.type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          来源: {phone.sourcesCount || 0} 个数据源
                        </div>
                      </div>
                      <ConfidenceBadge score={phone.confidence} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 邮箱地址 */}
            {emailsList.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  邮箱地址 ({emailsList.length})
                </h4>
                <div className="space-y-2">
                  {emailsList.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1">
                        <div className="font-mono font-semibold break-all">{email.address}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {email.type} · {email.domain}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          来源: {email.sourcesCount || 0} 个数据源
                        </div>
                      </div>
                      <ConfidenceBadge score={email.confidence} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 职业信息 */}
      {employment.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('employment')}>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <CardTitle>职业历史</CardTitle>
                <Badge>{employment.length}</Badge>
              </div>
              {expandedSections.employment ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.employment && (
            <CardContent>
              <div className="space-y-3">
                {employment.map((job, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{job.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{job.company}</div>
                        {job.location && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </div>
                        )}
                        {(job.startDate || job.endDate) && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {job.startDate} {job.endDate && `- ${job.endDate}`}
                          </div>
                        )}
                      </div>
                      <ConfidenceBadge score={job.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 社交媒体账户 */}
      {socialMedia.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('socialMedia')}>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>社交媒体账户</CardTitle>
                <Badge>{socialMedia.length}</Badge>
              </div>
              {expandedSections.socialMedia ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.socialMedia && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socialMedia.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{item.platform}</div>
                      <Badge variant="secondary">{item.accountCount || 0} 个账户</Badge>
                    </div>
                    {item.accounts.slice(0, 2).map((account, aidx) => (
                      <div key={aidx} className="text-xs text-muted-foreground mt-1">
                        {account.email && `📧 ${account.email}`}
                        {account.registrationDate && ` · 注册: ${account.registrationDate.split('T')[0]}`}
                      </div>
                    ))}
                    {item.totalAccounts > 2 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        还有 {item.totalAccounts - 2} 个账户...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 地址信息 */}
      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('addresses')}>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>地址记录</CardTitle>
                <Badge>{addresses.length}</Badge>
              </div>
              {expandedSections.addresses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.addresses && (
            <CardContent>
              <div className="space-y-2">
                {addresses.map((addr, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold">{formatInvestigateDisplay.address(addr)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        来源: {addr.sourcesCount || 0} 个数据源
                      </div>
                    </div>
                    <ConfidenceBadge score={addr.confidence} />
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 亲属关系 */}
      {relatives.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('relatives')}>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>亲属关系</CardTitle>
                <Badge>{relatives.length}</Badge>
              </div>
              {expandedSections.relatives ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.relatives && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relatives.map((rel, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-semibold">{rel.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {rel.relationship} · {rel.sourcesCount || 0} 个来源
                      </div>
                    </div>
                    <ConfidenceBadge score={rel.confidence} />
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 房产记录 */}
      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('properties')}>
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                <CardTitle>房产记录</CardTitle>
                <Badge>{properties.length}</Badge>
              </div>
              {expandedSections.properties ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.properties && (
            <CardContent>
              <div className="space-y-3">
                {properties.map((prop, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{prop.address}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {prop.city}, {prop.state} {prop.postalCode}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {prop.estimatedValue && <span>估值: {prop.estimatedValue}</span>}
                          {prop.bedrooms && prop.bedrooms > 0 && <span>{prop.bedrooms} 卧室</span>}
                          {prop.bathrooms && prop.bathrooms > 0 && <span>{prop.bathrooms} 浴室</span>}
                          {prop.purchaseYear && <span>购于: {prop.purchaseYear}</span>}
                        </div>
                      </div>
                      <ConfidenceBadge score={prop.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 安全信息 */}
      {leakedCredentials.total > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('security')}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <CardTitle className="text-red-500">数据泄露记录</CardTitle>
                <Badge variant="destructive">{leakedCredentials.total}</Badge>
              </div>
              {expandedSections.security ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CardHeader>
          {expandedSections.security && (
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="font-semibold text-red-500 mb-2">泄露统计</div>
                  <div className="text-sm text-muted-foreground">
                    共发现 {leakedCredentials.total} 个泄露凭证，涉及以下数据源：
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {leakedCredentials.sources.map((source, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/50 text-sm">
                      <div className="font-semibold">{source.source}</div>
                      <div className="text-xs text-muted-foreground">
                        {source.count || 0} 个凭证
                        {source.leakDate && ` · ${source.leakDate.split('T')[0]}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 数据源信息 */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">Investigate API</div>
                <div className="text-sm text-muted-foreground">
                  整合了 {dataSourcesCount} 个数据源的综合信息
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">查询耗时</div>
              <div className="text-lg font-bold">{Number(durationSeconds).toFixed(1)}秒</div>
            </div>
          </div>
          
          {/* 数据源列表（折叠） */}
          {processedData.quality?.sources && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                查看所有数据源 ({processedData.quality.sources.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-1">
                {processedData.quality.sources.slice(0, 50).map((source, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {source}
                  </Badge>
                ))}
                {processedData.quality.sources.length > 50 && (
                  <Badge variant="secondary" className="text-xs">
                    +{processedData.quality.sources.length - 50} 更多...
                  </Badge>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestigateProfileCard;
