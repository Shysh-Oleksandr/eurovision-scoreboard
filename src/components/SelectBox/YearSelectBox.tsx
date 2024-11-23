import React, { useCallback, useEffect, useState } from 'react';

import { Year } from '../../config';
import { reinitializeCountriesData } from '../../data/data';
import { ScoreboardAction, ScoreboardActionKind } from '../../models';
import { useAppContext } from '../../state/AppContext';
import Button from '../Button';

import SelectBox from '.';

const options = [
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
];

type Props = {
  dispatch: React.Dispatch<ScoreboardAction>;
};

export const YearSelectBox = ({ dispatch }: Props) => {
  const { selectedYear, setSelectedYear } = useAppContext();

  const [localSelectedYear, setLocalSelectedYear] =
    useState<Year>(selectedYear);

  const isDifferentYearSelected = localSelectedYear !== selectedYear;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalSelectedYear(event.target.value as Year);
  };

  const handleRestart = useCallback(() => {
    if (isDifferentYearSelected) {
      setSelectedYear(localSelectedYear);
      reinitializeCountriesData(localSelectedYear);
    }

    dispatch({ type: ScoreboardActionKind.START_OVER });
  }, [dispatch, isDifferentYearSelected, localSelectedYear, setSelectedYear]);

  // Workaround to fix the issue with the wrong countries colors when changing the year as first action
  useEffect(() => {
    setTimeout(() => {
      dispatch({ type: ScoreboardActionKind.TRIGGER_RERENDER });
    }, 1050);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document
      .querySelector('html')
      ?.setAttribute('data-theme', `theme${selectedYear}`);
  }, [selectedYear]);

  return (
    <div className="sm:ml-8 ml-3 flex items-center space-x-4">
      <SelectBox
        options={options}
        value={localSelectedYear}
        onChange={handleChange}
      />
      <Button
        label="Restart"
        onClick={handleRestart}
        className={`${
          isDifferentYearSelected
            ? 'animated-border'
            : 'border-[3px] border-solid border-transparent'
        }`}
      />
    </div>
  );
};
