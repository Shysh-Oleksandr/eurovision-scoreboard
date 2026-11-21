'use client';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import SegmentedTabs, { SegmentedTab } from '@/components/common/SegmentedTabs';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/**
 * Roomiest first: the tabs beside the title, then on their own row, then
 * with the short label for Running order, then also with less padding
 * (German and Greek on a phone). Phones always stack (styles.css), so only
 * the label steps apply there.
 */
const HEAD_STEPS = [
  { layout: 'row', tabs: 'full' },
  { layout: 'stack', tabs: 'full' },
  { layout: 'stack', tabs: 'short' },
  { layout: 'stack', tabs: 'tight' },
] as const;

interface StageSetupHeaderProps<T extends string> {
  title: string;
  titleId: string;
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  tabId: (value: T) => string;
  panelId: (value: T) => string;
  onClose: () => void;
}

/**
 * The libraries' header for the stage setup: the stage's name as the title,
 * the four tabs as the segmented well beside it and × to close. When they
 * don't fit on one row (a long stage name, a long language, a phone), the
 * tabs take a row of their own under the title.
 */
function StageSetupHeader<T extends string>({
  title,
  titleId,
  tabs,
  value,
  onChange,
  tabId,
  panelId,
  onClose,
}: StageSetupHeaderProps<T>) {
  const t = useTranslations('common');
  const rowRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(rowRef, HEAD_STEPS);

  return (
    <div className="dp-ss-head flex-none pl-4 pr-1.5 2cols:pl-[22px] 2cols:pr-3">
      <div
        ref={rowRef}
        className="dp-ss-head-row"
        {...fitStepAttributes(HEAD_STEPS[step])}
      >
        <h2
          id={titleId}
          className="dp-ss-title min-w-0 text-[19px] font-extrabold tracking-[-0.024em] 2cols:text-[20px]"
        >
          {title}
        </h2>
        <SegmentedTabs
          className="dp-ss-tabs flex"
          tabs={tabs}
          value={value}
          onChange={onChange}
          ariaLabelledBy={titleId}
          tabId={tabId}
          panelId={panelId}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="dp-ss-close grid size-11 flex-none place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-[22px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default StageSetupHeader;
