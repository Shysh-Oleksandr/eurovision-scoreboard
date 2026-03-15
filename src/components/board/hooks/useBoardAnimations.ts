import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useReorderCountries } from '../../../hooks/useReorderCountries';
import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export type BoardItemAnimationMode = 'flip' | 'teleport';

type TeleportAnimationPhase = 'outStart' | 'out' | 'inStart' | 'in';
type TeleportDirection = 'up' | 'down';
type TeleportAnimationState = {
  phase: TeleportAnimationPhase;
  direction: TeleportDirection;
};

const TELEPORT_OUT_DURATION_MS = 400;
const TELEPORT_IN_DURATION_MS = 400;
const TELEPORT_OUT_PHASE_DURATION_MS = 420;
const TELEPORT_IN_PHASE_DURATION_MS = 420;
const TELEPORT_FLIP_PHASE_DURATION_MS = 380;
const TELEPORT_IN_START_DELAY_MS = 40;
const TELEPORT_OUT_START_DELAY_MS = 16;
const TELEPORT_START_DELAY_MS = 0;
const PHASE_OVERLAP_RATIO = 0.7;
const TELEPORT_OUT_PREFERRED_STAGGER_MS = 70;
const TELEPORT_IN_PREFERRED_STAGGER_MS = 70;
const TELEPORT_MIN_STAGGER_MS = 42;

const areOrdersEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;

  return left.every((code, index) => code === right[index]);
};

const sortBottomToTopByOrder = (codes: string[], order: string[]) => {
  return [...codes].sort((leftCode, rightCode) => {
    return order.indexOf(rightCode) - order.indexOf(leftCode);
  });
};

const getAdaptiveStaggerMs = (
  itemCount: number,
  phaseDurationMs: number,
  phaseStartDelayMs: number,
  transitionDurationMs: number,
  preferredStaggerMs: number,
) => {
  if (itemCount <= 1) return 0;

  const availableWindow =
    phaseDurationMs - phaseStartDelayMs - transitionDurationMs;
  const maxStaggerThatFits = availableWindow / (itemCount - 1);

  if (maxStaggerThatFits <= 0) return 0;

  if (maxStaggerThatFits >= preferredStaggerMs) {
    return preferredStaggerMs;
  }

  return Math.max(TELEPORT_MIN_STAGGER_MS, maxStaggerThatFits);
};

const getPointsByCode = (countries: Country[]) => {
  const pointsByCode: Record<string, number> = {};
  countries.forEach((country) => {
    pointsByCode[country.code] = country.points;
  });

  return pointsByCode;
};

