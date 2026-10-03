import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

import { api } from '@/api/client';
import { useQuickSelectContestsQuery } from '@/api/quickSelect';
import {
  Option,
  OptionGroup,
} from '@/components/common/customSelect/CustomSelect';
import { Year } from '@/config';
import {
  CONTEST_TYPE_NAMES,
  getContestKey,
  parseContestKey,
} from '@/data/contestTypes';
import {
  ASIA_YEAR_OPTIONS,
  ESC_YEAR_OPTIONS,
  JESC_YEAR_OPTIONS,
} from '@/data/data';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import { applyThemeForContestYear } from '@/theme/syncThemeToContest';
import { Contest } from '@/types/contest';
import { ContestSnapshot } from '@/types/contestSnapshot';

const YEAR_OPTIONS = [
  ...ESC_YEAR_OPTIONS,
  ...JESC_YEAR_OPTIONS,
  ...ASIA_YEAR_OPTIONS,
];

export const getContestImageClassName = (
  option: Option,
  type: 'display' | 'select',
) => {
  if (option.isExisting) return '';

  if (type === 'display') return 'w-8 h-6 rounded-sm';

  return 'w-7 h-5 rounded-sm';
};

/** Options, value and handlers of the header "Contest" combo (year / saved contest / GF-only). */
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
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const { confirm } = useConfirmation();
  const { data: quickSelectContestsData } = useQuickSelectContestsQuery(!!user);

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

      if (eventStages.length > 0) {
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
      eventStages.length,
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

  const contestGroups = useMemo(() => {
    const groups: OptionGroup[] = [
      { label: 'ESC', options: ESC_YEAR_OPTIONS },
      { label: 'JESC', options: JESC_YEAR_OPTIONS },
      { label: 'ESC Asia', options: ASIA_YEAR_OPTIONS },
    ];

    if (quickSelectContestsData && quickSelectContestsData.length > 0) {
      groups.unshift({
        label: t('widgets.quickSelect'),
        options: quickSelectContestsData
          .filter((contest) => contest._id !== activeContest?._id)
          .map((contest) => {
            const { logo, isExisting } = getHostingCountryLogo(
              contest.hostingCountryCode,
            );

            return {
              label: `${contest.name} ${contest.year || ''}`.trim(),
              value: contest._id,
              imageUrl: logo,
              isExisting,
            };
          }),
      });
    }

    if (activeContest) {
      const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

      groups.unshift({
        label: t('common.custom'),
        options: [
          {
            label: activeContest.name,
            value: activeContest._id,
            imageUrl: logo,
            isExisting,
          },
        ],
      });
    }

    return groups;
  }, [activeContest, t, getHostingCountry, quickSelectContestsData]);

  const contestOptions = useMemo(() => {
    const options: Option[] = [...YEAR_OPTIONS];

    if (activeContest) {
      const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

      options.push({
        label: activeContest.name,
        value: activeContest._id,
        imageUrl: logo,
        isExisting,
      });
    }

    return options;
  }, [activeContest, getHostingCountry]);

  const contestValue = activeContest
    ? activeContest._id
    : getContestKey(year, contestType);

  return {
    contestOptions,
    contestGroups,
    contestValue,
    handleYearChange,
    handleGfOnlyChange,
    isGfOnly,
    activeContest,
  };
};
