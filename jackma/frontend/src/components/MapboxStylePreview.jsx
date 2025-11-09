import React from 'react';
import { GlassCard } from './ui/glass-card';

/**
 * Mapbox 样式预览组件
 * 传入 Mapbox Studio 的样式编辑链接，解析为可嵌入的预览 iframe。
 * 示例链接：
 *   https://console.mapbox.com/studio/styles/stein123/cmgq23www00ax01qt34kaexei/edit/#2/38/-34
 * @param {string} styleUrl - Mapbox Studio 样式链接
 * @param {object} coords - 坐标对象 { lat, lon } 用于标记位置
 */
const MapboxStylePreview = ({ styleUrl, coords }) => {
  if (!styleUrl || typeof styleUrl !== 'string') return null;

  // 从 console.mapbox.com/studio/styles/{user}/{styleId}/edit/#zoom/lat/lon 解析参数
  let user = '';
  let styleId = '';
  let zoom = 2;
  let lat = 0;
  let lon = 0;

  try {
    const u = new URL(styleUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(p => p === 'styles');
    if (idx >= 0 && parts[idx + 1] && parts[idx + 2]) {
      user = parts[idx + 1];
      styleId = parts[idx + 2];
    }
    const hash = (u.hash || '').replace(/^#/, '');
    const hashParts = hash.split('/');
    if (hashParts.length >= 3) {
      const z = parseFloat(hashParts[0]);
      const la = parseFloat(hashParts[1]);
      const lo = parseFloat(hashParts[2]);
      if (Number.isFinite(z)) zoom = z;
      if (Number.isFinite(la)) lat = la;
      if (Number.isFinite(lo)) lon = lo;
    }
  } catch (e) {
    // 若解析失败则静默并使用默认值
  }

  // 如果传入了坐标，使用传入的坐标并设置更高的缩放级别
  if (coords && typeof coords === 'object') {
    if (typeof coords.lat === 'number' && Number.isFinite(coords.lat)) {
      lat = coords.lat;
      zoom = 11; // 设置更高的缩放级别以便看清标记
    }
    if (typeof coords.lon === 'number' && Number.isFinite(coords.lon)) {
      lon = coords.lon;
    } else if (typeof coords.lng === 'number' && Number.isFinite(coords.lng)) {
      lon = coords.lng;
    }
  }

  // 读取令牌（优先环境变量），若未配置则尝试使用本地回退（仅用于预览）
  const token = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1Ijoic3RlaW4xMjMiLCJhIjoiY21ncTE2c3loMmRiZTJvcTJwdzhqaGgwZiJ9.udvt7YV8jZn8UKoDeQ0QlQ';

  if (!user || !styleId) return null;

  // 构建 iframe URL，如果有坐标则添加标记
  let iframeSrc = `https://api.mapbox.com/styles/v1/${user}/${styleId}.html?title=false&zoomwheel=true&fresh=true&access_token=${encodeURIComponent(token)}#${zoom}/${lat}/${lon}`;
  
  // 如果有有效坐标，使用 Mapbox 深色样式的交互式地图
  if (coords && lat !== 0 && lon !== 0) {
    // 使用 Mapbox dark-v11 深色样式，构建可交互的 iframe
    const darkStyleId = 'dark-v11';
    const interactiveIframeSrc = `https://api.mapbox.com/styles/v1/mapbox/${darkStyleId}.html?title=false&zoomwheel=true&fresh=true&access_token=${encodeURIComponent(token)}#${zoom}/${lat}/${lon}`;
    
    return (
      <GlassCard className="p-0 overflow-hidden mb-6" hover={true}>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">Mapbox 交互式地图 (深色) - 可缩放拖动</div>
          <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">在 Google Maps 打开</a>
        </div>
        <div className="w-full h-72 md:h-96 border-0 overflow-hidden bg-gray-900">
          <iframe
            title="交互式地图"
            className="w-full h-full border-0"
            src={interactiveIframeSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="px-4 pb-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>底图来源：Mapbox Dark (深色) - 支持缩放、拖动、旋转</span>
          <span className="font-mono">📍 {lat.toFixed(5)}, {lon.toFixed(5)}</span>
        </div>
      </GlassCard>
    );
  }

  // 若 iframe 在限定时间内未加载，启用静态图回退
  const [loaded, setLoaded] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!loaded) setFallback(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <GlassCard className="p-0 overflow-hidden mb-6" hover={true}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="text-sm text-muted-foreground uppercase tracking-wide">Mapbox 样式预览</div>
        <a href={styleUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">在 Mapbox Studio 打开</a>
      </div>
      {!fallback ? (
        <iframe
          title="mapbox-style-preview"
          className="w-full h-72 md:h-96 border-0"
          src={iframeSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="w-full h-72 md:h-96 border-0 flex items-center justify-center bg-muted/30">
          {/* OSM 静态图回退 */}
          <img
            alt="地图回退"
            className="w-full h-full object-cover"
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${Math.round(zoom)}&size=640x360&markers=${encodeURIComponent(`${lat},${lon},lightblue1`)}`}
          />
        </div>
      )}
      <div className="px-4 pb-4 text-xs text-muted-foreground">
        底图来源：{fallback ? 'OpenStreetMap 静态图（Mapbox 不可用）' : `Mapbox 样式 ${user}/${styleId}`}
      </div>
    </GlassCard>
  );
};

export default MapboxStylePreview;