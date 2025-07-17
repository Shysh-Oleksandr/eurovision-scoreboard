import React from 'react';

import SyncIcon from '../../assets/icons/SyncIcon';
import { Year } from '../../config';
import { SUPPORTED_YEARS } from '../../data/data';
import { StageId } from '../../models';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import {
  YEARS_WITH_THEME,
  getHostingCountryLogoForYear,
} from '../../theme/themes';
import Button from '../common/Button';
import CustomSelect from '../common/customSelect/CustomSelect';
import FeedbackInfoButton from '../feedbackInfo/FeedbackInfoButton';

import { SettingsIcon } from '@/assets/icons/SettingsIcon';
import { useTouchDevice } from '@/hooks/useTouchDevice';

const isSmallScreen = window.innerWidth < 370;

const yearOptions = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
  imageUrl: getHostingCountryLogoForYear(year.toString() as Year),
}));

const themeOptions = YEARS_WITH_THEME.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

type SetupHeaderProps = {
  openSettingsModal: () => void;
};

export const SetupHeader: React.FC<SetupHeaderProps> = ({
  openSettingsModal,
}) => {
  const year = useGeneralStore((state) => state.year);
  const themeYear = useGeneralStore((state) => state.themeYear);
  const setYear = useGeneralStore((state) => state.setYear);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);

  const isTouchDevice = useTouchDevice();

  const handleYearChange = (newYear: string) => {
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
        setYear(newYear as Year);
        setEventStages([]);
      }
    } else {
      setYear(newYear as Year);
    }
  };

  const handleThemeChange = (newThemeYear: string) => {
    setTheme(newThemeYear as Year);
  };

  const handleSyncTheme = () => {
    setTheme(year);
  };

  const shouldShowSyncButton =
    YEARS_WITH_THEME.includes(year as Year) &&
    year !== themeYear &&
    !isSmallScreen;

  return (
    <div
      className={`flex justify-between items-end w-full ${
        isTouchDevice ? 'overflow-x-auto' : 'overflow-x-visible'
      } space-x-3 pb-2`}
    >
      <div className="flex items-end sm:space-x-4 space-x-3">
        <CustomSelect
          options={yearOptions}
          value={year}
          onChange={handleYearChange}
          id="year-select-box"
          label="Year"
        />

        <CustomSelect
          options={themeOptions}
          value={themeYear}
          onChange={handleThemeChange}
          id="theme-select-box"
          label="Theme"
        />

        {shouldShowSyncButton && (
          <Button onClick={handleSyncTheme} className="!p-3 group">
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
        >
          <SettingsIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
        </Button>
        <FeedbackInfoButton />
      </div>
    </div>
  );
};
