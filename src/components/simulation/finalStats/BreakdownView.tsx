import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { buildStatsAccessors, StatsVoteType } from './statsAccessors';
import StatsFlag, { useFlagSettings } from './StatsFlag';
import { stageHasSplit } from './statsRankings';

import { getShortCodes } from '@/data/countries/shortCodes';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useChosenShortCodes } from '@/hooks/useChosenShortCodes';
import {
  Country,
  EventStage,
  StageVotingMode,
  StageVotingType,
  VotingCountry,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import type { StageVotes } from '@/state/scoreboard/types';

interface BreakdownViewProps {
  stage: EventStage;
  voteType: StatsVoteType;
  rankedCountries: (Country & { rank: number })[];
  getPoints: (country: Country) => number;
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  votes: Partial<StageVotes> | null | undefined;
}

/** What the readout line above the table describes. */
type Focus = { r: number | null; c: number | null };

const NO_FOCUS: Focus = { r: null, c: null };

/** The strongest shade (a 12, or 24 in Total) is white at this %. */
const MAX_SHADE = 26;

const toNumber = (value: string | number) =>
  typeof value === 'number' ? value : Number(value) || 0;

/**
 * Every voter × every entry. The scroll box is the table's own (both axes),
 * so the voters' row stays on top and the place / country / points column
 * stays on the left while the rest scrolls under them. Shading grows with
 * the points; the top value (a 12, or 24 for a jury and televote 12 in
 * Total) is in the accent. Pointing at (or tapping) a cell lights its row
 * and column and spells out the vote in the line above the table.
 */
const BreakdownView = ({
  stage,
  voteType,
  rankedCountries,
  getPoints,
  getCellPoints,
  votes,
}: BreakdownViewProps) => {
  const t = useTranslations('simulation.finalStats');
  const flagSettings = useFlagSettings();
  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  const voters: VotingCountry[] = getStageVotingCountries(stage.id, {
    channel:
      voteType === StageVotingType.JURY
        ? 'jury'
        : voteType === StageVotingType.TELEVOTE
        ? 'televote'
        : 'all',
  });
  const votersKey = voters.map((voter) => voter.code).join(',');

  const chosenShortCodes = useChosenShortCodes();
  const codes = useMemo(
    () => getShortCodes([...rankedCountries, ...voters], chosenShortCodes),
    // `voters` is rebuilt every render; its codes are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankedCountries, votersKey, chosenShortCodes],
  );

  // Per-channel lookups for the readout ("jury 12, televote 8") and for the
  // top value of a summed cell.
  const channels = useMemo(
    () => ({
      jury: buildStatsAccessors(stage, StageVotingType.JURY, votes),
      televote: buildStatsAccessors(stage, StageVotingType.TELEVOTE, votes),
    }),
    [stage, votes],
  );

  const hasSplit = stageHasSplit(stage);
  const isSummedTotal =
    voteType === 'Total' &&
    stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE;

  const matrix = useMemo(() => {
    const values = rankedCountries.map((country) =>
      voters.map((voter) =>
        voter.code === country.code
          ? 0
          : toNumber(getCellPoints(country.code, voter.code)),
      ),
    );
    const all = values.flat().filter((value) => value > 0);
    const channelMax = (lookup: typeof getCellPoints) =>
      Math.max(
        0,
        ...rankedCountries.flatMap((country) =>
          voters.map((voter) =>
            voter.code === country.code
              ? 0
              : toNumber(lookup(country.code, voter.code)),
          ),
        ),
      );
    // A summed cell's ceiling is a jury 12 plus a televote 12, whether or
    // not anyone got both.
    const top = isSummedTotal
      ? channelMax(channels.jury.getCellPoints) +
        channelMax(channels.televote.getCellPoints)
      : Math.max(0, ...all);

    return {
      values,
      top,
      min: all.length ? Math.min(...all) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedCountries, votersKey, getCellPoints, isSummedTotal, channels]);

  // --- Crosshair: classes toggled on the DOM, so 900 cells don't re-render
  // on every pointer move. The readout line is the only React update.
  const tableRef = useRef<HTMLTableElement>(null);
  const focusRef = useRef<Focus>(NO_FOCUS);
  const [focus, setFocus] = useState<Focus>(NO_FOCUS);

  const applyFocus = useCallback((next: Focus) => {
    const table = tableRef.current;
    const prev = focusRef.current;

    if (!table || (prev.r === next.r && prev.c === next.c)) return;

    if (prev.r !== next.r) {
      if (prev.r !== null)
        table
          .querySelector(`tbody tr[data-r="${prev.r}"]`)
          ?.classList.remove('is-hl');
      if (next.r !== null)
        table
          .querySelector(`tbody tr[data-r="${next.r}"]`)
          ?.classList.add('is-hl');
    }
    if (prev.c !== next.c) {
      if (prev.c !== null)
        table
          .querySelectorAll(`[data-c="${prev.c}"]`)
          .forEach((el) => el.classList.remove('is-hl'));
      if (next.c !== null)
        table
          .querySelectorAll(`[data-c="${next.c}"]`)
          .forEach((el) => el.classList.add('is-hl'));
    }

    focusRef.current = next;
    setFocus(next);
  }, []);

  const focusFromEvent = useCallback(
    (event: React.SyntheticEvent) => {
      const target = (event.target as Element).closest('th, td');

      if (!target || !tableRef.current?.contains(target)) return;

      const row = target.closest('tr[data-r]') as HTMLElement | null;
      const col = (target as HTMLElement).dataset.c;

      applyFocus({
        r: row ? Number(row.dataset.r) : null,
        c: col !== undefined ? Number(col) : null,
      });
    },
    [applyFocus],
  );

  const handlePointerOver = useCallback(
    (event: React.PointerEvent) => {
      // Touch and pen: a tap (click) picks the cell, so a scroll doesn't.
      if (event.pointerType === 'mouse') focusFromEvent(event);
    },
    [focusFromEvent],
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') applyFocus(NO_FOCUS);
    },
    [applyFocus],
  );

  // New data (another stage or channel) clears the crosshair.
  useEffect(() => {
    const table = tableRef.current;

    table
      ?.querySelectorAll('.is-hl')
      .forEach((el) => el.classList.remove('is-hl'));
    focusRef.current = NO_FOCUS;
    setFocus(NO_FOCUS);
  }, [matrix]);

  const { values, top, min } = matrix;

  const shadeOf = (value: number) =>
    top > 0 ? Math.round(MAX_SHADE * (value / top) ** 1.6 * 10) / 10 : 0;

  const table = useMemo(
    () => (
      <table
        ref={tableRef}
        className="dp-stats-table dp-stats-matrix"
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
        onClick={focusFromEvent}
      >
        <thead>
          <tr>
            <th scope="col" className="dp-stats-rowhead dp-stats-corner">
              <span className="dp-stats-rowhead-in">
                <span className="dp-stats-place" />
                <span className="min-w-0 flex-1 text-left">{t('country')}</span>
                <span className="text-right">{t('points')}</span>
              </span>
            </th>
            {voters.map((voter, c) => (
              <th
                key={voter.code}
                scope="col"
                data-c={c}
                className="dp-stats-voter"
              >
                <span className="dp-stats-voter-in">
                  <StatsFlag
                    country={voter}
                    settings={flagSettings}
                    size="sm"
                  />
                  <span aria-hidden="true" className="dp-stats-voter-code">
                    {codes[voter.code]}
                  </span>
                  <span className="sr-only">{voter.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country, r) => (
            <tr key={country.code} data-r={r}>
              <th scope="row" className="dp-stats-rowhead">
                <span className="dp-stats-rowhead-in">
                  <span className="dp-stats-place">{country.rank}</span>
                  <StatsFlag country={country} settings={flagSettings} />
                  <span className="dp-stats-rowname">{country.name}</span>
                  <span aria-hidden="true" className="dp-stats-rowcode">
                    {codes[country.code]}
                  </span>
                  <span className="dp-stats-rowtotal">
                    {toFixedIfDecimalFloat(getPoints(country))}
                  </span>
                </span>
              </th>
              {voters.map((voter, c) => {
                if (voter.code === country.code) {
                  return (
                    <td key={voter.code} data-c={c} className="is-self">
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">
                        {t('cellSelf', { country: country.name })}
                      </span>
                    </td>
                  );
                }

                const value = values[r][c];

                return (
                  <td
                    key={voter.code}
                    data-c={c}
                    className={
                      value > 0 && value === top
                        ? 'is-top'
                        : top > 0 && value / top >= 0.66
                        ? 'is-strong'
                        : undefined
                    }
                    style={
                      value > 0
                        ? ({ '--shade': shadeOf(value) } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {value > 0 ? toFixedIfDecimalFloat(value) : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matrix, rankedCountries, votersKey, codes, flagSettings, getPoints, t],
  );

  const readout = (() => {
    const country = focus.r !== null ? rankedCountries[focus.r] : undefined;
    const voter = focus.c !== null ? voters[focus.c] : undefined;

    if (country && voter) {
      if (voter.code === country.code) {
        return t('cellSelf', { country: country.name });
      }

      const value = values[focus.r!][focus.c!];
      const names = { voter: voter.name, country: country.name };

      if (!value) return t('cellNothing', names);
      if (voteType === 'Total' && hasSplit) {
        return t('cellGaveSplit', {
          ...names,
          points: toFixedIfDecimalFloat(value),
          jury: toNumber(channels.jury.getCellPoints(country.code, voter.code)),
          televote: toNumber(
            channels.televote.getCellPoints(country.code, voter.code),
          ),
        });
      }

      return t('cellGave', { ...names, points: toFixedIfDecimalFloat(value) });
    }
    if (voter) return t('columnFrom', { voter: voter.name });

    return null;
  })();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-3 2cols:px-4 pb-2 min-h-[40px] 2cols:min-h-[30px]">
        <p className="m-0 min-w-0 flex-1 text-[12.5px] 2cols:text-[13px] font-semibold leading-[1.35] text-white/75 line-clamp-2">
          {readout ?? (
            <>
              <span className="dp-stats-hint-hover">{t('cellHintHover')}</span>
              <span className="dp-stats-hint-tap">{t('cellHintTap')}</span>
            </>
          )}
        </p>
        {top > 0 && (
          <span
            aria-hidden="true"
            className="flex flex-none items-center gap-1.5 text-[12px] font-bold text-white/55 tabular-nums"
          >
            <span>{toFixedIfDecimalFloat(min)}</span>
            <span className="dp-stats-ramp w-14 2cols:w-16 h-2.5 rounded-[3px]" />
            <span className="dp-accent-ink">{toFixedIfDecimalFloat(top)}</span>
          </span>
        )}
      </div>
      <div className="dp-stats-scroll narrow-scrollbar flex-1 min-h-0">
        {table}
      </div>
    </div>
  );
};

export default BreakdownView;
