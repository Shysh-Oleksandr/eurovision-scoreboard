'use client';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  countPicks,
  customPrimary,
  formatSpec,
  mergedBuiltinAccents,
  mergedKeyframes,
  themeLabel,
} from './labModel';
import SpecSliders from './SpecSliders';
import { usePalettePicks } from './usePalettePicks';

import { useGeneralStore } from '@/state/generalStore';
import {
  ACCENT_KEYFRAMES,
  BUILTIN_INTERFACE_ACCENTS,
} from '@/theme/interfaceAccents';
import {
  AccentSpec,
  getInterfaceTokens,
  INTERFACE_TOKEN_VARS,
  interfaceTokensToCssVars,
  oklchToHex,
  pickAccentInk,
} from '@/theme/oklch';
import {
  getThemeBackground,
  getThemeForYear,
  YEARS_WITH_THEME,
} from '@/theme/themes';
import { getCustomThemeInterfaceVars } from '@/theme/themeUtils';

const PANEL_FLAG = 'dp-palette-panel';

type Source = 'active' | 'builtin' | 'custom';

const swatch = (spec: AccentSpec) => oklchToHex(spec.l, spec.c, spec.h);

/** Put the active theme's own interface tokens back on <html>. */
function restoreActiveTokens() {
  const root = document.documentElement;

  INTERFACE_TOKEN_VARS.forEach((name) => root.style.removeProperty(name));

  const { customTheme } = useGeneralStore.getState();

  if (customTheme) {
    Object.entries(getCustomThemeInterfaceVars(customTheme)).forEach(
      ([name, value]) => root.style.setProperty(name, value),
    );
  }
}

const AccentControl = ({
  label,
  value,
  override,
  onOverride,
}: {
  label: string;
  value: AccentSpec;
  override: AccentSpec | null;
  onOverride: (spec: AccentSpec | null) => void;
}) => {
  const ink = pickAccentInk(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-md border border-white/30 flex-none"
          style={{ background: swatch(value) }}
        />
        <span className="font-bold">{label}</span>
        <span className="text-white/50 tabular-nums truncate">
          {formatSpec(value)} · {ink.dark ? 'dark' : 'white'}{' '}
          {ink.contrast.toFixed(1)}
        </span>
        <label className="ml-auto flex items-center gap-1 text-white/70">
          <input
            type="checkbox"
            checked={!!override}
            onChange={(e) => onOverride(e.target.checked ? value : null)}
          />
          edit
        </label>
      </div>
      {override && <SpecSliders value={override} onChange={onOverride} />}
    </div>
  );
};

