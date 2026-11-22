'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import ThemePreviewCountryItemUI from '@/components/setup/widgets-section/custom-themes/ThemePreviewCountryItemUI';
import DouzeSpecPlayer from '@/douze/DouzeSpecPlayer';
import type { DouzeAnimationSpec } from '@/douze/model';
import {
  type DouzeOptions,
  sanitizeDouzeOptions,
  withDouzeOptions,
} from '@/douze/options';
import { year2021Douze } from '@/douze/specs/year2021';
import { year2022Douze } from '@/douze/specs/year2022';
import { year2023Douze } from '@/douze/specs/year2023';
import { year2024Douze } from '@/douze/specs/year2024';
import { year2026Douze } from '@/douze/specs/year2026';
import { hexToHsl, hslToString } from '@/helpers/colorConversion';
import { getThemeBackground } from '@/theme/themes';
import { resolveThemeSpecificsForBaseThemeYear } from '@/theme/themeSpecifics';
import type { FlagShape, PointsContainerShape } from '@/theme/types';

const SPECS: { label: string; year: string; spec: DouzeAnimationSpec }[] = [
  { label: '2021', year: '2021', spec: year2021Douze },
  { label: '2022', year: '2022', spec: year2022Douze },
  { label: '2023', year: '2023', spec: year2023Douze },
  { label: '2024', year: '2024', spec: year2024Douze },
  { label: '2026', year: '2026', spec: year2026Douze },
];

/** Base themes to try a spec on (2026: rounded pill rows). */
const BASE_YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

const COUNTRIES = [
  'UA',
  'RS',
  'AZ',
  'IT',
  'GB',
  'MK',
  'IL',
  'DK',
  'LU',
  'SE',
  'IS',
  'FR',
  'LT',
  'DE',
];
const WIDTHS = [
  { label: 'Board (416)', value: 416 },
  { label: 'Phone (320)', value: 320 },
  { label: 'Wide (560)', value: 560 },
];
const FRAME_MS = 1000 / 30;

/** Flag shapes to try a spec with (the base theme's own by default). */
const FLAG_SHAPES: FlagShape[] = [
  'big-rectangle',
  'small-rectangle',
  'square',
  'round',
  'round-border',
  'none',
];

/** Points shapes a custom theme can pick (the base theme's own by default). */
const POINTS_SHAPES: PointsContainerShape[] = [
  'triangle',
  'square',
  'transparent',
];

/**
 * A custom theme's row look over the base theme's: pill or square rows,
 * the points' shape and the total's colour (a theme colour variable, as
 * a custom theme's overrides set it).
 */
type RowLook = {
  flagShape: FlagShape | null;
  rounded: boolean | null;
  pointsShape: PointsContainerShape | null;
  /** `#rrggbb`. */
  pointsColor: string | null;
};

