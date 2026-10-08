'use client';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ItemSize,
  ScoreboardElement as ScoreboardElementModel,
} from '../model/design';
import { fitScoreboard, rowsHeightIn } from '../model/scoreboardFit';
import { useDesignData } from '../render/DesignDataContext';
import { useLayoutSignal } from '../render/layoutSignal';

import ShareCountryItem from '@/components/simulation/share/ShareCountryItem';
import { useReorderCountries } from '@/hooks/useReorderCountries';

const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
};

/** Column gap per row size (matches the original share image). */
const GAP_CLASS: Record<ItemSize, string> = {
  sm: 'gap-x-2',
  md: 'gap-x-3',
  lg: 'gap-x-5',
  xl: 'gap-x-5',
  '2xl': 'gap-x-5',
};

interface FitArea {
  /** Width of the element's slot. */
  w: number;
  /** Height of the element's box or flow slot (margins and padding included). */
  h: number;
}

const px = (value: string) => parseFloat(value) || 0;

/**
 * The space an auto-fit scoreboard may fill: its own box when it has a
 * height, else (in flow) what a fixed-height stack leaves after its other
 * children. `null` when the space depends on the scoreboard itself
 * (content-sized canvas, free element without a height) — the element then
 * keeps its stored columns and row size.
 */
function measureFitArea(
  wrapper: HTMLElement,
  hasHeight: boolean,
): FitArea | null {
  const w = wrapper.clientWidth;

  if (hasHeight) return { w, h: wrapper.clientHeight };
  const stack = wrapper.parentElement;

  if (!stack?.hasAttribute('data-stack')) return null;
  if (stack.closest('[data-auto-size]')) return null;
  const cs = getComputedStyle(stack);
  const inner = stack.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);

  if (!cs.flexDirection.startsWith('column')) return { w, h: inner };
  const others = Array.from(stack.children).filter(
    (child): child is HTMLElement =>
      child !== wrapper && child instanceof HTMLElement,
  );
  const taken = others.reduce((sum, child) => {
    const style = getComputedStyle(child);

    return (
      sum + child.offsetHeight + px(style.marginTop) + px(style.marginBottom)
    );
  }, 0);
  const gaps = px(cs.rowGap) * Math.max(0, stack.children.length - 1);

  return { w, h: Math.max(0, inner - taken - gaps) };
}

/**
 * The share-image country grid: rows are the real `ShareCountryItem`, filled
 * column by column (`useReorderCountries`) so rank order reads top-to-bottom
 * in each column. `fit: 'auto'` measures the space it has (measureFitArea)
 * and picks columns and row size with `fitScoreboard`; until measured it
 * renders with the stored ones and marks itself `data-fit-pending`.
 */
const ScoreboardElement: React.FC<{ el: ScoreboardElementModel }> = ({
  el,
}) => {
  const { countries: ranked, isVotingOver, runningOrder } = useDesignData();
  // Running order: the stage's draw order, unknown codes last (still ranked).
  const countries = useMemo(() => {
    if (el.rowOrder !== 'runningOrder' || !runningOrder?.length) return ranked;
    const pos = new Map(runningOrder.map((code, i) => [code, i]));

    return [...ranked].sort(
      (a, b) =>
        (pos.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
        (pos.get(b.code) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [ranked, runningOrder, el.rowOrder]);
  const limited = useMemo(
    () => (el.limit > 0 ? countries.slice(0, el.limit) : countries),
    [countries, el.limit],
  );
  const auto = el.fit === 'auto';
  const hasHeight = el.h !== undefined;
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState<FitArea | null>(null);
  const [measured, setMeasured] = useState(false);
  const signal = useLayoutSignal();

  useLayoutEffect(() => {
    const wrapper = gridRef.current?.parentElement;

    if (!auto || !wrapper) return undefined;
    const measure = () => {
      const next = measureFitArea(wrapper, hasHeight);

      setArea((prev) =>
        prev &&
        next &&
        Math.abs(prev.w - next.w) < 0.5 &&
        Math.abs(prev.h - next.h) < 0.5
          ? prev
          : next,
      );
      setMeasured(true);
    };

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(wrapper);
    const stack = hasHeight ? null : wrapper.parentElement;

    if (stack?.hasAttribute('data-stack')) {
      observer.observe(stack);
      Array.from(stack.children).forEach((child) => observer.observe(child));
    }

    return () => observer.disconnect();
  }, [auto, hasHeight]);

  useEffect(() => {
    if (auto && measured) signal();
  }, [auto, measured, area, signal]);

  const fit = useMemo(
    () =>
      auto && area
        ? fitScoreboard(
            limited.length,
            area.w,
            rowsHeightIn(area.h, el.paddingY),
          )
        : null,
    [auto, area, limited.length, el.paddingY],
  );
  const columns = fit?.columns ?? el.columns;
  const itemSize = fit?.itemSize ?? el.itemSize;
  const reordered = useReorderCountries(limited, columns);
  const uniform = el.statusMode === 'uniform';
  // Rank by object identity so two manual rows with the same country code
  // keep their own ranks (and React keys).
  const rankOf = useMemo(
    () => new Map(countries.map((c, i) => [c, i])),
    [countries],
  );

  const grid = (
    <div
      ref={gridRef}
      data-fit-pending={auto && !measured ? '' : undefined}
      className={`grid my-4 relative w-full mx-auto ${
        COLUMN_CLASS[columns] ?? 'grid-cols-2'
      } ${GAP_CLASS[itemSize]}`}
      style={{
        paddingTop: `${el.paddingY}px`,
        paddingBottom: `${el.paddingY}px`,
        maxWidth: fit?.width !== undefined ? `${fit.width}px` : undefined,
      }}
    >
      {reordered.map((country) => (
        <ShareCountryItem
          key={`${country.code}-${rankOf.get(country) ?? 0}`}
          country={country}
          index={rankOf.get(country) ?? 0}
          showPoints={el.showPoints}
          showRankings={el.showRankings}
          size={itemSize}
          shortCountryNames={el.shortNames}
          isVotingOver={uniform ? false : isVotingOver}
          withConsistentCountryStatus={uniform}
        />
      ))}
    </div>
  );

  // A free auto-fit box centres its rows vertically.
  return auto && hasHeight ? (
    <div className="flex flex-col justify-center h-full">{grid}</div>
  ) : (
    grid
  );
};

export default ScoreboardElement;
