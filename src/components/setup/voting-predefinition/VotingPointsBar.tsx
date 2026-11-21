import React, { useLayoutEffect, useRef, useState } from 'react';

import StatsFlag, {
  useFlagSettings,
} from '@/components/simulation/finalStats/StatsFlag';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import type { BaseCountry } from '@/models';

export type PointsChipState =
  /** Idle: the points system as a legend, nothing to pick yet. */
  | 'legend'
  /** Nobody has it. */
  | 'free'
  /** The selected cell has it. */
  | 'here'
  /** Another country has it. */
  | 'used'
  /** Whole-vote mode: the value the next tap gives. */
  | 'next';

export type PointsChip = {
  id: number;
  value: number;
  /** The code of who has it, shown under the value. */
  holder: string | null;
  label: string;
  state: PointsChipState;
};

type Props = {
  /** The voter the bar is about, if any. */
  voter: Pick<BaseCountry, 'code' | 'name' | 'flag'> | null;
  /** The readout, a hint or a notice. */
  text: React.ReactNode;
  chips: PointsChip[] | null;
  chipsLabel: string;
  onPick?: (pointsId: number) => void;
  actions?: React.ReactNode;
};

/** One row with labelled actions, else their icons only. */
const TOP_STEPS = [{ bar: 'labels' }, { bar: 'icons' }] as const;

/** A chip is never narrower than this; past that the chips take two rows. */
const MIN_CHIP = 30;
const CHIP_GAP = 4;

/**
 * Under the matrix: what the selected cell or voter is about ("Sweden gives
 * Israel 12 points"), then the voter's points as chips. A used value shows
 * who has it; picking it moves it to the selected cell. With nothing
 * selected the chips are the points system as a legend and the line is a
 * hint. The Total tab has the line only.
 */
export const VotingPointsBar: React.FC<Props> = ({
  voter,
  text,
  chips,
  chipsLabel,
  onPick,
  actions,
}) => {
  const flagSettings = useFlagSettings();
  const topRef = useRef<HTMLDivElement>(null);
  const step = useFitStep(topRef, TOP_STEPS);

  // Balanced rows: 10 chips on a phone are one row of 10 or two of 5, never
  // a row of 9 and an orphan.
  const chipsRef = useRef<HTMLDivElement>(null);
  const count = chips?.length ?? 0;
  const [columns, setColumns] = useState(count);

  useLayoutEffect(() => {
    const el = chipsRef.current;

    if (!el || count === 0) return undefined;

    const update = () => {
      const perRow = Math.max(
        1,
        Math.floor((el.clientWidth + CHIP_GAP) / (MIN_CHIP + CHIP_GAP)),
      );
      const rows = Math.ceil(count / perRow);

      setColumns(Math.ceil(count / rows));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(el);

    return () => observer.disconnect();
  }, [count]);

  return (
    <div className="dp-vp-bar dp-flat">
      <div
        ref={topRef}
        className="dp-vp-bar-top"
        {...fitStepAttributes(TOP_STEPS[step])}
      >
        {voter && (
          <StatsFlag country={voter} settings={flagSettings} size="sm" />
        )}
        <p className="dp-vp-readout" aria-live="polite">
          {text}
        </p>
        {actions && <div className="dp-vp-bar-actions">{actions}</div>}
      </div>
      {chips && (
        <div
          ref={chipsRef}
          role="group"
          aria-label={chipsLabel}
          className="dp-vp-chips"
          style={{ '--cols': columns } as React.CSSProperties}
        >
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="dp-vp-chip"
              data-state={chip.state}
              disabled={chip.state === 'legend'}
              aria-label={chip.label}
              aria-pressed={
                chip.state === 'legend' ? undefined : chip.state === 'here'
              }
              // Keeps the cell's field focused, so typing carries on.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick?.(chip.id)}
            >
              <span className="dp-vp-chip-v">{chip.value}</span>
              <span aria-hidden="true" className="dp-vp-chip-c">
                {chip.holder}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingPointsBar;
