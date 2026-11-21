import { useTranslations } from 'next-intl';
import React from 'react';

interface VoterChannelsErrorBarProps {
  /** The channel that has no eligible voter. */
  channel: 'jury' | 'televote';
  /** Every voter back to both channels. */
  onGiveAllBoth: () => void;
  /** Switch the stage to the one channel that has voters. */
  onSwitchMode: () => void;
}

/**
 * Inline validation docked between the tabs and the footer while a Jury and
 * Televote stage has no voter for one of its channels; Start waits until it
 * is resolved. Both fixes are right here: every voter back to both channels,
 * or the stage switched to the channel that has voters.
 */
export const VoterChannelsErrorBar: React.FC<VoterChannelsErrorBarProps> = ({
  channel,
  onGiveAllBoth,
  onSwitchMode,
}) => {
  const t = useTranslations('setup');

  return (
    <div
      role="alert"
      className="dp-ss-error mx-3.5 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold leading-[1.4] 2cols:mx-5"
    >
      <span
        aria-hidden="true"
        className="dp-ss-error-dot grid size-5 flex-none place-items-center rounded-full text-[12px] font-extrabold leading-none"
      >
        !
      </span>
      <span className="min-w-[200px] flex-1 text-pretty">
        {t(
          channel === 'jury'
            ? 'stageSetup.noJuryVoter'
            : 'stageSetup.noTelevoteVoter',
        )}
      </span>
      <span className="ml-auto flex flex-none flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onGiveAllBoth}
          className="dp-ss-error-act h-9 rounded-lg px-3 text-[13px] font-extrabold"
        >
          {t('eventStageModal.giveAllVotersBoth')}
        </button>
        <button
          type="button"
          onClick={onSwitchMode}
          className="dp-ss-error-act h-9 rounded-lg px-3 text-[13px] font-extrabold"
        >
          {t(
            channel === 'jury'
              ? 'stageSetup.makeTelevoteOnly'
              : 'stageSetup.makeJuryOnly',
          )}
        </button>
      </span>
    </div>
  );
};
