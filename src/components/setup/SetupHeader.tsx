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
import { useTouchDevice } from '@/hooks/useTouchDevice';
import { buildPrimaryFromHsva } from '@/theme/themeUtils';

const YEAR_OPTIONS = [...ESC_YEAR_OPTIONS, ...JESC_YEAR_OPTIONS];
const ALL_THEME_OPTIONS = [...THEME_OPTIONS, ...JESC_THEME_OPTIONS];

const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 480;

type SetupHeaderProps = {
  openSettingsModal: () => void;
};

export const SetupHeader: React.FC<SetupHeaderProps> = ({
  openSettingsModal,
}) => {
  const t = useTranslations('setup.eventSetupModal');

  const year = useGeneralStore((state) => state.year);
  const settings = useGeneralStore((state) => state.settings);
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const setYear = useGeneralStore((state) => state.setYear);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);

  const isTouchDevice = useTouchDevice();

  const handleYearChange = (newValue: string) => {
    const isJunior = newValue.startsWith(JUNIOR_THEME_PREFIX);
    const newYear = isJunior
      ? newValue.replace(JUNIOR_THEME_PREFIX, '')
      : newValue;

    const nextContestName = isJunior ? 'Junior Eurovision' : 'Eurovision';

    if (eventStages.length > 0) {
      if (window.confirm(t('contestIsInProgress'))) {
        setSettings({
          contestName: nextContestName,
          isJuniorContest: isJunior,
        });
        setYear(newYear as Year);
        setEventStages([]);
      }
    } else {
      setSettings({ contestName: nextContestName, isJuniorContest: isJunior });
      setYear(newYear as Year);
    }
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
        label: t('custom'),
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

  return (
    <div
      className={`flex justify-between items-end w-full ${
        isTouchDevice ? 'overflow-x-auto' : 'overflow-x-visible'
      } space-x-3 pb-2`}
    >
      <div className="flex items-end sm:space-x-4 space-x-3">
        <CustomSelect
          options={YEAR_OPTIONS}
          groups={[
            { label: 'ESC', options: ESC_YEAR_OPTIONS },
            { label: 'JESC', options: JESC_YEAR_OPTIONS },
          ]}
          value={
            settings.isJuniorContest ? `${JUNIOR_THEME_PREFIX}${year}` : year
          }
          onChange={handleYearChange}
          id="year-select-box"
          label={t('year')}
          className="sm:w-[130px] w-[110px]"
        />

        <CustomSelect
          options={themeOptions}
          groups={themeGroups}
          value={customTheme ? customTheme._id : themeYear}
          onChange={handleThemeChange}
          id="theme-select-box"
          label={customTheme ? `${t('theme')} (${t('custom')})` : t('theme')}
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
      <div className="flex items-end md:gap-4 gap-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSettingsModal();
          }}
          className="!p-3 group"
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
        </Button>
        <FeedbackInfoButton className={`${isTouchDevice ? 'mr-1' : ''}`} />
      </div>
    </div>
  );
};
