'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import SyncIcon from '../../assets/icons/SyncIcon';
import { Year } from '../../config';
import {
  ESC_YEAR_OPTIONS,
  JESC_THEME_OPTIONS,
  JESC_YEAR_OPTIONS,
  JUNIOR_THEME_PREFIX,
  THEME_OPTIONS,
} from '../../data/data';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import { YEARS_WITH_THEME } from '../../theme/themes';
import Button from '../common/Button';
import CustomSelect, {
  Option,
  OptionGroup,
} from '../common/customSelect/CustomSelect';
import FeedbackInfoButton from '../feedbackInfo/FeedbackInfoButton';

import { SettingsIcon } from '@/assets/icons/SettingsIcon';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import { getHostingCountryLogo } from '@/theme/hosting';
import { buildPrimaryFromHsva } from '@/theme/themeUtils';

const YEAR_OPTIONS = [...ESC_YEAR_OPTIONS, ...JESC_YEAR_OPTIONS];
const ALL_THEME_OPTIONS = [...THEME_OPTIONS, ...JESC_THEME_OPTIONS];

const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 515;

type SetupHeaderProps = {
  openSettingsModal: () => void;
};

export const SetupHeader: React.FC<SetupHeaderProps> = ({
  openSettingsModal,
}) => {
  const t = useTranslations();

  const year = useGeneralStore((state) => state.year);
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const settings = useGeneralStore((state) => state.settings);
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const setYear = useGeneralStore((state) => state.setYear);
  const setIsGfOnly = useGeneralStore((state) => state.setIsGfOnly);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);

  const isTouchDevice = useTouchDevice();

  const { confirm } = useConfirmation();

  const handleYearChange = (newValue: string, shouldToggleGfOnly = false) => {
    if (activeContest && newValue === activeContest._id) return;

    const isJunior = newValue.startsWith(JUNIOR_THEME_PREFIX);
    const newYear = isJunior
      ? newValue.replace(JUNIOR_THEME_PREFIX, '')
      : newValue;

    const nextContestName = isJunior ? 'Junior Eurovision' : 'Eurovision';

    if (eventStages.length > 0) {
      confirm({
        key: 'change-contest-year',
        title: t('settings.confirmations.changeContest'),
        description: t('settings.confirmations.changeContestDescription'),
        onConfirm: () => {
          if (shouldToggleGfOnly) {
            setIsGfOnly(!isGfOnly);
          }
          setSettings({
            contestName: nextContestName,
            isJuniorContest: isJunior,
          });
          setYear(newYear as Year);
          setEventStages([]);
        },
      });
    } else {
      if (shouldToggleGfOnly) {
        setIsGfOnly(!isGfOnly);
      }
      setSettings({ contestName: nextContestName, isJuniorContest: isJunior });
      setYear(newYear as Year);
    }
  };

  const handleGfOnlyChange = () => {
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
        const currentYear = settings.isJuniorContest
          ? `${JUNIOR_THEME_PREFIX}${year}`
          : year;

        handleYearChange(currentYear, true);
      },
    });
  };

  const handleThemeChange = (newThemeValue: string) => {
    if (newThemeValue === customTheme?._id) return;

    setTheme(newThemeValue);
  };

  const handleSyncTheme = () => {
    if (settings.isJuniorContest) {
      setTheme(`${JUNIOR_THEME_PREFIX}${year}`);
    } else {
      setTheme(year);
    }
  };

  const expectedThemeKey = settings.isJuniorContest
    ? `${JUNIOR_THEME_PREFIX}${year}`
    : year;
  const shouldShowSyncButton =
    YEARS_WITH_THEME.includes(expectedThemeKey) &&
    themeYear !== expectedThemeKey &&
    !isSmallScreen;

  const customThemeColor = useMemo(() => {
    return customTheme?.hue
      ? `hsl(${
          buildPrimaryFromHsva({
            h: customTheme.hue,
            s: 80,
            v: customTheme.shadeValue || 60,
          })['700']
        })`
      : undefined;
  }, [customTheme]);

  const themeGroups = useMemo(() => {
    const groups: OptionGroup[] = [
      { label: 'ESC', options: THEME_OPTIONS },
      { label: 'JESC', options: JESC_THEME_OPTIONS },
    ];

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
  }, [customTheme, customThemeColor, t]);

  const themeOptions = useMemo(() => {
    const options: Option[] = [...ALL_THEME_OPTIONS];

    if (customTheme) {
      options.push({
        label: customTheme.name,
        value: customTheme._id,
      });
    }

    return options;
  }, [customTheme]);

  const contestGroups = useMemo(() => {
    const groups: OptionGroup[] = [
      { label: 'ESC', options: ESC_YEAR_OPTIONS },
      { label: 'JESC', options: JESC_YEAR_OPTIONS },
    ];

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
  }, [activeContest, t, getHostingCountry]);

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

  const contestValue = useMemo(() => {
    if (activeContest) {
      return activeContest._id;
    }

    return settings.isJuniorContest ? `${JUNIOR_THEME_PREFIX}${year}` : year;
  }, [activeContest, settings.isJuniorContest, year]);

  return (
    <div
      className={`flex justify-between items-end w-full ${
        isTouchDevice ? 'overflow-x-auto' : 'overflow-x-visible'
      } space-x-3 pb-2`}
    >
      <div className="flex items-end sm:space-x-4 space-x-3">
        <div className="flex items-end gap-1.5">
          <CustomSelect
            options={contestOptions}
            groups={contestGroups}
            value={contestValue}
            onChange={handleYearChange}
            id="year-select-box"
            label={
              activeContest
                ? `${t('settings.general.contest')} (${t('common.custom')})`
                : t('settings.general.contest')
            }
            className="sm:w-[130px] w-[110px]"
          />
          {!activeContest && (
            <Button
              label={t('setup.eventSetupModal.grandFinalOnly')}
              className={`!px-1 !py-0 h-[42px] normal-case w-[48px] !text-[0.8rem] !leading-4  ${
                isGfOnly ? 'ring-primary-700/80 ring-2  ring-solid' : ''
              }`}
              onClick={handleGfOnlyChange}
            />
          )}
        </div>
        <div className="flex items-end gap-1.5">
          <CustomSelect
            options={themeOptions}
            groups={themeGroups}
            value={customTheme ? customTheme._id : themeYear}
            onChange={handleThemeChange}
            id="theme-select-box"
            label={
              customTheme
                ? `${t('common.theme')} (${t('common.custom')})`
                : t('common.theme')
            }
            className="sm:w-[130px] w-[110px]"
            customThemeColor={customThemeColor}
          />
          {shouldShowSyncButton && (
            <Button
              onClick={handleSyncTheme}
              className="!p-3 group"
              title="Sync Theme"
              aria-label="Sync Theme"
            >
              <SyncIcon className="group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-end md:gap-4 gap-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSettingsModal();
          }}
          className="!p-3 group"
          aria-label="Settings"
          title="Settings"
          snowEffect="right"
        >
          <SettingsIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
        </Button>
        <FeedbackInfoButton className={`${isTouchDevice ? 'mr-1' : ''}`} />
      </div>
    </div>
  );
};
