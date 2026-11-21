'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { PlayIcon } from '@/assets/icons/PlayIcon';
import Button from '@/components/common/Button';

interface StageSetupFooterProps {
  stageName: string;
  entries: number;
  voters: number;
  votingModeLabel: string;
  onCancel: () => void;
  onStart: () => void;
  startDisabled: boolean;
}

/**
 * The last look before the show: on the left the stage read back in one
 * line ("15 entries, 17 voters" and the voting mode), then a quiet Cancel and
 * Start, the one filled button. Phones keep only Start, under the thumb; ×
 * at the top closes.
 */
const StageSetupFooter: React.FC<StageSetupFooterProps> = ({
  stageName,
  entries,
  voters,
  votingModeLabel,
  onCancel,
  onStart,
  startDisabled,
}) => {
  const t = useTranslations('setup');
  const tCommon = useTranslations('common');

  return (
    <div className="dp-ss-foot flex flex-none items-center gap-2.5 px-3.5 pb-[calc(10px+var(--modal-safe-bottom,0px))] pt-2.5 2cols:px-5">
      <p className="hidden min-w-0 flex-1 truncate text-[13.5px] font-bold text-white/70 2cols:block">
        <span className="text-white">
          {t('stageSetup.recap', { entries, voters })}
        </span>
        <span aria-hidden="true" className="dp-ss-recap-sep" />
        {votingModeLabel}
      </p>
      <div className="hidden flex-none 2cols:block">
        <Button
          variant="surface"
          size="lg"
          className="dp-act--quiet px-4"
          onClick={onCancel}
        >
          {tCommon('cancel')}
        </Button>
      </div>
      <Button
        variant="cta"
        size="lg"
        className="dp-ss-start min-w-0 flex-1 justify-center gap-2 !uppercase !font-bold 2cols:flex-[0_1_360px]"
        onClick={onStart}
        disabled={startDisabled}
        Icon={<PlayIcon className="size-4 flex-none" />}
        shortcut="startStage"
      >
        <span className="truncate">
          {t('eventStageModal.startStage', { stageName })}
        </span>
      </Button>
    </div>
  );
};

export default StageSetupFooter;
