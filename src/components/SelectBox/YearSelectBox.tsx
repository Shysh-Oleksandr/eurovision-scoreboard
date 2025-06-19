import React, { useState } from 'react';

import { Year } from '../../config';
import { SUPPORTED_YEARS } from '../../data/data';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';
import FeedbackInfo from '../feedbackInfo';

import SelectBox from '.';

const options = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

export const YearSelectBox: React.FC = () => {
  const { year, themeInfo, setYear } = useCountriesStore();
  const { startOver } = useScoreboardStore();

  const [localYear, setLocalYear] = useState(year);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value as Year;

    setLocalYear(newYear);
  };

  const handleRestart = () => {
    if (localYear !== year) {
      setYear(localYear);
    }

    startOver();
  };

  return (
    <div className="flex justify-between items-center">
      <div className="sm:ml-8 ml-3 flex items-center space-x-4">
        <img
          src={themeInfo.hostingCountryLogo}
          alt="Hosting country logo"
          className="w-10 h-10"
        />
        <SelectBox
          options={options}
          value={localYear}
          onChange={handleYearChange}
        />
        <Button
          label="Restart"
          onClick={handleRestart}
          className={`${
            year !== localYear
              ? 'animated-border'
              : 'bg-none bg-primary-900 hover:bg-primary-950 border-[3px] border-solid border-transparent'
          }`}
        />
      </div>
      <FeedbackInfo className="md:hidden block relative bottom-auto sm:right-8 right-4" />
    </div>
  );
};
