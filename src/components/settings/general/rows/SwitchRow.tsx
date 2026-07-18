import { useTranslations } from 'next-intl';
import React from 'react';

import { SwitchItem } from '../model/types';

import { SettingsRow } from './SettingsRow';

import { ToggleButton } from '@/components/common/ToggleButton';
import { Settings, useGeneralStore } from '@/state/generalStore';

interface SwitchRowProps {
  item: SwitchItem;
  query?: string;
}

export const SwitchRow: React.FC<SwitchRowProps> = ({ item, query }) => {
  const t = useTranslations();
  const value = useGeneralStore((s) => s.settings[item.settingKey]) as boolean;
  const setSettings = useGeneralStore((s) => s.setSettings);

  const label = t(item.labelKey ?? '');
  const toggle = () =>
    setSettings({ [item.settingKey]: !value } as Partial<Settings>);

  return (
    <SettingsRow
      label={label}
      desc={item.descKey ? t(item.descKey) : undefined}
      tipKey={item.tipKey}
      query={query}
      onRowClick={toggle}
      control={<ToggleButton isActive={value} onToggle={toggle} />}
    />
  );
};
