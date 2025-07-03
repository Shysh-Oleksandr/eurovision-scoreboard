import React, { useCallback, useMemo } from 'react';

import { POINTS_ARRAY } from '../../data/data';
import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

type Props = {
  onClick: (countryCode: string) => void;
};

const BoardHeader = ({ onClick }: Props): JSX.Element => {
  const {
    countries,
    isJuryVoting,
    votingPoints,
    winnerCountry,
    qualifiedCountries,
    resetLastPoints,
    giveTelevotePoints,
    presenterSettings,
  } = useScoreboardStore();

  const { getQualifiedCountries, getVotingCountriesLength, getVotingCountry } =
    useCountriesStore();

  const { year } = useGeneralStore();

  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

  const votingCountry = getVotingCountry();

  const votingText = useMemo(() => {
    if (isVotingOver) return null;

    // Check if presenter mode is active
    if (presenterSettings.isAutoPlaying) {
      if (isJuryVoting) {
        const countriesStore = useCountriesStore.getState();
        const votingCountries = countriesStore.getVotingCountries();
        const messageCountry =
          votingCountries[presenterSettings.currentMessageCountryIndex];

        if (messageCountry) {
          // Use the presenter phase to determine the message
          if (presenterSettings.currentPhase === 'twelve-points') {
            return (
              <>
                Hi, <span className="font-medium">{messageCountry.name}</span>{' '}
                calling.
                <br />
                <span className="font-medium">12 points</span> go to...
              </>
            );
          }

          // For individual mode, always show specific point announcement
          if (presenterSettings.pointGrouping === 'individual') {
            let points = presenterSettings.currentAnnouncingPoints;

            // If no current points, look ahead to determine the first point for this country
            if (!points) {
              const presetVote =
                presenterSettings.presetJuryVotes[
                  presenterSettings.currentMessageCountryIndex
                ];

              if (presetVote) {
                // Get the first point (lowest) that will be announced
                const sortedPoints = Object.entries(presetVote.points)
                  .filter(([, pointValue]) => pointValue > 0)
                  .sort(
                    (a, b) =>
                      parseInt(a[1].toString()) - parseInt(b[1].toString()),
                  );

                if (sortedPoints.length > 0) {
                  points = parseInt(sortedPoints[0][1].toString());
                }
              }
            }

            if (points) {
              return (
                <>
                  Hi, <span className="font-medium">{messageCountry.name}</span>{' '}
                  calling.
                  <br />
                  <span className="font-medium">
                    {points} point{points === 1 ? '' : 's'}
                  </span>{' '}
                  go{points === 1 ? 'es' : ''} to...
                </>
              );
            }

            // Fallback if no points are configured
            return (
              <>
                Hi, <span className="font-medium">{messageCountry.name}</span>{' '}
                calling.
                <br />
                Preparing points...
              </>
            );
          }

          // For grouped mode, show the generic lower points message
          return (
            <>
              Hi, <span className="font-medium">{messageCountry.name}</span>{' '}
              calling.
              <br />
              Here are the lower points:
            </>
          );
        }
      } else {
        // Televote presenter mode
        return <>Televote results are being presented automatically.</>;
      }
    }

    if (isJuryVoting) {
      return (
        <>
          Choose a country to give{' '}
          <span className="font-medium">{votingPoints}</span> point
          {votingPoints === 1 ? '' : 's'}
        </>
      );
    }

    return (
      <>
        Enter televote points for{' '}
        <span className="font-medium">{votingCountry?.name}</span>
      </>
    );
  }, [
    isVotingOver,
    isJuryVoting,
    votingPoints,
    votingCountry,
    presenterSettings,
  ]);

  const chooseRandomly = useCallback(() => {
    if (!isJuryVoting) {
      const isFirstTelevoteCountry =
        countries.filter((country) => country.isVotingFinished).length === 0;

      if (isFirstTelevoteCountry) {
        resetLastPoints();
      }

      const votingCountryPlace =
        countries.findIndex((country) => country.code === votingCountry.code) +
        1;

      const randomVotingPoints = getRandomTelevotePoints(
        votingCountryPlace,
        getQualifiedCountries().length,
        getVotingCountriesLength(),
      );

      giveTelevotePoints(votingCountry?.code, randomVotingPoints);

      return;
    }

    const initialCountriesWithPointsLength = countries.filter(
      (country) => country.lastReceivedPoints !== null,
    ).length;

    const availableCountries = countries.filter(
      (country) =>
        country.code !== votingCountry?.code &&
        (country.lastReceivedPoints === null ||
          initialCountriesWithPointsLength >= POINTS_ARRAY.length),
    );

    if (availableCountries.length === 0) {
      return;
    }

    const randomCountryIndex = Math.floor(
      Math.random() * availableCountries.length,
    );
    const randomCountryCode = availableCountries[randomCountryIndex].code;

    onClick(randomCountryCode);
  }, [
    countries,
    votingCountry?.code,
    isJuryVoting,
    resetLastPoints,
    giveTelevotePoints,
    onClick,
    getQualifiedCountries,
    getVotingCountriesLength,
  ]);

  return (
    <div className="pb-2 flex flex-row w-full justify-between items-center">
      <h3 className="lg:text-2xl xs:text-xl text-lg text-white">
        {winnerCountry ? (
          <>
            <span className="font-semibold">{winnerCountry.name}</span> is the
            winner of Eurovision {year}!
          </>
        ) : (
          votingText
        )}
      </h3>
      {!isVotingOver && <Button label="Random" onClick={chooseRandomly} />}
    </div>
  );
};

export default BoardHeader;
