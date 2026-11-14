'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import CrossfadeFlag from './CrossfadeFlag';
import { useRoundProgress } from './useRoundProgress';
import { VoterInfo } from './useVoterInfo';

import { VotingCountry } from '@/models';

interface WindowFrameProps {
  /** Flag shown full-bleed where the broadcast shows the spokesperson. */
  country?: VotingCountry;
  /** Replaces the flag (the televote reveal shows the value instead). */
  feature?: React.ReactNode;
  title: React.ReactNode;
  /** A sentence ("Semi-Final 1 is over"), not a name: no capitals. */
  sentenceTitle?: boolean;
  caption?: React.ReactNode;
  /** 0-1; omitted hides the line. */
  progress?: number;
  className?: string;
  /** Sizes the picture (default: whatever height the frame leaves it). */
  windowClassName?: string;
}

/**
 * The spokesperson's window: a picture (the voter's flag) over a flat caption
 * bar, like the broadcast's "Malta, 15th of 26 countries". When the voter
 * changes only the flag and the caption change, in place.
 */
export const WindowFrame = ({
  country,
  feature,
  title,
  sentenceTitle = false,
  caption,
  progress,
  className = '',
  windowClassName = 'flex-1 min-h-[150px]',
}: WindowFrameProps) => (
  <div className={`flex flex-col ${className}`}>
    <div
      className={`dp-sim-window relative overflow-hidden ${windowClassName}`}
    >
      {feature ?? <CrossfadeFlag country={country} />}
    </div>
    <div className="dp-sim-caption flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pt-[11px] pb-3">
      <span
        className={`min-w-0 font-extrabold leading-tight tracking-[-0.01em] text-white [overflow-wrap:anywhere] ${
          sentenceTitle ? 'text-[17px]' : 'text-[19px] uppercase'
        }`}
      >
        {title}
      </span>
      {caption && (
        <span className="text-[14px] font-semibold leading-tight text-white/75">
          {caption}
        </span>
      )}
    </div>
    {progress !== undefined && (
      // shrink-0: an empty 3px box would be the first thing a held column
      // squeezes away.
      <div className="dp-sim-progress h-[3px] shrink-0" aria-hidden="true">
        <i style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    )}
  </div>
);

interface VoterWindowProps {
  voter: VoterInfo;
  className?: string;
  windowClassName?: string;
}

export const useOrdinalCaption = (voter: VoterInfo) => {
  const t = useTranslations('simulation');

  return t.rich('ordinalOfCountries', {
    index: voter.index,
    length: voter.total,
    span: (chunks) => <>{chunks}</>,
  });
};

const VoterWindow = ({
  voter,
  className,
  windowClassName,
}: VoterWindowProps) => {
  const t = useTranslations('simulation');
  const progress = useRoundProgress(voter);
  const ordinal = useOrdinalCaption(voter);

  if (voter.phase === 'reveal') {
    return (
      <WindowFrame
        className={className}
        windowClassName={windowClassName}
        feature={
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[64px] font-black leading-none tracking-[-0.03em] text-white tabular-nums">
              {voter.points}
            </span>
          </div>
        }
        title={t('pointsGoTo', { count: voter.points })}
        caption={ordinal}
        progress={progress}
      />
    );
  }

  return (
    <WindowFrame
      className={className}
      windowClassName={windowClassName}
      country={voter.country}
      title={voter.country?.name ?? ''}
      caption={ordinal}
      progress={progress}
    />
  );
};

export default React.memo(VoterWindow);
