import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useGSAP } from '@gsap/react';

import { useReorderCountries } from '../../../hooks/useReorderCountries';
import { Country } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

export type BoardItemAnimationMode = 'flip' | 'teleport';

type TeleportAnimationPhase = 'outStart' | 'out' | 'inStart' | 'in';
type TeleportDirection = 'up' | 'down';
type ActiveTeleportPhase = {
  phase: TeleportAnimationPhase;
  direction: TeleportDirection;
};

const TELEPORT_OUT_DURATION_MS = 400;
const TELEPORT_IN_DURATION_MS = 400;
const TELEPORT_OUT_PHASE_DURATION_MS = 420;
const TELEPORT_FLIP_PHASE_DURATION_MS = 380;
const TELEPORT_IN_START_DELAY_MS = 40;
const TELEPORT_OUT_START_DELAY_MS = 16;
const TELEPORT_START_DELAY_MS = 0;
const COUNT_UP_DURATION_MS = 600; // must match CountUp duration in PointsSection
const PHASE_OVERLAP_RATIO = 0.7;

// Teleport phases write inline styles straight to the item DOM nodes (via the
// node registry below) instead of routing through React state: the visuals are
// identical to the old class flips, but a phase tick no longer re-renders the
// whole board subtree. Only opacity/transform ever change during a phase, so
// the transitions list them explicitly instead of `all`.
const buildTeleportTransition = (durationMs: number) =>
  `opacity ${durationMs}ms ease-out, transform ${durationMs}ms ease-out`;
const TELEPORT_TRANSITION_OUT = buildTeleportTransition(
  TELEPORT_OUT_DURATION_MS,
);
const TELEPORT_TRANSITION_IN = buildTeleportTransition(TELEPORT_IN_DURATION_MS);

const applyTeleportPhaseStyles = (
  node: HTMLElement,
  phase: TeleportAnimationPhase,
  direction: TeleportDirection,
) => {
  const startOffset = direction === 'up' ? '6px' : '-6px';

  // will-change is applied per phase (like the old class flips did), not
  // statically: a permanent will-change would make every row a stacking
  // context and paint the overflowing douze-hearts overlay under the
  // following rows.
  if (phase === 'outStart') {
    node.style.transition = '';
    node.style.willChange = '';
    node.style.opacity = '1';
    node.style.transform = `translateY(${startOffset})`;
  } else if (phase === 'out') {
    node.style.transition = TELEPORT_TRANSITION_OUT;
    node.style.willChange = 'transform, opacity';
    node.style.opacity = '0';
    node.style.transform = 'translateY(0px)';
  } else if (phase === 'inStart') {
    node.style.transition = '';
    node.style.willChange = '';
    node.style.opacity = '0';
    node.style.transform = `translateY(${startOffset})`;
  } else {
    node.style.transition = TELEPORT_TRANSITION_IN;
    node.style.willChange = 'transform, opacity';
    node.style.opacity = '1';
    node.style.transform = 'translateY(0px)';
  }
};

const clearTeleportStyles = (node: HTMLElement) => {
  node.style.transition = '';
  node.style.willChange = '';
  node.style.opacity = '';
  node.style.transform = '';
};

const areOrdersEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;

  return left.every((code, index) => code === right[index]);
};

