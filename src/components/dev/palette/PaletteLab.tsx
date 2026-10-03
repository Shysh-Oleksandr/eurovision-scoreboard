'use client';
import { Copy, Download, ExternalLink, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { generateInterfaceAccentsSource } from './codegen';
import HueScrubber from './HueScrubber';
import {
  AccentTarget,
  countPicks,
  EMPTY_PICKS,
  getBrandCandidates,
  getCustomSample,
  KEYFRAME_HUES,
  KEYFRAME_SHADES,
  keyframeCell,
  keyframeKey,
  mergedBuiltinAccents,
  mergedKeyframes,
  themeLabel,
  withPick,
} from './labModel';
import LabRow, { OnPick } from './LabRow';
import { usePalettePicks } from './usePalettePicks';

import {
  AccentKeyframeRow,
  getInterfaceTokens,
  InterfaceAccents,
} from '@/theme/oklch';
import {
  getThemeBackground,
  getThemeForYear,
  YEARS_WITH_THEME,
} from '@/theme/themes';

type Section = 'all' | 'builtin' | 'custom';

const resolveBuiltin = (
  year: string,
  accents: InterfaceAccents,
  keyframes: AccentKeyframeRow[],
): Required<InterfaceAccents> => {
  const tokens = getInterfaceTokens(
    getThemeForYear(year).colors.primary,
    accents,
    keyframes,
  );

  return { accent: tokens.accent, accent2: tokens.accent2 };
};

/** A tuned cell as it renders on its own sample theme (gamut-clamped). */
const resolveCustom = (
  primary: { 800: string; 900: string },
  cell: InterfaceAccents,
): Required<InterfaceAccents> => {
  const tokens = getInterfaceTokens(primary, cell);

  return { accent: tokens.accent, accent2: tokens.accent2 };
};

const BRAND = Object.fromEntries(
  YEARS_WITH_THEME.map((year) => [year, getBrandCandidates(year)]),
);

const Toggle = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <div className="flex rounded-lg bg-white/[0.06] p-0.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`px-2.5 py-1 rounded-md text-xs font-bold ${
          value === option.value
            ? 'bg-white text-black'
            : 'text-white/70 hover:text-white'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/**
 * Dev-only Palette Lab (`/dev/palette-lab`): review the interface accent of
 * every built-in theme and of the auto curve custom themes use, pick by eye,
 * and export the result as `src/theme/interfaceAccents.ts`.
 */
const PaletteLab = () => {
  const [picks, updatePicks] = usePalettePicks();
  const [target, setTarget] = useState<AccentTarget>('accent');
  const [section, setSection] = useState<Section>('all');
  const [showBackgrounds, setShowBackgrounds] = useState(true);
  const [exported, setExported] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const keyframes = useMemo(() => mergedKeyframes(picks), [picks]);
  const builtin = useMemo(
    () => mergedBuiltinAccents(picks, keyframes),
    [picks, keyframes],
  );
  const codeKeyframes = useMemo(() => mergedKeyframes(EMPTY_PICKS), []);
  const codeBuiltin = useMemo(
    () => mergedBuiltinAccents(EMPTY_PICKS, codeKeyframes),
    [codeKeyframes],
  );

  const onPick = useCallback<OnPick>(
    (scope, key, pickTarget, spec) =>
      updatePicks((prev) => withPick(prev, scope, key, pickTarget, spec)),
    [updatePicks],
  );

  const pickCount = countPicks(picks);

  const openExport = () => {
    setCopied(false);
    setExported(generateInterfaceAccentsSource(builtin, keyframes));
  };

  const copyExport = async () => {
    if (!exported) return;

    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const downloadExport = () => {
    if (!exported) return;

    const url = URL.createObjectURL(
      new Blob([exported], { type: 'text/plain' }),
    );
    const link = document.createElement('a');

    link.href = url;
    link.download = 'interfaceAccents.ts';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0b0a10] text-white">
      <div className="sticky top-0 z-20 bg-[#0b0a10]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-[1500px] mx-auto px-5 py-3 flex flex-wrap items-center gap-3">
          <div className="mr-2">
            <h1 className="text-lg font-extrabold leading-tight">
              Palette Lab
            </h1>
            <p className="text-[11px] text-white/50">
              Hover a candidate to preview it, click to pick, fine-tune with the
              sliders. Picks persist in this browser.
            </p>
          </div>
          <Toggle
            value={target}
            onChange={setTarget}
            options={[
              { value: 'accent', label: 'Accent' },
              { value: 'accent2', label: 'Accent 2' },
            ]}
          />
          <Toggle
            value={section}
            onChange={setSection}
            options={[
              { value: 'all', label: 'All' },
              { value: 'builtin', label: 'Built-in' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          <label className="flex items-center gap-1.5 text-xs text-white/70">
            <input
              type="checkbox"
              checked={showBackgrounds}
              onChange={(e) => setShowBackgrounds(e.target.checked)}
            />
            Theme backgrounds
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/60 tabular-nums">
              {pickCount} pick{pickCount === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              disabled={pickCount === 0}
              onClick={() => {
                if (window.confirm('Discard every pick in this browser?')) {
                  updatePicks(() => EMPTY_PICKS);
                }
              }}
              className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-40"
            >
              Reset all
            </button>
            <a
              href="/?palette"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20"
            >
              Open app with panel
              <ExternalLink className="size-3" />
            </a>
            <button
              type="button"
              onClick={openExport}
              className="px-3 py-1.5 rounded-md text-xs font-extrabold bg-emerald-500 text-black hover:bg-emerald-400"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto px-5 py-6 flex flex-col gap-10">
        {section !== 'custom' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold">Built-in themes</h2>
              <p className="text-xs text-white/50">
                Each theme ships its own accent. &ldquo;Brand&rdquo; candidates
                come from the theme&apos;s scoreboard colours.
              </p>
            </div>
            {YEARS_WITH_THEME.map((year) => {
              const { primary } = getThemeForYear(year).colors;

              return (
                <LabRow
                  key={year}
                  scope="builtin"
                  rowKey={year}
                  title={themeLabel(year)}
                  subtitle={`primary.800 ${primary[800]}`}
                  primary={primary}
                  applied={resolveBuiltin(year, builtin[year], keyframes)}
                  code={resolveBuiltin(year, codeBuiltin[year], codeKeyframes)}
                  picked={picks.builtin[year]}
                  target={target}
                  brand={BRAND[year]}
                  backgroundImage={
                    showBackgrounds ? getThemeBackground(year) : undefined
                  }
                  onPick={onPick}
                />
              );
            })}
          </div>
        )}

        {section !== 'builtin' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold">Custom themes</h2>
              <p className="text-xs text-white/50">
                The auto curve: 12 primary hues × 3 shades. Everything in
                between is interpolated; check it in the scrubber.
              </p>
            </div>
            <HueScrubber keyframes={keyframes} />
            {KEYFRAME_HUES.map((hue) => (
              <div key={hue} className="flex flex-col gap-3">
                <h3 className="text-sm font-extrabold text-white/70 mt-2">
                  Primary OKLCH {hue}°
                </h3>
                {KEYFRAME_SHADES.map(({ shade, label }) => {
                  const sample = getCustomSample(hue, shade);
                  const key = keyframeKey(hue, shade);

                  return (
                    <LabRow
                      key={key}
                      scope="keyframes"
                      rowKey={key}
                      title={`${label} · OKLCH ${hue}°`}
                      subtitle={`editor hue ${
                        sample.hslHue
                      }° · shade ${shade} · primary.900 L ${sample.primL.toFixed(
                        1,
                      )}`}
                      primary={sample.primary}
                      applied={resolveCustom(
                        sample.primary,
                        keyframeCell(keyframes, hue, shade),
                      )}
                      code={resolveCustom(
                        sample.primary,
                        keyframeCell(codeKeyframes, hue, shade),
                      )}
                      picked={picks.keyframes[key]}
                      target={target}
                      onPick={onPick}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>

      {exported !== null && (
        <div className="fixed inset-0 z-30 bg-black/70 grid place-items-center p-6">
          <div className="w-full max-w-4xl max-h-full flex flex-col rounded-2xl bg-[#14121c] border border-white/15">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <h2 className="font-extrabold">src/theme/interfaceAccents.ts</h2>
              <span className="text-xs text-white/50">
                replace the file with this, or send it to Claude
              </span>
              <button
                type="button"
                onClick={copyExport}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-emerald-500 text-black"
              >
                <Copy className="size-3.5" />
                {copied ? 'Copied' : 'Copy as TS'}
              </button>
              <button
                type="button"
                onClick={downloadExport}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-white/10"
              >
                <Download className="size-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => setExported(null)}
                className="p-1.5 rounded-md bg-white/10"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <pre className="overflow-auto p-4 text-[11px] leading-relaxed text-white/80 select-all">
              {exported}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaletteLab;
