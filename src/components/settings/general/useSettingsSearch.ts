import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Category, SettingsEnv, SettingsItem } from './model/types';

export interface SearchGroup {
  category: Category;
  matches: SettingsItem[];
}

export interface SearchResult {
  active: boolean;
  groups: SearchGroup[];
  counts: Record<string, number>;
  total: number;
}

/**
 * Filters the settings model by a query, matching each item's resolved
 * label + tooltip + description (+ custom search text). Env-hidden items
 * (e.g. unsupported fullscreen) are excluded; conditional children are matched
 * flat regardless of their parent toggle.
 */
export function useSettingsSearch(
  categories: Category[],
  query: string,
  env: SettingsEnv,
): SearchResult {
  const t = useTranslations();
  const q = query.trim().toLowerCase();

  return useMemo(() => {
    if (!q) {
      return { active: false, groups: [], counts: {}, total: 0 };
    }

    const safeT = (key?: string) => {
      if (!key) return '';
      try {
        return t(key);
      } catch {
        return '';
      }
    };

    const haystack = (item: SettingsItem): string => {
      const parts: string[] = [safeT(item.labelKey), safeT(item.descKey)];

      if (item.tipKey) parts.push(safeT(item.tipKey));
      if (item.kind === 'subhead' && item.noteKey)
        parts.push(safeT(item.noteKey));
      if (item.kind === 'twocol') {
        item.items.forEach((f) =>
          parts.push(safeT(f.labelKey), safeT(f.placeholderKey)),
        );
      }
      if (item.kind === 'custom') {
        item.searchTextKeys.forEach((k) => parts.push(safeT(k)));
      }

      return parts
        .join(' ')
        .replace(/<[^>]*>/g, ' ')
        .toLowerCase();
    };

    const collect = (items: SettingsItem[]): SettingsItem[] => {
      const out: SettingsItem[] = [];

      for (const item of items) {
        if (item.when && !item.when(env)) continue;
        if (item.kind !== 'subhead' && item.kind !== 'note') {
          if (haystack(item).includes(q)) out.push(item);
        }
        if (item.children) out.push(...collect(item.children));
      }

      return out;
    };

    const groups = categories
      .map((category) => ({ category, matches: collect(category.items) }))
      .filter((group) => group.matches.length > 0);
    const counts = Object.fromEntries(
      groups.map((group) => [group.category.id, group.matches.length]),
    );
    const total = groups.reduce((n, group) => n + group.matches.length, 0);

    return { active: true, groups, counts, total };
  }, [q, categories, env, t]);
}
