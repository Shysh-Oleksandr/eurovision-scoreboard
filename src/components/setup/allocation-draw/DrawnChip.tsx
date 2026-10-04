'use client';
import { Dices } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

/** "Drawn" badge on a semi whose line-up came from the allocation draw. */
const DrawnChip: React.FC = () => {
  const t = useTranslations('setup.allocationDraw');

  return (
    <span className="dp-drawn-chip inline-flex items-center gap-[5px] h-6 px-[9px] rounded-full text-[11.5px] font-extrabold text-white flex-none select-none">
      <Dices className="size-[13px]" />
      {t('drawnChip')}
    </span>
  );
};

export default DrawnChip;
