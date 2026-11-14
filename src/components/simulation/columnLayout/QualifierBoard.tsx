'use client';
import gsap from 'gsap';
import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { CountryQualificationItem } from '../qualification/CountryQualificationItem';

import { useQualifiers } from './useQualifiers';

import { useBoardLayoutOverride } from '@/components/board/BoardLayoutContext';
import { useReorderCountries } from '@/hooks/useReorderCountries';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/** Never leave the board hidden if the host never reports it ready. */
const APPEAR_FALLBACK_MS = 1500;

/**
 * Pick qualifiers mode, the column layout's board: every entry in running
 * order as the theme's qualification row. A qualified row stays in its place,
 * dimmed (so nothing reflows while you look for the next one); the split
 * screen's candidates get an accent ring; once the stage is over the rest
 * take the theme's non-qualifier colours. It renders the board's own
 * structure (`.container-wrapping-flipper > div > .dp-scoreboard-font >
 * button`) so `BoardStage` sizes it like the standard board, and its rows
 * rise in the same way when a stage starts.
 */
const QualifierBoard = () => {
  const layout = useBoardLayoutOverride();
  const columns = layout?.columns ?? 2;
  const appearReady = layout?.appearReady ?? true;
  const { roundedCountryContainer } = useThemeSpecifics();
  const startCounter = useScoreboardStore((state) => state.startCounter);
  const pickQualifier = useScoreboardStore((state) => state.pickQualifier);
  const q = useQualifiers();
  const countries = useMemo(() => q.stage?.countries ?? [], [q.stage]);
  const ordered = useReorderCountries(countries, columns);
  const containerRef = useRef<HTMLDivElement>(null);
  const appearedRef = useRef<string | null>(null);

  const candidateCodes = useMemo(
    () => new Set(q.splitCandidates.map((country) => country.code)),
    [q.splitCandidates],
  );
  const qualifiedCodes = useMemo(
    () => new Set(q.qualified.map((country) => country.code)),
    [q.qualified],
  );

  // The entrance: hidden until the host has fitted the board, then every row
  // rises in, top to bottom (the standard board's `useBoardAnimations`).
  const appearKey = `${q.stage?.id}|${startCounter}`;

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container || appearedRef.current === appearKey) return undefined;

    if (!appearReady) {
      container.style.opacity = '0';

      const fallback = window.setTimeout(() => {
        appearedRef.current = appearKey;
        container.style.opacity = '';
      }, APPEAR_FALLBACK_MS);

      return () => window.clearTimeout(fallback);
    }

    appearedRef.current = appearKey;
    container.style.opacity = '';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>(':scope > div > *'),
    );

    if (rows.length === 0) return undefined;

    gsap.fromTo(
      rows,
      { opacity: 0, x: 0, y: 14 },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        stagger: Math.min(0.035, 0.4 / rows.length),
        clearProps: 'opacity,transform',
      },
    );

    return undefined;
  }, [appearKey, appearReady]);

  return (
    <div className="h-full w-full">
      <div
        ref={containerRef}
        data-cols={columns}
        className={`container-wrapping-flipper ${
          roundedCountryContainer ? 'rounded-design' : ''
        }`}
      >
        <div className={roundedCountryContainer ? 'gap-y-[1px]' : ''}>
          {ordered.map((country) => (
            <CountryQualificationItem
              key={country.code}
              country={country}
              bare
              as={q.isOver ? 'div' : 'button'}
              hideIfQualified={!q.isOver}
              nonQualified={q.isOver && !qualifiedCodes.has(country.code)}
              highlighted={!q.isOver && candidateCodes.has(country.code)}
              onClick={q.isOver ? undefined : () => pickQualifier(country.code)}
              rowClassName="lg:mb-[6px] mb-1"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(QualifierBoard);
