import React, { ChangeEvent, useState } from 'react';

import { getMaxPossibleTelevotePoints } from '../../data/data';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

const NUMBER_REGEX = /^\d*$/;

type Props = {
  votingCountryIndex: number;
  isFirstTelevoteCountry: boolean;
};

const TelevoteInput = ({
  votingCountryIndex,
  isFirstTelevoteCountry,
}: Props) => {
  const { countries, resetLastPoints, giveTelevotePoints } =
    useScoreboardStore();
  const { getCountriesLength } = useCountriesStore();
  const [enteredPoints, setEnteredPoints] = useState('');
  const [error, setError] = useState('');

  const votingCountryCode = countries[votingCountryIndex]?.code || '';

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow whole numbers
    if (NUMBER_REGEX.test(inputValue)) {
      setError('');

      setEnteredPoints(inputValue);
    }
  };

  const handleVoting = () => {
    const votingPoints = parseInt(enteredPoints);

    if (isNaN(votingPoints)) {
      setError('Invalid input');

      return;
    }

    const maxPossibleTelevotePoints = getMaxPossibleTelevotePoints(
      getCountriesLength(),
    );

    if (votingPoints > maxPossibleTelevotePoints) {
      setError(
        `The maximum possible televote points are ${maxPossibleTelevotePoints}`,
      );

      return;
    }

    setEnteredPoints('');

    if (isFirstTelevoteCountry) {
      resetLastPoints();
    }

    giveTelevotePoints(votingCountryCode, votingPoints);
  };

  return (
    <div className="lg:px-4 px-3 mt-1">
      <label className="lg:text-xl text-lg text-white" htmlFor="televoteInput">
        Enter televote points
      </label>
      <div className="flex">
        <input
          className="w-full lg:pt-3 md:pt-2 pt-1 lg:pb-2 md:pb-1 pb-[2px] px-2 mt-2 rounded-md bg-primary-900 transition-colors duration-300 placeholder:text-gray-400 text-white lg:text-base text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
          name="televoteInput"
          id="televoteInput"
          type="number"
          placeholder="Enter points..."
          value={enteredPoints}
          onChange={handleInputChange}
        />
        <Button
          label="Vote"
          onClick={handleVoting}
          className="mt-2 ml-2 md:px-4 !px-6"
        />
      </div>
      {error !== '' && (
        <h5 className="text-countryItem-douzePointsBlock2 lg:text-base text-sm lg:ml-2 ml-1 lg:pt-2 pt-1">
          {error}
        </h5>
      )}
    </div>
  );
};

export default TelevoteInput;
