'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { DesignStage } from './DesignRenderer';
import {
  ExportEngine,
  exportNode,
  ExportResult,
  formatBytes,
  formatMs,
  pixelDiff,
  PixelDiff,
} from './exportDesign';
import { buildLandscapeFixture, buildPortraitFixture } from './fixture';
import { Design } from './model';
import { Btn, envInfo, Field, inputCls, Mono, Section, useEnvInfo } from './ui';
import { useResolvedCountries } from './useDesignData';

interface Run {
  id: number;
  fixture: string;
  engine: ExportEngine;
  scale: number;
  format: 'png' | 'jpeg';
  skipPreload: boolean;
  result?: ExportResult;
  error?: string;
}

const ENGINES: ExportEngine[] = ['html-to-image', 'snapdom'];

/**
 * Question 1 of the PoC: does a deterministic single-pass export reproduce
 * the preview, with which engine, how fast, on which browsers.
 */
const ExportPanel: React.FC = () => {
  const [fixtureKind, setFixtureKind] = useState<'landscape' | 'portrait'>(
    'landscape',
  );
  const [design, setDesign] = useState<Design>(() => buildLandscapeFixture());
  const [engine, setEngine] = useState<ExportEngine | 'both'>('both');
  const [scale, setScale] = useState<1 | 2>(2);
  const [format, setFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [skipPreload, setSkipPreload] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [diff, setDiff] = useState<PixelDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(0.5);

  const nodeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  const data = useResolvedCountries(design.data);
  const env = useEnvInfo();

  useEffect(() => {
    setDesign(
      fixtureKind === 'landscape'
        ? buildLandscapeFixture()
        : buildPortraitFixture(),
    );
  }, [fixtureKind]);

  useEffect(() => {
    const fit = () => {
      const w = containerRef.current?.clientWidth ?? 800;

      setZoom(Math.min(1, (w - 8) / design.canvas.width));
    };

    fit();
    window.addEventListener('resize', fit);

    return () => window.removeEventListener('resize', fit);
  }, [design.canvas.width]);

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);

    setDesign((d) => ({
      ...d,
      elements: d.elements.map((el) =>
        el.id === 'upload-image' && el.type === 'image'
          ? { ...el, src: url }
          : el,
      ),
    }));
  };

  const run = useCallback(async () => {
    const node = nodeRef.current;

    if (!node) return;
    setBusy(true);
    setDiff(null);
    const engines = engine === 'both' ? ENGINES : [engine];
    const newRuns: Run[] = [];

    for (const eng of engines) {
      runId.current += 1;
      const base: Run = {
        id: runId.current,
        fixture: design.name,
        engine: eng,
        scale,
        format,
        skipPreload,
      };

      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await exportNode(node, {
          engine: eng,
          width: design.canvas.width,
          height: design.canvas.height,
          scale,
          format,
          skipPreload,
        });

        newRuns.push({ ...base, result });
      } catch (e) {
        newRuns.push({ ...base, error: String((e as Error)?.message ?? e) });
      }
    }
    setRuns((r) => [...newRuns, ...r]);

    if (newRuns.length === 2 && newRuns[0].result && newRuns[1].result) {
      try {
        setDiff(
          await pixelDiff(newRuns[0].result.dataUrl, newRuns[1].result.dataUrl),
        );
      } catch {
        setDiff(null);
      }
    }
    setBusy(false);
  }, [design, engine, scale, format, skipPreload]);

  const copyMarkdown = () => {
    const header =
      '| fixture | engine | scale | fmt | preload | preload ms | fonts ms | capture ms | encode ms | total ms | bytes | warnings |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
    const rows = runs
      .map((r) =>
        r.result
          ? `| ${r.fixture} | ${r.engine} | ${r.scale}× | ${r.format} | ${
              r.skipPreload ? 'skipped' : 'yes'
            } | ${r.result.timings.preloadMs.toFixed(
              0,
            )} | ${r.result.timings.fontsMs.toFixed(
              0,
            )} | ${r.result.timings.captureMs.toFixed(
              0,
            )} | ${r.result.timings.encodeMs.toFixed(
              0,
            )} | ${r.result.timings.totalMs.toFixed(0)} | ${formatBytes(
              r.result.bytes,
            )} | ${r.result.warnings.length} w / ${r.result.retries} retry |`
          : `| ${r.fixture} | ${r.engine} | ${r.scale}× | ${r.format} | ${
              r.skipPreload ? 'skipped' : 'yes'
            } | — | — | — | — | — | — | ERROR: ${r.error} |`,
      )
      .join('\n');

    navigator.clipboard?.writeText(`${envInfo()}\n\n${header}\n${rows}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <Section
        title="Export fidelity"
        right={<span className="text-xs text-neutral-400">{data.info}</span>}
      >
        <div className="flex flex-wrap gap-2 items-end">
          <Field label="Fixture">
            <select
              className={inputCls}
              value={fixtureKind}
              onChange={(e) => setFixtureKind(e.target.value as any)}
            >
              <option value="landscape">1200×630 (gradient bg)</option>
              <option value="portrait">1080×1920 (theme bg)</option>
            </select>
          </Field>
          <Field label="Engine">
            <select
              className={inputCls}
              value={engine}
              onChange={(e) => setEngine(e.target.value as any)}
            >
              <option value="both">both (A/B + pixel diff)</option>
              <option value="html-to-image">html-to-image</option>
              <option value="snapdom">snapdom</option>
            </select>
          </Field>
          <Field label="Scale">
            <select
              className={inputCls}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </Field>
          <Field label="Format">
            <select
              className={inputCls}
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <option value="jpeg">jpeg 0.92</option>
              <option value="png">png</option>
            </select>
          </Field>
          <label className="flex items-center gap-1 text-xs text-neutral-300 pb-1.5">
            <input
              type="checkbox"
              checked={skipPreload}
              onChange={(e) => setSkipPreload(e.target.checked)}
            />
            skip preload (legacy behaviour)
          </label>
          <Field label="Upload image → 'Uploaded image' element">
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </Field>
          <Btn onClick={run} disabled={busy} active>
            {busy ? 'Exporting…' : 'Export'}
          </Btn>
          <Btn onClick={copyMarkdown} disabled={!runs.length}>
            Copy results as markdown
          </Btn>
          <Btn onClick={() => setRuns([])} disabled={!runs.length}>
            Clear
          </Btn>
        </div>
        <Mono>{env}</Mono>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title={`Preview (zoom ${zoom.toFixed(2)})`}>
          <div ref={containerRef} className="w-full overflow-hidden">
            <DesignStage
              design={design}
              countries={data.countries}
              zoom={zoom}
              nodeRef={nodeRef}
            />
          </div>
        </Section>

        <Section
          title="Latest exports"
          right={
            diff && (
              <span
                className={`text-xs font-mono ${
                  diff.ratio < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                engine diff: {(diff.ratio * 100).toFixed(2)}% of sampled px
                {diff.sizeMismatch ? ' · SIZE MISMATCH' : ''}
              </span>
            )
          }
        >
          {runs.length === 0 && (
            <p className="text-xs text-neutral-500">
              Run an export. Compare each image to the preview: flags, fonts,
              gradients, the heart mask, the rotated panel, the uploaded image,
              the background.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {runs.slice(0, 4).map((r) => (
              <div key={r.id} className="flex flex-col gap-1">
                <div className="text-xs text-neutral-300 font-mono">
                  #{r.id} {r.engine} · {r.scale}× {r.format} ·{' '}
                  {r.skipPreload ? 'no preload' : 'preload'}
                  {r.result && (
                    <>
                      {' '}
                      · {r.result.width}×{r.result.height} ·{' '}
                      {formatBytes(r.result.bytes)} · total{' '}
                      <b>{formatMs(r.result.timings.totalMs)}</b> (preload{' '}
                      {formatMs(r.result.timings.preloadMs)}, capture{' '}
                      {formatMs(r.result.timings.captureMs)}, encode{' '}
                      {formatMs(r.result.timings.encodeMs)}) · inlined{' '}
                      {r.result.inlinedImages} img /{' '}
                      {r.result.inlinedBackgrounds} bg · retries{' '}
                      {r.result.retries}
                    </>
                  )}
                </div>
                {r.error && <Mono className="text-red-400">{r.error}</Mono>}
                {r.result?.warnings.length ? (
                  <Mono className="text-amber-300">
                    {r.result.warnings.join('\n')}
                  </Mono>
                ) : null}
                {r.result && (
                  <img
                    src={r.result.dataUrl}
                    alt={`export ${r.id}`}
                    className="w-full h-auto rounded border border-neutral-800"
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {runs.length > 0 && (
        <Section title="All runs">
          <div className="overflow-x-auto">
            <table className="text-xs font-mono w-full">
              <thead className="text-neutral-400">
                <tr>
                  {[
                    '#',
                    'fixture',
                    'engine',
                    'scale',
                    'fmt',
                    'preload?',
                    'preload ms',
                    'fonts',
                    'capture',
                    'encode',
                    'total',
                    'bytes',
                    'warn',
                  ].map((h) => (
                    <th key={h} className="text-left pr-3 py-1">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-800">
                    <td className="pr-3 py-1">{r.id}</td>
                    <td className="pr-3">{r.fixture}</td>
                    <td className="pr-3">{r.engine}</td>
                    <td className="pr-3">{r.scale}×</td>
                    <td className="pr-3">{r.format}</td>
                    <td className="pr-3">{r.skipPreload ? 'skip' : 'yes'}</td>
                    {r.result ? (
                      <>
                        <td className="pr-3">
                          {r.result.timings.preloadMs.toFixed(0)}
                        </td>
                        <td className="pr-3">
                          {r.result.timings.fontsMs.toFixed(0)}
                        </td>
                        <td className="pr-3">
                          {r.result.timings.captureMs.toFixed(0)}
                        </td>
                        <td className="pr-3">
                          {r.result.timings.encodeMs.toFixed(0)}
                        </td>
                        <td className="pr-3 font-bold">
                          {r.result.timings.totalMs.toFixed(0)}
                        </td>
                        <td className="pr-3">{formatBytes(r.result.bytes)}</td>
                        <td className="pr-3">
                          {r.result.warnings.length} w / {r.result.retries} r
                        </td>
                      </>
                    ) : (
                      <td colSpan={7} className="text-red-400">
                        {r.error}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
};

export default ExportPanel;
