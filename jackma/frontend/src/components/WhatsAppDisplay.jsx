import React from 'react';
import { 
  MessageCircle, ExternalLink, Copy, User, Phone, Globe, 
  Shield, Calendar, MapPin, Building2, CheckCircle2, XCircle, 
  AlertCircle, Info, Clock, Smartphone, FileText
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import AccountCard from './AccountCard';
import MapboxStylePreview from './MapboxStylePreview';
import ErrorBoundary from './ErrorBoundary';

export const WhatsAppDisplay = ({ whatsappData, socialMediaData, externalLookupData, query, melissaCoords }) => {
  if (!whatsappData) return null;

  const raw = whatsappData || {};
  const wdata = (raw.data && typeof raw.data === 'object' && Object.keys(raw.data).length > 0) ? raw.data : raw;

  // 从 Social Media Scanner 提取 WhatsApp 设备信息
  const socialMediaWhatsAppInfo = React.useMemo(() => {
    if (!socialMediaData?.data) return null;
    
    const data = socialMediaData.data;
    
    // Social Media Scanner 返回的数据结构: { WhatsApp: { ... }, Facebook: { ... }, ... }
    const whatsappInfo = data.WhatsApp || data.whatsapp || data['Whats App'] || data['whats app'];
    
    if (!whatsappInfo || typeof whatsappInfo !== 'object') return null;
    
    // 提取设备信息
    return {
      country: whatsappInfo.country || whatsappInfo.Country,
      deviceOS: whatsappInfo.device_os || whatsappInfo.deviceOS || whatsappInfo.DeviceOS || whatsappInfo['Device OS'],
      device: whatsappInfo.device || whatsappInfo.Device,
      live: whatsappInfo.live,
      note: whatsappInfo.note,
      raw: whatsappInfo
    };
  }, [socialMediaData]);

  // 从 External Lookup 提取设备信息
  const externalDeviceInfo = React.useMemo(() => {
    if (!externalLookupData?.data) return null;
    
    const lookupData = externalLookupData.data;
    const sources = lookupData.sources || {};
    
    // 从各个数据源中提取设备相关信息
    const deviceInfo = {
      devices: [],
      carriers: [],
      operators: []
    };
    
    // 遍历所有数据源
    Object.entries(sources).forEach(([sourceName, sourceData]) => {
      if (Array.isArray(sourceData)) {
        sourceData.forEach(record => {
          // 提取运营商信息
          if (record.MobileOperator || record.Carrier || record.carrier) {
            const carrier = record.MobileOperator || record.Carrier || record.carrier;
            if (carrier && !deviceInfo.carriers.includes(carrier)) {
              deviceInfo.carriers.push(carrier);
            }
          }
          
          // 提取设备类型
          if (record.DeviceType || record.device_type || record.deviceType) {
            const device = record.DeviceType || record.device_type || record.deviceType;
            if (device && !deviceInfo.devices.some(d => d.type === device)) {
              deviceInfo.devices.push({
                type: device,
                source: sourceName
              });
            }
          }
        });
      } else if (typeof sourceData === 'object' && sourceData !== null) {
        // 处理单个对象
        if (sourceData.MobileOperator || sourceData.Carrier || sourceData.carrier) {
          const carrier = sourceData.MobileOperator || sourceData.Carrier || sourceData.carrier;
          if (carrier && !deviceInfo.carriers.includes(carrier)) {
            deviceInfo.carriers.push(carrier);
          }
        }
        
        if (sourceData.DeviceType || sourceData.device_type || sourceData.deviceType) {
          const device = sourceData.DeviceType || sourceData.device_type || sourceData.deviceType;
          if (device && !deviceInfo.devices.some(d => d.type === device)) {
            deviceInfo.devices.push({
              type: device,
              source: sourceName
            });
          }
        }
      }
    });
    
    return deviceInfo.devices.length > 0 || deviceInfo.carriers.length > 0 ? deviceInfo : null;
  }, [externalLookupData]);

  // 统一清理可能包含反引号/引号/前后空格的URL字符串
  const cleanUrl = (u) => {
    if (typeof u !== 'string') return u;
    try {
      return u.replace(/^\s*[`'\"]|[`'\"]\s*$/g, '').trim();
    } catch {
      return u;
    }
  };

  // 规范化国家展示：优先ISO代码；若为数字则显示拨号代码或推断US
  const normalizeCountry = (cc, number) => {
    if (!cc) return null;
    const s = String(cc).trim();
    if (/^[A-Z]{2,3}$/.test(s)) return s; // ISO代码
    if (/^\d+$/.test(s)) {
      const n = String(number || '').replace(/[^\d]/g, '');
      if (n.startsWith('1')) return 'US';
      return `+${s}`; // 拨号代码
    }
    return s;
  };

  // 规范化线路类型：过滤设备OS值（ios/android）不作为线路类型显示
  const normalizeLineType = (t) => {
    if (!t) return null;
    const s = String(t).toLowerCase();
    if (s === 'ios' || s === 'android') return null;
    return t;
  };

  const toBool = (val) => {
    if (val === true) return true;
    if (val === false) return false;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', '是', 'found'].includes(s)) return true;
      if (['false', '0', 'no', 'n', 'none', '否', 'not found'].includes(s)) return false;
    }
    return !!val;
  };

  // 提取所有字段
  const displayPhone = wdata?.phone || wdata?.number || query;
  const profilePicBase64 = wdata?.profilePicBase64;
  const profilePicUrl = cleanUrl(wdata?.profilePicUrl) || cleanUrl(wdata?.profilePic) || cleanUrl(wdata?.urlImage);
  const profilePic = profilePicBase64 || profilePicUrl;
  const about = wdata?.about;
  const aboutSetAt = wdata?.aboutSetAt;
  const aboutHistory = wdata?.aboutHistory;
  const countryCode = normalizeCountry(wdata?.countryCode, displayPhone);
  const deviceOS = wdata?.deviceOS;
  const deviceType = wdata?.deviceType;
  const lineType = normalizeLineType(wdata?.lineType || wdata?.type);
  
  // 人脸分析数据
  const faceAnalysis = wdata?.faceAnalysis;
  const hasFaceAnalysis = faceAnalysis && faceAnalysis.people && Array.isArray(faceAnalysis.people) && faceAnalysis.people.length > 0;
  
  // ID 信息
  const idData = wdata?.id;
  const idServer = idData?.server;
  const idUser = idData?.user;
  const idSerialized = idData?._serialized;
  const idBase64 = idSerialized ? btoa(idSerialized) : null;
  
  // 设备信息
  const devices = wdata?.devices || wdata?.linkedDevices || [];
  const deviceCountData = wdata?.deviceCount;
  const deviceCount = deviceCountData?.deviceCount || (Array.isArray(devices) ? devices.length : 0);
  
  // 账户状态
  const isUser = toBool(wdata?.isUser);
  const isWAContact = toBool(wdata?.isWAContact);
  const isBusiness = toBool(wdata?.isBusiness);
  const isVerified = toBool(wdata?.isVerified);
  const isEnterprise = toBool(wdata?.isEnterprise);
  const isGroup = toBool(wdata?.isGroup);
  const isMe = toBool(wdata?.isMe);
  const isMyContact = toBool(wdata?.isMyContact);
  
  // 运营商信息
  const carrierData = wdata?.carrierData || {};
  const carrierSuccess = toBool(carrierData?.success);
  const carrierCountry = carrierData?.country;
  const carrierLocation = carrierData?.location;
  const carrierLineType = carrierData?.lineType;
  const carrierValid = carrierData?.valid;
  const carrierFormatted = carrierData?.formatted;
  
  // Facebook 泄露
  const fbLeak = wdata?.fbLeak;
  const pictureHistory = Array.isArray(wdata?.pictureHistory) ? wdata.pictureHistory : [];
  const rawJson = (() => {
    try { return JSON.stringify(wdata, null, 2); } catch { return null; }
  })();

  const buildWaLink = (phone) => {
    if (!phone) return '';
    const s = String(phone).trim();
    const cleaned = s.replace(/[^\d+]/g, '');
    const normalized = cleaned.startsWith('+') ? cleaned : cleaned.replace(/^0+/, '');
    return `https://wa.me/${normalized.replace(/^\+/, '')}`;
  };

  const waLink = buildWaLink(displayPhone);
  const [showRaw, setShowRaw] = React.useState(false);
  const [wrapRaw, setWrapRaw] = React.useState(false);
  const downloadRawJson = () => {
    if (!rawJson) return;
    try {
      const blob = new Blob([rawJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-raw-${(displayPhone || idSerialized || 'data')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (date.getFullYear() <= 1970) return null;
      return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  // 信息行组件 - 统一样式
  const InfoRow = ({ icon: Icon, label, value, copyable = false }) => {
    if (!value) return null;
    const isUrl = typeof value === 'string' && /^https?:\/\//i.test(value);
    const displayValue = typeof value === 'string' ? cleanUrl(value) : value;
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
          <span className="text-sm text-muted-foreground shrink-0">{label}:</span>
          {isUrl ? (
            <a
              href={displayValue}
              target="_blank"
              rel="noopener noreferrer"
              title={displayValue}
              className="text-sm font-medium break-all text-primary hover:underline"
            >
              {displayValue}
            </a>
          ) : (
            <span className="text-sm font-medium truncate" title={String(displayValue)}>{displayValue}</span>
          )}
        </div>
        {copyable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 shrink-0"
            onClick={() => navigator.clipboard.writeText(String(displayValue))}
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  // 状态指示器组件
  const StatusIndicator = ({ active, label }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
      {active ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      )}
      <span className={`text-sm ${active ? 'text-foreground' : 'text-muted-foreground/70'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="mb-8 space-y-4">
      {/* 主卡片 - 使用 AccountCard */}
      <AccountCard
        appName="WhatsApp"
        platform="whatsapp"
        websiteUrl="https://www.whatsapp.com"
        status={isUser ? '已注册' : '未注册'}
        timestamp={formatDate(aboutSetAt)}
        accountId={idUser}
        name={displayPhone}
        location={carrierLocation}
        locationIcon="🌍"
        phone={displayPhone}
        language={countryCode}
        tags={[
          ...(isUser ? ['WhatsApp User'] : []),
          ...(isWAContact ? ['Contact'] : []),
          ...(isBusiness ? ['Business'] : []),
          ...(isVerified ? ['Verified'] : []),
          ...(deviceCount > 0 ? [`${deviceCount} Devices`] : [])
        ]}
        avatarUrl={profilePic}
        logoImageUrl={null}
        onViewAccount={() => waLink && window.open(waLink, '_blank')}
        onExpand={() => {}}
        mainFields={[
          { label: 'Phone', value: displayPhone, copyable: true },
          ...(idSerialized ? [{ label: 'JID', value: idSerialized, copyable: true }] : []),
          ...(countryCode ? [{ label: 'Country', value: countryCode }] : []),
          ...(carrierLocation ? [{ label: 'Location', value: carrierLocation }] : []),
          ...(lineType ? [{ label: 'Line Type', value: lineType }] : []),
          ...(deviceOS ? [{ label: 'Device OS', value: deviceOS }] : []),
          ...(deviceType ? [{ label: 'Device', value: deviceType }] : []),
          ...(about && about.trim() ? [{ label: 'About', value: about }] : []),
          ...(deviceCount > 0 ? [{ label: 'Devices', value: `${deviceCount} 台设备` }] : [])
        ]}
      />

      {/* 详细信息区域 - 网格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 账户状态 */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">账户状态</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatusIndicator active={isUser} label="WhatsApp 用户" />
            <StatusIndicator active={isWAContact} label="联系人" />
            <StatusIndicator active={isBusiness} label="商用账户" />
            <StatusIndicator active={isVerified} label="已认证" />
            <StatusIndicator active={isEnterprise} label="企业账户" />
            <StatusIndicator active={isMyContact} label="我的联系人" />
          </div>
        </div>

        {/* 头像展示 + 人脸分析 */}
        {profilePic && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">头像{hasFaceAnalysis && ' & 人脸分析'}</h3>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                <img
                  src={profilePic}
                  alt="WhatsApp Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="flex-1 space-y-3">
                {profilePicUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(profilePicUrl, '_blank')}
                  >
                    查看原图
                  </Button>
                )}
                {hasFaceAnalysis && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-primary">AI 人脸分析</div>
                    {faceAnalysis.people.map((person, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">年龄:</span>
                            <span className="ml-2 font-medium">{person.age} 岁</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">性别:</span>
                            <span className="ml-2 font-medium">{person.gender === 'Male' ? '男性' : person.gender === 'Female' ? '女性' : person.gender}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">置信度:</span>
                            <span className="ml-2 font-medium">{(person.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {faceAnalysis.total > 0 && (
                      <div className="text-xs text-muted-foreground">
                        检测到 {faceAnalysis.total} 个人脸
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 签名历史 */}
        {Array.isArray(aboutHistory) && aboutHistory.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">签名历史</h3>
            </div>
            <div className="space-y-2">
              {aboutHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                  <div className="text-sm text-foreground/90 break-words">{item.about}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(item.date) || (item.aboutSetAt && formatDate(item.aboutSetAt)) || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 头像历史 */}
        {Array.isArray(pictureHistory) && pictureHistory.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">头像历史</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {pictureHistory.map((url, idx) => (
                <div key={idx} className="w-full aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={cleanUrl(url)}
                    alt={`Avatar ${idx}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 运营商信息 */}
        {carrierSuccess && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">运营商信息</h3>
            </div>
            <div className="space-y-2">
              <InfoRow icon={Globe} label="国家" value={carrierCountry} />
              <InfoRow icon={MapPin} label="地区" value={carrierLocation} />
              <InfoRow icon={Phone} label="线路类型" value={carrierLineType} />
              {carrierValid !== undefined && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">有效性:</span>
                  </div>
                  <Badge variant={carrierValid ? 'default' : 'secondary'}>
                    {carrierValid ? '有效' : '无效'}
                  </Badge>
                </div>
              )}
              {carrierFormatted?.international && (
                <InfoRow label="国际格式" value={carrierFormatted.international} copyable />
              )}
              {carrierFormatted?.e164 && (
                <InfoRow label="E.164" value={carrierFormatted.e164} copyable />
              )}
            </div>
          </div>
        )}

        {/* 账户 ID 信息 */}
        {(idData || idSerialized) && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">账户 ID</h3>
            </div>
            <div className="space-y-2">
              <InfoRow label="用户 ID" value={idUser} copyable />
              <InfoRow label="服务器" value={idServer} />
              <InfoRow label="序列化 ID" value={idSerialized} copyable />
              {idBase64 && (
                <div className="py-2 px-3 rounded-lg bg-white/[0.02]">
                  <div className="text-sm text-muted-foreground mb-2">Base64:</div>
                  <div className="font-mono text-xs break-all bg-black/20 p-2 rounded">
                    {idBase64}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7"
                    onClick={() => navigator.clipboard.writeText(idBase64)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    复制
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 更多字段 */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">更多字段</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setShowRaw(v => !v)}
            >
              <FileText className="w-4 h-4 mr-1" />
              {showRaw ? '隐藏原始数据' : '显示原始数据'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {countryCode && <InfoRow label="Country" value={countryCode} />}
            {idSerialized && <InfoRow label="JID" value={idSerialized} copyable />}
            {lineType && <InfoRow label="Line Type" value={lineType} />}
            {deviceOS && <InfoRow label="Device OS" value={deviceOS} />}
            {deviceType && <InfoRow label="Device" value={deviceType} />}
            {wdata?.image_status && <InfoRow label="Image Status" value={wdata.image_status} />}
            {profilePicUrl && <InfoRow label="Avatar URL" value={profilePicUrl} copyable />}
            {waLink && <InfoRow label="WhatsApp Link" value={waLink} copyable />}
            {wdata?.date && <InfoRow label="Data Timestamp" value={formatDate(wdata.date)} />}
            {aboutSetAt && <InfoRow label="About Set At" value={formatDate(aboutSetAt)} />}
          </div>
        </div>

        {/* 原始数据（WhatsApp） */}
        {showRaw && rawJson && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">原始数据（WhatsApp）</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setWrapRaw(v => !v)}>
                  {wrapRaw ? '取消换行' : '换行显示'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={downloadRawJson}>
                  下载 JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(rawJson)}>
                  复制 JSON
                </Button>
              </div>
            </div>
            <pre className={`text-xs bg-black/30 p-3 rounded-lg overflow-auto max-h-96 font-mono ${wrapRaw ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
              {rawJson}
            </pre>
          </div>
        )}

        {/* 设备信息 - 合并 WhatsApp API、Social Media Scanner 和 External Lookup 数据 */}
        {(deviceCount > 0 || deviceCountData || socialMediaWhatsAppInfo || externalDeviceInfo) && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">设备信息</h3>
              </div>
              {deviceCount > 0 && (
                <Badge variant="default" className="text-sm">
                  {deviceCount} 台登录设备
                </Badge>
              )}
            </div>
            
            {/* Social Media Scanner 的 WhatsApp 设备信息 */}
            {socialMediaWhatsAppInfo && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <div className="text-sm font-semibold text-green-500">WhatsApp 设备检测</div>
                  {socialMediaWhatsAppInfo.live && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      在线
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {socialMediaWhatsAppInfo.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">国家:</span>
                      <span className="font-medium">{socialMediaWhatsAppInfo.country}</span>
                    </div>
                  )}
                  {socialMediaWhatsAppInfo.deviceOS && (
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">系统:</span>
                      <span className="font-medium">{socialMediaWhatsAppInfo.deviceOS}</span>
                    </div>
                  )}
                  {socialMediaWhatsAppInfo.device && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Smartphone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">设备:</span>
                      <span className="font-medium">{socialMediaWhatsAppInfo.device}</span>
                    </div>
                  )}
                </div>
                {socialMediaWhatsAppInfo.note && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {socialMediaWhatsAppInfo.note}
                  </div>
                )}
              </div>
            )}
            
            {/* WhatsApp 设备数量 */}
            {deviceCountData && (
              <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">WhatsApp 登录设备</div>
                    <div className="font-bold text-primary text-lg">{deviceCountData.deviceCount} 台</div>
                  </div>
                  {deviceCountData.lastUpdated && formatDate(deviceCountData.lastUpdated) && (
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">更新时间</div>
                      <div className="text-xs">{formatDate(deviceCountData.lastUpdated)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* WhatsApp 登录设备列表 */}
            {devices.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-muted-foreground mb-2">WhatsApp 登录设备</div>
                <div className="space-y-2">
                  {devices.map((device, index) => (
                    <div key={index} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="font-medium text-sm mb-2">设备 {index + 1}</div>
                      <div className="space-y-1 text-xs">
                        {device.name && <div><span className="text-muted-foreground">名称:</span> {device.name}</div>}
                        {device.platform && <div><span className="text-muted-foreground">平台:</span> {device.platform}</div>}
                        {device.model && <div><span className="text-muted-foreground">型号:</span> {device.model}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* External Lookup 设备信息 */}
            {externalDeviceInfo && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground mb-2">设备类型信息</div>
                
                {/* 设备类型 */}
                {externalDeviceInfo.devices.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-2">检测到的设备类型:</div>
                    <div className="flex flex-wrap gap-2">
                      {externalDeviceInfo.devices.map((device, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Smartphone className="w-3 h-3 mr-1" />
                          {device.type}
                          <span className="ml-1 text-muted-foreground">({device.source})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 运营商信息 */}
                {externalDeviceInfo.carriers.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">运营商:</div>
                    <div className="flex flex-wrap gap-2">
                      {externalDeviceInfo.carriers.map((carrier, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          {carrier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 如果没有任何设备信息 */}
            {deviceCount === 0 && !deviceCountData && !externalDeviceInfo && (
              <div className="text-center text-muted-foreground text-sm py-4">
                暂无设备信息
              </div>
            )}
          </div>
        )}

        {/* 个人简介 */}
        {about && about.trim() && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">个人简介</h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed p-3 rounded-lg bg-white/[0.02]">
              {about}
            </p>
            {aboutSetAt && formatDate(aboutSetAt) && (
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>设置于: {formatDate(aboutSetAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Facebook 泄露检测 */}
        {fbLeak && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl shadow-2xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Facebook 泄露检测</h3>
            </div>
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              toBool(fbLeak.success) 
                ? 'bg-red-500/10 border border-red-500/20' 
                : 'bg-green-500/10 border border-green-500/20'
            }`}>
              {toBool(fbLeak.success) ? (
                <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold mb-1 ${
                  toBool(fbLeak.success) ? 'text-red-500' : 'text-green-500'
                }`}>
                  {toBool(fbLeak.success) ? '⚠️ 发现泄露记录' : '✓ 未发现泄露'}
                </div>
                {(fbLeak.message || fbLeak.error) && (
                  <p className="text-sm text-muted-foreground">
                    {fbLeak.message || fbLeak.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 地图 */}
      {melissaCoords && melissaCoords.lat && (melissaCoords.lon || melissaCoords.lng) && (
        <ErrorBoundary>
          <MapboxStylePreview coords={melissaCoords} />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default WhatsAppDisplay;