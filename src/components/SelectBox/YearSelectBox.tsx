import React from 'react';

import Button from '../Button';

import SelectBox from '.';

const options = [
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
];

export const YearSelectBox = () => {
  // const [state, dispatch]= useReducer(scoreboardReducer, initialState);

  return (
    <div className="sm:ml-8 ml-3 flex items-center space-x-4">
      <SelectBox options={options} defaultValue="2024" />
      <Button label="Restart" onClick={() => null} />
    </div>
  );
};
