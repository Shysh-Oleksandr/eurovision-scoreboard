import { useTranslations } from 'next-intl';
import React from 'react';

import { VoterChannelMode } from '@/models';

interface VoterChannelBadgeProps {
  mode: VoterChannelMode;
}

/**
 * Chip badge shown only when a voter's channel is not the default. Lives in the
 * chip's overhanging badge row next to the status badge; it never shrinks — in
 * a tight row the label drops "only" (see `.voter-channel-badge-*` in
 * styles.css) and the full text stays in the tooltip.
 */
export const VoterChannelBadge: React.FC<VoterChannelBadgeProps> = ({
  mode,
}) => {
  const t = useTranslations('setup.eventStageModal');

  if (mode === 'both') return null;

  const full =
    mode === 'jury' ? t('channelJuryOnly') : t('channelTelevoteOnly');
  const short = mode === 'jury' ? t('jury') : t('televote');

  return (
    <span
      className={`voter-channel-badge voter-channel-badge--${mode} flex-none pointer-events-auto px-1.5 rounded-[5px] border bg-black/70 text-[10px] leading-[18px] font-extrabold text-white/90 whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.45)]`}
      style={{ borderColor: 'hsl(var(--twc-primary-700))' }}
      title={full}
    >
      <span className="voter-channel-badge-full">{full}</span>
      <span className="voter-channel-badge-short">{short}</span>
    </span>
  );
};
