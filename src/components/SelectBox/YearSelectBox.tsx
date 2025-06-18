import React, { useState } from 'react';

import { Year } from '../../config';
import { reinitializeCountriesData, SUPPORTED_YEARS } from '../../data/data';
import { ScoreboardActionKind } from '../../models';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../Button';

import SelectBox from '.';

const options = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));

interface Props {
  dispatch: React.Dispatch<any>;
}

export const YearSelectBox: React.FC<Props> = ({ dispatch }) => {
  const { themeInfo, year, setYear } = useTheme();

  const [localYear, setLocalYear] = useState(year);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value as Year;

    setLocalYear(newYear);
    dispatch({ type: 'SET_YEAR', payload: newYear });
  };

  const handleRestart = () => {
    if (localYear !== year) {
      setYear(localYear);
      reinitializeCountriesData(localYear);
    }

    dispatch({ type: ScoreboardActionKind.START_OVER });
  };

  React.useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', `theme${year}`);
  }, [year]);

  return (
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
  );
};
