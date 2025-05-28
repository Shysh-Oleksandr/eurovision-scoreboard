import React, { useState } from 'react';

import { Year } from '../../config';
import { reinitializeCountriesData } from '../../data/data';
import { ScoreboardActionKind } from '../../models';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../Button';

import SelectBox from '.';

const options = [
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
];

interface Props {
  dispatch: React.Dispatch<any>;
}

export const YearSelectBox: React.FC<Props> = ({ dispatch }) => {
  const { year, setYear } = useTheme();

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

  // Workaround to fix the issue with the wrong countries colors when changing the year as first action
  React.useEffect(() => {
    setTimeout(() => {
      dispatch({ type: ScoreboardActionKind.TRIGGER_RERENDER });
    }, 1050);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', `theme${year}`);
  }, [year]);

  return (
    <div className="sm:ml-8 ml-3 flex items-center space-x-4">
      <SelectBox options={options} value={year} onChange={handleYearChange} />
      <Button
        label="Restart"
        onClick={handleRestart}
        className={`${
          year !== localYear
            ? 'animated-border'
            : 'border-[3px] border-solid border-transparent'
        }`}
      />
    </div>
  );
};
