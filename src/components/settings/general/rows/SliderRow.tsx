import { useTranslations } from 'next-intl';
import React from 'react';

import { SliderItem } from '../model/types';

import { RangeSlider } from '@/components/common/RangeSlider';
import { Settings, useGeneralStore } from '@/state/generalStore';

interface SliderRowProps {
  item: SliderItem;
}

export const SliderRow: React.FC<SliderRowProps> = ({ item }) => {
  const t = useTranslations();
  const value = useGeneralStore((s) => s.settings[item.settingKey]) as number;
  const setSettings = useGeneralStore((s) => s.setSettings);

  const minLabel =
    item.minLabel ?? (item.minLabelKey ? t(item.minLabelKey) : undefined);
  const maxLabel =
    item.maxLabel ?? (item.maxLabelKey ? t(item.maxLabelKey) : undefined);

  return (
    <div className="px-3 py-2">
      <RangeSlider
        id={item.id}
        label={item.labelKey ? t(item.labelKey) : undefined}
        value={value}
        onChange={(next) =>
          setSettings({ [item.settingKey]: next } as Partial<Settings>)
        }
        min={item.min}
        max={item.max}
        step={item.step}
        displayValue={item.displayValue}
        minLabel={minLabel}
        maxLabel={maxLabel}
      />
    </div>
  );
};
