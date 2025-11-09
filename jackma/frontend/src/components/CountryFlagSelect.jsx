import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import 'flag-icons/css/flag-icons.min.css';

// 常用國家及區號，顯示英文縮寫（UK 對應旗幟代碼 GB）
const COUNTRIES = [
  { code: 'CN', abbr: 'CN', dial: '86' },
  { code: 'US', abbr: 'US', dial: '1' },
  { code: 'GB', abbr: 'UK', dial: '44' },
  { code: 'IN', abbr: 'IN', dial: '91' },
  { code: 'JP', abbr: 'JP', dial: '81' },
  { code: 'KR', abbr: 'KR', dial: '82' },
  { code: 'RU', abbr: 'RU', dial: '7' },
  { code: 'DE', abbr: 'DE', dial: '49' },
  { code: 'FR', abbr: 'FR', dial: '33' },
  { code: 'BR', abbr: 'BR', dial: '55' },
];


export const CountryFlagSelect = ({ value = '86', onChange }) => {
  return (
    <div className="w-[180px]">
      <Select value={value} onValueChange={(v) => onChange?.(v)}>
        <SelectTrigger className="h-16 px-3 bg-background/50 border-border/50 focus:border-primary/50">
          <SelectValue placeholder="選擇國家/區號" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.dial}>
              <span className={`fi fi-${c.code.toLowerCase()} mr-2`} aria-hidden="true" />
              <span className="mr-2">{c.abbr}</span>
              <span className="text-muted-foreground">+{c.dial}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CountryFlagSelect;