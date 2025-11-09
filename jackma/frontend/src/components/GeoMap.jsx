import React from 'react';
import { GlassCard } from './ui/glass-card';

/**
 * 地图组件（轻量版）
 * - 使用 OpenStreetMap 静态地图，无需 API Key
 * - 支持多个坐标点，自动取第一个作为中心
 */
const GeoMap = ({ coords = [], title = '地图线索', zoom = 11, size = { w: 640, h: 360 } }) => {
  const points = Array.isArray(coords) ? coords.filter(c => Number.isFinite(c?.lat) && Number.isFinite(c?.lon)) : [];
  if (points.length === 0) return null;

  const center = points[0];
  const markersParam = points
    .slice(0, 10) // 防止过多 marker
    .map(c => `${c.lat},${c.lon},lightblue1`)
    .join('|');
  const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lon}&zoom=${zoom}&size=${size.w}x${size.h}&markers=${encodeURIComponent(markersParam)}`;

  const osmLink = `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lon}#map=${zoom}/${center.lat}/${center.lon}`;
  const gmapsLink = `https://www.google.com/maps/@${center.lat},${center.lon},${zoom}z`;

  return (
    <GlassCard className="p-6" hover>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">坐标点数：{points.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={osmLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">OpenStreetMap</a>
          <span className="text-muted-foreground">·</span>
          <a href={gmapsLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Google Maps</a>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-white/10 bg-black/5 dark:bg-white/5">
        <img src={staticMapUrl} alt="地图线索" className="w-full h-auto" />
      </div>
    </GlassCard>
  );
};

export default GeoMap;