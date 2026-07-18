import { ReactNode } from 'react';

import { Option } from '@/components/common/customSelect/CustomSelect';
import { Settings } from '@/state/generalStore';

/** A lucide-react icon (or any component accepting size/className). */
export type IconType = React.ComponentType<{
  size?: number;
  className?: string;
}>;

/** Environment flags used by env-based `when` predicates (NOT parent-toggle gating). */
export interface SettingsEnv {
  fullscreenEnabled: boolean;
  hasSimBg: boolean;
}

export type SettingsPredicate = (env: SettingsEnv) => boolean;

type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];
type NumberSettingKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];
type StringSettingKey = {
  [K in keyof Settings]: Settings[K] extends string ? K : never;
}[keyof Settings];

interface ItemBase {
  id: string;
  labelKey?: string;
  tipKey?: string;
  descKey?: string;
  /** Env-based visibility only (e.g. fullscreen support). Parent-toggle gating uses `children`. */
  when?: SettingsPredicate;
  /** Rendered indented when the parent switch is on (non-search mode). */
  children?: SettingsItem[];
}

export interface SwitchItem extends ItemBase {
  kind: 'switch';
  settingKey: BooleanSettingKey;
}

export interface SelectItem extends ItemBase {
  kind: 'select';
  settingKey: StringSettingKey;
  options: () => Option[];
}

export interface SliderItem extends ItemBase {
  kind: 'slider';
  settingKey: NumberSettingKey;
  min: number;
  max: number;
  step: number;
  minLabelKey?: string;
  maxLabelKey?: string;
  minLabel?: string;
  maxLabel?: string;
  displayValue?: boolean;
}

export interface FieldItem extends ItemBase {
  kind: 'field';
  settingKey: StringSettingKey | NumberSettingKey;
  inputType: 'text' | 'number';
  placeholderKey?: string;
  /** When true, value is coerced to a number and clamped to [min, max] on blur. */
  numeric?: boolean;
  min?: number;
  max?: number;
  compact?: boolean;
}

export interface TwoColItem extends ItemBase {
  kind: 'twocol';
  items: FieldItem[];
}

export interface SubheadItem extends ItemBase {
  kind: 'subhead';
  noteKey?: string;
}

export interface NoteItem extends ItemBase {
  kind: 'note';
}

export interface RenderCtx {
  query: string;
}

export interface CustomItem extends ItemBase {
  kind: 'custom';
  /** i18n keys contributing to the search haystack for this composite. */
  searchTextKeys: string[];
  render: (ctx: RenderCtx) => ReactNode;
}

export type SettingsItem =
  | SwitchItem
  | SelectItem
  | SliderItem
  | FieldItem
  | TwoColItem
  | SubheadItem
  | NoteItem
  | CustomItem;

export interface Category {
  id: string;
  titleKey: string;
  blurbKey: string;
  icon: IconType;
  items: SettingsItem[];
}
