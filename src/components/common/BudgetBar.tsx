import React from 'react';

/** Fixed (non-hue-derived) status colours, so "over budget" reads the same in every theme. */
const FILL_COLOR = {
  ok: 'bg-[#3ad29a]',
  warn: 'bg-[#e6b23c]',
  bad: 'bg-[#ff5d70]',
} as const;

interface BudgetBarProps {
  /** Channel label, e.g. "Jury budget". */
  title: string;
  /** Sum of the currently typed totals in this channel. */
  used: number;
  /** The channel budget: voters × sum(points system). */
  total: number;
  /** Formatted "used / total" caption. */
  usedLabel: string;
  /**
   * Forces the red state even when the sum fits — used when a single country's
   * target breaks the per-country cap, which no amount of budget can absorb.
   */
  isInfeasible?: boolean;
}

/**
 * A horizontal budget/feasibility bar for the totals-entry view. Green while the
 * typed totals sit comfortably under the channel budget, amber as they approach
 * it, red once the budget or a hard feasibility bound is broken.
 */
export const BudgetBar: React.FC<BudgetBarProps> = ({
  title,
  used,
  total,
  usedLabel,
  isInfeasible = false,
}) => {
  const ratio = total > 0 ? used / total : 0;
  const state =
    isInfeasible || used > total ? 'bad' : ratio > 0.9 ? 'warn' : 'ok';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px] font-bold">
        <span className="text-white/55">{title}</span>
        <span className="tabular-nums text-white">{usedLabel}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.09]">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ${FILL_COLOR[state]}`}
          style={{ width: `${Math.max(0, Math.min(ratio, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default BudgetBar;
