import { useMemo } from 'react';

import { Country } from '../../../models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

type useItemStateProps = {
  country: Country;
  votingCountryCode?: string;
  isJuryVoting: boolean;
  showPlaceAnimation: boolean;
  shouldShowAsNonQualified: boolean;
  hasCountryFinishedVoting: boolean;
  isCountryVotingFinished: boolean;
  isVotingOver: boolean;
};

export const useItemState = ({
  country,
  votingCountryCode,
  isJuryVoting,
  showPlaceAnimation,
  shouldShowAsNonQualified,
  hasCountryFinishedVoting,
  isCountryVotingFinished,
  isVotingOver,
}: useItemStateProps) => {
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );

  const isVotingCountry = country.code === votingCountryCode && isJuryVoting;
  const isActive =
    country.code === votingCountryCode &&
    !isJuryVoting &&
    !revealTelevoteLowestToHighest;

  const isVoted = useMemo(
    () => country.lastReceivedPoints !== null || country.isVotingFinished,
    [country.lastReceivedPoints, country.isVotingFinished],
  );

  const isDisabled = useMemo(() => {
    // Countries that have voted and voting hasn't finished yet are disabled
    if (isVoted && !hasCountryFinishedVoting) return true;

    // Current voting country during jury voting is disabled
    if (isVotingCountry) return true;

    // Voting is over
    if (isVotingOver) return true;

    // During televoting
    if (!isJuryVoting) {
      if (revealTelevoteLowestToHighest) {
        // In reveal mode, all unfinished countries are clickable
        return isVoted;
      } else {
        // In normal televoting mode, all countries are disabled
        return true;
      }
    }

    // During jury voting, all other countries are clickable
    return false;
  }, [
    isVoted,
    hasCountryFinishedVoting,
    isVotingCountry,
    isJuryVoting,
    revealTelevoteLowestToHighest,
    country.code,
    votingCountryCode,
    isVotingOver,
  ]);

  const buttonColors = useMemo(() => {
    if (shouldShowAsNonQualified) {
      return `bg-countryItem-unqualifiedBg text-countryItem-unqualifiedText opacity-70 ${
        showPlaceAnimation ? '!opacity-70' : ''
      }`;
    }

    if (isJuryVoting) {
      return `bg-countryItem-juryBg text-countryItem-juryCountryText ${
        isDisabled ? '' : 'hover:bg-countryItem-juryHoverBg cursor-pointer'
      }`;
    }

    if (isActive) {
      return 'bg-countryItem-televoteActiveBg text-countryItem-televoteActiveText outline outline-2';
    }

    if (isCountryVotingFinished || isVotingOver) {
      return 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';
    }

    return `bg-countryItem-televoteUnfinishedBg text-countryItem-televoteUnfinishedText ${
      revealTelevoteLowestToHighest
        ? 'hover:bg-countryItem-juryHoverBg cursor-pointer'
        : ''
    }`;
  }, [
    shouldShowAsNonQualified,
    isJuryVoting,
    isActive,
    isCountryVotingFinished,
    isVotingOver,
    showPlaceAnimation,
    isDisabled,
  ]);

  const buttonClassName = useMemo(
    () =>
      `relative will-change-colors outline-countryItem-televoteOutline flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full transition-all !duration-500 ${
        isActive ? 'rounded-sm' : ''
      } ${showPlaceAnimation ? 'lg:ml-2 xs:ml-1.5 ml-1' : ''}
      ${isVotingCountry ? 'opacity-70 cursor-not-allowed' : ''}
      ${buttonColors}
      ${isVotingOver ? 'pointer-events-none' : ''}
      `,
    [isActive, showPlaceAnimation, isVotingCountry, buttonColors, isVotingOver],
  );

  return { isDisabled, buttonClassName, isActive, isVotingCountry };
};
