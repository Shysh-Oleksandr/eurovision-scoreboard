'use client';
import React from 'react';

import { useScoreboardStore } from '../../state/scoreboardStore';
import ConfettiShower from '../effects/confetti/ConfettiShower';

import { useGeneralStore } from '@/state/generalStore';

/**
 * The winner's confetti, drawn with the settings in Settings → Effects. Once
 * it has fallen, it's marked as shown so it doesn't play again on a reload.
 */
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

  if (
    !winnerCountry ||
    !showWinnerConfetti ||
    isWinnerAnimationAlreadyDisplayed
  )
    return null;

  return (
    <ConfettiShower
      key={winnerCountry.code}
      country={winnerCountry}
      onComplete={() => setIsWinnerAnimationAlreadyDisplayed(true)}
    />
  );
};

export default WinnerConfetti;
