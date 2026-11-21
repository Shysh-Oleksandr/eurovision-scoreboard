import { useTranslations } from 'next-intl';
import React, { useCallback, useLayoutEffect, useRef } from 'react';

import StatsFlag, {
  useFlagSettings,
} from '@/components/simulation/finalStats/StatsFlag';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { cn } from '@/helpers/utils';
import { useHasFinePointer } from '@/hooks/useHasFinePointer';
import type { BaseCountry } from '@/models';

export type VoterValidity = 'valid' | 'invalid' | 'incomplete' | null;

/** A cell of the matrix: participant (row) and voter (column) codes. */
export type MatrixCell = { p: string; v: string };

/** The crosshair: a row and column index, either may be unset. */
type Focus = { r: number | null; c: number | null };

const NO_FOCUS: Focus = { r: null, c: null };

/** The strongest shade (the top value) is white at this %, as in Breakdown. */
const MAX_SHADE = 26;

type Country = Pick<BaseCountry, 'code' | 'name' | 'flag'>;

type Props = {
  rankedCountries: Array<Country & { rank: number }>;
  votingCountries: Country[];
  /** Sports-style codes for every participant and voter. */
  codes: Record<string, string>;
  /** False on the read-only Total tab. */
  isEditable: boolean;
  /** The "Always show full country names" setting: never swap in codes. */
  showFullNames: boolean;
  /** The most one cell can hold, for the shading. */
  cellTop: number;
  getVoterValidity: (voterCode: string) => VoterValidity;
  getTotalPointsForCountry: (countryCode: string) => number;
  getCellValue: (participantCode: string, voterCode: string) => number;
  /** What a cell's field shows: the typed text while editing, else its points. */
  valueForCell: (participantCode: string, voterCode: string) => string;
  onChangeCell: (cell: MatrixCell, value: string) => void;
  onCommitCell: (cell: MatrixCell, value: string) => void;
  selected: MatrixCell | null;
  onSelectCell: (cell: MatrixCell) => void;
  /** The voter whose whole vote is being given, if any. */
  ballotVoter: string | null;
  /** The value the next tap gives in whole-vote mode. */
  nextPoints: number | null;
  onVoterClick: (voterCode: string) => void;
  onBallotTap: (participantCode: string) => void;
  tableRef?: (el: HTMLTableElement | null) => void;
  scrollerRef?: React.Ref<HTMLDivElement>;
};

/**
 * The Detailed tab's points matrix: participants down, voters across, in the
 * stats Breakdown's look (codes under the voters' flags, white shading that
 * grows with the points, the top value in the accent). The header row and
 * the place / country / total column stay pinned while the rest scrolls.
 *
 * Editing: with a mouse or trackpad every cell is a field (type, then Enter
 * or the arrows to move; the points bar takes clicks too); on touch screens a
 * cell is a button that selects it for the points bar, so no keyboard opens.
 * A voter's flag starts their whole vote: each tap on a row then gives the
 * next value.
 */
