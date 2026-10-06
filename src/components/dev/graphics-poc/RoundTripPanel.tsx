'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { DesignStage } from './DesignRenderer';
import { useEditorStore } from './editorStore';
import {
  ExportEngine,
  exportNode,
  ExportResult,
  formatMs,
  pixelDiff,
  PixelDiff,
  sha256,
} from './exportDesign';
import { buildResultsTemplate } from './fixture';
import {
  DataBinding,
  Design,
  getAtPath,
  parseDesign,
  serializeDesign,
  setAtPath,
} from './model';
import { Btn, Field, inputCls, Mono, Section } from './ui';
import { useResolvedCountries } from './useDesignData';

const useFitZoom = (
  width: number,
  ref: React.RefObject<HTMLDivElement | null>,
) => {
  const [zoom, setZoom] = useState(0.4);

  useEffect(() => {
    const fit = () => {
      const w = ref.current?.clientWidth ?? 600;

      setZoom(Math.min(1, (w - 8) / width));
    };

    fit();
    window.addEventListener('resize', fit);

    return () => window.removeEventListener('resize', fit);
  }, [width, ref]);

  return zoom;
};

interface RoundTripReport {
  jsonBytes: number;
  hashA: string;
  hashB: string;
  parseOk: boolean;
  parseError?: string;
  exportA?: ExportResult;
  exportB?: ExportResult;
  diff?: PixelDiff;
}

