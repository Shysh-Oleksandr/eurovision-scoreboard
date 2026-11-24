import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { PickerItem } from '../picker/pickerItems';

import { api } from '@/api/client';
import { useQuickSelectContestsQuery } from '@/api/quickSelect';
import { Option } from '@/components/common/customSelect/CustomSelect';
import { Year } from '@/config';
import {
  CONTEST_TYPE_NAMES,
  ContestType,
  getContestKey,
  parseContestKey,
} from '@/data/contestTypes';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import {
  ASIA_YEAR_OPTIONS,
  ESC_YEAR_OPTIONS,
  JESC_YEAR_OPTIONS,
} from '@/data/data';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useAuthStore } from '@/state/useAuthStore';
import {
  contestHostCountry,
  getHostingCountryByYear,
  getHostingCountryLogo,
  getHostingLogoByCountryCode,
} from '@/theme/hosting';
import { applyThemeForContestYear } from '@/theme/syncThemeToContest';
import { Contest } from '@/types/contest';
import { ContestSnapshot } from '@/types/contestSnapshot';

const SERIES_OPTIONS: [ContestType, Option[]][] = [
  ['esc', ESC_YEAR_OPTIONS],
  ['jesc', JESC_YEAR_OPTIONS],
  ['asia', ASIA_YEAR_OPTIONS],
];

const HOST_NAMES = new Map(
  ALL_COUNTRIES.map((country) => [country.code, country.name]),
);

/**
 * Every official edition as a picker item, with the white 2026 hearts when
 * that setting is on.
 */
const buildEditions = (shouldUse2026WhiteHeartFlags: boolean): PickerItem[] =>
  SERIES_OPTIONS.flatMap(([series, options]) =>
    options.map((option) => {
      const { year } = parseContestKey(option.value);
      const { code } = getHostingCountryByYear(year as Year, series);

      return {
        value: option.value,
        series,
        year: Number(year),
        name: `${CONTEST_TYPE_NAMES[series]} ${year}`,
        host: HOST_NAMES.get(code),
        imageUrl:
          (shouldUse2026WhiteHeartFlags &&
            getHostingLogoByCountryCode(code, true)) ||
          option.imageUrl,
        isHeart: true,
      };
    }),
  );

/** Picker items, value and handlers of the header "Contest" combo (year / saved contest / GF-only). */
export const useContestField = () => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const year = useGeneralStore((state) => state.year);
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const contestType = useGeneralStore((state) => state.settings.contestType);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const setYear = useGeneralStore((state) => state.setYear);
  const setIsGfOnly = useGeneralStore((state) => state.setIsGfOnly);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
  // The boolean only: the board updates `eventStages` on every vote, and the
  // header (kept mounted while the setup is closed) shouldn't follow along.
  const hasEventStages = useScoreboardStore(
    (state) => state.eventStages.length > 0,
  );
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const { confirm } = useConfirmation();
  const { data: quickSelectContestsData } = useQuickSelectContestsQuery(!!user);
  const customCountries = useCountriesStore((state) => state.customCountries);

  const handleYearChange = useCallback(
    async (newValue: string, shouldToggleGfOnly = false) => {
      if (activeContest && newValue === activeContest._id) return;

      if (newValue.length > 16) {
        try {
          const { data: contest } = await api.get(`/contests/${newValue}`);
          const { data: snapshot } = await api.get(
            `/contests/${newValue}/snapshot`,
          );

          useGeneralStore.getState().setContestToLoad({
            contest: contest as Contest,
            snapshot: snapshot as ContestSnapshot,
          });
        } catch (e: any) {
          toast.error(
            e?.response?.data?.message ||
              t('widgets.contests.failedToLoadContest'),
          );
        }

        return;
      }

      const { year: newYear, contestType: nextContestType } =
        parseContestKey(newValue);

      const apply = () => {
        if (shouldToggleGfOnly) {
          setIsGfOnly(!isGfOnly);
        }
        setSettings({
          contestName: CONTEST_TYPE_NAMES[nextContestType],
          contestType: nextContestType,
        });
        setYear(newYear as Year);
        applyThemeForContestYear();
      };

      if (hasEventStages) {
        confirm({
          key: 'change-contest-year',
          title: t('settings.confirmations.changeContest'),
          description: t('settings.confirmations.changeContestDescription'),
          onConfirm: () => {
            apply();
            setEventStages([]);
          },
        });
      } else {
        apply();
      }
    },
    [
      activeContest,
      confirm,
      hasEventStages,
      isGfOnly,
      setEventStages,
      setIsGfOnly,
      setSettings,
      setYear,
      t,
    ],
  );

  const handleGfOnlyChange = useCallback(() => {
    confirm({
      key: 'grand-final-only-change',
      title: t(
        isGfOnly
          ? 'setup.eventSetupModal.confirmNotGFOnlyTitle'
          : 'setup.eventSetupModal.confirmGFOnlyTitle',
      ),
      description: t(
        isGfOnly
          ? 'setup.eventSetupModal.confirmNotGFOnlyDescription'
          : 'setup.eventSetupModal.confirmGFOnlyDescription',
      ),
      onConfirm: () => {
        handleYearChange(getContestKey(year, contestType), true);
      },
    });
  }, [confirm, contestType, handleYearChange, isGfOnly, t, year]);

  const editions = useMemo(
    () => buildEditions(shouldUse2026WhiteHeartFlags),
    [shouldUse2026WhiteHeartFlags],
  );

  // The account's quick select, the loaded contest included (marked there).
  const pinned = useMemo<PickerItem[]>(
    () =>
      (quickSelectContestsData ?? []).map((contest) => {
        const { logo, isExisting } = getHostingCountryLogo(
          contestHostCountry(contest, customCountries),
          true,
          shouldUse2026WhiteHeartFlags,
        );

        return {
          value: contest._id,
          name: `${contest.name} ${contest.year || ''}`.trim(),
          imageUrl: logo,
          isHeart: isExisting,
        };
      }),
    [quickSelectContestsData, customCountries, shouldUse2026WhiteHeartFlags],
  );

  const contestValue = activeContest
    ? activeContest._id
    : getContestKey(year, contestType);

  // What the combo shows: the loaded saved contest, else the edition.
  const current = useMemo<PickerItem | undefined>(() => {
    if (!activeContest) {
      return editions.find((item) => item.value === contestValue);
    }

    const { logo, isExisting } = getHostingCountryLogo(
      getHostingCountry(),
      true,
      shouldUse2026WhiteHeartFlags,
    );

    return {
      value: activeContest._id,
      name: activeContest.name,
      imageUrl: logo,
      isHeart: isExisting,
    };
  }, [
    activeContest,
    contestValue,
    editions,
    getHostingCountry,
    shouldUse2026WhiteHeartFlags,
  ]);

  return {
    editions,
    pinned,
    current,
    contestValue,
    handleYearChange,
    handleGfOnlyChange,
    isGfOnly,
    activeContest,
    contestType,
  };
};
