import { useMemo } from 'react';

import { Country } from '../../../models';

type useItemStateProps = {
  country: Country;
  votingCountryCode?: string;
  isJuryVoting: boolean;
  showPlaceAnimation: boolean;
  shouldShowAsNonQualified: boolean;
  hasCountryFinishedVoting: boolean;
  isCountryVotingFinished: boolean;
};

export const useItemState = ({
  country,
  votingCountryCode,
  isJuryVoting,
  showPlaceAnimation,
  shouldShowAsNonQualified,
  hasCountryFinishedVoting,
  isCountryVotingFinished,
}: useItemStateProps) => {
  const isVotingCountry = country.code === votingCountryCode && isJuryVoting;
  const isActive = country.code === votingCountryCode && !isJuryVoting;

  const isVoted = useMemo(
    () => country.lastReceivedPoints !== null || country.isVotingFinished,
    [country.lastReceivedPoints, country.isVotingFinished],
  );

  const isDisabled = useMemo(
    () =>
      (isVoted && !hasCountryFinishedVoting) ||
      isVotingCountry ||
      !isJuryVoting,
    [isVoted, hasCountryFinishedVoting, isVotingCountry, isJuryVoting],
  );

  const buttonColors = useMemo(() => {
    if (shouldShowAsNonQualified) {
      return `bg-countryItem-unqualifiedBg text-countryItem-unqualifiedText opacity-70 ${
        showPlaceAnimation ? '!opacity-70' : ''
      }`;
    }

    if (isJuryVoting) {
      return `bg-countryItem-juryBg text-countryItem-juryCountryText ${
        isDisabled ? '' : 'hover:bg-countryItem-juryHoverBg cursor-pointer '
      }`;
    }

    if (isActive) {
      return 'bg-countryItem-televoteActiveBg text-countryItem-televoteActiveText outline outline-2';
    }

    if (isCountryVotingFinished) {
      return 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';
    }

    return 'bg-countryItem-televoteUnfinishedBg text-countryItem-televoteUnfinishedText';
  }, [
    shouldShowAsNonQualified,
    isJuryVoting,
    isActive,
    isCountryVotingFinished,
    showPlaceAnimation,
    isDisabled,
  ]);

  const buttonClassName = useMemo(
    () =>
      `relative will-change-colors outline-countryItem-televoteOutline flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full transition-all !duration-500 ${
        isActive ? 'rounded-sm' : ''
      } ${showPlaceAnimation ? 'lg:ml-2 ml-1.5' : ''}
      ${isVotingCountry ? 'opacity-70 cursor-not-allowed' : ''}
      ${buttonColors}
      `,
    [isActive, showPlaceAnimation, isVotingCountry, buttonColors],
  );

  return { isDisabled, buttonClassName, isActive, isVotingCountry };
};
