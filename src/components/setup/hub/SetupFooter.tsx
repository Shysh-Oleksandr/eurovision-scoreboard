'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { PlayIcon } from '@/assets/icons/PlayIcon';
import Button from '@/components/common/Button';

type SetupFooterProps = {
  canClose: boolean;
  closeLabel: string;
  onClose: () => void;
  onStart: () => void;
};

/** Footer outside the scroll area: ghost Close (when a show is running) + accent Start CTA. */
const SetupFooter = ({
  canClose,
  closeLabel,
  onClose,
  onStart,
}: SetupFooterProps) => {
  const t = useTranslations();

  return (
    <div className="dp-surface-footer flex items-center gap-2.5 px-3.5 pt-[10px] 2cols:px-5 pb-[calc(10px+var(--modal-safe-bottom,0px))] z-30">
      {canClose && (
        <Button
          variant="ghost"
          size="xl"
          className="px-[22px] text-[13.5px]"
          onClick={onClose}
          snowEffect="middle"
        >
          {closeLabel}
        </Button>
      )}
      <Button
        variant="cta"
        size="xl"
        className="flex-1 justify-center gap-2.5 !uppercase !font-bold"
        onClick={onStart}
        snowEffect="right"
        Icon={<PlayIcon className="size-[19px]" />}
      >
        {t('common.start')}
      </Button>
    </div>
  );
};

export default SetupFooter;
