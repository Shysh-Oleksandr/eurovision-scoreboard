import { useTranslations } from 'next-intl';
import React from 'react';

import { StageVotingMode } from '@/models';

interface VoterChannelsPausedNoteProps {
  votingMode: StageVotingMode;
}

/**
 * Shown on the Voters tab when the stage keeps non-default channel settings but
 * its voting mode is not Jury and Televote, where per-voter channels are paused.
 */
export const VoterChannelsPausedNote: React.FC<
  VoterChannelsPausedNoteProps
> = ({ votingMode }) => {
  const t = useTranslations('setup.eventStageModal');

  const modeLabel =
    votingMode === StageVotingMode.JURY_ONLY
      ? t('juryOnly')
      : votingMode === StageVotingMode.COMBINED
      ? t('combined')
      : t('televoteOnly');

  return (
    <div className="flex items-start gap-2.5 px-[13px] py-[11px] rounded-xl bg-black/30 border border-white/[0.16] text-[13.5px] font-semibold leading-[1.4] text-white/[0.66]">
      <span
        aria-hidden
        className="flex-none mt-px w-[17px] h-[17px] rounded-full border-[1.5px] grid place-items-center text-[11px] font-extrabold leading-none text-white/80 border-white/60"
      >
        i
      </span>
      <span>
        {t.rich('voterChannelsPaused', {
          mode: modeLabel,
          juryAndTelevote: t('juryAndTelevote'),
          b: (chunks) => (
            <b className="text-white/90 font-extrabold">{chunks}</b>
          ),
        })}
      </span>
    </div>
  );
};
