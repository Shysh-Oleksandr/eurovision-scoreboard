import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { PickerItem } from '../picker/pickerItems';

import { useQuickSelectThemesQuery } from '@/api/quickSelect';
import { Option } from '@/components/common/customSelect/CustomSelect';
import { useApplyCustomTheme } from '@/components/setup/widgets-section/custom-themes/hooks/useApplyCustomTheme';
import {
  CONTEST_TYPE_NAMES,
  ContestType,
  parseContestKey,
} from '@/data/contestTypes';
import {
  ASIA_THEME_OPTIONS,
  JESC_THEME_OPTIONS,
  THEME_OPTIONS,
} from '@/data/data';
import { toast } from '@/helpers/toast';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import {
  applyThemeForContestYear,
  getExpectedThemeKey,
} from '@/theme/syncThemeToContest';
import { themes } from '@/theme/themes';
import { getThemeThumbnail } from '@/theme/themeThumbnails';
import { buildPrimaryFromHsva } from '@/theme/themeUtils';

const SERIES_THEMES: [ContestType, Option[]][] = [
  ['esc', THEME_OPTIONS],
  ['jesc', JESC_THEME_OPTIONS],
  ['asia', ASIA_THEME_OPTIONS],
];

/** Every built-in theme as a picker item: swatch and background thumbnail. */
const THEME_EDITIONS: PickerItem[] = SERIES_THEMES.flatMap(
  ([series, options]) =>
    options.map((option) => {
      const { year } = parseContestKey(option.value);

      return {
        value: option.value,
        series,
        year: Number(year),
        name: `${CONTEST_TYPE_NAMES[series]} ${year}`,
        color: themes[option.value as keyof typeof themes]?.colors.primary[700],
        thumbnailUrl: getThemeThumbnail(option.value),
      };
    }),
);

const swatchFor = (hue: number, shadeValue?: number) =>
  `hsl(${buildPrimaryFromHsva({ h: hue, s: 80, v: shadeValue ?? 60 })['700']})`;

/** Picker items, value and handlers of the header "Theme" combo, incl. the sync chip. */
export const useThemeField = () => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const year = useGeneralStore((state) => state.year);
  const contestType = useGeneralStore((state) => state.settings.contestType);
  const syncEnabled = useGeneralStore(
    (state) => state.settings.syncThemeWithContest,
  );
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const handleApplyCustomTheme = useApplyCustomTheme();
  const { data: quickSelectThemesData } = useQuickSelectThemesQuery(!!user);

  const unlink = useCallback(() => {
    setSettings({ syncThemeWithContest: false });
    toast.info(t('setup.eventSetupModal.themeUnlinked'));
  }, [setSettings, t]);

  const handleThemeChange = useCallback(
    (newThemeValue: string) => {
      if (newThemeValue === customTheme?._id) return;

      // A deliberate pick that diverges from the contest year unlinks the
      // sync so the next year change doesn't silently discard it.
      if (
        syncEnabled &&
        newThemeValue !== getExpectedThemeKey(year, contestType)
      ) {
        unlink();
      }

      if (newThemeValue.length > 16) {
        handleApplyCustomTheme(newThemeValue);

        return;
      }

      setTheme(newThemeValue);
    },
    [
      contestType,
      customTheme?._id,
      handleApplyCustomTheme,
      setTheme,
      syncEnabled,
      unlink,
      year,
    ],
  );

  const toggleSync = useCallback(() => {
    if (syncEnabled) {
      unlink();

      return;
    }

    setSettings({ syncThemeWithContest: true });
    applyThemeForContestYear({ force: true });
    toast.success(t('setup.eventSetupModal.themeFollowsYear'));
  }, [setSettings, syncEnabled, t, unlink]);

  const customThemeColor = useMemo(
    () =>
      customTheme?.hue
        ? swatchFor(customTheme.hue, customTheme.shadeValue)
        : undefined,
    [customTheme],
  );

  // The account's quick select, the applied custom theme included.
  const pinned = useMemo<PickerItem[]>(
    () =>
      (quickSelectThemesData ?? []).map((theme) => ({
        value: theme._id,
        name: theme.name,
        color: swatchFor(theme.hue, theme.shadeValue),
      })),
    [quickSelectThemesData],
  );

  const themeValue = customTheme ? customTheme._id : themeYear;

  // What the combo shows: the applied custom theme, else the built-in one.
  const current = useMemo<PickerItem>(
    () =>
      customTheme
        ? {
            value: customTheme._id,
            name: customTheme.name,
            color: customThemeColor,
          }
        : THEME_EDITIONS.find((item) => item.value === themeYear) ?? {
            value: themeYear,
            name: themeYear,
          },
    [customTheme, customThemeColor, themeYear],
  );

  return {
    editions: THEME_EDITIONS,
    pinned,
    current,
    themeValue,
    contestType,
    customTheme,
    handleThemeChange,
    syncEnabled,
    toggleSync,
  };
};
