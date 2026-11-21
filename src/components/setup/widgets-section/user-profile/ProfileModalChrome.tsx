'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

/**
 * The profile modals' header, the Themes and Contests libraries' frame: the
 * title, the views beside it from `2cols` (your own profile), and × to close.
 * There is no Close bar.
 */
export const ProfileHeader: React.FC<{
  title: string;
  titleId: string;
  onClose: () => void;
  /** Tabs beside the title from `2cols` (phones get them in a bottom bar). */
  tabs?: React.ReactNode;
}> = ({ title, titleId, onClose, tabs }) => {
  const t = useTranslations('common');

  return (
    <div className="flex h-[56px] flex-none items-center gap-4 pl-4 pr-1.5 2cols:h-[66px] 2cols:pl-[22px] 2cols:pr-3">
      <h2
        id={titleId}
        className="min-w-0 truncate text-[19px] font-extrabold tracking-[-0.024em] 2cols:text-[20px]"
      >
        {title}
      </h2>
      {tabs && <div className="hidden min-w-0 2cols:flex">{tabs}</div>}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="ml-auto grid size-11 flex-none place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X className="size-[22px]" aria-hidden="true" />
      </button>
    </div>
  );
};
