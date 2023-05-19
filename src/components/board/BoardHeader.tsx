import React, { useCallback } from 'react';

import { Country } from '../../models';
import Button from '../Button';

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  votingPoints: number;
  onClick: (countryCode: string) => void;
};

const BoardHeader = ({
  countries,
  isJuryVoting,
  votingPoints,
  onClick,
}: Props): JSX.Element => {
  const chooseRandomly = useCallback(() => {
    const countriesWithoutPoints = countries.filter(
      (country) => !country.lastReceivedPoints,
    );

    const randomCountryIndex = Math.floor(
      Math.random() * countriesWithoutPoints.length,
    );
    const randomCountryCode = countriesWithoutPoints[randomCountryIndex].code;

    onClick(randomCountryCode);
  }, [countries, onClick]);

  return (
    <div className="pb-2 flex flex-row w-full justify-between items-center">
      <h3 className="text-2xl text-white">
        {isJuryVoting
          ? `Choose a country to give ${votingPoints} point${
              votingPoints === 1 ? '' : 's'
            }`
          : ''}
      </h3>
      <Button label="Choose randomly" onClick={chooseRandomly} />
    </div>
  );
};

export default BoardHeader;