const Panel = ({ onClose }: { onClose: () => void }) => {
  const [picks] = usePalettePicks();
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);

  const [collapsed, setCollapsed] = useState(false);
  const [source, setSource] = useState<Source>('active');
  const [year, setYear] = useState(themeYear);
  const [hslHue, setHslHue] = useState(customTheme?.hue ?? 230);
  const [shade, setShade] = useState(customTheme?.shadeValue ?? 60);
  const [useLabPicks, setUseLabPicks] = useState(true);
  const [accentOverride, setAccentOverride] = useState<AccentSpec | null>(null);
  const [accent2Override, setAccent2Override] = useState<AccentSpec | null>(
    null,
  );

  const keyframes = useMemo(
    () => (useLabPicks ? mergedKeyframes(picks) : ACCENT_KEYFRAMES),
    [picks, useLabPicks],
  );
  const builtin = useMemo(
    () =>
      useLabPicks
        ? mergedBuiltinAccents(picks, keyframes)
        : BUILTIN_INTERFACE_ACCENTS,
    [picks, keyframes, useLabPicks],
  );

  const overrides = {
    ...(accentOverride ? { accent: accentOverride } : {}),
    ...(accent2Override ? { accent2: accent2Override } : {}),
  };

  const previewYear =
    source === 'builtin'
      ? year
      : source === 'active' && !customTheme
      ? themeYear
      : null;
  const primary = previewYear
    ? getThemeForYear(previewYear).colors.primary
    : source === 'custom'
    ? customPrimary(hslHue, shade)
    : customPrimary(customTheme!.hue, customTheme!.shadeValue ?? 60);
  const tokens = getInterfaceTokens(
    primary,
    { ...(previewYear ? builtin[previewYear] : {}), ...overrides },
    keyframes,
  );
  const cssVars = interfaceTokensToCssVars(tokens);
  const varsKey = JSON.stringify(cssVars);

  useEffect(() => {
    const root = document.documentElement;

    Object.entries(JSON.parse(varsKey) as Record<string, string>).forEach(
      ([name, value]) => root.style.setProperty(name, value),
    );
  }, [varsKey]);

  useEffect(() => restoreActiveTokens, []);

  const yearIndex = YEARS_WITH_THEME.indexOf(year);
  const stepYear = (delta: number) =>
    setYear(
      YEARS_WITH_THEME[
        (yearIndex + delta + YEARS_WITH_THEME.length) % YEARS_WITH_THEME.length
      ],
    );

  return (
    <>
      {source === 'builtin' && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[999] pointer-events-none"
          style={{
            background: `center / cover no-repeat url(${getThemeBackground(
              year,
            )})`,
          }}
        />
      )}
      <div className="fixed right-3 bottom-3 z-[10050] w-[330px] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl bg-[#0d0912]/95 border border-white/15 shadow-[0_18px_44px_rgba(0,0,0,.6)] text-white text-[11.5px]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <span className="font-extrabold text-[12.5px]">Palette</span>
          <span className="text-white/45 truncate">
            {previewYear
              ? themeLabel(previewYear)
              : source === 'custom'
              ? `custom hue ${hslHue}° · shade ${shade}`
              : `custom “${customTheme?.name ?? ''}”`}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded hover:bg-white/10"
            aria-label="Collapse"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close palette panel"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {!collapsed && (
          <div className="p-3 flex flex-col gap-3">
            <div className="flex rounded-lg bg-white/[0.06] p-0.5">
              {(['active', 'builtin', 'custom'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSource(value)}
                  className={`flex-1 py-1 rounded-md font-bold ${
                    source === value
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {value === 'active'
                    ? 'Active theme'
                    : value === 'builtin'
                    ? 'Built-in'
                    : 'Custom hue'}
                </button>
              ))}
            </div>

            {source === 'builtin' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepYear(-1)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20"
                  aria-label="Previous theme"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="flex-1 bg-white/10 rounded px-2 py-1"
                >
                  {YEARS_WITH_THEME.map((y) => (
                    <option key={y} value={y} className="bg-[#0d0912]">
                      {themeLabel(y)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => stepYear(1)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20"
                  aria-label="Next theme"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}

            {source === 'custom' && (
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2">
                  <span className="w-10 font-bold">Hue</span>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={hslHue}
                    onChange={(e) => setHslHue(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right tabular-nums">
                    {hslHue}°
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-10 font-bold">Shade</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={shade}
                    onChange={(e) => setShade(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right tabular-nums">{shade}</span>
                </label>
              </div>
            )}

            <label className="flex items-center gap-1.5 text-white/75">
              <input
                type="checkbox"
                checked={useLabPicks}
                onChange={(e) => setUseLabPicks(e.target.checked)}
              />
              Use Palette Lab picks ({countPicks(picks)})
            </label>

            <AccentControl
              label="Accent"
              value={tokens.accent}
              override={accentOverride}
              onOverride={setAccentOverride}
            />
            <AccentControl
              label="Accent 2"
              value={tokens.accent2}
              override={accent2Override}
              onOverride={setAccent2Override}
            />

            <div className="flex items-center gap-2 text-white/50 tabular-nums">
              <span>
                primary {Math.round(tokens.hue)}° · L
                {tokens.lightness.toFixed(1)} · C{tokens.chroma.toFixed(3)}
              </span>
              <a
                href="/dev/palette-lab"
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-white/80 hover:text-white"
              >
                Lab
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Dev-only panel that repaints the live app's interface tokens: any built-in
 * theme, any custom hue/shade, the Palette Lab's picks, or a hand-tuned
 * accent. Open with `?palette` (remembered until closed). It only writes CSS
 * variables on <html>; stores and the server are never touched.
 */
const PaletteDevPanel = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      if (new URL(window.location.href).searchParams.has('palette')) {
        localStorage.setItem(PANEL_FLAG, '1');
      }
      setEnabled(localStorage.getItem(PANEL_FLAG) === '1');
    } catch {
      setEnabled(false);
    }
  }, []);

  if (!enabled) return null;

  return createPortal(
    <Panel
      onClose={() => {
        try {
          localStorage.removeItem(PANEL_FLAG);
        } catch {
          // Storage blocked: the panel just closes for this page view.
        }
        setEnabled(false);
      }}
    />,
    document.body,
  );
};

export default PaletteDevPanel;
