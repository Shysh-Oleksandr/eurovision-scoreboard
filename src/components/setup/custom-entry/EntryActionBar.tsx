'use client';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import Button from '@/components/common/Button';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/**
 * Everything on one row while it fits; then Delete keeps only its icon;
 * then the leading action (Delete, Add another) takes its own row above
 * Cancel and Save.
 */
const BAR_STEPS = [{ bar: 'row' }, { bar: 'icon' }, { bar: 'stack' }] as const;

interface EntryActionBarProps {
  /** Left of Cancel: Delete when editing, Add another when creating. */
  leading?: React.ReactNode;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveDisabled: boolean;
}

/** The custom entry modal's footer: ModalBottomContent's bar with a fitted leading slot. */
const EntryActionBar: React.FC<EntryActionBarProps> = ({
  leading,
  onCancel,
  onSave,
  isSaving,
  saveDisabled,
}) => {
  const tCommon = useTranslations('common');
  const barRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(barRef, BAR_STEPS);

  return (
    <div className="bg-primary-900 px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5">
      <div
        ref={barRef}
        className="dp-entry-bar"
        {...fitStepAttributes(BAR_STEPS[step])}
      >
        {leading && <div className="dp-entry-bar-lead">{leading}</div>}
        <div className="dp-entry-bar-main">
          <Button
            variant="ghost"
            size="lg"
            className="dp-entry-bar-btn px-[18px]"
            onClick={onCancel}
            snowEffect="middle"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="cta"
            size="lg"
            className="dp-entry-bar-btn flex-1 min-w-0 justify-center gap-2 !uppercase !font-bold"
            onClick={onSave}
            isLoading={isSaving}
            disabled={isSaving || saveDisabled}
            snowEffect="right"
          >
            {tCommon('save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EntryActionBar;
