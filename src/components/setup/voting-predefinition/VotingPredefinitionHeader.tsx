'use client';

import React, { useRef } from 'react';

import { cn } from '@/helpers/utils';
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
 * The modal's fixed shell header: a wrapping command bar (mode tabs, per-tab
 * controls, Share, overflow) above a hero row naming the stage being authored.
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
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabColor = useReadableForegroundFromCssVar(
    tabsRef,
    '--twc-primary-700',
  );

  return (
    <div className="flex-none px-4 pt-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-[9px]">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label={kicker}
          className="flex flex-wrap mr-auto flex-none gap-0.5 rounded-xl border border-white/10 bg-black/[0.26] p-1"
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

        {contextualControls}
        {shareMenu}
        {overflowMenu}
      </div>

      <div className="mb-3 mt-3.5 flex flex-wrap items-baseline gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/40">
          {kicker}
        </span>
        <h1 className="text-[21px] font-extrabold tracking-[-0.025em] sm:text-[25px]">
          {title}
        </h1>
        {titleAdornment}
      </div>
    </div>
  );
};

export default VotingPredefinitionHeader;
