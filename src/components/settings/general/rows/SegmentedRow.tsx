import { useTranslations } from 'next-intl';
import React from 'react';

import { SegmentedItem } from '../model/types';

import { Segmented } from '@/components/simulation/columnLayout/controls';
import { Settings, useGeneralStore } from '@/state/generalStore';

interface SegmentedRowProps {
  item: SegmentedItem;
}

/** A setting with a few choices, all visible at once (no dropdown, no search). */
export const SegmentedRow: React.FC<SegmentedRowProps> = ({ item }) => {
  const t = useTranslations();
  const value = useGeneralStore((s) => s.settings[item.settingKey]) as string;
  const setSettings = useGeneralStore((s) => s.setSettings);
  const label = item.labelKey ? t(item.labelKey) : '';

  return (
    <div className="px-3 py-2">
      {label && (
        <div className="mb-1 block text-sm font-medium text-white/70">
          {label}
        </div>
      )}
      {item.descKey && (
        <p className="mb-2 text-[12.5px] text-white/50">{t(item.descKey)}</p>
      )}
      <Segmented
        ariaLabel={label}
        value={value}
        options={item.options.map((option) => ({
          value: option.value,
          label: option.labelKey ? t(option.labelKey) : option.label ?? '',
        }))}
        onChange={(next) =>
          setSettings({ [item.settingKey]: next } as Partial<Settings>)
        }
      />
    </div>
  );
};
