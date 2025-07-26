import React, { ChangeEvent, useState } from 'react';

// import { getMaxPossibleTelevotePoints } from '../../data/data';
import { getSequenceNumber } from '../../helpers/getSequenceNumber';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import { useGeneralStore } from '@/state/generalStore';

const NUMBER_REGEX = /^\d*$/;

type Props = {
  isFirstTelevoteCountry: boolean;
};

const TelevoteInput = ({ isFirstTelevoteCountry }: Props) => {
  const resetLastPoints = useScoreboardStore((state) => state.resetLastPoints);
  const giveTelevotePoints = useScoreboardStore(
    (state) => state.giveTelevotePoints,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const televotingProgress = useScoreboardStore(
    (state) => state.televotingProgress,
  );
  const shouldShowManualTelevoteWarning = useGeneralStore(
    (state) => state.settings.shouldShowManualTelevoteWarning,
  );

  const hasShownManualTelevoteWarning = useScoreboardStore(
    (state) => state.hasShownManualTelevoteWarning,
  );
  const setHasShownManualTelevoteWarning = useScoreboardStore(
    (state) => state.setHasShownManualTelevoteWarning,
  );

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const { countries } = getCurrentStage();

  const [enteredPoints, setEnteredPoints] = useState('');
  const [error, setError] = useState('');

  const votingCountryCode = getVotingCountry().code;

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

    // Commented out for now, but in future we should add a setting to enable this check
    // const maxPossibleTelevotePoints = getMaxPossibleTelevotePoints(
    //   getVotingCountriesLength(),
    // );

    // if (votingPoints > maxPossibleTelevotePoints) {
    //   setError(
    //     `The maximum possible televote points are ${maxPossibleTelevotePoints}`,
    //   );

    //   return;
    // }

    const vote = () => {
      setEnteredPoints('');

      if (isFirstTelevoteCountry) {
        resetLastPoints();
      }

      giveTelevotePoints(votingCountryCode, votingPoints);
    };

    if (hasShownManualTelevoteWarning || !shouldShowManualTelevoteWarning) {
      vote();

      return;
    }

    const confirmation = window.confirm(
      'Note: Manually assigning televote points won’t be reflected in the detailed stats. Are you sure you want to continue?',
    );

    if (confirmation) {
      setHasShownManualTelevoteWarning(true);
      vote();
    }
  };

  return (
    <div className="w-full pb-1 lg:pt-3 pt-2 lg:px-4 px-3 rounded-md rounded-b-none">
      <label
        className="lg:text-[1.35rem] text-lg text-white"
        htmlFor="televoteInput"
      >
        Enter televote points
      </label>

      <h5 className="uppercase text-slate-400 lg:text-sm text-xs mt-2 mb-1">
        <span className="font-medium">
          {getSequenceNumber(televotingProgress + 1)}
        </span>{' '}
        of <span className="font-medium">{countries.length}</span> countries
      </h5>
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
          disabled={enteredPoints === '' || error !== ''}
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
