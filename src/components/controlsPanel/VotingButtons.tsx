import React, { useCallback, useEffect, useRef } from 'react';

import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';

import TelevoteInput from './TelevoteInput';

type Props = {
  countries: Country[];
  shouldShowLastPoints: boolean;
  isJuryVoting: boolean;
  countriesLeft: number;
  votingCountryIndex: number;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({
  countries,
  shouldShowLastPoints,
  isJuryVoting,
  countriesLeft,
  votingCountryIndex,
  dispatch,
}: Props) => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const voteRandomly = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS });

    dispatch({
      type: ScoreboardActionKind.HIDE_LAST_RECEIVED_POINTS,
    });

    timerId.current = setTimeout(() => {
      dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
    }, 3000);
  }, [dispatch]);

  const finishVoting = useCallback(() => {
    if (isJuryVoting) {
      new Array(countriesLeft).fill(0).map(() => {
        dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS });
      });

      timerId.current = setTimeout(() => {
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }, 3000);
    } else {
      const filteredCountries = countries.filter(
        (country) => !country.isVotingFinished,
      );
      const sortedCountries = [...filteredCountries].sort(
        (a, b) => b.points - a.points,
      );

      sortedCountries.map((votingCountry) => {
        const votingCountryPlace =
          countries.findIndex(
            (country) => country.code === votingCountry.code,
          ) + 1;

        const randomVotingPoints = getRandomTelevotePoints(votingCountryPlace);

        dispatch({
          type: ScoreboardActionKind.GIVE_TELEVOTE_POINTS,
          payload: {
            countryCode: votingCountry.code,
            votingPoints: randomVotingPoints,
          },
        });
      });
    }
  }, [countries, countriesLeft, dispatch, isJuryVoting]);

  useEffect(() => {
    if (shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className="bg-blue-950 w-full pt-2 pb-4">
      {isJuryVoting ? (
        <div className="px-4">
          <Button label="Vote randomly" onClick={voteRandomly} />
        </div>
      ) : (
        <TelevoteInput
          votingCountryIndex={votingCountryIndex}
          dispatch={dispatch}
        />
      )}

      <div className="w-full bg-slate-600 h-[1px] my-4"></div>
      <div className="px-4">
        <Button
          label="Finish randomly"
          onClick={finishVoting}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VotingButtons;
