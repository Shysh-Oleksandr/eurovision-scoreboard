import { useTranslations } from 'next-intl';
import React, { useEffect, useRef } from 'react';

import { VoterChannelMode } from '@/models';
import { useReadableForegroundFromCssVar } from '@/theme/useReadableForegroundFromCssVar';

interface VoterChannelTogglesProps {
  mode: VoterChannelMode;
  onChange: (mode: VoterChannelMode) => void;
}

const CHANNELS = ['jury', 'televote'] as const;

const isChannelOn = (
  mode: VoterChannelMode,
  channel: (typeof CHANNELS)[number],
) => (channel === 'jury' ? mode !== 'televote' : mode !== 'jury');

const toggleChannel = (
  mode: VoterChannelMode,
  channel: (typeof CHANNELS)[number],
): VoterChannelMode => {
  const jury =
    channel === 'jury' ? !isChannelOn(mode, 'jury') : mode !== 'televote';
  const televote =
    channel === 'televote' ? !isChannelOn(mode, 'televote') : mode !== 'jury';

  if (jury && televote) return 'both';

  return jury ? 'jury' : 'televote';
};

const stopPropagation = (e: Event | React.SyntheticEvent) => {
  e.stopPropagation();
};

/**
 * The J / T pair shown on a voter chip in "voter channels" mode. The last
 * active channel is locked — a voter is excluded with the chip's × instead.
 */
export const VoterChannelToggles: React.FC<VoterChannelTogglesProps> = ({
  mode,
  onChange,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const ref = useRef<HTMLDivElement>(null);
  // Active fill is primary-700 → primary-800; flip the glyph dark on light themes.
  const activeColor = useReadableForegroundFromCssVar(ref, '--twc-primary-700');

  // The chip itself is the drag source (react-easy-sort listens to mousedown on
  // the item and to a native touchstart on the list), so keep toggle taps from
  // starting a drag.
  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    el.addEventListener('touchstart', stopPropagation, { passive: true });

    return () => el.removeEventListener('touchstart', stopPropagation);
  }, []);

  return (
    <div
      ref={ref}
      data-no-drag
      className="flex-none flex items-center gap-[3px] mr-0.5 cursor-default"
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
    >
      {CHANNELS.map((channel) => {
        const isOn = isChannelOn(mode, channel);
        const isLocked = isOn && mode !== 'both';
        const label =
          channel === 'jury' ? t('votesInJury') : t('votesInTelevote');

        return (
          <button
            key={channel}
            type="button"
            aria-pressed={isOn}
            aria-disabled={isLocked || undefined}
            aria-label={label}
            title={isLocked ? t('lastChannelLocked') : label}
            onClick={() => {
              if (!isLocked) onChange(toggleChannel(mode, channel));
            }}
            className={`relative w-[19px] h-[22px] rounded-md grid place-items-center text-[11px] font-extrabold leading-none transition-colors before:absolute before:-inset-y-[11px] before:-inset-x-[3px] before:content-[''] ${
              isOn
                ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                : 'bg-black/30 border border-white/[0.16] text-white/[0.42] hover:text-white/70'
            } ${
              isLocked
                ? 'cursor-not-allowed after:absolute after:inset-0 after:rounded-md after:border after:border-dashed after:border-black/35'
                : ''
            }`}
            style={
              isOn
                ? {
                    color: activeColor,
                    background: isLocked
                      ? 'hsl(var(--twc-primary-700) / 0.7)'
                      : 'linear-gradient(180deg, hsl(var(--twc-primary-700)), hsl(var(--twc-primary-800)))',
                    ...(isLocked ? { boxShadow: 'none', opacity: 0.85 } : {}),
                  }
                : undefined
            }
          >
            {channel === 'jury' ? 'J' : 'T'}
          </button>
        );
      })}
    </div>
  );
};