/** Question 3: zod round-trip + a template with bound fields. */
const RoundTripPanel: React.FC = () => {
  const [engine, setEngine] = useState<ExportEngine>('html-to-image');

  /* ---------- round trip of the editor's current design ---------- */
  const designA = useEditorStore((s) => s.design);
  const [designB, setDesignB] = useState<Design | null>(null);
  const [report, setReport] = useState<RoundTripReport | null>(null);
  const [busy, setBusy] = useState(false);
  const refA = useRef<HTMLDivElement>(null);
  const refB = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const zoomRT = useFitZoom(designA.canvas.width, colRef);
  const dataA = useResolvedCountries(designA.data);

  const runRoundTrip = async () => {
    setBusy(true);
    try {
      const json = serializeDesign(designA);
      const hashA = await sha256(json);
      let parsed: Design | null = null;
      let parseError: string | undefined;

      try {
        parsed = parseDesign(JSON.parse(json));
      } catch (e) {
        parseError = String((e as Error)?.message ?? e);
      }
      setDesignB(parsed);
      const hashB = parsed ? await sha256(serializeDesign(parsed)) : '';
      const next: RoundTripReport = {
        jsonBytes: json.length,
        hashA,
        hashB,
        parseOk: !!parsed,
        parseError,
      };

      setReport(next);
      if (!parsed) return;

      // Let B render, then export both with identical options.
      await new Promise((r) => setTimeout(r, 150));
      const opts = {
        engine,
        width: designA.canvas.width,
        height: designA.canvas.height,
        scale: 1,
        format: 'png' as const,
      };

      if (!refA.current || !refB.current) return;
      const exportA = await exportNode(refA.current, opts);
      const exportB = await exportNode(refB.current, opts);
      const diff = await pixelDiff(exportA.dataUrl, exportB.dataUrl, 2, 8);

      setReport({ ...next, exportA, exportB, diff });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- template with bound fields ---------- */
  const [template, setTemplate] = useState<Design>(() =>
    buildResultsTemplate(),
  );
  const [contestId, setContestId] = useState('');
  const [tplExport, setTplExport] = useState<ExportResult | null>(null);
  const tplRef = useRef<HTMLDivElement>(null);
  const tplColRef = useRef<HTMLDivElement>(null);
  const zoomTpl = useFitZoom(template.canvas.width, tplColRef);
  const dataTpl = useResolvedCountries(template.data);

  const setSource = (source: DataBinding['source']) => {
    const data: DataBinding =
      source === 'contest'
        ? { source, contestId: contestId || 'missing' }
        : source === 'fixture'
        ? { source, count: 26 }
        : source === 'manual'
        ? {
            source,
            rows: [
              { code: 'UA', name: 'Ukraine', points: 631 },
              { code: 'SE', name: 'Sweden', points: 466 },
              { code: 'ES', name: 'Spain', points: 459 },
              { code: 'XX', name: 'My custom entry', points: 300 },
            ],
          }
        : { source: 'live' };

    setTemplate((t) => ({ ...t, data }));
  };

  useEffect(() => {
    if (template.data.source === 'contest' && contestId) {
      setTemplate((t) => ({ ...t, data: { source: 'contest', contestId } }));
    }
  }, [contestId, template.data.source]);

  const templateJsonValid = useMemo(() => {
    try {
      parseDesign(JSON.parse(serializeDesign(template)));

      return true;
    } catch {
      return false;
    }
  }, [template]);

  const exportTemplate = async () => {
    if (!tplRef.current) return;
    setTplExport(
      await exportNode(tplRef.current, {
        engine,
        width: template.canvas.width,
        height: template.canvas.height,
        scale: 2,
        format: 'jpeg',
      }),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Section
        title="Round trip: editor design → JSON → zod → render → export → compare"
        right={
          <select
            className={inputCls + ' !w-auto'}
            value={engine}
            onChange={(e) => setEngine(e.target.value as ExportEngine)}
          >
            <option value="html-to-image">html-to-image</option>
            <option value="snapdom">snapdom</option>
          </select>
        }
      >
        <div className="flex gap-2 items-center">
          <Btn onClick={runRoundTrip} disabled={busy} active>
            {busy ? 'Running…' : 'Run round trip'}
          </Btn>
          <span className="text-xs text-neutral-400">
            Uses the design currently in the Editor tab (
            {designA.elements.length} elements, {dataA.info}).
          </span>
        </div>
        {report && (
          <Mono
            className={
              report.parseOk &&
              report.hashA === report.hashB &&
              report.diff &&
              report.diff.ratio < 0.005 &&
              !report.diff.sizeMismatch
                ? 'text-emerald-300'
                : 'text-amber-300'
            }
          >
            {[
              `json: ${report.jsonBytes} bytes`,
              `zod parse: ${
                report.parseOk ? 'ok' : `FAIL ${report.parseError}`
              }`,
              `hash A: ${report.hashA.slice(0, 16)}…`,
              `hash B: ${report.hashB.slice(0, 16)}… ${
                report.hashA === report.hashB ? '(identical)' : '(DIFFERENT)'
              }`,
              report.exportA &&
                `export A: ${formatMs(report.exportA.timings.totalMs)}`,
              report.exportB &&
                `export B: ${formatMs(report.exportB.timings.totalMs)}`,
              report.diff &&
                `pixel diff: ${(report.diff.ratio * 100).toFixed(3)}% of ${
                  report.diff.sampled
                } sampled px${
                  report.diff.sizeMismatch ? ' · SIZE MISMATCH' : ''
                } → ${
                  report.diff.ratio < 0.005 && !report.diff.sizeMismatch
                    ? 'PASS'
                    : 'CHECK'
                }`,
            ]
              .filter(Boolean)
              .join('\n')}
          </Mono>
        )}
        <div ref={colRef} className="grid gap-3 lg:grid-cols-2">
          <div>
            <div className="text-xs text-neutral-400 mb-1">
              A · in-memory design
            </div>
            <DesignStage
              design={designA}
              countries={dataA.countries}
              zoom={zoomRT / 2}
              nodeRef={refA}
            />
          </div>
          <div>
            <div className="text-xs text-neutral-400 mb-1">
              B · reparsed from JSON
            </div>
            {designB ? (
              <DesignStage
                design={designB}
                countries={dataA.countries}
                zoom={zoomRT / 2}
                nodeRef={refB}
              />
            ) : (
              <div className="text-xs text-neutral-600">run first</div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Template: bound fields + data source">
        <div className="flex flex-wrap gap-2 items-end">
          {template.templateFields?.map((f) => {
            const value = getAtPath(template, f.path);

            return (
              <Field key={f.path} label={`${f.label} (${f.path})`}>
                {f.kind === 'select' ? (
                  <select
                    className={inputCls}
                    value={String(value)}
                    onChange={(e) =>
                      setTemplate((t) =>
                        setAtPath(
                          t,
                          f.path,
                          typeof f.options?.[0] === 'number'
                            ? Number(e.target.value)
                            : e.target.value,
                        ),
                      )
                    }
                  >
                    {f.options?.map((o) => (
                      <option key={String(o)} value={String(o)}>
                        {String(o)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputCls}
                    value={String(value ?? '')}
                    onChange={(e) =>
                      setTemplate((t) =>
                        setAtPath(
                          t,
                          f.path,
                          f.kind === 'number'
                            ? Number(e.target.value)
                            : e.target.value,
                        ),
                      )
                    }
                  />
                )}
              </Field>
            );
          })}
          <Field label="Data source">
            <select
              className={inputCls}
              value={template.data.source}
              onChange={(e) =>
                setSource(e.target.value as DataBinding['source'])
              }
            >
              <option value="live">live scoreboard store</option>
              <option value="contest">saved contest snapshot</option>
              <option value="manual">manual rows</option>
              <option value="fixture">fixture</option>
            </select>
          </Field>
          {template.data.source === 'contest' && (
            <Field label="Contest id (must be yours or public)">
              <input
                className={inputCls}
                value={contestId}
                placeholder="24-char Mongo id"
                onChange={(e) => setContestId(e.target.value.trim())}
              />
            </Field>
          )}
          <Btn onClick={exportTemplate} active>
            Export template (2×)
          </Btn>
          <span
            className={`text-xs font-mono ${
              templateJsonValid ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            zod: {templateJsonValid ? 'valid' : 'INVALID'} · {dataTpl.status} ·{' '}
            {dataTpl.info}
          </span>
        </div>
        <div ref={tplColRef} className="grid gap-3 lg:grid-cols-2">
          <DesignStage
            design={template}
            countries={dataTpl.countries}
            zoom={zoomTpl / 2}
            nodeRef={tplRef}
          />
          {tplExport && (
            <div>
              <Mono>
                {tplExport.width}×{tplExport.height} ·{' '}
                {formatMs(tplExport.timings.totalMs)}
              </Mono>
              <img
                src={tplExport.dataUrl}
                alt="template export"
                className="w-full rounded border border-neutral-800"
              />
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default RoundTripPanel;
