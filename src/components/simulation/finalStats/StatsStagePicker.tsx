import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import AnchoredMenu from '@/components/common/AnchoredMenu';
import { EventStage } from '@/models';

interface StatsStagePickerProps {
  stages: EventStage[];
  selectedStageId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The stage whose stats show: its name as the view's title when only one
 * stage has finished, else a combo like the setup hub's ("Stage" caption
 * inside the control) with the finished stages in a menu.
 */
const StatsStagePicker = ({
  stages,
  selectedStageId,
  onSelect,
}: StatsStagePickerProps) => {
  const t = useTranslations('simulation.finalStats');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = stages.find((stage) => stage.id === selectedStageId);

  if (stages.length <= 1) {
    return (
      <h2 className="dp-stats-stage m-0 min-w-0 text-[17px] 2cols:text-[19px] font-extrabold tracking-[-0.02em] leading-tight text-balance">
        {selected?.name ?? stages[0]?.name}
      </h2>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="dp-stats-stage dp-combo flex items-center gap-3 h-[46px] 2cols:h-[44px] min-w-0 max-w-full rounded-xl pl-3.5 pr-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="min-w-0 flex flex-col gap-[3px] leading-none">
          <span className="truncate text-[12px] font-semibold text-white/75">
            {t('stage')}
          </span>
          <span className="truncate text-[15px] font-extrabold tracking-[-0.01em]">
            {selected?.name}
          </span>
        </span>
        <ChevronDown className="ml-auto size-4 flex-none text-white/55" />
      </button>
      <AnchoredMenu
        open={open}
        anchor={triggerRef.current}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        ariaLabel={t('stage')}
        items={stages.map((stage) => ({
          label: stage.name,
          onClick: () => onSelect(stage.id),
          trailing:
            stage.id === selectedStageId ? (
              <Check className="size-4 text-accent" />
            ) : null,
        }))}
      />
    </>
  );
};

export default StatsStagePicker;
