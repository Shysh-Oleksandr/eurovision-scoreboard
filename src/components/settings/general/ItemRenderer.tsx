import React from 'react';

import { SettingsEnv, SettingsItem, SwitchItem } from './model/types';
import { FieldRow } from './rows/FieldRow';
import { Note } from './rows/Note';
import { SelectRow } from './rows/SelectRow';
import { SliderRow } from './rows/SliderRow';
import { Subhead } from './rows/Subhead';
import { SwitchRow } from './rows/SwitchRow';
import { TwoCol } from './rows/TwoCol';

import { useGeneralStore } from '@/state/generalStore';

interface ItemProps {
  item: SettingsItem;
  query?: string;
}

/** Renders a single item's control row — no conditional children, no env gating. */
export const ItemControl: React.FC<ItemProps> = ({ item, query }) => {
  switch (item.kind) {
    case 'switch':
      return <SwitchRow item={item} query={query} />;
    case 'select':
      return <SelectRow item={item} />;
    case 'slider':
      return <SliderRow item={item} />;
    case 'field':
      return <FieldRow item={item} query={query} />;
    case 'twocol':
      return <TwoCol item={item} query={query} />;
    case 'subhead':
      return <Subhead item={item} />;
    case 'note':
      return <Note item={item} />;
    case 'custom':
      return <>{item.render({ query: query ?? '' })}</>;
    default:
      return null;
  }
};

const SwitchWithChildren: React.FC<{
  item: SwitchItem;
  env: SettingsEnv;
  query?: string;
}> = ({ item, env, query }) => {
  const on = useGeneralStore((s) => s.settings[item.settingKey]) as boolean;

  return (
    <>
      <SwitchRow item={item} query={query} />
      {on && item.children && item.children.length > 0 && (
        <div className="ml-3 flex flex-col border-l-2 border-solid border-primary-700 pl-3.5">
          {item.children.map((child) => (
            <ItemNode key={child.id} item={child} env={env} query={query} />
          ))}
        </div>
      )}
    </>
  );
};

interface ItemNodeProps {
  item: SettingsItem;
  env: SettingsEnv;
  query?: string;
}

/**
 * Normal-mode renderer: applies env-based visibility, then renders the control and
 * (for switches) its conditional children indented when the switch is on.
 */
export const ItemNode: React.FC<ItemNodeProps> = ({ item, env, query }) => {
  if (item.when && !item.when(env)) return null;

  if (item.kind === 'switch' && item.children && item.children.length > 0) {
    return <SwitchWithChildren item={item} env={env} query={query} />;
  }

  return <ItemControl item={item} query={query} />;
};
