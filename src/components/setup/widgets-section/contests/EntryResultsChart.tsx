'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import type { EntryStatsParticipation } from '@/types/entryStats';

interface EntryResultsChartProps {
  /** Oldest first. */
  rows: EntryStatsParticipation[];
  entryCode: string;
}

const PAD_LEFT = 28;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PLOT_HEIGHT = 132;
const NQ_BAND = 26;
const AXIS_HEIGHT = 20;
/**
 * Below this spacing between contests the chart turns into a scatter of
 * small dots: a line through every contest would only draw noise.
 */
const MIN_DOT_SPACING = 9;

const rankTicks = (maxRank: number): number[] => {
  if (maxRank < 10) return [1, maxRank];

  const ticks = [1];

  for (let r = 10; r <= maxRank; r += 10) ticks.push(r);
  if (maxRank - ticks[ticks.length - 1] >= 4) ticks.push(maxRank);

  return ticks;
};

/**
 * Grand final place per contest, oldest to newest. Non-qualifications sit in
 * a band under the plot and break the line. The contest table below the chart
 * is its table view.
 */
const EntryResultsChart: React.FC<EntryResultsChartProps> = ({
  rows,
  entryCode,
}) => {
  const t = useTranslations('widgets.contests.entryStats');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;

    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => setWidth(el.clientWidth));

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActiveIndex(null);
  }, [rows]);

  const n = rows.length;
  const hasNq = rows.some((r) => r.status === 'NQ');
  const maxRank = Math.max(
    2,
    ...rows.map((r) => (r.status === 'FINAL' ? r.gfSize ?? r.gfRank ?? 0 : 0)),
  );
  const plotBottom = PAD_TOP + PLOT_HEIGHT;
  const nqY = plotBottom + NQ_BAND / 2 + 3;
  const height = plotBottom + (hasNq ? NQ_BAND : 8) + AXIS_HEIGHT;
  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const spacing = n > 1 ? plotWidth / (n - 1) : plotWidth;
  const dense = spacing < MIN_DOT_SPACING;

  const xOf = (i: number) =>
    n > 1 ? PAD_LEFT + (i / (n - 1)) * plotWidth : PAD_LEFT + plotWidth / 2;
  const yOf = (row: EntryStatsParticipation) =>
    row.status === 'FINAL' && row.gfRank
      ? PAD_TOP + ((row.gfRank - 1) / (maxRank - 1)) * PLOT_HEIGHT
      : nqY;

  let linePath = '';

  rows.forEach((row, i) => {
    if (dense || row.status !== 'FINAL') return;
    const continues = i > 0 && rows[i - 1].status === 'FINAL';

    linePath += `${continues ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(
      row,
    ).toFixed(1)}`;
  });

  const indexFromClientX = (clientX: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();

    if (!rect || n === 0) return null;
    if (n === 1) return 0;
    const ratio = (clientX - rect.left - PAD_LEFT) / plotWidth;

    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => Math.max(0, i - 1),
      ArrowRight: (i) => Math.min(n - 1, i + 1),
      Home: () => 0,
      End: () => n - 1,
    };
    const move = keys[e.key];

    if (move) {
      e.preventDefault();
      setActiveIndex((i) => move(i ?? n - 1));
    } else if (e.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  const active = activeIndex !== null ? rows[activeIndex] : null;
  const firstYear = rows[0]?.year;
  const lastYear = rows[n - 1]?.year;
  const axisY = height - 6;

  const tooltipValue = (row: EntryStatsParticipation) => {
    if (row.status !== 'FINAL' || !row.gfRank) return t('nonQualified');
    const place = row.gfSize
      ? t('placeOf', { rank: row.gfRank, size: row.gfSize })
      : `#${row.gfRank}`;

    return `${place}, ${row.gfPoints ?? 0} ${t('points')}`;
  };

  /** The semi-final place and the grand final jury/televote places. */
  const tooltipDetails = (row: EntryStatsParticipation) => [
    ...(row.semi
      ? [
          t('semiPlaceOf', {
            stage: row.semi.stageName,
            rank: row.semi.rank,
            size: row.semi.size,
          }),
        ]
      : []),
    ...(row.gfJuryRank !== undefined && row.gfTelevoteRank !== undefined
      ? [
          t('splitPlaces', {
            jury: row.gfJuryRank,
            televote: row.gfTelevoteRank,
          }),
        ]
      : []),
  ];

  const renderTooltip = () => {
    if (!active || activeIndex === null) return null;
    const x = xOf(activeIndex);
    const y = yOf(active);
    const align =
      x < width * 0.3 ? 'start' : x > width * 0.7 ? 'end' : 'center';
    const translateX =
      align === 'start'
        ? '-16px'
        : align === 'end'
        ? 'calc(-100% + 16px)'
        : '-50%';
    const above = y > 64;

    return (
      <div
        className="absolute z-10 pointer-events-none max-w-[220px] flex flex-col gap-0.5 leading-[1.3] rounded-[10px] border border-white/10 bg-primary-950 px-2.5 py-2 shadow-lg"
        style={{
          left: x,
          top: above ? y - 12 : y + 12,
          transform: `translate(${translateX}, ${above ? '-100%' : '0'})`,
        }}
      >
        <div className="text-[13px] font-bold text-white whitespace-nowrap">
          {tooltipValue(active)}
        </div>
        {tooltipDetails(active).map((line) => (
          <div
            key={line}
            className="text-[12px] font-semibold text-white/85 truncate"
          >
            {line}
          </div>
        ))}
        <div className="text-[12px] font-semibold text-white/70 truncate">
          {active.contestName}
        </div>
        {active.year !== undefined && (
          <div className="text-[12px] font-semibold text-white/55">
            {active.year}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className="relative outline-none rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={t('resultsOverTime')}
      onKeyDown={handleKeyDown}
      onFocus={() => setActiveIndex((i) => i ?? n - 1)}
      onBlur={() => setActiveIndex(null)}
    >
      {plotWidth > 0 && (
        <svg
          width={width}
          height={height}
          className="block select-none"
          style={{ touchAction: 'pan-y' }}
          aria-hidden="true"
          onPointerDown={(e) => setActiveIndex(indexFromClientX(e.clientX))}
          onPointerMove={(e) => setActiveIndex(indexFromClientX(e.clientX))}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setActiveIndex(null);
          }}
        >
          {rankTicks(maxRank).map((rank) => {
            const y = PAD_TOP + ((rank - 1) / (maxRank - 1)) * PLOT_HEIGHT;

            return (
              <g key={rank}>
                <line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + plotWidth}
                  y1={y}
                  y2={y}
                  className="stroke-white/10"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-white/55 text-[11px] font-semibold tabular-nums"
                >
                  {rank}
                </text>
              </g>
            );
          })}

          {hasNq && (
            <text
              x={PAD_LEFT - 8}
              y={nqY}
              dy="0.35em"
              textAnchor="end"
              className="fill-white/55 text-[11px] font-semibold"
            >
              {t('nqShort')}
            </text>
          )}

          {activeIndex !== null && (
            <line
              x1={xOf(activeIndex)}
              x2={xOf(activeIndex)}
              y1={PAD_TOP}
              y2={hasNq ? nqY + 8 : plotBottom}
              className="stroke-white/25"
              strokeWidth={1}
            />
          )}

          <path
            d={linePath}
            fill="none"
            className="stroke-white/70"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {rows.map((row, i) => {
            const isActive = i === activeIndex;
            const isWin = row.winnerCode === entryCode;
            const isNq = row.status !== 'FINAL';

            if (dense && !isActive) {
              return (
                <circle
                  key={row.contestId}
                  cx={xOf(i)}
                  cy={yOf(row)}
                  r={isWin ? 2.5 : 2}
                  className={
                    isWin
                      ? 'fill-accent'
                      : isNq
                      ? 'fill-white/40'
                      : 'fill-white/80'
                  }
                />
              );
            }

            if (isNq) {
              return (
                <circle
                  key={row.contestId}
                  cx={xOf(i)}
                  cy={nqY}
                  r={isActive ? 4.5 : 3.5}
                  className="fill-primary-800 stroke-white/55"
                  strokeWidth={1.5}
                />
              );
            }

            return (
              <circle
                key={row.contestId}
                cx={xOf(i)}
                cy={yOf(row)}
                r={(isWin ? 5 : 4) + (isActive ? 1 : 0)}
                className={`stroke-primary-800 ${
                  isWin ? 'fill-accent' : 'fill-white'
                }`}
                strokeWidth={2}
              />
            );
          })}

          {firstYear !== undefined && (
            <text
              x={PAD_LEFT}
              y={axisY}
              textAnchor="start"
              className="fill-white/55 text-[11px] font-semibold tabular-nums"
            >
              {firstYear}
            </text>
          )}
          {lastYear !== undefined && n > 1 && lastYear !== firstYear && (
            <text
              x={PAD_LEFT + plotWidth}
              y={axisY}
              textAnchor="end"
              className="fill-white/55 text-[11px] font-semibold tabular-nums"
            >
              {lastYear}
            </text>
          )}
        </svg>
      )}
      {renderTooltip()}
      <div className="sr-only" aria-live="polite">
        {active
          ? `${active.contestName}${
              active.year !== undefined ? ` (${active.year})` : ''
            }: ${[tooltipValue(active), ...tooltipDetails(active)].join(', ')}`
          : ''}
      </div>
    </div>
  );
};

export default EntryResultsChart;