export const VotingPredefinitionTable: React.FC<Props> = ({
  rankedCountries,
  votingCountries,
  codes,
  isEditable,
  showFullNames,
  cellTop,
  getVoterValidity,
  getTotalPointsForCountry,
  getCellValue,
  valueForCell,
  onChangeCell,
  onCommitCell,
  selected,
  onSelectCell,
  ballotVoter,
  nextPoints,
  onVoterClick,
  onBallotTap,
  tableRef,
  scrollerRef,
}) => {
  const tSetup = useTranslations('setup.votingPredefinition');
  const flagSettings = useFlagSettings();
  const isFinePointer = useHasFinePointer();
  const localTableRef = useRef<HTMLTableElement | null>(null);

  const validityLabel = (validity: VoterValidity) => {
    if (validity === 'valid') return tSetup('validityComplete');
    if (validity === 'invalid') return tSetup('validityInvalid');

    return tSetup('validityIncomplete');
  };

  const selectedRow = selected
    ? rankedCountries.findIndex((country) => country.code === selected.p)
    : -1;
  const selectedCol = selected
    ? votingCountries.findIndex((voter) => voter.code === selected.v)
    : -1;
  const selectedFocus: Focus =
    selectedRow >= 0 && selectedCol >= 0
      ? { r: selectedRow, c: selectedCol }
      : NO_FOCUS;

  // --- Crosshair: classes toggled on the DOM (as in Breakdown), so pointing
  // doesn't re-render ~1,000 cells. It follows the mouse while it's over the
  // table and rests on the selected cell otherwise.
  const hoverRef = useRef<Focus | null>(null);
  const shownRef = useRef<Focus>(NO_FOCUS);

  const paintFocus = useCallback((next: Focus) => {
    const table = localTableRef.current;

    if (!table) return;

    table
      .querySelectorAll('.is-hl')
      .forEach((el) => el.classList.remove('is-hl'));
    if (next.r !== null) {
      table
        .querySelector(`tbody tr[data-r="${next.r}"]`)
        ?.classList.add('is-hl');
    }
    if (next.c !== null) {
      table
        .querySelectorAll(`[data-c="${next.c}"]`)
        .forEach((el) => el.classList.add('is-hl'));
    }
    shownRef.current = next;
  }, []);

  // After every render: React rewrites a cell's class when its points change,
  // which drops the crosshair's.
  useLayoutEffect(() => {
    paintFocus(hoverRef.current ?? selectedFocus);
  });

  const focusFromTarget = (target: EventTarget): Focus | null => {
    const cell = (target as Element).closest?.('th, td');

    if (!cell || !localTableRef.current?.contains(cell)) return null;

    const row = cell.closest('tr[data-r]') as HTMLElement | null;
    const col = (cell as HTMLElement).dataset.c;

    return {
      r: row ? Number(row.dataset.r) : null,
      c: col !== undefined ? Number(col) : null,
    };
  };

  const handlePointerOver = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;

    const next = focusFromTarget(event.target);

    if (!next) return;
    hoverRef.current = next;
    if (next.r !== shownRef.current.r || next.c !== shownRef.current.c) {
      paintFocus(next);
    }
  };

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    hoverRef.current = null;
    paintFocus(selectedFocus);
  };

  // --- Keyboard: Enter and the arrows walk the fields, skipping a country's
  // own cell. Leaving a field commits it (on blur).
  const moveFrom = (r: number, c: number, dr: number, dc: number) => {
    const table = localTableRef.current;

    if (!table) return false;

    let cc = c + dc;
    let rr = r + dr;

    while (
      rr >= 0 &&
      rr < rankedCountries.length &&
      cc >= 0 &&
      cc < votingCountries.length
    ) {
      const input = table.querySelector<HTMLInputElement>(
        `tbody tr[data-r="${rr}"] > td[data-c="${cc}"] input`,
      );

      if (input) {
        input.focus();

        return true;
      }

      rr += dr;
      cc += dc;
    }

    return false;
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    const steps: Record<string, [number, number]> = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      Enter: event.shiftKey ? [-1, 0] : [1, 0],
    };
    const step = steps[event.key];

    if (!step) return;

    event.preventDefault();
    if (!moveFrom(r, c, step[0], step[1]) && event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const shadeOf = (value: number) =>
    cellTop > 0
      ? Math.round(MAX_SHADE * Math.min(1, value / cellTop) ** 1.6 * 10) / 10
      : 0;

  const cellClass = (value: number) =>
    value > 0 && value >= cellTop
      ? 'is-top'
      : cellTop > 0 && value / cellTop >= 0.66
      ? 'is-strong'
      : undefined;

  return (
    <div
      ref={scrollerRef}
      className="dp-vp-scroll narrow-scrollbar min-h-0 flex-1"
    >
      <table
        ref={(el) => {
          localTableRef.current = el;
          tableRef?.(el);
        }}
        className="dp-vp-matrix"
        data-names={showFullNames ? 'full' : 'auto'}
        data-input={isFinePointer ? 'fine' : 'touch'}
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
      >
        <thead>
          <tr>
            <th scope="col" className="dp-vp-rowhead dp-vp-corner">
              <span className="dp-vp-rowhead-in">
                <span className="dp-vp-place" />
                <span className="min-w-0 flex-1 text-left">
                  {tSetup('participantColumn')}
                </span>
              </span>
            </th>
            {votingCountries.map((voter, c) => {
              const validity = isEditable ? getVoterValidity(voter.code) : null;
              const content = (
                <span className="dp-vp-voter-in">
                  <StatsFlag
                    country={voter}
                    settings={flagSettings}
                    size="sm"
                  />
                  <span className="dp-vp-voter-code-row">
                    <span aria-hidden="true" className="dp-vp-voter-code">
                      {codes[voter.code]}
                    </span>
                    {validity && (
                      <span
                        aria-hidden="true"
                        className="dp-vp-dot"
                        data-validity={validity}
                      />
                    )}
                  </span>
                </span>
              );

              return (
                <th
                  key={voter.code}
                  scope="col"
                  data-c={c}
                  className={cn(
                    'dp-vp-voter',
                    voter.code === ballotVoter && 'is-ballot',
                    c === selectedCol && 'is-sel',
                  )}
                  title={
                    validity
                      ? `${voter.name}: ${validityLabel(validity)}`
                      : voter.name
                  }
                >
                  {isEditable ? (
                    <button
                      type="button"
                      className="dp-vp-voter-btn"
                      aria-pressed={voter.code === ballotVoter}
                      aria-label={tSetup('voterHeaderLabel', {
                        voter: voter.name,
                      })}
                      onClick={() => onVoterClick(voter.code)}
                    >
                      {content}
                    </button>
                  ) : (
                    <>
                      {content}
                      <span className="sr-only">{voter.name}</span>
                    </>
                  )}
                </th>
              );
            })}
            <th aria-hidden="true" className="dp-vp-filler" />
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country, r) => (
            <tr key={country.code} data-r={r}>
              <th
                scope="row"
                className={cn('dp-vp-rowhead', r === selectedRow && 'is-sel')}
                onClick={
                  ballotVoter ? () => onBallotTap(country.code) : undefined
                }
              >
                <span className="dp-vp-rowhead-in">
                  <span className="dp-vp-place">{country.rank}</span>
                  <StatsFlag
                    country={country}
                    settings={flagSettings}
                    size="sm"
                  />
                  <span className="dp-vp-rowname">{country.name}</span>
                  <span aria-hidden="true" className="dp-vp-rowcode">
                    {codes[country.code]}
                  </span>
                  <span className="dp-vp-rowtotal">
                    {toFixedIfDecimalFloat(
                      getTotalPointsForCountry(country.code),
                    )}
                  </span>
                </span>
              </th>
              {votingCountries.map((voter, c) => {
                const isBallotCol = voter.code === ballotVoter;

                if (voter.code === country.code) {
                  return (
                    <td
                      key={voter.code}
                      data-c={c}
                      className={cn('is-self', isBallotCol && 'is-ballot')}
                    >
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">
                        {tSetup('cellSelf', { country: country.name })}
                      </span>
                    </td>
                  );
                }

                const value = getCellValue(country.code, voter.code);
                const cell = { p: country.code, v: voter.code };
                const isSelected = r === selectedRow && c === selectedCol;
                const label = `${country.name}, ${voter.name}`;
                const tdProps = {
                  'data-c': c,
                  className: cn(
                    cellClass(value),
                    isBallotCol && 'is-ballot',
                    isSelected && 'is-sel',
                  ),
                  style:
                    value > 0
                      ? ({ '--shade': shadeOf(value) } as React.CSSProperties)
                      : undefined,
                };

                if (!isEditable) {
                  return (
                    <td
                      key={voter.code}
                      {...tdProps}
                      onClick={() => onSelectCell(cell)}
                    >
                      {value > 0 ? toFixedIfDecimalFloat(value) : ''}
                    </td>
                  );
                }

                if (!isFinePointer) {
                  return (
                    <td key={voter.code} {...tdProps}>
                      <button
                        type="button"
                        className="dp-vp-cell"
                        aria-label={label}
                        aria-pressed={isSelected}
                        onClick={() =>
                          isBallotCol
                            ? onBallotTap(country.code)
                            : onSelectCell(cell)
                        }
                      >
                        {value > 0 ? toFixedIfDecimalFloat(value) : ''}
                      </button>
                    </td>
                  );
                }

                return (
                  <td
                    key={voter.code}
                    {...tdProps}
                    // Whole-vote mode: a click gives the next value instead of
                    // opening the field.
                    onMouseDown={
                      isBallotCol
                        ? (event) => event.preventDefault()
                        : undefined
                    }
                    onClick={
                      isBallotCol ? () => onBallotTap(country.code) : undefined
                    }
                  >
                    <input
                      className="dp-vp-cell"
                      value={valueForCell(country.code, voter.code)}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={
                        isBallotCol && nextPoints !== null
                          ? String(nextPoints)
                          : undefined
                      }
                      readOnly={isBallotCol}
                      tabIndex={isBallotCol ? -1 : undefined}
                      aria-label={label}
                      onFocus={(event) => {
                        event.currentTarget.select();
                        onSelectCell(cell);
                      }}
                      onKeyDown={(event) => handleKeyDown(event, r, c)}
                      onChange={(event) =>
                        onChangeCell(cell, event.target.value)
                      }
                      onBlur={(event) => onCommitCell(cell, event.target.value)}
                    />
                  </td>
                );
              })}
              <td aria-hidden="true" className="dp-vp-filler" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VotingPredefinitionTable;
