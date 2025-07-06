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

export const SetupHeader: React.FC = () => {
  const { year, themeYear, setYear, setTheme } = useGeneralStore();
  const { eventStages, getCurrentStage, setEventStages } = useScoreboardStore();

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
    <div className="flex justify-between items-center">
      <div className="flex items-end sm:space-x-4 space-x-2">
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
          <Button onClick={handleSyncTheme}>
            <SyncIcon />
          </Button>
        )}
      </div>
      <FeedbackInfoButton className="sm:mt-1.5 mt-3" />
    </div>
  );
};
