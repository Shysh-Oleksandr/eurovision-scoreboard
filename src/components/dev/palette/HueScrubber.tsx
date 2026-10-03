'use client';
import React, { useMemo, useState } from 'react';

import HubMock from './HubMock';
import { formatSpec, KEYFRAME_SHADES, sampleFromHslHue } from './labModel';

import {
  AccentKeyframeRow,
  getInterfaceTokens,
  oklchToHex,
  pickAccentInk,
} from '@/theme/oklch';

type HueScrubberProps = {
  keyframes: AccentKeyframeRow[];
};

const STRIP_HUES = Array.from({ length: 72 }, (_, i) => i * 5);

/**
 * What a custom theme gets between the tuned rows: drag the editor's hue and
 * shade, or click a cell of the strips (editor hue 0–355°, one strip per
 * tuned shade) to jump there. Strips make jumps between rows easy to spot.
 */
const HueScrubber = ({ keyframes }: HueScrubberProps) => {
  const [hslHue, setHslHue] = useState(230);
  const [shade, setShade] = useState(60);

  const sample = sampleFromHslHue(hslHue, shade);
  const tokens = getInterfaceTokens(sample.primary, undefined, keyframes);

  const strips = useMemo(
    () =>
      KEYFRAME_SHADES.map(({ shade: stripShade, label }) => ({
        shade: stripShade,
        label,
        cells: STRIP_HUES.map((hue) => {
          const s = sampleFromHslHue(hue, stripShade);
          const t = getInterfaceTokens(s.primary, undefined, keyframes);
          const surfaceL = Math.min(40, Math.max(17, t.lightness));
          const surfaceC = Math.min(0.12, Math.max(0.035, t.chroma));

          return {
            hue,
            primHue: Math.round(s.primHue),
            surface: oklchToHex(surfaceL, surfaceC, t.hue),
            accent: oklchToHex(t.accent.l, t.accent.c, t.accent.h),
            accent2: oklchToHex(t.accent2.l, t.accent2.c, t.accent2.h),
            title: `editor hue ${hue}° → OKLCH ${Math.round(
              s.primHue,
            )}° · accent ${formatSpec(t.accent)}`,
          };
        }),
      })),
    [keyframes],
  );

  return (
    <section className="rounded-2xl bg-white/[0.035] border border-white/10 p-4">
      <header className="mb-3">
        <h3 className="text-base font-extrabold">Custom theme scrubber</h3>
        <p className="text-xs text-white/50">
          The interpolated result for any custom theme. Hue and shade are the
          theme editor's own controls.
        </p>
      </header>
      <div className="flex gap-4 items-start flex-wrap">
        <div className="flex flex-col gap-2.5 w-[400px] max-w-full">
          <HubMock tokens={tokens} zoom={0.62} />
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <span className="w-12 font-bold">Hue</span>
            <input
              type="range"
              min={0}
              max={359}
              value={hslHue}
              onChange={(e) => setHslHue(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-32 text-right tabular-nums whitespace-nowrap">
              {hslHue}° (OKLCH {Math.round(sample.primHue)}°)
            </span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <span className="w-12 font-bold">Shade</span>
            <input
              type="range"
              min={10}
              max={100}
              value={shade}
              onChange={(e) => setShade(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-24 text-right tabular-nums">{shade}</span>
          </label>
          <div className="text-[11px] text-white/60 tabular-nums">
            Accent {formatSpec(tokens.accent)} ·{' '}
            {pickAccentInk(tokens.accent).dark ? 'dark' : 'white'} ink
          </div>
        </div>

        <div className="flex-1 min-w-[300px] flex flex-col gap-3">
          {strips.map((strip) => (
            <div key={strip.shade}>
              <div className="text-[11px] text-white/60 mb-1">
                {strip.label} (shade {strip.shade})
              </div>
              <div className="flex rounded-md overflow-hidden border border-white/10">
                {strip.cells.map((cell) => (
                  <button
                    key={cell.hue}
                    type="button"
                    title={cell.title}
                    onClick={() => {
                      setHslHue(cell.hue);
                      setShade(strip.shade);
                    }}
                    className={`flex-1 min-w-0 h-12 flex flex-col items-center justify-center gap-1 ${
                      cell.hue === hslHue && strip.shade === shade
                        ? 'outline outline-2 outline-white z-10'
                        : ''
                    }`}
                    style={{ background: cell.surface }}
                  >
                    <span
                      className="w-[70%] aspect-square rounded-full"
                      style={{ background: cell.accent }}
                    />
                    <span
                      className="w-[70%] h-1 rounded-full"
                      style={{ background: cell.accent2 }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-white/45">
            Each cell: modal surface, accent (dot) and accent 2 (bar). Click a
            cell to load it into the mock.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HueScrubber;