export const useBoardAnimations = (
  sortedCountries: Country[],
  wasTheFirstPointsAwarded: boolean,
  isDouzePointsAwarded: boolean,
  boardItemAnimationMode: BoardItemAnimationMode,
) => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const startCounter = useScoreboardStore((state) => state.startCounter);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const setBoardTeleportAnimationRunning = useScoreboardStore(
    (state) => state.setBoardTeleportAnimationRunning,
  );
  const handleBoardTeleportAnimationComplete = useScoreboardStore(
    (state) => state.handleBoardTeleportAnimationComplete,
  );
  const shouldResetLastPointsAfterTeleport = useScoreboardStore(
    (state) => state.shouldResetLastPointsAfterTeleport,
  );
  const alwaysShowRankings = useGeneralStore(
    (state) => state.settings.alwaysShowRankings,
  );

  const [showPlace, setShowPlace] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>(
    sortedCountries.map((c) => c.code),
  );
  const [finalCountries, setFinalCountries] = useState<Country[]>([]);
  const [teleportStateByCode, setTeleportStateByCode] = useState<
    Record<string, TeleportAnimationState>
  >({});
  const [teleportOnlyByCode, setTeleportOnlyByCode] = useState<
    Record<string, boolean>
  >({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const teleportTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const displayOrderRef = useRef(displayOrder);
  const animationRunIdRef = useRef(0);
  const isTeleportCycleRunningRef = useRef(false);
  const previousPointsByCodeRef = useRef(getPointsByCode(sortedCountries));
  const queuedTeleportUpdateRef = useRef<{
    order: string[];
    hasDouzePointsAnimation: boolean;
    shouldAnimateByCode: Record<string, boolean>;
  } | null>(null);

  const { id: currentStageId, isOver: isVotingOver } = getCurrentStage() || {};

  const countriesToRender = useMemo(() => {
    const countryMap = new Map(sortedCountries.map((c) => [c.code, c]));

    return displayOrder
      .map((code) => countryMap.get(code))
      .filter((c): c is Country => !!c);
  }, [displayOrder, sortedCountries]);

  const reorderedCountries = useReorderCountries(
    countriesToRender,
    undefined,
    isVotingOver,
  );

  const flipMoveDelay = useMemo(() => {
    if (!wasTheFirstPointsAwarded || isVotingOver) return 0;

    return isDouzePointsAwarded ? 1000 : 500;
  }, [isDouzePointsAwarded, wasTheFirstPointsAwarded, isVotingOver]);

  useEffect(() => {
    displayOrderRef.current = displayOrder;
  }, [displayOrder]);

  const clearPendingAnimations = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    teleportTimelineRef.current?.kill();
    teleportTimelineRef.current = null;
  }, []);

  const runTeleportSequence = useCallback(
    (
      newOrder: string[],
      runId: number,
      previousOrder: string[],
      hasDouzePointsAnimation: boolean,
      shouldAnimateByCode: Record<string, boolean>,
    ) => {
      const continueWithQueuedOrFinish = (
        completedOrder: string[],
        completedHasDouzePointsAnimation: boolean,
      ) => {
        if (runId !== animationRunIdRef.current) return;

        const queuedUpdate = queuedTeleportUpdateRef.current;
        if (queuedUpdate) {
          queuedTeleportUpdateRef.current = null;

          if (!areOrdersEqual(queuedUpdate.order, completedOrder)) {
            animationRunIdRef.current += 1;
            const nextRunId = animationRunIdRef.current;
            timeoutRef.current = setTimeout(() => {
              runTeleportSequence(
                queuedUpdate.order,
                nextRunId,
                completedOrder,
                queuedUpdate.hasDouzePointsAnimation,
                queuedUpdate.shouldAnimateByCode,
              );
            }, TELEPORT_START_DELAY_MS);

            return;
          }

          completedHasDouzePointsAnimation =
            queuedUpdate.hasDouzePointsAnimation;
        }

        isTeleportCycleRunningRef.current = false;
        setBoardTeleportAnimationRunning(false);
        handleBoardTeleportAnimationComplete(completedHasDouzePointsAnimation);
      };

      const movedCodes = newOrder.filter(
        (code, index) => previousOrder[index] !== code,
      );
      const animatedMovedCodes = movedCodes.filter(
        (code) => shouldAnimateByCode[code],
      );
      const nextTeleportOnlyByCode: Record<string, boolean> = {};
      animatedMovedCodes.forEach((code) => {
        nextTeleportOnlyByCode[code] = true;
      });
      setTeleportOnlyByCode(nextTeleportOnlyByCode);

      if (movedCodes.length === 0) {
        displayOrderRef.current = newOrder;
        setDisplayOrder(newOrder);
        setTeleportStateByCode({});
        setTeleportOnlyByCode({});
        continueWithQueuedOrFinish(newOrder, hasDouzePointsAnimation);

        return;
      }

      // When no moved country received points, we should only do FLIP movement.
      // Avoid creating a no-op timeline that can leave the cycle locked.
      if (animatedMovedCodes.length === 0) {
        displayOrderRef.current = newOrder;
        setDisplayOrder(newOrder);
        setTeleportStateByCode({});
        setTeleportOnlyByCode({});
        continueWithQueuedOrFinish(newOrder, hasDouzePointsAnimation);

        return;
      }

      teleportTimelineRef.current?.kill();

      const timeline = gsap.timeline({
        onComplete: () => {
          if (runId !== animationRunIdRef.current) return;

          displayOrderRef.current = newOrder;
          setDisplayOrder(newOrder);
          setTeleportStateByCode({});
          setTeleportOnlyByCode({});
          teleportTimelineRef.current = null;
          continueWithQueuedOrFinish(newOrder, hasDouzePointsAnimation);
        },
      });
      teleportTimelineRef.current = timeline;

      const outOrder = sortBottomToTopByOrder(
        animatedMovedCodes,
        previousOrder,
      );
      const inOrder = sortBottomToTopByOrder(animatedMovedCodes, newOrder);
      const directionByCode: Record<string, TeleportDirection> = {};

      animatedMovedCodes.forEach((code) => {
        const previousIndex = previousOrder.indexOf(code);
        const newIndex = newOrder.indexOf(code);
        directionByCode[code] = newIndex < previousIndex ? 'up' : 'down';
      });

      const outStartDelay = TELEPORT_OUT_START_DELAY_MS / 1000;
      const inStartDelay = TELEPORT_IN_START_DELAY_MS / 1000;
      const inDuration = TELEPORT_IN_DURATION_MS / 1000;
      const outStaggerMs = getAdaptiveStaggerMs(
        outOrder.length,
        TELEPORT_OUT_PHASE_DURATION_MS,
        TELEPORT_OUT_START_DELAY_MS,
        TELEPORT_OUT_DURATION_MS,
        TELEPORT_OUT_PREFERRED_STAGGER_MS,
      );
      const inStaggerMs = getAdaptiveStaggerMs(
        inOrder.length,
        TELEPORT_IN_PHASE_DURATION_MS,
        TELEPORT_IN_START_DELAY_MS,
        TELEPORT_IN_DURATION_MS,
        TELEPORT_IN_PREFERRED_STAGGER_MS,
      );
      const outPhaseDurationMs =
        animatedMovedCodes.length > 0 ? TELEPORT_OUT_PHASE_DURATION_MS : 0;
      const outBlockDuration = outPhaseDurationMs / 1000;
      const flipStartAtSeconds =
        (outPhaseDurationMs * PHASE_OVERLAP_RATIO) / 1000;
      const fadeInPhaseStartAtSeconds =
        flipStartAtSeconds +
        (TELEPORT_FLIP_PHASE_DURATION_MS * PHASE_OVERLAP_RATIO) / 1000;

      outOrder.forEach((code) => {
        const itemStartTime = 0;
        const direction = directionByCode[code];

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            setTeleportStateByCode((previous) => ({
              ...previous,
              [code]: { phase: 'outStart', direction },
            }));
          },
          undefined,
          itemStartTime,
        );

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            setTeleportStateByCode((previous) => ({
              ...previous,
              [code]: { phase: 'out', direction },
            }));
          },
          undefined,
          itemStartTime + outStartDelay,
        );
      });

      timeline.call(
        () => {
          if (runId !== animationRunIdRef.current) return;

          displayOrderRef.current = newOrder;
          setDisplayOrder(newOrder);
        },
        undefined,
        flipStartAtSeconds,
      );

      inOrder.forEach((code) => {
        const itemStartTime = fadeInPhaseStartAtSeconds;
        const direction = directionByCode[code];

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            setTeleportStateByCode((previous) => ({
              ...previous,
              [code]: { phase: 'inStart', direction },
            }));
          },
          undefined,
          itemStartTime,
        );

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            setTeleportStateByCode((previous) => ({
              ...previous,
              [code]: { phase: 'in', direction },
            }));
          },
          undefined,
          itemStartTime + inStartDelay,
        );

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            setTeleportStateByCode((previous) => {
              const nextPhases = { ...previous };
              delete nextPhases[code];

              return nextPhases;
            });
          },
          undefined,
          itemStartTime + inStartDelay + inDuration,
        );
      });
      timeline.play(0);
    },
    [handleBoardTeleportAnimationComplete, setBoardTeleportAnimationRunning],
  );

  useEffect(() => {
    const newOrder = sortedCountries.map((c) => c.code);
    const currentOrder = displayOrderRef.current;
    const nextPointsByCode = getPointsByCode(sortedCountries);
    const previousPointsByCode = previousPointsByCodeRef.current;
    const shouldAnimateByCode: Record<string, boolean> = {};

    sortedCountries.forEach((country) => {
      const previousPoints =
        previousPointsByCode[country.code] ?? country.points;
      shouldAnimateByCode[country.code] = country.points > previousPoints;
    });
    previousPointsByCodeRef.current = nextPointsByCode;

    if (areOrdersEqual(newOrder, currentOrder)) {
      if (
        boardItemAnimationMode === 'teleport' &&
        shouldResetLastPointsAfterTeleport &&
        !isTeleportCycleRunningRef.current
      ) {
        handleBoardTeleportAnimationComplete(isDouzePointsAwarded);
      }
      return;
    }

    if (boardItemAnimationMode === 'flip') {
      isTeleportCycleRunningRef.current = false;
      queuedTeleportUpdateRef.current = null;
      clearPendingAnimations();
      setBoardTeleportAnimationRunning(false);
      timeoutRef.current = setTimeout(() => {
        setDisplayOrder(newOrder);
      }, flipMoveDelay);
      return;
    }

    if (isTeleportCycleRunningRef.current) {
      queuedTeleportUpdateRef.current = {
        order: newOrder,
        hasDouzePointsAnimation: isDouzePointsAwarded,
        shouldAnimateByCode,
      };
      return;
    }

    clearPendingAnimations();
    animationRunIdRef.current += 1;
    const runId = animationRunIdRef.current;
    const previousOrder = [...displayOrderRef.current];
    isTeleportCycleRunningRef.current = true;
    queuedTeleportUpdateRef.current = null;
    setBoardTeleportAnimationRunning(true);
    timeoutRef.current = setTimeout(() => {
      runTeleportSequence(
        newOrder,
        runId,
        previousOrder,
        isDouzePointsAwarded,
        shouldAnimateByCode,
      );
    }, flipMoveDelay);
  }, [
    sortedCountries,
    flipMoveDelay,
    boardItemAnimationMode,
    clearPendingAnimations,
    handleBoardTeleportAnimationComplete,
    isDouzePointsAwarded,
    runTeleportSequence,
    setBoardTeleportAnimationRunning,
    shouldResetLastPointsAfterTeleport,
  ]);

  useEffect(() => {
    return () => {
      animationRunIdRef.current += 1;
      clearPendingAnimations();
      isTeleportCycleRunningRef.current = false;
      queuedTeleportUpdateRef.current = null;
      setTeleportStateByCode({});
      setTeleportOnlyByCode({});
      setBoardTeleportAnimationRunning(false);
    };
  }, [clearPendingAnimations, setBoardTeleportAnimationRunning]);

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

  const getCountryAnimationClassName = useCallback(
    (countryCode: string) => {
      if (boardItemAnimationMode !== 'teleport') return '';

      const teleportState = teleportStateByCode[countryCode];
      if (!teleportState) return '';

      const transitionClass =
        'transition-all duration-[400ms] ease-out will-change-transform will-change-opacity';
      const startOffsetClass =
        teleportState.direction === 'up'
          ? 'translate-y-[6px]'
          : '-translate-y-[6px]';

      if (teleportState.phase === 'outStart') {
        return `opacity-100 ${startOffsetClass}`;
      }

      if (teleportState.phase === 'out') {
        return `${transitionClass} opacity-0 translate-y-0`;
      }

      if (teleportState.phase === 'inStart') {
        return `opacity-0 ${startOffsetClass}`;
      }

      return `${transitionClass} opacity-100 translate-y-0`;
    },
    [boardItemAnimationMode, teleportStateByCode],
  );

  const shouldUseFlipAnimationForCountry = useCallback(
    (countryCode: string) => {
      if (boardItemAnimationMode !== 'teleport') return true;

      return !teleportOnlyByCode[countryCode];
    },
    [boardItemAnimationMode, teleportOnlyByCode],
  );

  return {
    delayedSortedCountries,
    finalCountries,
    showPlace,
    flipKey,
    containerRef,
    isTeleportAnimationEnabled: boardItemAnimationMode === 'teleport',
    getCountryAnimationClassName,
    shouldUseFlipAnimationForCountry,
  };
};
