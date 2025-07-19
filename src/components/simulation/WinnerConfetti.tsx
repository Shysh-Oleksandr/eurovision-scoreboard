import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

import { useScoreboardStore } from '../../state/scoreboardStore';

import { useGeneralStore } from '@/state/generalStore';

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
  const showWinnerConfetti = useGeneralStore(
    (state) => state.showWinnerConfetti,
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
      }, CONFETTI_TIMEOUT);

      return () => clearTimeout(timer);
    }
    setShowConfetti(false);
    setShouldRecycle(false);
  }, [winnerCountry]);

  if (!showConfetti || !showWinnerConfetti) return null;

  return (
    <Confetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={shouldRecycle}
      numberOfPieces={300}
      gravity={0.1}
      colors={CONFETTI_COLORS}
    />
  );
};

export default WinnerConfetti;
