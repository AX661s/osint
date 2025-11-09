import React, { useState } from "react";
import { PlatformIcon } from "./PlatformIcon";
import UniversalLogo from "./UniversalLogo";

// 黑玻璃风格账户情报卡（显示更多字段版本）
export default function AccountCard(props) {
  const {
    appName,
    appColor = "#16a34a",
    status = "Active",
    timestamp,
    accountId,
    name,
    locationIcon,
    location,
    phone,
    email,
    language,
    tags = [],
    avatarUrl,
    onViewAccount,
    onExpand,
    platform,
    websiteUrl,
    mainFields,
    // 新增：平台 Logo 图片（优先于内置图标）
    logoImageUrl,
  } = props;

  const platformName = platform ?? appName ?? "Unknown";
  
  // 动态选择主字段：仅显示存在值的关键项（最多6个）
  const normalizeMainFields = () => {
    // 若外部已提供 mainFields，优先使用（并过滤空值）
    let list = Array.isArray(mainFields) ? mainFields.filter(f => f && f.value !== undefined && f.value !== null && f.value !== '') : [];
    if (list.length > 0) {
      return list.slice(0, 6);
    }

    // 回退：根据优先级从 props 选择有值的字段
    const candidates = [
      name ? { label: "Name", value: name } : null,
      phone ? { label: "Phone", value: phone, copyable: true } : null,
      email ? { label: "Email", value: email, copyable: true } : null,
      accountId ? { label: "Account ID", value: accountId, copyable: true } : null,
      language ? { label: "Language", value: language } : null,
      location ? { label: "Location", value: (
        <span className="inline-flex items-center gap-1">
          <span className="text-base leading-none">{locationIcon}</span>
          <span>{location}</span>
        </span>
      ) } : null,
    ].filter(Boolean);

    // 仅显示存在值的项，最多6个
    return candidates.slice(0, 6);
  };

  return (
    <div className="w-full rounded-2xl border border-border/50 bg-card text-card-foreground shadow overflow-hidden flex flex-col" style={{ minHeight: '380px' }}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 sm:p-5 shrink-0">
        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-transparent p-0">
          <UniversalLogo
            platform={platformName}
            module={platformName}
            label={appName || platformName}
            url={websiteUrl}
            className="h-full w-full block"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{appName}</h3>
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
              {status}
            </span>
          </div>
      {timestamp && <p className="mt-1 text-xs text-neutral-400">{timestamp}</p>}
    </div>
    <div className="ml-auto">
      <Avatar url={avatarUrl} name={name} />
    </div>
  </div>

      {/* Fields section: two-column symmetric layout with exactly six items */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:px-5 pb-4 sm:pb-5 sm:grid-cols-2 flex-1">
        {normalizeMainFields().map((f, idx) => (
          <div key={`${f.label}-${idx}`}>
            <Field label={f.label} value={f.value} copyable={f.copyable} />
          </div>
        ))}

        {tags.length > 0 && (
          <div className="col-span-1 sm:col-span-2 -mt-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-3 sm:px-5 shrink-0 mt-auto">
        <button
          onClick={onViewAccount}
          className="inline-flex items-center gap-1 text-sm text-neutral-200 hover:text-white transition"
        >
          <span>View Account</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M7 17 17 7v6h2V5H11v2h6L7 17z" />
          </svg>
        </button>
        <button
          onClick={onExpand}
          className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 px-3 py-2 text-sm font-medium transition"
        >
          Expand Results
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, copyable }) {
  const isSensitive = (lbl) => /password|密码/i.test(lbl ?? "");
  const masked = isSensitive(label);
  const isReactElement = (v) => v && typeof v === 'object' && 'props' in v;
  const safeRender = (v) => {
    if (masked) return "••••••";
    if (v === null || v === undefined || v === "") return <span className="opacity-50">—</span>;
    if (isReactElement(v)) return v;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return <span>{String(v)}</span>;
    if (t === "object") {
      if (v && typeof v === 'object' && v._serialized) return <span>{v._serialized}</span>;
      return <span className="text-neutral-300">{JSON.stringify(v)}</span>;
    }
    return <span className="text-neutral-300">{String(v)}</span>;
  };
  const getCopyText = (v) => {
    if (masked) return undefined;
    if (v === null || v === undefined || v === "") return undefined;
    if (isReactElement(v)) return undefined;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return String(v);
    if (t === "object") {
      if (v && v._serialized) return v._serialized;
      try { return JSON.stringify(v); } catch { return undefined; }
    }
    return undefined;
  };
  const text = getCopyText(value);
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-2">
        <span>{label}</span>
        {masked && (
          <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">已遮罩</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="truncate text-sm text-neutral-100/95">{safeRender(value)}</div>
        {!masked && copyable && text && (
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-neutral-300 hover:bg-white/10"
            title="Copy"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

function Avatar({ url, name }) {
  const [imgError, setImgError] = useState(false);
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name ? `${name} avatar` : "avatar"}
        className="h-32 w-32 rounded-2xl object-cover border border-white/10 shadow-lg"
        title={url}
        onError={() => setImgError(true)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    );
  }
  const mono = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div className="h-32 w-32 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-semibold">
      {mono}
    </div>
  );
}