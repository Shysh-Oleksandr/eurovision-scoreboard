import gsap from 'gsap';
import { useMemo, useRef } from 'react';

import { useGSAP } from '@gsap/react';

type ReturnType = {
  lastPointsContainerRef: React.RefObject<HTMLDivElement | null>;
  lastPointsTextRef: React.RefObject<HTMLDivElement | null>;
};

const useAnimatePoints = ({
  shouldShowLastPoints,
  isDouzePoints,
  douzePointsRefs,
}: {
  shouldShowLastPoints: boolean;
  isDouzePoints: boolean;
  douzePointsRefs: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parallelogramBlueRef: React.RefObject<HTMLDivElement | null>;
    parallelogramYellowRef: React.RefObject<HTMLDivElement | null>;
  } | null;
}): ReturnType => {
  const lastPointsContainerRef = useRef<HTMLDivElement | null>(null);
  const lastPointsTextRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!douzePointsRefs?.containerRef.current) {
        return;
      }

      const { containerRef, parallelogramBlueRef, parallelogramYellowRef } =
        douzePointsRefs;

      if (isDouzePoints) {
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
      dependencies: [isDouzePoints, douzePointsRefs],
      scope: douzePointsRefs?.containerRef,
    },
  );

  useGSAP(
    () => {
      if (!lastPointsContainerRef.current || !lastPointsTextRef.current) return;

      if (shouldShowLastPoints) {
        gsap.fromTo(
          lastPointsContainerRef.current,
          { opacity: 0, x: 36 },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power1.out' },
        );
        gsap.fromTo(
          lastPointsTextRef.current,
          { opacity: 0, x: 15 },
          { opacity: 1, x: 0, duration: 0.35, ease: 'power1.out' },
        );
      } else {
        gsap.to(lastPointsContainerRef.current, {
          opacity: 0,
          x: 36,
          duration: 0.3,
          ease: 'power2.in',
        });
        gsap.to(lastPointsTextRef.current, {
          opacity: 0,
          x: 15,
          duration: 0,
        });
      }
    },
    {
      dependencies: [shouldShowLastPoints],
      scope: lastPointsContainerRef,
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
