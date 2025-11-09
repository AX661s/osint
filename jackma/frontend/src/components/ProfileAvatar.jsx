import React, { useState } from 'react';

// 将 //url 补全为 https://url
const toAbsUrl = (url = '') => {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  return s;
};

// 识别平台品牌渐变（用于首字母背景）
const getGradient = (platformName = '') => {
  const s = String(platformName || '').toLowerCase();
  const map = [
    [/facebook/, 'from-blue-600 via-blue-500 to-indigo-500'],
    [/instagram/, 'from-pink-500 via-red-500 to-yellow-500'],
    [/twitter|x\b/, 'from-slate-900 via-gray-800 to-black'],
    [/linkedin/, 'from-blue-700 via-blue-600 to-cyan-500'],
    [/github/, 'from-gray-800 via-gray-700 to-gray-900'],
    [/youtube/, 'from-red-600 via-red-500 to-orange-500'],
    [/tiktok/, 'from-gray-900 via-fuchsia-500 to-teal-500'],
    [/telegram/, 'from-cyan-500 via-sky-500 to-blue-500'],
    [/whatsapp/, 'from-emerald-500 via-green-500 to-teal-500'],
    [/reddit/, 'from-orange-500 via-amber-500 to-red-500'],
    [/discord/, 'from-indigo-600 via-purple-600 to-blue-600'],
    [/spotify/, 'from-green-600 via-emerald-500 to-teal-500'],
  ];
  for (const [re, cls] of map) if (re.test(s)) return cls;
  return 'from-neutral-600 via-neutral-500 to-neutral-700';
};

// 判断是否为数字或电话号码（用于过滤姓名）
const isNumericOrPhone = (value) => {
  if (!value || typeof value !== 'string') return true;
  const cleaned = value.replace(/[\s\-\+\(\)]/g, '');
  const digitCount = (cleaned.match(/\d/g) || []).length;
  const digitRatio = digitCount / cleaned.length;
  return digitRatio > 0.7 || (cleaned.length > 10 && /^\d+$/.test(cleaned));
};

// 从 spec_format 条目中按优先级提取头像 URL
const getAvatarUrl = (spec) => {
  if (!spec) return null;
  const avatarFields = [
    'avatar',
    'profile_picture',
    'profile_pic',
    'profile_image',
    'profile_picture_url',
    'avatar_url',
    'image_url',
    'photo_url',
    'picture_url',
    'picture',
    'pic',
    'img'
  ];
  for (const field of avatarFields) {
    const node = spec[field];
    if (!node) continue;
    const val = node.value;
    if (val === undefined || val === null || val === '' || val === 'null') continue;
    const url = String(val);
    if (url.startsWith('http') || url.startsWith('//')) return toAbsUrl(url);
  }
  return null;
};

// 从 spec_format 条目中提取用户名/显示名（过滤电话号码）
const getUserName = (spec, platformName) => {
  if (!spec) return platformName;
  const nameFields = ['name', 'full_name', 'display_name', 'nickname', 'username', 'user'];
  for (const field of nameFields) {
    const node = spec[field];
    if (node && node.value) {
      const v = String(node.value);
      if (!isNumericOrPhone(v)) return v;
    }
  }
  return platformName;
};

/**
 * ProfileAvatar
 * 使用 spec_format 优先显示头像；无头像则显示品牌渐变首字母。
 */
const ProfileAvatar = ({ spec, platformName, size = 'h-8 w-8' }) => {
  const [error, setError] = useState(false);
  const url = getAvatarUrl(spec);
  const name = getUserName(spec, platformName);
  const mono = (name?.trim()?.[0] ?? '?').toUpperCase();
  const gradient = getGradient(platformName);

  if (url && !error) {
    const proxied = (typeof url === 'string' && url.startsWith('//')) ? `https:${url}` : url;
    const src = (typeof proxied === 'string' && proxied.startsWith('http'))
      ? `/api/avatar?url=${encodeURIComponent(proxied)}`
      : proxied;
    return (
      <img
        src={src}
        alt={name ? `${name} avatar` : 'avatar'}
        className={`${size} rounded-full object-cover border border-white/10`}
        onError={() => setError(true)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full border border-white/10 bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-semibold text-white/90`}
      title={name}
    >
      {mono}
    </div>
  );
};

export default ProfileAvatar;