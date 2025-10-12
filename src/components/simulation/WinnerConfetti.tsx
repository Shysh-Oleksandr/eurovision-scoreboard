import React, { Suspense, useEffect, useState } from 'react';

import { useScoreboardStore } from '../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

const LazyConfetti = React.lazy(() => import('react-confetti'));

const PIECES = 300;
const CONFETTI_TIMEOUT = 10 * 1000;

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
];

const WinnerConfetti: React.FC = () => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.isWinnerAnimationAlreadyDisplayed,
  );
  const setIsWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.setIsWinnerAnimationAlreadyDisplayed,
  );
  const showWinnerConfetti = useGeneralStore(
    (state) => state.settings.showWinnerConfetti,
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [shouldRecycle, setShouldRecycle] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (winnerCountry) {
      setShowConfetti(true);
      setShouldRecycle(true);

      const timer = setTimeout(() => {
        setShouldRecycle(false);

        setTimeout(() => {
          setIsWinnerAnimationAlreadyDisplayed(true);
        }, CONFETTI_TIMEOUT);
      }, CONFETTI_TIMEOUT);

      return () => clearTimeout(timer);
    }
    setShowConfetti(false);
    setShouldRecycle(false);
  }, [winnerCountry, setIsWinnerAnimationAlreadyDisplayed]);

  const shouldRender =
    showConfetti && showWinnerConfetti && !isWinnerAnimationAlreadyDisplayed;

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <LazyConfetti
        width={windowDimensions.width}
        height={windowDimensions.height}
        recycle={shouldRecycle}
        numberOfPieces={PIECES}
        gravity={0.1}
        colors={CONFETTI_COLORS}
      />
    </Suspense>
  );
};

export default WinnerConfetti;
