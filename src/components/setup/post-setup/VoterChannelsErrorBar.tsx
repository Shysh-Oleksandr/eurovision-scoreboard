import { useTranslations } from 'next-intl';
import React from 'react';

interface VoterChannelsErrorBarProps {
  /** The channel that has no eligible voter. */
  channel: 'jury' | 'televote';
  onFix: () => void;
}

/**
 * Inline validation docked between the modal body and its footer while a
 * Jury and Televote stage has no voter for one of its channels. Stays until
 * resolved; the "Give all voters both" action resets every voter to the default.
 */
export const VoterChannelsErrorBar: React.FC<VoterChannelsErrorBarProps> = ({
  channel,
  onFix,
}) => {
  const t = useTranslations('setup.eventStageModal');

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-[11px] gap-y-2 mx-3 xs:mx-5 md:mx-6 mb-3 px-3.5 py-3 rounded-xl text-[13.5px] font-bold leading-[1.4] text-[#ffe2dc]"
      style={{
        background:
          'linear-gradient(var(--badge-red-bg), var(--badge-red-bg)), #120704',
        border: '1px solid var(--badge-red-bd)',
      }}
    >
      <span
        aria-hidden
        className="flex-none w-5 h-5 rounded-full grid place-items-center text-xs font-extrabold leading-none text-white bg-[rgb(255,84,104)]"
      >
        !
      </span>
      <span className="flex-1 min-w-[200px]">
        {t.rich(channel === 'jury' ? 'noJuryVoter' : 'noTelevoteVoter', {
          b: (chunks) => <b className="text-white font-extrabold">{chunks}</b>,
        })}
      </span>
      <button
        type="button"
        onClick={onFix}
        className="ml-auto flex-none px-[11px] py-[7px] rounded-lg bg-white/[0.12] border border-white/20 text-[12.5px] font-extrabold text-white whitespace-nowrap transition-colors hover:bg-white/20"
      >
        {t('giveAllVotersBoth')}
      </button>
    </div>
  );
};
