import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { ANIMATION_DURATION } from '../../data/data';
import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

import TelevoteInput from './TelevoteInput';

const VotingButtons = () => {
  const {
    countries,
    shouldShowLastPoints,
    isJuryVoting,
    votingCountryIndex,
    shouldClearPoints,
    giveRandomJuryPoints,
    hideLastReceivedPoints,
    resetLastPoints,
    giveTelevotePoints,
  } = useScoreboardStore();
  const { getQualifiedCountries, getCountriesLength } = useCountriesStore();

  const countriesLeft = getCountriesLength() - votingCountryIndex;

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

    giveRandomJuryPoints();
    hideLastReceivedPoints();

    timerId.current = setTimeout(() => {
      resetLastPoints();
    }, ANIMATION_DURATION);
  }, [giveRandomJuryPoints, hideLastReceivedPoints, resetLastPoints]);

  const finishVoting = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    if (isJuryVoting) {
      new Array(countriesLeft).fill(0).forEach(() => {
        giveRandomJuryPoints(true);
      });

      timerId.current = setTimeout(() => {
        resetLastPoints();
      }, ANIMATION_DURATION);
    } else {
      const filteredCountries = countries.filter(
        (country) => !country.isVotingFinished,
      );
      const sortedCountries = [...filteredCountries].sort(
        (a, b) => b.points - a.points,
      );

      sortedCountries.forEach((votingCountry) => {
        const votingCountryPlace =
          countries.findIndex(
            (country) => country.code === votingCountry.code,
          ) + 1;

        const randomVotingPoints = getRandomTelevotePoints(
          votingCountryPlace,
          getQualifiedCountries().length,
          getCountriesLength(),
        );

        giveTelevotePoints(votingCountry.code, randomVotingPoints);
      });
    }
  }, [
    countries,
    countriesLeft,
    isJuryVoting,
    giveRandomJuryPoints,
    resetLastPoints,
    giveTelevotePoints,
    getQualifiedCountries,
    getCountriesLength,
  ]);

  useEffect(() => {
    if ((shouldShowLastPoints || shouldClearPoints) && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints, shouldClearPoints]);

  return (
    <div className="w-full pt-2 lg:pb-4 pb-3 rounded-md rounded-t-none">
      {isJuryVoting ? (
        <div className="lg:px-4 px-3">
          <Button label="Vote randomly" onClick={voteRandomly} />
        </div>
      ) : (
        <TelevoteInput
          votingCountryIndex={votingCountryIndex}
          isFirstTelevoteCountry={isFirstTelevoteCountry}
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