/** A row with the player held at `heldAtMs` (or playing when null). */
const LabRow: React.FC<{
  spec: DouzeAnimationSpec;
  year: string;
  countryCode: string;
  width: number;
  heldAtMs: number | null;
  runKey: number;
  playbackRate: number;
  lite: boolean;
  look: RowLook;
  label?: string;
}> = ({
  spec,
  year,
  countryCode,
  width,
  heldAtMs,
  runKey,
  playbackRate,
  lite,
  look,
  label,
}) => {
  const specifics = resolveThemeSpecificsForBaseThemeYear(year);
  const colorStyle = look.pointsColor
    ? ({
        '--twc-countryItem-juryPointsBg': hslToString(
          hexToHsl(look.pointsColor),
        ),
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex items-center gap-3">
      {label !== undefined && (
        <span className="w-14 shrink-0 text-right font-mono text-xs text-white/70">
          {label}
        </span>
      )}
      {/* data-lab-t: the strip rows' boxes, for scripts/douze-frames.mjs compare. */}
      <div
        className="relative"
        style={{ width, ...colorStyle }}
        data-lab-t={label}
      >
        <ThemePreviewCountryItemUI
          baseThemeYear={year}
          state="jury"
          points={102}
          lastPoints={12}
          showDouzePointsAnimation={false}
          previewCountryCode={countryCode}
          uppercaseEntryName={specifics.uppercaseEntryName}
          flagShape={look.flagShape ?? specifics.flagShape}
          pointsContainerShape={
            look.pointsShape ?? specifics.pointsContainerShape
          }
          roundedCountryContainer={
            look.rounded ?? specifics.roundedCountryContainer
          }
        />
        <DouzeSpecPlayer
          spec={spec}
          heldAtMs={heldAtMs}
          runKey={runKey}
          playbackRate={playbackRate}
          lite={lite}
          pointsLabel="12 points"
        />
      </div>
    </div>
  );
};

const DouzeLab: React.FC = () => {
  const [specIndex, setSpecIndex] = useState(0);
  const [countryCode, setCountryCode] = useState('RS');
  const [width, setWidth] = useState(416);
  const [heldAtMs, setHeldAtMs] = useState<number | null>(700);
  const [runKey, setRunKey] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [lite, setLite] = useState(false);
  const [flagShape, setFlagShape] = useState<FlagShape | null>(null);
  const [rounded, setRounded] = useState<boolean | null>(null);
  const [pointsShape, setPointsShape] = useState<PointsContainerShape | null>(
    null,
  );
  const [pointsColor, setPointsColor] = useState<string | null>(null);
  const look = useMemo<RowLook>(
    () => ({ flagShape, rounded, pointsShape, pointsColor }),
    [flagShape, rounded, pointsShape, pointsColor],
  );
  // Rows are measured once per run: a new look remounts them.
  const lookKey = `${flagShape}-${rounded}-${pointsShape}-${pointsColor}`;
  const [options, setOptions] = useState<DouzeOptions | null>(null);
  const [zoom, setZoom] = useState(1.5);
  const [stepMs, setStepMs] = useState(100);
  const [stripFrom, setStripFrom] = useState(0);
  const [stripTo, setStripTo] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoOffsetMs, setVideoOffsetMs] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Client only: the rows measure the window and would not hydrate cleanly.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const { spec: baseSpec, year: specYear } = SPECS[specIndex];
  const [baseYear, setBaseYear] = useState<string | null>(null);
  const year = baseYear ?? specYear;
  // The spec as a custom theme with these options would play it.
  const spec = useMemo(
    () => withDouzeOptions(baseSpec, options),
    [baseSpec, options],
  );
  const setOption = (patch: Partial<DouzeOptions>) =>
    setOptions((current) => sanitizeDouzeOptions({ ...current, ...patch }));
  const timeline = useMemo(() => {
    const from = Math.max(0, stripFrom);
    const to = Math.min(spec.durationMs, stripTo ?? spec.durationMs);

    return Array.from(
      { length: Math.max(0, Math.floor((to - from) / stepMs)) + 1 },
      (_, i) => from + i * stepMs,
    );
  }, [spec.durationMs, stepMs, stripFrom, stripTo]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || heldAtMs === null) return;

    video.pause();
    video.currentTime = Math.max(0, (videoOffsetMs + heldAtMs) / 1000);
  }, [heldAtMs, videoOffsetMs, videoUrl]);

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  const play = (rate: number) => {
    setPlaybackRate(rate);
    setHeldAtMs(null);
    setRunKey((key) => key + 1);
    const video = videoRef.current;

    if (video) {
      video.playbackRate = rate;
      video.currentTime = videoOffsetMs / 1000;
      void video.play();
    }
  };

  if (!isMounted) return null;

  const hold = (ms: number) => {
    setHeldAtMs(Math.min(spec.durationMs, Math.max(0, Math.round(ms))));
  };

  return (
    <div
      className={`theme-${year} min-h-screen bg-cover bg-center p-6 text-white`}
      style={{ backgroundImage: `url(${getThemeBackground(year)})` }}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-black/60 p-3 text-sm">
        <strong>Douze lab</strong>
        <select
          className="rounded bg-black/50 px-2 py-1"
          value={specIndex}
          onChange={(e) => setSpecIndex(Number(e.target.value))}
        >
          {SPECS.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          data-lab-base=""
          value={year}
          onChange={(e) => setBaseYear(e.target.value)}
        >
          {BASE_YEARS.map((y) => (
            <option key={y} value={y}>
              Base {y}
            </option>
          ))}
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
        >
          {COUNTRIES.map((code) => (
            <option key={code}>{code}</option>
          ))}
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        >
          {WIDTHS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          data-lab-flag=""
          value={flagShape ?? ''}
          onChange={(e) =>
            setFlagShape((e.target.value || null) as FlagShape | null)
          }
        >
          <option value="">Theme's flag</option>
          {FLAG_SHAPES.map((shape) => (
            <option key={shape}>{shape}</option>
          ))}
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          data-lab-rows=""
          value={rounded === null ? '' : rounded ? 'rounded' : 'square'}
          onChange={(e) =>
            setRounded(e.target.value ? e.target.value === 'rounded' : null)
          }
        >
          <option value="">Theme's rows</option>
          <option value="rounded">Pill rows</option>
          <option value="square">Square rows</option>
        </select>
        <select
          className="rounded bg-black/50 px-2 py-1"
          data-lab-points=""
          value={pointsShape ?? ''}
          onChange={(e) =>
            setPointsShape(
              (e.target.value || null) as PointsContainerShape | null,
            )
          }
        >
          <option value="">Theme's points</option>
          {POINTS_SHAPES.map((shape) => (
            <option key={shape}>{shape}</option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={pointsColor !== null}
            onChange={(e) =>
              setPointsColor(e.target.checked ? '#800000' : null)
            }
          />
          total
          <input
            type="color"
            data-lab-points-color=""
            value={pointsColor ?? '#800000'}
            onChange={(e) => setPointsColor(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-1">
          Zoom
          <input
            type="number"
            step={0.25}
            min={0.5}
            className="w-16 rounded bg-black/50 px-1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value) || 1)}
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={lite}
            onChange={(e) => setLite(e.target.checked)}
          />
          Lite
        </label>
        <select
          className="rounded bg-black/50 px-2 py-1"
          data-lab-colors=""
          value={options?.colors ?? ''}
          onChange={(e) =>
            setOption(
              e.target.value === 'custom'
                ? {
                    colors: 'custom',
                    custom: ['#ff2d6f', '#2de1ff', '#ffd23f'],
                  }
                : {
                    colors: (e.target.value || undefined) as
                      | DouzeOptions['colors']
                      | undefined,
                    custom: undefined,
                  },
            )
          }
        >
          <option value="">Own colours</option>
          <option value="flag">Flag colours</option>
          <option value="theme">Theme colours</option>
          <option value="custom">Custom (pink, cyan, gold)</option>
        </select>
        <label className="flex items-center gap-1">
          speed
          <input
            type="number"
            data-lab-speed=""
            step={0.05}
            min={0.5}
            max={2}
            className="w-16 rounded bg-black/50 px-1"
            value={options?.speed ?? 1}
            onChange={(e) => setOption({ speed: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1">
          veil
          <input
            type="color"
            value={options?.veil ?? '#ffffff'}
            onChange={(e) => setOption({ veil: e.target.value })}
          />
        </label>
        {baseSpec.parts?.map((part) => (
          <label key={part} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!options?.off?.includes(part)}
              onChange={(e) =>
                setOption({
                  off: e.target.checked
                    ? options?.off?.filter((id) => id !== part)
                    : [...(options?.off ?? []), part],
                })
              }
            />
            {part}
          </label>
        ))}
        {(['glow', 'wash'] as const).map((key) => (
          <label key={key} className="flex items-center gap-1">
            {key}
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              className="w-14 rounded bg-black/50 px-1"
              value={options?.[key] ?? 1}
              onChange={(e) => setOption({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <button
          type="button"
          className="rounded bg-white/15 px-2 py-1"
          onClick={() => play(1)}
        >
          Play
        </button>
        <button
          type="button"
          className="rounded bg-white/15 px-2 py-1"
          onClick={() => play(0.25)}
        >
          Play ×0.25
        </button>
        <button
          type="button"
          className="rounded bg-white/15 px-2 py-1"
          onClick={() => hold((heldAtMs ?? 0) - FRAME_MS)}
        >
          −1 frame
        </button>
        <button
          type="button"
          className="rounded bg-white/15 px-2 py-1"
          onClick={() => hold((heldAtMs ?? 0) + FRAME_MS)}
        >
          +1 frame
        </button>
        <input
          type="range"
          min={0}
          max={spec.durationMs}
          value={heldAtMs ?? 0}
          onChange={(e) => hold(Number(e.target.value))}
          className="w-64"
        />
        <input
          type="number"
          data-lab-time=""
          className="w-20 rounded bg-black/50 px-1 font-mono"
          value={heldAtMs ?? ''}
          onChange={(e) => hold(Number(e.target.value))}
        />
        ms
        <label className="flex items-center gap-1">
          Strip step
          <input
            type="number"
            data-lab-strip-step=""
            className="w-16 rounded bg-black/50 px-1"
            value={stepMs}
            min={20}
            onChange={(e) => setStepMs(Math.max(20, Number(e.target.value)))}
          />
        </label>
        <label className="flex items-center gap-1">
          from
          <input
            type="number"
            data-lab-strip-from=""
            className="w-16 rounded bg-black/50 px-1"
            value={stripFrom}
            min={0}
            onChange={(e) => setStripFrom(Number(e.target.value) || 0)}
          />
          to
          <input
            type="number"
            data-lab-strip-to=""
            className="w-16 rounded bg-black/50 px-1"
            value={stripTo ?? spec.durationMs}
            onChange={(e) => setStripTo(Number(e.target.value) || null)}
          />
        </label>
        <label className="flex items-center gap-1">
          Reference video
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) setVideoUrl(URL.createObjectURL(file));
            }}
          />
        </label>
        <label className="flex items-center gap-1">
          its t=0 at
          <input
            type="number"
            className="w-20 rounded bg-black/50 px-1"
            value={videoOffsetMs}
            onChange={(e) => setVideoOffsetMs(Number(e.target.value))}
          />
          ms
        </label>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div style={{ zoom }} data-lab-main="">
          <LabRow
            key={`${countryCode}-${width}-${specIndex}-${year}-${lookKey}`}
            spec={spec}
            year={year}
            countryCode={countryCode}
            width={width}
            heldAtMs={heldAtMs}
            runKey={runKey}
            playbackRate={playbackRate}
            lite={lite}
            look={look}
          />
        </div>
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            className="max-w-[640px] rounded"
          />
        )}
      </div>

      <div
        // Room between the rows: some animations lift the row out of its
        // place (2021), and the compare script cuts each with its margin.
        className="mt-8 grid w-fit gap-x-12 gap-y-10"
        style={{
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${Math.ceil(timeline.length / 2)}, auto)`,
        }}
        data-lab-strip=""
      >
        {timeline.map((t) => (
          <LabRow
            key={`${t}-${countryCode}-${width}-${specIndex}-${year}-${lookKey}`}
            spec={spec}
            year={year}
            countryCode={countryCode}
            width={width}
            heldAtMs={t}
            runKey={0}
            playbackRate={1}
            lite={lite}
            look={look}
            label={`${t}`}
          />
        ))}
      </div>
    </div>
  );
};

export default DouzeLab;
