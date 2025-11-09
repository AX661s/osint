import React, { useState, useEffect } from 'react';
import { GlassCard } from './ui/glass-card';
import { Button } from './ui/button';
import { 
  Mail, MapPin, Calendar, Camera, MessageSquare, Star, Eye, EyeOff,
  ExternalLink, Shield, Clock, User, Globe, Activity, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const GoogleAccountCard = ({ email, onClose }) => {
  const [googleData, setGoogleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (email) {
      fetchGoogleData();
    }
  }, [email]);

  const fetchGoogleData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 [Google] Fetching data for email: ${email}`);
      
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? '/api' 
        : (process.env.REACT_APP_API_URL || 'http://localhost:8000/api');
        
      const response = await fetch(`${API_BASE_URL}/google/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ [Google] API response:', data);
      
      setGoogleData(data);
      toast.success('Google账户信息获取成功');
      
    } catch (err) {
      console.error('❌ [Google] API error:', err);
      setError(err.message);
      toast.error(`Google API错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'HIGH': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const InfoRow = ({ icon: Icon, label, value, highlight = false }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
      highlight 
        ? 'bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/30' 
        : 'bg-muted/30 hover:bg-muted/50 border border-border/50'
    }`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            highlight ? 'bg-primary/20' : 'bg-muted/50'
          }`}>
            <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        )}
        <span className={`font-medium ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      <span className={`font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value || '—'}
      </span>
    </div>
  );

  if (loading) {
    return (
      <GlassCard className="p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <Mail className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">正在分析Google账户</h3>
            <p className="text-muted-foreground">{email}</p>
            <p className="text-sm text-muted-foreground/70">
              正在获取账户信息，请稍候...
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6 border-destructive/50" style={{ backgroundColor: 'hsl(var(--background))' }}>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-xl font-bold text-destructive">获取失败</h3>
            <p className="text-muted-foreground">{email}</p>
            <p className="text-sm text-destructive/70 mt-2">{error}</p>
            <Button 
              onClick={fetchGoogleData}
              variant="outline" 
              className="mt-4"
            >
              重试
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (!googleData) {
    return null;
  }

  return (
    <GlassCard className="p-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* 头部 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-50"></div>
        
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Google头像 */}
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center overflow-hidden">
              {googleData.avatar_url ? (
                <img 
                  src={googleData.avatar_url} 
                  alt="Google Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold">Google账户信息</h3>
              <p className="text-white/80">{email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="w-4 h-4" />
                <span className="text-sm">Google服务</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-white hover:bg-white/20"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 内容 */}
      {showDetails && (
        <div className="p-6 space-y-6">
          {/* 隐私风险评估 */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border-2 ${getRiskColor(googleData.privacy_score)}`}>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <div>
                  <p className="font-semibold">隐私评分</p>
                  <p className="text-2xl font-black">{googleData.privacy_score || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl border-2 ${getRiskColor(googleData.overall_risk_level)}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">风险等级</p>
                  <p className="text-2xl font-black">{googleData.overall_risk_level || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              账户详情
            </h4>
            
            {googleData.step1_registration?.gaia_id && (
              <InfoRow 
                icon={User}
                label="Gaia ID"
                value={googleData.step1_registration.gaia_id}
                highlight
              />
            )}
            
            {googleData.step1_registration?.last_profile_edit && (
              <InfoRow 
                icon={Clock}
                label="最后编辑"
                value={new Date(googleData.step1_registration.last_profile_edit).toLocaleString()}
              />
            )}
            
            <InfoRow 
              icon={Mail}
              label="邮箱状态"
              value={googleData.step1_registration?.email_registered ? "已注册" : "未注册"}
            />
          </div>

          {/* Google Maps数据 */}
          {googleData.step5_location_analysis?.maps_url && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Google Maps活动
              </h4>
              
              {googleData.step1_registration?.maps_reviews && (
                <InfoRow 
                  icon={MessageSquare}
                  label="评论数量"
                  value={googleData.step1_registration.maps_reviews}
                />
              )}
              
              {googleData.step1_registration?.maps_photos && (
                <InfoRow 
                  icon={Camera}
                  label="照片数量"
                  value={googleData.step1_registration.maps_photos}
                />
              )}
              
              {googleData.step1_registration?.maps_answers && (
                <InfoRow 
                  icon={MessageSquare}
                  label="回答数量"
                  value={googleData.step1_registration.maps_answers}
                />
              )}
              
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(googleData.step5_location_analysis.maps_url, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  查看Google Maps资料
                </Button>
              </div>
            </div>
          )}

          {/* 反向图片搜索结果 */}
          {googleData.step6_reverse_image && (
            <div className="space-y-3">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                图片分析结果
              </h4>
              
              <InfoRow 
                icon={Activity}
                label="匹配结果"
                value={`${googleData.step6_reverse_image.total_results || 0} 个`}
              />
              
              <InfoRow 
                icon={Shield}
                label="图片风险"
                value={googleData.step6_reverse_image.risk_assessment || 'N/A'}
              />
              
              {googleData.step6_reverse_image.summary && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>分析摘要:</strong> {googleData.step6_reverse_image.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 时间戳 */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              分析时间: {googleData.analysis_timestamp ? new Date(googleData.analysis_timestamp).toLocaleString() : '刚刚'}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default GoogleAccountCard;