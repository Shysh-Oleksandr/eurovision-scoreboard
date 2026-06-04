import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Matches `.container-wrapping-flipper.two-column` in styles.css (`max-width: 479px`). */
export const SCOREBOARD_TWO_COLUMN_COMPACT_MEDIA_QUERY = '(max-width: 479px)';

/**
 * True when the scoreboard is in mobile two-column mode with compact country-item
 * styling (narrow viewport + two-column layout setting enabled).
 */
export const useScoreboardTwoColumnCompactLayout = (
  isTwoColumnLayoutEnabled: boolean,
): boolean => {
  const isNarrowViewport = useMediaQuery(
    SCOREBOARD_TWO_COLUMN_COMPACT_MEDIA_QUERY,
  );

  return isTwoColumnLayoutEnabled && isNarrowViewport;
};
