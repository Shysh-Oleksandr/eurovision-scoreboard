import gsap from 'gsap';
import { useLayoutEffect, useMemo, useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { playThemeSound } from '@/theme/playThemeSound';
import { DouzePointsAnimationMode } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

type ReturnType = {
  lastPointsContainerRef: React.RefObject<HTMLDivElement | null>;
  lastPointsTextRef: React.RefObject<HTMLDivElement | null>;
};

function clearLastPointsGsapStyles(
  ...elements: (HTMLElement | null | undefined)[]
) {
  const targets = elements.filter(Boolean) as HTMLElement[];

  if (targets.length === 0) return;

  gsap.killTweensOf(targets);
  gsap.set(targets, { clearProps: 'all' });
}

const useAnimatePoints = ({
  shouldShowLastPoints,
  isDouzePoints,
  douzePointsRefs,
  douzePointsAnimationModeOverride,
  isThemePreview = false,
  lastPointsAnimationDirection = 'right-to-left',
  pointsLayoutKey = '',
}: {
  shouldShowLastPoints: boolean;
  isDouzePoints: boolean;
  douzePointsRefs: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parallelogramBlueRef: React.RefObject<HTMLDivElement | null>;
    parallelogramYellowRef: React.RefObject<HTMLDivElement | null>;
  } | null;
  douzePointsAnimationModeOverride?: DouzePointsAnimationMode;
  /** When true, skip custom theme sounds (e.g. customize-theme modal preview). */
  isThemePreview?: boolean;
  /**
   * `right-to-left`: last-points block enters from the right (legacy).
   * `left-to-right`: enters from the left (rounded pill layout).
   */
  lastPointsAnimationDirection?: 'right-to-left' | 'left-to-right';
  /** Changes when theme/layout specifics change (clears stale GSAP inline styles). */
  pointsLayoutKey?: string;
}): ReturnType => {
  const lastPointsContainerRef = useRef<HTMLDivElement | null>(null);
  const lastPointsTextRef = useRef<HTMLDivElement | null>(null);
  /** Avoids playing douze SFX on every useGSAP re-run (e.g. Strict Mode or ref churn). */
  const douzePointsSoundPlayedForParallelogramsRef = useRef(false);
  const { douzePointsAnimationMode } = useThemeSpecifics();
  const resolvedDouzePointsAnimationMode =
    douzePointsAnimationModeOverride ?? douzePointsAnimationMode;

  useGSAP(
    () => {
      if (resolvedDouzePointsAnimationMode !== 'parallelograms') {
        douzePointsSoundPlayedForParallelogramsRef.current = false;

        return;
      }

      if (!douzePointsRefs?.containerRef.current) {
        return;
      }

      const { containerRef, parallelogramBlueRef, parallelogramYellowRef } =
        douzePointsRefs;

      if (!parallelogramBlueRef.current || !parallelogramYellowRef.current) {
        return;
      }

      if (isDouzePoints) {
        if (!douzePointsSoundPlayedForParallelogramsRef.current) {
          playThemeSound('douzePoints', { skip: isThemePreview });
          douzePointsSoundPlayedForParallelogramsRef.current = true;
        }
        gsap.to(containerRef.current, {
          opacity: 1,
          duration: 0.4,
          delay: 0.2,
          ease: 'cubic.inOut',
        });
        gsap.to(parallelogramBlueRef.current, {
          left: '120%',
          transform: 'skewX(-45deg)',
          duration: 1,
          ease: 'cubic.inOut',
        });
        gsap.to(parallelogramYellowRef.current, {
          left: '120%',
          transform: 'skewX(-45deg)',
          duration: 1,
          ease: 'cubic.inOut',
        });
      } else {
        douzePointsSoundPlayedForParallelogramsRef.current = false;
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.5,
          delay: 0.4,
          ease: 'cubic.inOut',
        });
        gsap.fromTo(
          parallelogramBlueRef.current,
          { left: '120%', transform: 'skewX(-45deg)' },
          {
            left: '-20%',
            transform: 'skewX(45deg)',
            duration: 1,
            ease: 'cubic.inOut',
          },
        );
        gsap.fromTo(
          parallelogramYellowRef.current,
          { left: '120%', transform: 'skewX(-45deg)' },
          {
            left: '-50%',
            transform: 'skewX(45deg)',
            duration: 1,
            ease: 'cubic.inOut',
          },
        );
      }
    },
    {
      dependencies: [
        isDouzePoints,
        douzePointsRefs,
        resolvedDouzePointsAnimationMode,
        isThemePreview,
      ],
      scope: douzePointsRefs?.containerRef,
    },
  );

  useLayoutEffect(() => {
    if (!pointsLayoutKey) return;

    clearLastPointsGsapStyles(
      lastPointsContainerRef.current,
      lastPointsTextRef.current,
    );
  }, [pointsLayoutKey]);

  useGSAP(
    () => {
      if (!lastPointsContainerRef.current || !lastPointsTextRef.current) return;

      clearLastPointsGsapStyles(
        lastPointsContainerRef.current,
        lastPointsTextRef.current,
      );

      const enterFrom =
        lastPointsAnimationDirection === 'left-to-right'
          ? { containerX: -36, textX: -15 }
          : { containerX: 36, textX: 15 };
      const exitTo =
        lastPointsAnimationDirection === 'left-to-right'
          ? { containerX: -36, textX: -15 }
          : { containerX: 36, textX: 15 };

      if (shouldShowLastPoints) {
        gsap.fromTo(
          lastPointsContainerRef.current,
          { opacity: 0, x: enterFrom.containerX },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power1.out' },
        );
        gsap.fromTo(
          lastPointsTextRef.current,
          { opacity: 0, x: enterFrom.textX },
          { opacity: 1, x: 0, duration: 0.35, ease: 'power1.out' },
        );
      } else {
        gsap.to(lastPointsContainerRef.current, {
          opacity: 0,
          x: exitTo.containerX,
          duration: 0.3,
          ease: 'power2.in',
        });
        gsap.to(lastPointsTextRef.current, {
          opacity: 0,
          x: exitTo.textX,
          duration: 0,
        });
      }
    },
    {
      dependencies: [
        shouldShowLastPoints,
        lastPointsAnimationDirection,
        pointsLayoutKey,
      ],
    },
  );

  return useMemo(
    () => ({
      lastPointsContainerRef,
      lastPointsTextRef,
    }),
    [],
  );
};

export default useAnimatePoints;
