import { useTranslations } from 'next-intl';
import React from 'react';

import { NoteItem } from '../model/types';

import { InfoIcon } from '@/assets/icons/InfoIcon';

interface NoteProps {
  item: NoteItem;
}

export const Note: React.FC<NoteProps> = ({ item }) => {
  const t = useTranslations();

  return (
    <div className="mx-3 my-1 flex items-center gap-2 rounded-[9px] border border-white/10 bg-white/[0.05] px-3 py-2.5 text-[12.5px] font-medium text-white/60">
      <InfoIcon className="size-4 shrink-0" />
      <span>{t(item.labelKey ?? '')}</span>
    </div>
  );
};
