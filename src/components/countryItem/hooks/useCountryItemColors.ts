import { useMemo } from 'react';

type Props = {
  isJuryVoting: boolean;
  isCountryVotingFinished: boolean;
  isActive: boolean;
};

export const useCountryItemColors = ({
  isJuryVoting,
  isCountryVotingFinished,
  isActive,
}: Props) => {
  const pointsBgClass = useMemo(() => {
    if (isJuryVoting)
      return 'bg-countryItem-juryPointsBg text-countryItem-juryPointsBg';
    if (isCountryVotingFinished)
      return 'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
    if (isActive)
      return 'bg-countryItem-televoteActivePointsBg text-countryItem-televoteActivePointsBg';

    return 'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsBg';
  }, [isJuryVoting, isCountryVotingFinished, isActive]);

  const pointsTextClass = useMemo(() => {
    if (isJuryVoting) return 'text-countryItem-juryPointsText';
    if (isCountryVotingFinished)
      return 'text-countryItem-televoteFinishedPointsText';
    if (isActive) return 'text-countryItem-televoteActivePointsText';

    return 'text-countryItem-televoteUnfinishedPointsText';
  }, [isJuryVoting, isCountryVotingFinished, isActive]);

  const lastPointsBgClass = isCountryVotingFinished
    ? 'bg-countryItem-televoteLastPointsBg text-countryItem-televoteLastPointsBg'
    : 'bg-countryItem-juryLastPointsBg text-countryItem-juryLastPointsBg';

  const lastPointsTextClass =
    isJuryVoting || !isCountryVotingFinished
      ? 'text-countryItem-juryLastPointsText'
      : 'text-countryItem-televoteLastPointsText';

  return {
    pointsBgClass,
    pointsTextClass,
    lastPointsBgClass,
    lastPointsTextClass,
  };
};
