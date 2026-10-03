'use client';
import React from 'react';

import { AccentSpec, maxChromaInGamut, oklchToHex } from '@/theme/oklch';

type SpecSlidersProps = {
  value: AccentSpec;
  onChange: (spec: AccentSpec) => void;
};

const track = (stops: string[]) =>
  `linear-gradient(90deg, ${stops.join(', ')})`;

const range = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);

/** OKLCH hue / lightness / chroma sliders whose tracks preview the result. */
const SpecSliders = ({ value, onChange }: SpecSlidersProps) => {
  const { h, l, c } = value;
  const rows = [
    {
      key: 'h' as const,
      label: 'H',
      min: 0,
      max: 359,
      step: 1,
      text: `${Math.round(h)}°`,
      background: track(range(0, 360, 12).map((x) => oklchToHex(l, c, x))),
    },
    {
      key: 'l' as const,
      label: 'L',
      min: 35,
      max: 95,
      step: 0.5,
      text: `${l.toFixed(1)}`,
      background: track(range(35, 95, 6).map((x) => oklchToHex(x, c, h))),
    },
    {
      key: 'c' as const,
      label: 'C',
      min: 0,
      max: 0.32,
      step: 0.005,
      text: `${c.toFixed(3)}${c > maxChromaInGamut(l, h) + 0.001 ? ' ⚠' : ''}`,
      background: track(range(0, 0.32, 6).map((x) => oklchToHex(l, x, h))),
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <label
          key={row.key}
          className="flex items-center gap-2 text-[11px] text-white/70"
        >
          <span className="w-3 font-bold">{row.label}</span>
          <input
            type="range"
            min={row.min}
            max={row.max}
            step={row.step}
            value={value[row.key]}
            onChange={(e) =>
              onChange({ ...value, [row.key]: Number(e.target.value) })
            }
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-white"
            style={{ background: row.background }}
          />
          <span className="w-14 text-right tabular-nums">{row.text}</span>
        </label>
      ))}
    </div>
  );
};

export default SpecSliders;
