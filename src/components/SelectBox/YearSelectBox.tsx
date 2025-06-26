import React from 'react';

import { Year } from '../../config';
import { SUPPORTED_YEARS } from '../../data/data';
import { EventPhase } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import FeedbackInfoButton from '../feedbackInfo/FeedbackInfoButton';

import SelectBox from '.';

const options = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

export const YearSelectBox: React.FC = () => {
  const { year, themeInfo, setYear } = useCountriesStore();
  const { eventPhase, setEventPhase } = useScoreboardStore();

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value as Year;

    if (eventPhase !== EventPhase.COUNTRY_SELECTION) {
      if (
        window.confirm(
          `A ${
            eventPhase === EventPhase.GRAND_FINAL ? 'Grand Final' : 'semi-final'
          } is in progress. Changing the year will reset the current scoreboard and start a new setup. Are you sure?`,
        )
      ) {
        setYear(newYear);
        setEventPhase(EventPhase.COUNTRY_SELECTION);
      }
    } else {
      setYear(newYear);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <img
          src={themeInfo.hostingCountryLogo}
          alt="Hosting country logo"
          className="w-10 h-10"
        />
        <SelectBox
          options={options}
          value={year}
          onChange={handleYearChange}
          id="year-select-box"
        />
      </div>
      <FeedbackInfoButton />
    </div>
  );
};
