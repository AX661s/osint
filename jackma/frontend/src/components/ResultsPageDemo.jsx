import React from 'react';
import PlatformCard from './PlatformCard';
import { GlassCard } from './ui/glass-card';
import { CheckCircle2, Shield, Download, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// 示例数据用于演示两列布局
const sampleResults = {
  data: [
    {
      success: true,
      source: 'osint_industries',
      data: {
        platform: 'GitHub',
        name: 'John Developer',
        username: 'johndev',
        location: 'San Francisco, CA',
        followers: 1250,
        verified: true,
        bio: 'Full-stack developer passionate about open source',
        website: 'https://johndev.com',
        repositories: 45,
        languages: ['JavaScript', 'Python', 'Go']
      }
    },
    {
      success: true,
      source: 'social_media_scanner',
      data: {
        platform: 'Twitter',
        name: 'John Dev',
        username: '@johndev',
        followers: 3420,
        following: 890,
        tweets: 1250,
        verified: false,
        location: 'SF Bay Area',
        bio: 'Building cool stuff | Tech enthusiast',
        joined: '2019-03-15'
      }
    },
    {
      success: true,
      source: 'truecaller',
      data: {
        platform: 'LinkedIn',
        name: 'John Developer',
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco Bay Area',
        connections: 500,
        industry: 'Computer Software',
        experience: '5+ years'
      }
    },
    {
      success: true,
      source: 'caller_id',
      data: {
        platform: 'Instagram',
        name: 'john_dev',
        followers: 2180,
        following: 450,
        posts: 342,
        verified: false,
        bio: 'Developer | Photographer | Traveler',
        website: 'linktr.ee/johndev'
      }
    },
    {
      success: false,
      source: 'hibp',
      error: 'No data found for this email'
    },
    {
      success: false,
      source: 'ipqualityscore',
      error: 'API quota exceeded'
    }
  ]
};

const ResultsPageDemo = ({ onBack }) => {
  // 转换示例数据为平台格式
  const extractPlatforms = () => {
    const platforms = [];
    
    sampleResults.data.forEach((result, index) => {
      if (result.success && result.data) {
        platforms.push({
          ...result.data,
          module: result.source,
          source: result.source,
          status: 'found'
        });
      } else {
        platforms.push({
          module: result.source,
          source: result.source,
          status: 'error',
          error: result.error || '查询失败'
        });
      }
    });
    
    return platforms;
  };

  const platforms = extractPlatforms();
  const foundPlatforms = platforms.filter(p => p.status === 'found');
  const errorPlatforms = platforms.filter(p => p.status === 'error');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* 头部 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-white/10 dark:hover:bg-black/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    OSINT 查询结果 - 两列布局演示
                  </h1>
                  <Badge variant="secondary" className="uppercase">演示模式</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  查询目标: <span className="text-primary font-semibold">demo@example.com</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 backdrop-blur-sm bg-white/5 border-white/20"
              >
                <Download className="w-4 h-4" />
                导出 JSON
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                总平台数
              </span>
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {platforms.length}
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                发现数据
              </span>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="text-4xl font-bold text-green-500">
              {foundPlatforms.length}
            </div>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                错误/限制
              </span>
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-4xl font-bold text-red-500">
              {errorPlatforms.length}
            </div>
          </GlassCard>
        </div>

        {/* 平台卡片网格 - 新的两列布局 */}
        <div className="space-y-12">
          {/* 发现数据的平台 */}
          {foundPlatforms.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                发现数据的平台 ({foundPlatforms.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-max">
                {foundPlatforms.map((platform, index) => (
                  <PlatformCard key={`found-${index}`} platform={platform} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* 错误/限制的平台 */}
          {errorPlatforms.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-500" />
                错误或限制的平台 ({errorPlatforms.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-max">
                {errorPlatforms.map((platform, index) => (
                  <PlatformCard key={`error-${index}`} platform={platform} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPageDemo;