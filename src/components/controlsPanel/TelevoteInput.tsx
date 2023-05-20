import React, { ChangeEvent, useState } from 'react';

import { MAX_POSSIBLE_TELEVOTE_POINTS } from '../../data';
import allCountries from '../../data/countries.json';
import { ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';

const NUMBER_REGEX = /^\d*$/;

type Props = {
  votingCountryIndex: number;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const TelevoteInput = ({ votingCountryIndex, dispatch }: Props) => {
  const [enteredPoints, setEnteredPoints] = useState('');
  const [error, setError] = useState('');

  const votingCountryCode = allCountries[votingCountryIndex]?.code || '';

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

    if (votingPoints > MAX_POSSIBLE_TELEVOTE_POINTS) {
      setError(
        `The maximum possible televote points are ${MAX_POSSIBLE_TELEVOTE_POINTS}`,
      );

      return;
    }

    setEnteredPoints('');

    dispatch({
      type: ScoreboardActionKind.GIVE_TELEVOTE_POINTS,
      payload: { countryCode: votingCountryCode, votingPoints },
    });
  };

  return (
    <div className="px-4 mt-1">
      <label className="text-xl text-white" htmlFor="televoteInput">
        Enter televote points
      </label>
      <div className="flex">
        <input
          className="w-full py-3 px-2 mt-2 rounded-md bg-blue-900 transition-colors duration-300 placeholder:text-gray-400 text-white border-solid border-transparent border-b-2 hover:bg-blue-800 focus:bg-blue-800 focus:border-white "
          name="televoteInput"
          id="televoteInput"
          type="number"
          placeholder="Enter points..."
          value={enteredPoints}
          onChange={handleInputChange}
        />
        <Button label="Vote" onClick={handleVoting} className="mt-2 ml-2" />
      </div>
      {error !== '' && <h5 className="text-red-600 text-base ml-2">{error}</h5>}
    </div>
  );
};

export default TelevoteInput;
