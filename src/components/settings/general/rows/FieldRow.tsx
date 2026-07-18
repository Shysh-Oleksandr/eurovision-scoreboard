import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { FieldItem } from '../model/types';

import { Highlight } from './Highlight';
import { InlineTip } from './InlineTip';

import { Input } from '@/components/Input';
import { Settings, useGeneralStore } from '@/state/generalStore';

interface FieldRowProps {
  item: FieldItem;
  query?: string;
}

export const FieldRow: React.FC<FieldRowProps> = ({ item, query }) => {
  const t = useTranslations();
  const raw = useGeneralStore((s) => s.settings[item.settingKey]);
  const setSettings = useGeneralStore((s) => s.setSettings);
  const [local, setLocal] = useState(String(raw ?? ''));

  useEffect(() => {
    setLocal(String(raw ?? ''));
  }, [raw]);

  const commitNumeric = () => {
    const parsed = parseInt(local, 10);
    let next = Number.isNaN(parsed) ? Number(raw) : parsed;

    if (item.min !== undefined) next = Math.max(item.min, next);
    if (item.max !== undefined) next = Math.min(item.max, next);

    setLocal(String(next));
    setSettings({ [item.settingKey]: next } as Partial<Settings>);
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center gap-[7px]">
        <label
          htmlFor={item.id}
          className="text-[12.5px] font-semibold text-white/70"
        >
          <Highlight text={t(item.labelKey ?? '')} query={query} />
        </label>
        {item.tipKey && <InlineTip tipKey={item.tipKey} />}
      </div>
      <Input
        id={item.id}
        type={item.inputType}
        min={item.min}
        max={item.max}
        placeholder={item.placeholderKey ? t(item.placeholderKey) : undefined}
        value={item.numeric ? local : String(raw ?? '')}
        onChange={(e) => {
          if (item.numeric) {
            setLocal(e.target.value);
          } else {
            setSettings({
              [item.settingKey]: e.target.value,
            } as Partial<Settings>);
          }
        }}
        onBlur={item.numeric ? commitNumeric : undefined}
        className={`h-11 ${item.compact ? 'max-w-[140px]' : ''}`}
      />
    </div>
  );
};
