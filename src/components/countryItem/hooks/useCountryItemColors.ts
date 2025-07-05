import { useMemo } from 'react';

import { useThemeColor } from '../../../theme/useThemeColor';

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
  const [
    JURY_LAST_POINTS_BG,
    JURY_LAST_POINTS_TEXT,
    JURY_POINTS_BG,
    JURY_POINTS_TEXT,
    TELEVOTE_LAST_POINTS_BG,
    TELEVOTE_LAST_POINTS_TEXT,
    TELEVOTE_UNFINISHED_POINTS_BG,
    TELEVOTE_UNFINISHED_POINTS_TEXT,
    TELEVOTE_ACTIVE_POINTS_BG,
    TELEVOTE_ACTIVE_POINTS_TEXT,
    TELEVOTE_FINISHED_POINTS_BG,
    TELEVOTE_FINISHED_POINTS_TEXT,
  ] = useThemeColor([
    'countryItem.juryLastPointsBg',
    'countryItem.juryLastPointsText',
    'countryItem.juryPointsBg',
    'countryItem.juryPointsText',
    'countryItem.televoteLastPointsBg',
    'countryItem.televoteLastPointsText',
    'countryItem.televoteUnfinishedPointsBg',
    'countryItem.televoteUnfinishedPointsText',
    'countryItem.televoteActivePointsBg',
    'countryItem.televoteActivePointsText',
    'countryItem.televoteFinishedPointsBg',
    'countryItem.televoteFinishedPointsText',
  ]);

  const colors = useMemo(() => {
    const pointsBgColor = (() => {
      if (isJuryVoting) return JURY_POINTS_BG;
      if (isCountryVotingFinished) return TELEVOTE_FINISHED_POINTS_BG;
      if (isActive) return TELEVOTE_ACTIVE_POINTS_BG;

      return TELEVOTE_UNFINISHED_POINTS_BG;
    })();

    const pointsTextColor = (() => {
      if (isJuryVoting) return JURY_POINTS_TEXT;
      if (isCountryVotingFinished) return TELEVOTE_FINISHED_POINTS_TEXT;
      if (isActive) return TELEVOTE_ACTIVE_POINTS_TEXT;

      return TELEVOTE_UNFINISHED_POINTS_TEXT;
    })();

    const lastPointsBgColor = isCountryVotingFinished
      ? TELEVOTE_LAST_POINTS_BG
      : JURY_LAST_POINTS_BG;

    const lastPointsTextColor =
      isJuryVoting || !isCountryVotingFinished
        ? JURY_LAST_POINTS_TEXT
        : TELEVOTE_LAST_POINTS_TEXT;

    return {
      pointsBgColor,
      pointsTextColor,
      lastPointsBgColor,
      lastPointsTextColor,
    };
  }, [
    isJuryVoting,
    isCountryVotingFinished,
    isActive,
    JURY_LAST_POINTS_BG,
    JURY_LAST_POINTS_TEXT,
    JURY_POINTS_BG,
    JURY_POINTS_TEXT,
    TELEVOTE_LAST_POINTS_BG,
    TELEVOTE_LAST_POINTS_TEXT,
    TELEVOTE_UNFINISHED_POINTS_BG,
    TELEVOTE_UNFINISHED_POINTS_TEXT,
    TELEVOTE_ACTIVE_POINTS_BG,
    TELEVOTE_ACTIVE_POINTS_TEXT,
    TELEVOTE_FINISHED_POINTS_BG,
    TELEVOTE_FINISHED_POINTS_TEXT,
  ]);

  return colors;
};
