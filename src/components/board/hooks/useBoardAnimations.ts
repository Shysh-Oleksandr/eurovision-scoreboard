import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

import { useGSAP } from '@gsap/react';

import { useReorderCountries } from '../../../hooks/useReorderCountries';
import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export const useBoardAnimations = (
  sortedCountries: Country[],
  isVotingOver: boolean,
  wasTheFirstPointsAwarded: boolean,
  isDouzePointsAwarded: boolean,
) => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const startCounter = useScoreboardStore((state) => state.startCounter);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const alwaysShowRankings = useGeneralStore(
    (state) => state.settings.alwaysShowRankings,
  );

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

    return isDouzePointsAwarded ? 1000 : 500;
  }, [isDouzePointsAwarded, wasTheFirstPointsAwarded, isVotingOver]);

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

  const flipKey = useMemo(
    () => `${finalCountries.map((c) => c.code).join(',')}-${isVotingOver}`,
    [finalCountries, isVotingOver],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.in',
        },
      );
    },
    {
      dependencies: [
        currentStageId,
        startCounter,
        showAllParticipants,
        viewedStageId,
      ],
      scope: containerRef,
    },
  );

  const [delayedSortedCountries, setDelayedSortedCountries] =
    useState(sortedCountries);

  useEffect(() => {
    if (alwaysShowRankings && wasTheFirstPointsAwarded) {
      const delay = flipMoveDelay === 0 ? 0 : flipMoveDelay + 200;
      const timer = setTimeout(() => {
        setDelayedSortedCountries(sortedCountries);
      }, delay);

      return () => clearTimeout(timer);
    }
    setDelayedSortedCountries(sortedCountries);
  }, [
    sortedCountries,
    alwaysShowRankings,
    wasTheFirstPointsAwarded,
    flipMoveDelay,
  ]);

  return {
    delayedSortedCountries,
    finalCountries,
    showPlace,
    flipKey,
    containerRef,
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
