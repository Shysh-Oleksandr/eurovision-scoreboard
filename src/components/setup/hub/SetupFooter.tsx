'use client';
import { Dices } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { PlayIcon } from '@/assets/icons/PlayIcon';
import Button from '@/components/common/Button';

type SetupFooterProps = {
  canClose: boolean;
  closeLabel: string;
  onClose: () => void;
  onStart: () => void;
  /** Countries waiting in the allocation draw: the CTA becomes "Go to the draw". */
  waitingCount?: number;
  onOpenDraw?: () => void;
};

/** Footer outside the scroll area: ghost Close (when a show is running) + accent Start CTA. */
const SetupFooter = ({
  canClose,
  closeLabel,
  onClose,
  onStart,
  waitingCount = 0,
  onOpenDraw,
}: SetupFooterProps) => {
  const t = useTranslations();
  const toDraw = waitingCount > 0 && !!onOpenDraw;

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
      {toDraw ? (
        <Button
          variant="cta"
          softGlow={false}
          size="xl"
          className="flex-1 justify-center gap-2.5 !uppercase !font-bold"
          onClick={onOpenDraw}
          snowEffect="right"
          Icon={<Dices className="size-5" />}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="truncate">
              {t('setup.allocationDraw.footerGoToDraw')}
            </span>
            <span className="dp-cta-count normal-case tracking-[.03em] text-[10.5px] 2cols:text-[11.5px] font-extrabold px-2 2cols:px-2.5 py-[3px] 2cols:py-1 rounded-full whitespace-nowrap">
              {t('setup.allocationDraw.subToBeDrawn', { count: waitingCount })}
            </span>
          </span>
        </Button>
      ) : (
        <Button
          variant="cta"
          softGlow={false}
          size="xl"
          className="flex-1 justify-center gap-2.5 !uppercase !font-bold"
          onClick={onStart}
          snowEffect="right"
          Icon={<PlayIcon className="size-[19px]" />}
        >
          {t('common.start')}
        </Button>
      )}
    </div>
  );
};

export default SetupFooter;
