'use client';
import { ArrowLeftRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import Button from '@/components/common/Button';

/** Sticky tray at the bottom of the scroll area while multi-select is on. */
const SelectionTray: React.FC = () => {
  const t = useTranslations();
  const selectionMode = useSetupUiStore((state) => state.selectionMode);
  const selectedCount = useSetupUiStore((state) => state.selected.size);

  if (!selectionMode) return null;

  return (
    <div className="dp-tray sticky bottom-0 z-[12] flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-0.5 text-white">
      <span className="text-[13px] font-extrabold tabular-nums">
        {t('setup.eventSetupModal.selectedCount', { count: selectedCount })}
      </span>
      <Button
        variant="surface"
        size="sm"
        className="!h-[38px]"
        disabled={selectedCount === 0}
        Icon={<ArrowLeftRight className="size-4" />}
        onClick={(e) =>
          useSetupUiStore.getState().openMenu({ kind: 'tray' }, e.currentTarget)
        }
      >
        {t('setup.eventSetupModal.moveToEllipsis')}
      </Button>
      <Button
        variant="surface"
        size="sm"
        className="!h-[38px] ml-auto"
        onClick={() => useSetupUiStore.getState().clearSelection()}
      >
        {t('common.clear')}
      </Button>
      <Button
        variant="surface"
        size="sm"
        className="!h-[38px]"
        onClick={() => useSetupUiStore.getState().setSelectionMode(false)}
      >
        {t('common.done')}
      </Button>
    </div>
  );
};

export default SelectionTray;
