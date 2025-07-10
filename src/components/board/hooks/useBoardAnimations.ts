import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

import { useSpring } from '@react-spring/web';

import { useReorderCountries } from '../../../hooks/useReorderCountries';
import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useBoardAnimations = (
  sortedCountries: Country[],
  isVotingOver: boolean,
  wasTheFirstPointsAwarded: boolean,
  hasCountryFinishedVoting: boolean,
) => {
  const {
    winnerCountry,
    setCanDisplayPlaceAnimation,
    getCurrentStage,
    restartCounter,
    showAllParticipants,
  } = useScoreboardStore();

  const [showPlace, setShowPlace] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>(
    sortedCountries.map((c) => c.code),
  );
  const [finalCountries, setFinalCountries] = useState<Country[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const { id: currentStageId } = getCurrentStage();

  const countriesToRender = useMemo(() => {
    const countryMap = new Map(sortedCountries.map((c) => [c.code, c]));

    return displayOrder
      .map((code) => countryMap.get(code))
      .filter((c): c is Country => !!c);
  }, [displayOrder, sortedCountries]);

  const reorderedCountries = useReorderCountries(countriesToRender);

  const flipMoveDelay = useMemo(() => {
    if (!wasTheFirstPointsAwarded || isVotingOver) return 0;

    return hasCountryFinishedVoting ? 1000 : 500;
  }, [hasCountryFinishedVoting, wasTheFirstPointsAwarded, isVotingOver]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      const newOrder = sortedCountries.map((c) => c.code);

      if (
        newOrder.length !== displayOrder.length ||
        newOrder.some((code, i) => code !== displayOrder[i])
      ) {
        setDisplayOrder(newOrder);
      }
    }, flipMoveDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sortedCountries, flipMoveDelay, displayOrder]);

  useEffect(() => {
    setFinalCountries(reorderedCountries);
  }, [reorderedCountries]);

  useEffect(() => {
    if (isVotingOver) {
      const timer = setTimeout(() => {
        setShowPlace(true);
      }, 3050);

      return () => clearTimeout(timer);
    }
    if (!winnerCountry) {
      setShowPlace(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVotingOver]);

  useEffect(() => {
    if (winnerCountry) {
      setTimeout(() => {
        setCanDisplayPlaceAnimation(false);
      }, 4050);
    }
  }, [setCanDisplayPlaceAnimation, winnerCountry]);

  const flipKey = useMemo(
    () => `${finalCountries.map((c) => c.code).join(',')}-${isVotingOver}`,
    [finalCountries, isVotingOver],
  );

  const [containerAnimation, api] = useSpring(() => ({
    from: { opacity: 0, transform: 'translateY(15px)' },
    config: { duration: 350 },
  }));

  useEffect(() => {
    api.start({
      to: { opacity: 1, transform: 'translateY(0px)' },
      from: { opacity: 0, transform: 'translateY(15px)' },
    });
  }, [api, currentStageId, restartCounter, showAllParticipants]);

  return {
    finalCountries,
    showPlace,
    flipKey,
    containerAnimation,
    renderItem: (
      renderFn: (country: Country, index: number, props: any) => JSX.Element,
    ) => {
      return finalCountries.map((country, index) =>
        renderFn(
          country,
          index,
          {}, // Empty props, as Flipped will provide them
        ),
      );
    },
  };
};
