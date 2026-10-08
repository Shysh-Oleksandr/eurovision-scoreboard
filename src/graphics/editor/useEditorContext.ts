'use client';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Design } from '../model/design';
import { designThemeFromActive, designThemeLabel } from '../model/designTheme';
import { useDesignData } from '../render/DesignDataContext';

import { useEditorStore } from './editorStore';

import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * "Live · Grand Final" / "Nordic Vision · Final" / "Manual · 26 rows" for
 * chips and notes. Must run inside the `DesignDataProvider` bound to the
 * same design (the stage name comes from the resolved data).
 */
export function useDataLabel(data: Design['data']): string {
  const t = useTranslations('graphics.data');
  const { countries, stageName, status, inaccessible } = useDesignData();

  return useMemo(() => {
    switch (data.source) {
      case 'manual':
        return `${t('manual')} · ${t('nRows', { count: data.rows.length })}`;
      case 'provided':
        return t('provided');
      case 'contest': {
        const name = data.contestName || t('savedContest');

        if (inaccessible) return `${t('live')} · ${stageName}`;
        if (status === 'loading') return `${name} · …`;

        return stageName ? `${name} · ${stageName}` : name;
      }
      case 'live':
      default:
        return stageName
          ? `${t('live')} · ${stageName}`
          : `${t('live')} · ${t('nRows', { count: countries.length })}`;
    }
  }, [data, stageName, status, inaccessible, countries.length, t]);
}

/**
 * Name of a design's theme (else the active one) for notes and chips.
 * Defaults to the editor's document; the template sheet passes its own.
 */
export function useThemeName(design?: Design): string {
  const editorTheme = useEditorStore((s) => s.design.theme);
  const customTheme = useGeneralStore((s) => s.customTheme);
  const themeYear = useGeneralStore((s) => s.themeYear);
  const theme = design ? design.theme : editorTheme;

  return designThemeLabel(
    theme ?? designThemeFromActive({ themeYear, customTheme }),
  );
}

/** Title / subtitle defaults for new designs and templates. */
export function useTemplateContext(): { title: string; subtitle: string } {
  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);
  const stageName = useScoreboardStore((s) => {
    const stage =
      s.eventStages.find((st) => st.id === s.viewedStageId) ||
      s.getCurrentStage();

    return stage?.name ?? '';
  });

  return useMemo(
    () => ({
      title: `${contestName} ${contestYear}`.trim(),
      subtitle: stageName || 'Grand Final',
    }),
    [contestName, contestYear, stageName],
  );
}

/** Alphabetical country options for selects (flags, manual rows). */
export function useCountryOptions(): { value: string; label: string }[] {
  return useMemo(
    () =>
      [...ALL_COUNTRIES]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.code, label: c.name })),
    [],
  );
}
