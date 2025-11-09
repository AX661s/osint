import React from 'react';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassCard } from './ui/glass-card';

/**
 * 统计卡片组件
 * 显示查询结果的统计信息
 */
export const StatsCards = ({ regularPlatforms, foundPlatforms, errorPlatforms }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            总平台数
          </span>
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {regularPlatforms.length}
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
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-4xl font-bold text-red-500">
          {errorPlatforms.length}
        </div>
      </GlassCard>
    </div>
  );
};

export default StatsCards;
