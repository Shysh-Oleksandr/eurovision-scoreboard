import { useMemo } from 'react';

import { Country } from '../../../models';

type useItemStateProps = {
  country: Country;
  votingCountryCode?: string;
  isJuryVoting: boolean;
  showPlaceAnimation: boolean;
  shouldShowAsNonQualified: boolean;
  hasCountryFinishedVoting: boolean;
};

export const useItemState = ({
  country,
  votingCountryCode,
  isJuryVoting,
  showPlaceAnimation,
  shouldShowAsNonQualified,
  hasCountryFinishedVoting,
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

  const buttonClassName = useMemo(
    () =>
      `relative outline outline-countryItem-televoteOutline flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full ${
        isDisabled
          ? ''
          : 'cursor-pointer transition-colors duration-[400ms] hover:!bg-countryItem-juryHoverBg'
      } ${isActive ? 'rounded-sm' : ''} ${
        showPlaceAnimation ? 'lg:ml-2 ml-1.5' : ''
      } ${
        shouldShowAsNonQualified
          ? `!bg-countryItem-unqualifiedBg opacity-70 ${
              showPlaceAnimation ? '!opacity-70' : ''
            }`
          : ''
      } 
      ${isVotingCountry ? 'opacity-70' : ''}
      `,
    [
      isDisabled,
      isActive,
      showPlaceAnimation,
      shouldShowAsNonQualified,
      isVotingCountry,
    ],
  );

  return { isDisabled, buttonClassName, isActive, isVotingCountry };
};
