'use client';
import { Dices, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

const CHIP_CLASS =
  'dp-drawn-chip inline-flex items-center gap-[5px] h-6 px-[9px] rounded-full text-[11.5px] font-extrabold text-white flex-none select-none';

/**
 * "Drawn" badge on a semi whose line-up came from the allocation draw. With
 * `onShare` it is a button that opens the draw's share image.
 */
const DrawnChip: React.FC<{ onShare?: () => void }> = ({ onShare }) => {
  const t = useTranslations('setup.allocationDraw');

  if (!onShare) {
    return (
      <span className={CHIP_CLASS}>
        <Dices className="size-[13px]" />
        {t('drawnChip')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onShare}
      title={t('shareTitle')}
      aria-label={`${t('drawnChip')} · ${t('shareTitle')}`}
      className={`${CHIP_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
    >
      <Dices className="size-[13px]" aria-hidden="true" />
      {t('drawnChip')}
      <Share2 className="size-[12px] opacity-80" aria-hidden="true" />
    </button>
  );
};

export default DrawnChip;