const sortBottomToTopByOrder = (codes: string[], order: string[]) => {
  return [...codes].sort((leftCode, rightCode) => {
    return order.indexOf(rightCode) - order.indexOf(leftCode);
  });
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
  const itemNodesRef = useRef(new Map<string, HTMLElement>());
  const itemRefCallbacksRef = useRef(
    new Map<string, (node: HTMLElement | null) => void>(),
  );
  const teleportOnlyByCodeRef = useRef<Record<string, boolean>>({});
  /** Phase currently applied to each animated node — the source of truth for
   *  re-asserting inline styles after react-flip-toolkit wipes them. */
  const activeTeleportPhaseByCodeRef = useRef(
    new Map<string, ActiveTeleportPhase>(),
  );
  const boardItemAnimationModeRef = useRef(boardItemAnimationMode);
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
    pointsAwardedAt: number;
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

  /** Registry of item root nodes, keyed by country code (stable callbacks so
   *  memoized items don't re-render from ref identity churn). */
  const getItemRef = useCallback((code: string) => {
    let refCallback = itemRefCallbacksRef.current.get(code);

    if (!refCallback) {
      refCallback = (node: HTMLElement | null) => {
        if (node) {
          itemNodesRef.current.set(code, node);
        } else {
          itemNodesRef.current.delete(code);
        }
      };
      itemRefCallbacksRef.current.set(code, refCallback);
    }

    return refCallback;
  }, []);

  const clearAllTeleportItemStyles = useCallback(() => {
    Object.keys(teleportOnlyByCodeRef.current).forEach((code) => {
      const node = itemNodesRef.current.get(code);

      if (node) clearTeleportStyles(node);
    });
    teleportOnlyByCodeRef.current = {};
    activeTeleportPhaseByCodeRef.current.clear();
  }, []);

  // Mirrors the old mode check in getCountryAnimationClassName: when the mode
  // leaves 'teleport' mid-cycle (theme change, winner board), phase styles
  // vanish immediately while the timeline still runs to completion so its
  // side effects (queue handoff, last-points reset) fire exactly as before.
  useEffect(() => {
    boardItemAnimationModeRef.current = boardItemAnimationMode;

    if (boardItemAnimationMode !== 'teleport') {
      clearAllTeleportItemStyles();
    }
  }, [boardItemAnimationMode, clearAllTeleportItemStyles]);

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
            const elapsed = Date.now() - queuedUpdate.pointsAwardedAt;
            const countUpRemaining = Math.max(
              0,
              COUNT_UP_DURATION_MS - elapsed,
            );
            const queuedDelay = Math.max(
              TELEPORT_START_DELAY_MS,
              countUpRemaining,
            );

            timeoutRef.current = setTimeout(() => {
              runTeleportSequence(
                queuedUpdate.order,
                nextRunId,
                completedOrder,
                queuedUpdate.hasDouzePointsAnimation,
                queuedUpdate.shouldAnimateByCode,
              );
            }, queuedDelay);

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

      // Any styles a previous (killed) run left behind are stale now.
      clearAllTeleportItemStyles();

      // Nothing moved, or no moved country received points (FLIP-only move):
      // don't create a no-op timeline that can leave the cycle locked.
      if (animatedMovedCodes.length === 0) {
        displayOrderRef.current = newOrder;
        setDisplayOrder(newOrder);
        continueWithQueuedOrFinish(newOrder, hasDouzePointsAnimation);

        return;
      }

      const nextTeleportOnlyByCode: Record<string, boolean> = {};

      animatedMovedCodes.forEach((code) => {
        nextTeleportOnlyByCode[code] = true;
      });
      teleportOnlyByCodeRef.current = nextTeleportOnlyByCode;

      teleportTimelineRef.current?.kill();

      const timeline = gsap.timeline({
        onComplete: () => {
          if (runId !== animationRunIdRef.current) return;

          displayOrderRef.current = newOrder;
          setDisplayOrder(newOrder);
          clearAllTeleportItemStyles();
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
      const outPhaseDurationMs =
        animatedMovedCodes.length > 0 ? TELEPORT_OUT_PHASE_DURATION_MS : 0;
      const flipStartAtSeconds =
        (outPhaseDurationMs * PHASE_OVERLAP_RATIO) / 1000;
      const fadeInPhaseStartAtSeconds =
        flipStartAtSeconds +
        (TELEPORT_FLIP_PHASE_DURATION_MS * PHASE_OVERLAP_RATIO) / 1000;

      const applyPhaseToItem = (
        code: string,
        phase: TeleportAnimationPhase,
      ) => {
        if (runId !== animationRunIdRef.current) return;
        if (boardItemAnimationModeRef.current !== 'teleport') return;

        const direction = directionByCode[code];

        activeTeleportPhaseByCodeRef.current.set(code, { phase, direction });

        const node = itemNodesRef.current.get(code);

        if (!node) return;

        applyTeleportPhaseStyles(node, phase, direction);
      };

      outOrder.forEach((code) => {
        const itemStartTime = 0;

        timeline.call(
          () => applyPhaseToItem(code, 'outStart'),
          undefined,
          itemStartTime,
        );

        timeline.call(
          () => applyPhaseToItem(code, 'out'),
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

        timeline.call(
          () => applyPhaseToItem(code, 'inStart'),
          undefined,
          itemStartTime,
        );

        timeline.call(
          () => applyPhaseToItem(code, 'in'),
          undefined,
          itemStartTime + inStartDelay,
        );

        timeline.call(
          () => {
            if (runId !== animationRunIdRef.current) return;

            activeTeleportPhaseByCodeRef.current.delete(code);

            const node = itemNodesRef.current.get(code);

            if (node) clearTeleportStyles(node);
          },
          undefined,
          itemStartTime + inStartDelay + inDuration,
        );
      });
      timeline.play(0);
    },
    [
      clearAllTeleportItemStyles,
      handleBoardTeleportAnimationComplete,
      setBoardTeleportAnimationRunning,
    ],
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
      clearAllTeleportItemStyles();
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
        pointsAwardedAt: Date.now(),
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
    clearAllTeleportItemStyles,
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
      clearAllTeleportItemStyles();
      setBoardTeleportAnimationRunning(false);
    };
  }, [
    clearAllTeleportItemStyles,
    clearPendingAnimations,
    setBoardTeleportAnimationRunning,
  ]);

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

  // react-flip-toolkit wipes inline opacity/transform on every flipped element
  // when flipKey changes (to measure final positions) — including the rows a
  // running teleport cycle owns. Without re-asserting the in-flight phase the
  // moved row transitions back to visible at the mid-timeline reorder and then
  // fades in a second time when the in-phase starts. This runs in the same
  // commit as the Flipper update (child lifecycles first), so it lands after
  // the wipe and before paint.
  useLayoutEffect(() => {
    activeTeleportPhaseByCodeRef.current.forEach(
      ({ phase, direction }, code) => {
        const node = itemNodesRef.current.get(code);

        if (node) applyTeleportPhaseStyles(node, phase, direction);
      },
    );
  }, [flipKey]);

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

  const shouldUseFlipAnimationForCountry = useCallback(
    (countryCode: string) => {
      if (boardItemAnimationMode !== 'teleport') return true;

      return !teleportOnlyByCodeRef.current[countryCode];
    },
    [boardItemAnimationMode],
  );

  return {
    delayedSortedCountries,
    finalCountries,
    showPlace,
    flipKey,
    containerRef,
    isTeleportAnimationEnabled: boardItemAnimationMode === 'teleport',
    getItemRef,
    shouldUseFlipAnimationForCountry,
  };
};
