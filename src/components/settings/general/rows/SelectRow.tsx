import { useTranslations } from 'next-intl';
import React from 'react';

import { SelectItem } from '../model/types';

import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { Settings, useGeneralStore } from '@/state/generalStore';

interface SelectRowProps {
  item: SelectItem;
}

export const SelectRow: React.FC<SelectRowProps> = ({ item }) => {
  const t = useTranslations();
  const value = useGeneralStore((s) => s.settings[item.settingKey]) as string;
  const setSettings = useGeneralStore((s) => s.setSettings);

  return (
    <div className="px-3 py-2">
      <CustomSelect
        id={item.id}
        options={item.options()}
        value={value}
        onChange={(next) =>
          setSettings({ [item.settingKey]: next } as Partial<Settings>)
        }
        label={item.labelKey ? t(item.labelKey) : undefined}
        className="w-full"
        withIndicator={false}
      />
    </div>
  );
};
