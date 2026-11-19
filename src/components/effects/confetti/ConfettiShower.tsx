'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { getConfettiPlan } from './confettiPlan';
import { useConfettiColors } from './useConfettiColors';

import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';

const LazyConfetti = dynamic(() => import('react-confetti'), {
  ssr: false,
});

/** Ends the shower even if the last pieces never report back. */
const SAFETY_MARGIN_MS = 20 * 1000;

interface ConfettiShowerProps {
  /** Whose flag the "Flag" colours come from. */
  country: BaseCountry | null;
  /** Every piece has fallen off the screen. Called once. */
  onComplete?: () => void;
  /** Fixed to the viewport above modals (the settings preview). */
  overlay?: boolean;
}

/**
 * One confetti shower drawn with the winner confetti settings: it rains for
 * the chosen duration, then the last pieces fall away and `onComplete` runs.
 * Remount it (a new `key`) to start again.
 */
const ConfettiShower: React.FC<ConfettiShowerProps> = ({
  country,
  onComplete,
  overlay = false,
}) => {
  const { amount, durationSeconds, speed, colorsMode } = useGeneralStore(
    useShallow((state) => ({
      amount: state.settings.winnerConfettiAmount,
      durationSeconds: state.settings.winnerConfettiDuration,
      speed: state.settings.winnerConfettiSpeed,
      colorsMode: state.settings.winnerConfettiColors,
    })),
  );
  const plan = getConfettiPlan({ amount, durationSeconds, speed });
  const colors = useConfettiColors(colorsMode, country);
  const isReady = colors !== null;
  const [recycle, setRecycle] = useState(true);
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const onCompleteRef = useRef(onComplete);
  const isDoneRef = useRef(false);

  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The clock starts once the colours are known, so it can't run out
  // before the first piece falls.
  useEffect(() => {
    if (!isReady) return undefined;

    const stopRain = setTimeout(() => setRecycle(false), plan.rainMs);
    const safety = setTimeout(finish, plan.rainMs + SAFETY_MARGIN_MS);

    return () => {
      clearTimeout(stopRain);
      clearTimeout(safety);
    };
  }, [isReady, plan.rainMs, finish]);

  if (!isReady) return null;

  return (
    <LazyConfetti
      width={size.width}
      height={size.height}
      recycle={recycle}
      numberOfPieces={plan.numberOfPieces}
      gravity={plan.gravity}
      initialVelocityY={plan.initialVelocityY}
      tweenDuration={plan.tweenDuration}
      colors={colors}
      onConfettiComplete={finish}
      style={overlay ? { position: 'fixed', zIndex: 1100 } : { zIndex: 1000 }}
    />
  );
};

export default ConfettiShower;
