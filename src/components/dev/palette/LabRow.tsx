'use client';
import { RotateCcw } from 'lucide-react';
import React, { memo, useMemo, useState } from 'react';

import HubMock, { SwatchMock } from './HubMock';
import {
  accentOnSurfaceContrast,
  AccentTarget,
  Candidate,
  cssColor,
  formatSpec,
  getCandidates,
  LabPicks,
  PickSet,
  sameSpec,
} from './labModel';
import SpecSliders from './SpecSliders';

import {
  AccentSpec,
  getInterfaceTokens,
  InterfaceAccents,
  oklchFromRgb,
  parseCssColorToRgb,
  pickAccentInk,
} from '@/theme/oklch';

export type OnPick = (
  scope: keyof LabPicks,
  key: string,
  target: AccentTarget,
  spec: AccentSpec | null,
) => void;

type LabRowProps = {
  scope: keyof LabPicks;
  rowKey: string;
  title: string;
  subtitle: string;
  primary: { 800: string; 900: string };
  /** What renders now (code + picks), accent2 resolved. */
  applied: Required<InterfaceAccents>;
  /** What the code file has, accent2 resolved: the "In code" candidate. */
  code: Required<InterfaceAccents>;
  picked?: PickSet;
  target: AccentTarget;
  brand?: Candidate[];
  backgroundImage?: string;
  onPick: OnPick;
};

const inkLabel = (spec: AccentSpec) => {
  const ink = pickAccentInk(spec);

  return `${ink.dark ? 'dark' : 'white'} ink ${ink.contrast.toFixed(1)}:1`;
};

/**
 * One palette to review: the full hub mock on the left (hover a candidate to
 * preview it there), sliders for fine-tuning, and the candidate swatches.
 */
const LabRow = ({
  scope,
  rowKey,
  title,
  subtitle,
  primary,
  applied,
  code,
  picked,
  target,
  brand,
  backgroundImage,
  onPick,
}: LabRowProps) => {
  const [hovered, setHovered] = useState<AccentSpec | null>(null);
  const primHue = useMemo(() => {
    const rgb = parseCssColorToRgb(primary[800]);

    return (rgb && oklchFromRgb(rgb).H) ?? 0;
  }, [primary]);

  const shown = hovered ? { ...applied, [target]: hovered } : applied;
  const tokens = getInterfaceTokens(primary, shown);
  const candidates = useMemo(
    () => getCandidates(target, primHue, code, applied, brand),
    [target, primHue, code, applied, brand],
  );
  const isPicked = !!picked?.[target];
  const other: AccentTarget = target === 'accent' ? 'accent2' : 'accent';

  return (
    <section
      className="rounded-2xl bg-white/[0.035] border border-white/10 p-4"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 560px' }}
    >
      <header className="flex items-center gap-3 mb-3">
        <span
          className="w-6 h-6 rounded-full border border-white/30 flex-none"
          style={{ background: cssColor(primary[800]) }}
        />
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-tight">{title}</h3>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          {picked?.[other] && (
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {other === 'accent' ? 'accent' : 'accent 2'} picked
            </span>
          )}
          {isPicked && (
            <>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                picked
              </span>
              <button
                type="button"
                onClick={() => onPick(scope, rowKey, target, null)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                title="Back to the value in code"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex gap-4 items-start flex-wrap">
        <div className="flex flex-col gap-2.5 w-[400px] max-w-full">
          <HubMock
            tokens={tokens}
            backgroundImage={backgroundImage}
            zoom={0.62}
          />
          <SpecSliders
            value={applied[target]}
            onChange={(spec) => onPick(scope, rowKey, target, spec)}
          />
          <div className="text-[11px] text-white/60 leading-relaxed tabular-nums">
            <div>
              <b className="text-white/85">Accent</b>{' '}
              {formatSpec(tokens.accent)} · {inkLabel(tokens.accent)} · on
              surface{' '}
              {accentOnSurfaceContrast(tokens, tokens.accent).toFixed(1)}:1
            </div>
            <div>
              <b className="text-white/85">Accent 2</b>{' '}
              {formatSpec(tokens.accent2)} · {inkLabel(tokens.accent2)} · on
              surface{' '}
              {accentOnSurfaceContrast(tokens, tokens.accent2).toFixed(1)}:1
            </div>
          </div>
        </div>

        <div
          className="flex-1 min-w-[300px] grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {candidates.map((candidate) => {
            const candidateTokens = getInterfaceTokens(primary, {
              ...applied,
              [target]: candidate.spec,
            });
            const spec = candidateTokens[target];
            const active = sameSpec(spec, applied[target]);
            const ink = pickAccentInk(spec);

            return (
              <button
                key={candidate.id}
                type="button"
                onMouseEnter={() => setHovered(spec)}
                onFocus={() => setHovered(spec)}
                onBlur={() => setHovered(null)}
                onClick={() => onPick(scope, rowKey, target, spec)}
                className={`text-left rounded-lg overflow-hidden border transition-colors ${
                  active
                    ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                    : 'border-white/10 hover:border-white/40'
                }`}
              >
                <SwatchMock tokens={candidateTokens} />
                <span className="block px-2 py-1.5 bg-black/40 text-[10.5px] leading-snug">
                  <span className="block font-bold text-white/90 truncate">
                    {candidate.label}
                  </span>
                  <span className="block text-white/55 tabular-nums">
                    {formatSpec(spec)}
                  </span>
                  <span
                    className={`block tabular-nums ${
                      ink.contrast < 3 ? 'text-red-300' : 'text-white/55'
                    }`}
                  >
                    {ink.dark ? 'dark' : 'white'} ink {ink.contrast.toFixed(1)}
                    :1
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Rows only re-render when their own values change, not on every pick. */
export default memo(
  LabRow,
  (prev, next) =>
    prev.scope === next.scope &&
    prev.rowKey === next.rowKey &&
    prev.title === next.title &&
    prev.subtitle === next.subtitle &&
    prev.target === next.target &&
    prev.backgroundImage === next.backgroundImage &&
    prev.onPick === next.onPick &&
    prev.brand === next.brand &&
    prev.primary[800] === next.primary[800] &&
    prev.primary[900] === next.primary[900] &&
    sameJson(prev.applied, next.applied) &&
    sameJson(prev.code, next.code) &&
    sameJson(prev.picked, next.picked),
);
