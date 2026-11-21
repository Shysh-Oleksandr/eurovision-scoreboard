'use client';

import React, { useRef } from 'react';

import { cn } from '@/helpers/utils';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { useReadableForegroundFromCssVar } from '@/theme/useReadableForegroundFromCssVar';

export type PredefinitionMode = 'detailed' | 'rank' | 'totals';

type ModeTab = { value: PredefinitionMode; label: string };

type Props = {
  modeTabs: ModeTab[];
  activeMode: PredefinitionMode;
  onModeChange: (mode: PredefinitionMode) => void;
  /** Per-tab controls, rendered between the tab group and Share. */
  contextualControls?: React.ReactNode;
  shareMenu: React.ReactNode;
  overflowMenu: React.ReactNode;
  kicker: string;
  title: string;
  /** Inline pill after the title (the points-system help on Detailed). */
  titleAdornment?: React.ReactNode;
};

/**
 * Command bar steps, roomiest first: one row; the tab's own controls on a
 * second row; then (phones) tabs stretched, Reset left to the ⋯ menu where
 * it also lives, and Share / Randomize as their icons.
 */
const BAR_STEPS = [{ bar: 'one' }, { bar: 'two' }, { bar: 'compact' }] as const;
const COMPACT_STEP = 2;

/**
 * The modal's fixed shell header: the command bar (mode tabs, per-tab
 * controls, Share, overflow) above the stage being authored.
 */
export const VotingPredefinitionHeader: React.FC<Props> = ({
  modeTabs,
  activeMode,
  onModeChange,
  contextualControls,
  shareMenu,
  overflowMenu,
  kicker,
  title,
  titleAdornment,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(barRef, BAR_STEPS);
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabColor = useReadableForegroundFromCssVar(
    tabsRef,
    '--twc-primary-700',
  );

  return (
    <div className="flex-none px-4 pt-4 sm:px-5">
      <div
        ref={barRef}
        className="dp-vp-head"
        {...fitStepAttributes(BAR_STEPS[step])}
      >
        <div
          ref={tabsRef}
          role="tablist"
          aria-label={kicker}
          className="dp-vp-head-tabs rounded-xl border border-white/10 bg-black/[0.26] p-1"
        >
          {modeTabs.map((tab) => {
            const isActive = tab.value === activeMode;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(tab.value)}
                className={cn(
                  'whitespace-nowrap rounded-[7px] px-[15px] py-[7px]',
                  'text-[13.5px] font-bold tracking-[-0.01em] transition-colors duration-200',
                  isActive
                    ? 'bg-gradient-to-b from-primary-700 to-primary-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-white/55 hover:text-white/75',
                )}
                style={isActive ? { color: activeTabColor } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="dp-vp-head-ctx">{contextualControls}</div>
        <div className="dp-vp-head-end">
          {shareMenu}
          {overflowMenu}
        </div>
      </div>

      <div className="mb-3 mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* On phones the stage name says enough; the modal's purpose is
            the tab group's accessible name either way. */}
        {step !== COMPACT_STEP && (
          <span className="text-[13px] font-semibold text-white/60">
            {kicker}
          </span>
        )}
        <h1 className="text-[20px] font-extrabold tracking-[-0.024em] sm:text-[24px]">
          {title}
        </h1>
        {titleAdornment}
      </div>
    </div>
  );
};

export default VotingPredefinitionHeader;
