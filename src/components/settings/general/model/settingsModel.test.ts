import { describe, expect, it } from 'vitest';

import en from '../../../../../messages/en.json';

import { CATEGORIES } from './settingsModel';
import type { SettingsItem } from './types';

import { useGeneralStore } from '@/state/generalStore';

/** Flatten every item, descending into conditional children and two-col fields. */
const flatten = (items: SettingsItem[]): SettingsItem[] =>
  items.flatMap((item) => [
    item,
    ...(item.children ? flatten(item.children) : []),
    ...(item.kind === 'twocol' ? item.items : []),
  ]);

const allItems = CATEGORIES.flatMap((category) => flatten(category.items));

const resolveKey = (path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      en,
    );

describe('general settings model', () => {
  it('has unique item ids', () => {
    const ids = allItems.map((item) => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
  });

  it('binds every control to a real settings key', () => {
    const settings = useGeneralStore.getState().settings as unknown as Record<
      string,
      unknown
    >;

    for (const item of allItems) {
      if (
        item.kind === 'switch' ||
        item.kind === 'slider' ||
        item.kind === 'select' ||
        item.kind === 'field'
      ) {
        expect(
          Object.prototype.hasOwnProperty.call(settings, item.settingKey),
        ).toBe(true);
      }
    }
  });

  it('references only i18n keys that exist in en.json', () => {
    const keys = new Set<string>();

    for (const category of CATEGORIES) {
      keys.add(category.titleKey);
      keys.add(category.blurbKey);
    }

    for (const item of allItems) {
      if (item.labelKey) keys.add(item.labelKey);
      if (item.tipKey) keys.add(item.tipKey);
      if (item.descKey) keys.add(item.descKey);
      if (item.kind === 'subhead' && item.noteKey) keys.add(item.noteKey);
      if (item.kind === 'field' && item.placeholderKey) {
        keys.add(item.placeholderKey);
      }
      if (item.kind === 'slider') {
        if (item.minLabelKey) keys.add(item.minLabelKey);
        if (item.maxLabelKey) keys.add(item.maxLabelKey);
      }
      if (item.kind === 'custom') {
        item.searchTextKeys.forEach((key) => keys.add(key));
      }
    }

    const missing = [...keys].filter((key) => resolveKey(key) === undefined);

    expect(missing).toEqual([]);
  });
});
