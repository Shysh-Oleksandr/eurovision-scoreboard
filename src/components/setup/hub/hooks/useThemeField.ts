import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

import { useQuickSelectThemesQuery } from '@/api/quickSelect';
import {
  Option,
  OptionGroup,
} from '@/components/common/customSelect/CustomSelect';
import { useApplyCustomTheme } from '@/components/setup/widgets-section/custom-themes/hooks/useApplyCustomTheme';
import { JESC_THEME_OPTIONS, THEME_OPTIONS } from '@/data/data';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import {
  applyThemeForContestYear,
  getExpectedThemeKey,
} from '@/theme/syncThemeToContest';
import { buildPrimaryFromHsva } from '@/theme/themeUtils';

const ALL_THEME_OPTIONS = [...THEME_OPTIONS, ...JESC_THEME_OPTIONS];

const swatchFor = (hue: number, shadeValue?: number) =>
  `hsl(${buildPrimaryFromHsva({ h: hue, s: 80, v: shadeValue || 60 })['700']})`;

/** Options, value and handlers of the header "Theme" combo, incl. the sync chip. */
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

  const themeGroups = useMemo(() => {
    const groups: OptionGroup[] = [
      { label: 'ESC', options: THEME_OPTIONS },
      { label: 'JESC', options: JESC_THEME_OPTIONS },
    ];

    if (quickSelectThemesData && quickSelectThemesData.length > 0) {
      groups.unshift({
        label: t('widgets.quickSelect'),
        options: quickSelectThemesData
          .filter((theme) => theme._id !== customTheme?._id)
          .map((theme) => ({
            label: theme.name,
            value: theme._id,
            color: swatchFor(theme.hue, theme.shadeValue),
          })),
      });
    }

    if (customTheme) {
      groups.unshift({
        label: t('common.custom'),
        options: [
          {
            label: customTheme.name,
            value: customTheme._id,
            color: customThemeColor,
          },
        ],
      });
    }

    return groups;
  }, [customTheme, customThemeColor, t, quickSelectThemesData]);

  const themeOptions = useMemo(() => {
    const options: Option[] = [...ALL_THEME_OPTIONS];

    if (customTheme) {
      options.push({ label: customTheme.name, value: customTheme._id });
    }

    return options;
  }, [customTheme]);

  return {
    themeOptions,
    themeGroups,
    themeValue: customTheme ? customTheme._id : themeYear,
    customTheme,
    customThemeColor,
    handleThemeChange,
    syncEnabled,
    toggleSync,
  };
};
