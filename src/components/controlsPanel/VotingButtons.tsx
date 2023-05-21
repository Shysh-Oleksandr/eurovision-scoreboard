import React, { useCallback, useEffect, useMemo, useRef } from 'react';

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
  shouldClearPoints: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({
  countries,
  shouldShowLastPoints,
  isJuryVoting,
  countriesLeft,
  votingCountryIndex,
  shouldClearPoints,
  dispatch,
}: Props) => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const isFirstTelevoteCountry = useMemo(
    () => countries.filter((country) => country.isVotingFinished).length === 0,
    [countries],
  );

  const voteRandomly = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_JURY_POINTS });

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
        dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_JURY_POINTS });
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
    if ((shouldShowLastPoints || shouldClearPoints) && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints, shouldClearPoints]);

  return (
    <div className="bg-blue-950 w-full pt-2 lg:pb-4 pb-3">
      {isJuryVoting ? (
        <div className="lg:px-4 px-3">
          <Button label="Vote randomly" onClick={voteRandomly} />
        </div>
      ) : (
        <TelevoteInput
          votingCountryIndex={votingCountryIndex}
          isFirstTelevoteCountry={isFirstTelevoteCountry}
          dispatch={dispatch}
        />
      )}

      <div className="w-full bg-slate-600 h-[1px] lg:my-4 my-3"></div>
      <div className="lg:px-4 px-3">
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
