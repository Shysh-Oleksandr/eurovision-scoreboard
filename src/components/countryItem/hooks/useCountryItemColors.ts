import { useMemo } from 'react';

type Props = {
  isJuryVoting: boolean;
  isCountryVotingFinished: boolean;
  isActive: boolean;
  isUnqualified: boolean;
};

export const useCountryItemColors = ({
  isJuryVoting,
  isCountryVotingFinished,
  isActive,
  isUnqualified,
}: Props) => {
  const pointsBgClass = useMemo(() => {
    if (isUnqualified)
      return 'bg-countryItem-unqualifiedPointsBg text-countryItem-unqualifiedPointsBg';
    if (isJuryVoting)
      return 'bg-countryItem-juryPointsBg text-countryItem-juryPointsBg';
    if (isCountryVotingFinished)
      return 'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
    if (isActive)
      return 'bg-countryItem-televoteActivePointsBg text-countryItem-televoteActivePointsBg';

    return 'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsBg';
  }, [isUnqualified, isJuryVoting, isCountryVotingFinished, isActive]);

  const pointsTextClass = useMemo(() => {
    if (isUnqualified) return 'text-countryItem-unqualifiedPointsText';
    if (isJuryVoting) return 'text-countryItem-juryPointsText';
    if (isCountryVotingFinished)
      return 'text-countryItem-televoteFinishedPointsText';
    if (isActive) return 'text-countryItem-televoteActivePointsText';

    return 'text-countryItem-televoteUnfinishedPointsText';
  }, [isUnqualified, isJuryVoting, isCountryVotingFinished, isActive]);

  let lastPointsBgClass: string;
  if (isUnqualified) {
    lastPointsBgClass =
      'bg-countryItem-unqualifiedLastPointsBg text-countryItem-unqualifiedLastPointsBg';
  } else if (isJuryVoting) {
    lastPointsBgClass =
      'bg-countryItem-juryLastPointsBg text-countryItem-juryLastPointsBg';
  } else if (isActive) {
    lastPointsBgClass =
      'bg-countryItem-televoteActiveLastPointsBg text-countryItem-televoteActiveLastPointsBg';
  } else if (isCountryVotingFinished) {
    lastPointsBgClass =
      'bg-countryItem-televoteFinishedLastPointsBg text-countryItem-televoteFinishedLastPointsBg';
  } else {
    lastPointsBgClass =
      'bg-countryItem-televoteLastPointsBg text-countryItem-televoteLastPointsBg';
  }

  let lastPointsTextClass: string;
  if (isUnqualified) {
    lastPointsTextClass = 'text-countryItem-unqualifiedLastPointsText';
  } else if (isJuryVoting) {
    lastPointsTextClass = 'text-countryItem-juryLastPointsText';
  } else if (isActive) {
    lastPointsTextClass = 'text-countryItem-televoteActiveLastPointsText';
  } else if (isCountryVotingFinished) {
    lastPointsTextClass = 'text-countryItem-televoteFinishedLastPointsText';
  } else {
    lastPointsTextClass = 'text-countryItem-televoteLastPointsText';
  }

  return {
    pointsBgClass,
    pointsTextClass,
    lastPointsBgClass,
    lastPointsTextClass,
  };
};
