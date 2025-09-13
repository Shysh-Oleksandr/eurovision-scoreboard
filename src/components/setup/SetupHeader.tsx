import React from 'react';

import SyncIcon from '../../assets/icons/SyncIcon';
import { Year } from '../../config';
import {
  JUNIOR_SUPPORTED_YEARS,
  JUNIOR_THEME_PREFIX,
  SUPPORTED_YEARS,
} from '../../data/data';
import { StageId } from '../../models';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import { getHostingCountryByYear } from '../../theme/hosting';
import {
  ESC_YEARS_WITH_THEME,
  JUNIOR_YEARS_WITH_THEME,
  YEARS_WITH_THEME,
} from '../../theme/themes';
import Button from '../common/Button';
import CustomSelect from '../common/customSelect/CustomSelect';
import FeedbackInfoButton from '../feedbackInfo/FeedbackInfoButton';

import { SettingsIcon } from '@/assets/icons/SettingsIcon';
import { useTouchDevice } from '@/hooks/useTouchDevice';

const isSmallScreen = window.innerWidth < 370;

const escYearOptions = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
  imageUrl: getHostingCountryByYear(year.toString() as Year).logo,
}));

const jescYearOptions = JUNIOR_SUPPORTED_YEARS.map((year) => ({
  value: `${JUNIOR_THEME_PREFIX}${year}`,
  label: year.toString(),
  imageUrl: getHostingCountryByYear(year.toString() as Year, true).logo,
}));

const themeOptions = ESC_YEARS_WITH_THEME.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

const jescThemeOptions = JUNIOR_YEARS_WITH_THEME.map((year) => {
  const yearNumber = parseInt(year.replace(JUNIOR_THEME_PREFIX, ''));

  return {
    value: `${JUNIOR_THEME_PREFIX}${yearNumber}`,
    label: yearNumber.toString(),
  };
});

type SetupHeaderProps = {
  openSettingsModal: () => void;
};

export const SetupHeader: React.FC<SetupHeaderProps> = ({
  openSettingsModal,
}) => {
  const year = useGeneralStore((state) => state.year);
  const settings = useGeneralStore((state) => state.settings);
  const themeYear = useGeneralStore((state) => state.themeYear);
  const setYear = useGeneralStore((state) => state.setYear);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);

  const isTouchDevice = useTouchDevice();

  const handleYearChange = (newValue: string) => {
    const isJunior = newValue.startsWith(JUNIOR_THEME_PREFIX);
    const newYear = isJunior
      ? newValue.replace(JUNIOR_THEME_PREFIX, '')
      : newValue;

    const nextContestName = isJunior ? 'Junior Eurovision' : 'Eurovision';

    if (eventStages.length > 0) {
      const { id: currentStageId } = getCurrentStage();
      const isGrandFinal = currentStageId === StageId.GF;

      if (
        window.confirm(
          `A ${
            isGrandFinal ? 'Grand Final' : 'semi-final'
          } is in progress. Changing the year will reset the current scoreboard and start a new setup. Are you sure?`,
        )
      ) {
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

  return (
    <div
      className={`flex justify-between items-end w-full ${
        isTouchDevice ? 'overflow-x-auto' : 'overflow-x-visible'
      } space-x-3 pb-2`}
    >
      <div className="flex items-end sm:space-x-4 space-x-3">
        <CustomSelect
          options={[...escYearOptions, ...jescYearOptions]}
          groups={[
            { label: 'ESC', options: escYearOptions },
            { label: 'JESC', options: jescYearOptions },
          ]}
          value={
            settings.isJuniorContest ? `${JUNIOR_THEME_PREFIX}${year}` : year
          }
          onChange={handleYearChange}
          id="year-select-box"
          label="Year"
          className="sm:w-[130px] w-[110px]"
        />

        <CustomSelect
          options={[...themeOptions, ...jescThemeOptions]}
          groups={[
            { label: 'ESC', options: themeOptions },
            { label: 'JESC', options: jescThemeOptions },
          ]}
          value={themeYear}
          onChange={handleThemeChange}
          id="theme-select-box"
          label="Theme"
          className="sm:w-[130px] w-[110px]"
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
