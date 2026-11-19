'use client';
import { Play, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@/components/common/Button';
import ConfettiShower from '@/components/effects/confetti/ConfettiShower';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Plays the winner confetti over the settings with the current settings.
 * Changes made while it plays show up on the next pieces. "Flag" colours use
 * the current winner, else the hosting country.
 */
export const ConfettiPreviewItem: React.FC = () => {
  const t = useTranslations('settings.ui');
  const [run, setRun] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const hostingCountryCode = useGeneralStore(
    (state) => state.settings.hostingCountryCode,
  );
  const isFlagColors = useGeneralStore(
    (state) => state.settings.winnerConfettiColors === 'flag',
  );
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);

  const country = useMemo(
    () =>
      winnerCountry ??
      getAllCountries().find(
        (candidate) => candidate.code === hostingCountryCode,
      ) ??
      null,
    [winnerCountry, getAllCountries, hostingCountryCode],
  );

  const toggle = () => {
    if (!isPlaying) setRun((value) => value + 1);
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Button
        variant="surface"
        size="md"
        className="shrink-0"
        Icon={
          isPlaying ? (
            <Square size={14} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )
        }
        onClick={toggle}
      >
        {isPlaying ? t('winnerConfettiStop') : t('winnerConfettiPreview')}
      </Button>
      {isFlagColors && country && (
        <p className="min-w-0 text-[12.5px] text-white/50">
          {t('winnerConfettiPreviewFlag', { country: country.name })}
        </p>
      )}
      {isPlaying &&
        createPortal(
          <ConfettiShower
            key={run}
            country={country}
            overlay
            onComplete={() => setIsPlaying(false)}
          />,
          document.body,
        )}
    </div>
  );
};
