import { useTranslations } from 'next-intl';
import React from 'react';

import { SubheadItem } from '../model/types';

interface SubheadProps {
  item: SubheadItem;
}

export const Subhead: React.FC<SubheadProps> = ({ item }) => {
  const t = useTranslations();

  return (
    <div className="mt-5 mb-1 px-3 first:mt-1">
      <h4 className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-white/55">
        {t(item.labelKey ?? '')}
      </h4>
      {item.noteKey && (
        <p className="mt-1 text-[12px] text-white/40">{t(item.noteKey)}</p>
      )}
    </div>
  );
};
