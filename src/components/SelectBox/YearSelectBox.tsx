import React from 'react';

import { Year } from '../../config';
import { SUPPORTED_YEARS } from '../../data/data';
import { EventPhase } from '../../models';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import { YEARS_WITH_THEME } from '../../theme/themes';
import { themesInfo } from '../../theme/themesInfo';
import Button from '../Button';
import FeedbackInfoButton from '../feedbackInfo/FeedbackInfoButton';

import CustomSelect from './CustomSelect';
import SyncIcon from './SyncIcon';

const isSmallScreen = window.innerWidth < 370;

const yearOptions = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
  imageUrl: themesInfo[year.toString() as Year].hostingCountryLogo,
}));

const themeOptions = YEARS_WITH_THEME.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

export const YearSelectBox: React.FC = () => {
  const { year, themeYear, setYear, setTheme } = useGeneralStore();
  const { eventPhase, setEventPhase } = useScoreboardStore();

  const handleYearChange = (newYear: string) => {
    if (eventPhase !== EventPhase.COUNTRY_SELECTION) {
      if (
        window.confirm(
          `A ${
            eventPhase === EventPhase.GRAND_FINAL ? 'Grand Final' : 'semi-final'
          } is in progress. Changing the year will reset the current scoreboard and start a new setup. Are you sure?`,
        )
      ) {
        setYear(newYear as Year);
        setEventPhase(EventPhase.COUNTRY_SELECTION);
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
