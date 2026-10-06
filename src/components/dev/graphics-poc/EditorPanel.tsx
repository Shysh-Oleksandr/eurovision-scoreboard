'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { DesignStage } from './DesignRenderer';
import { editorHistory, useEditorStore } from './editorStore';
import {
  ExportEngine,
  exportNode,
  ExportResult,
  formatMs,
} from './exportDesign';
import { buildLandscapeFixture, buildPortraitFixture } from './fixture';
import { HANDLES, Rect, resizeRect, rotateRect, snapRect } from './geometry';
import { DesignElement, newId } from './model';
import SelectionOverlay from './SelectionOverlay';
import { Btn, Field, inputCls, Mono, NumberInput, Section } from './ui';
import { useResolvedCountries } from './useDesignData';
import { useGestures } from './useGestures';

const ZOOMS = [0.25, 0.5, 0.75, 1];

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

/** Pure-math self test: resize there-and-back, rotate there-and-back, snap. */
function runGeometrySelfTest(): string[] {
  const out: string[] = [];
  const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const sameRect = (a: Rect, b: Rect) =>
    eq(a.x, b.x) && eq(a.y, b.y) && eq(a.w, b.w) && eq(a.h, b.h);

  [0, 30, 125, 270].forEach((rotation) => {
    const start: Rect = { x: 100, y: 80, w: 300, h: 160, rotation };

    HANDLES.forEach((h) => {
      const d = { x: 37, y: 23 };
      const grown = resizeRect(start, h, d, { minSize: 1 });
      const back = resizeRect(grown, h, { x: -d.x, y: -d.y }, { minSize: 1 });

      out.push(
        `${
          sameRect(back, start) ? 'PASS' : 'FAIL'
        } resize ${h} @${rotation}° there-and-back`,
      );
    });

    // Anchored side must not move: compare the corner opposite to 'se'.
    const grown = resizeRect(start, 'se', { x: 50, y: 20 }, { minSize: 1 });
    const cornerOf = (r: Rect) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const a = (r.rotation * Math.PI) / 180;
      const lx = -r.w / 2;
      const ly = -r.h / 2;

      return {
        x: cx + lx * Math.cos(a) - ly * Math.sin(a),
        y: cy + lx * Math.sin(a) + ly * Math.cos(a),
      };
    };
    const c0 = cornerOf(start);
    const c1 = cornerOf(grown);

    out.push(
      `${
        eq(c0.x, c1.x) && eq(c0.y, c1.y) ? 'PASS' : 'FAIL'
      } resize se @${rotation}° keeps NW corner fixed`,
    );
  });

  const r: Rect = { x: 0, y: 0, w: 100, h: 50, rotation: 10 };
  const pivot = { x: 50, y: 25 };
  const rot = rotateRect(r, pivot, { x: 100, y: 25 }, { x: 50, y: 75 });
  const backRot = rotateRect(rot, pivot, { x: 50, y: 75 }, { x: 100, y: 25 });

  out.push(
    `${
      eq(rot.rotation, 100) ? 'PASS' : 'FAIL'
    } rotate +90° (10 → ${rot.rotation.toFixed(3)})`,
  );
  out.push(
    `${
      eq(backRot.rotation, 10) ? 'PASS' : 'FAIL'
    } rotate back (→ ${backRot.rotation.toFixed(3)})`,
  );

  const snapped = snapRect(
    { x: 553, y: 10, w: 100, h: 20, rotation: 0 },
    { width: 1200, height: 630 },
    [],
    6,
  );

  out.push(
    `${
      snapped.rect.x === 550 && snapped.guides.length === 1 ? 'PASS' : 'FAIL'
    } snap center → 600 (x=${snapped.rect.x})`,
  );

  return out;
}

const Inspector: React.FC<{ el: DesignElement }> = ({ el }) => {
  const update = useEditorStore((s) => s.updateElement);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const set = (patch: Partial<DesignElement>) => update(el.id, patch);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-400 font-mono">
        {el.type} · {el.id}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="x">
          <NumberInput value={el.x} onChange={(x) => set({ x })} />
        </Field>
        <Field label="y">
          <NumberInput value={el.y} onChange={(y) => set({ y })} />
        </Field>
        <Field label="w">
          <NumberInput value={el.w} min={1} onChange={(w) => set({ w })} />
        </Field>
        <Field label="h">
          <NumberInput value={el.h} min={1} onChange={(h) => set({ h })} />
        </Field>
        <Field label="rotation">
          <NumberInput
            value={el.rotation}
            onChange={(rotation) => set({ rotation })}
          />
        </Field>
        <Field label="opacity">
          <NumberInput
            value={el.opacity}
            step={0.05}
            min={0}
            max={1}
            onChange={(opacity) => set({ opacity })}
          />
        </Field>
      </div>
      <div className="flex gap-2 text-xs text-neutral-300">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={el.locked}
            onChange={(e) => set({ locked: e.target.checked })}
          />
          locked
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={el.hidden}
            onChange={(e) => set({ hidden: e.target.checked })}
          />
          hidden
        </label>
        <Btn onClick={() => sendBackward(el.id)}>[ back</Btn>
        <Btn onClick={() => bringForward(el.id)}>] fwd</Btn>
      </div>

      {el.type === 'text' && (
        <>
          <Field label="text">
            <textarea
              className={inputCls}
              rows={2}
              value={el.text}
              onChange={(e) => set({ text: e.target.value } as any)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="size">
              <NumberInput
                value={el.fontSize}
                min={4}
                onChange={(fontSize) => set({ fontSize } as any)}
              />
            </Field>
            <Field label="weight">
              <NumberInput
                value={el.fontWeight}
                step={100}
                min={100}
                max={900}
                onChange={(fontWeight) => set({ fontWeight } as any)}
              />
            </Field>
            <Field label="color">
              <input
                type="color"
                value={el.color.startsWith('#') ? el.color : '#ffffff'}
                onChange={(e) => set({ color: e.target.value } as any)}
              />
            </Field>
            <Field label="font">
              <select
                className={inputCls}
                value={el.fontSlot}
                onChange={(e) => set({ fontSlot: e.target.value } as any)}
              >
                <option value="ui">UI font</option>
                <option value="scoreboard">scoreboard font</option>
              </select>
            </Field>
            <Field label="align">
              <select
                className={inputCls}
                value={el.align}
                onChange={(e) => set({ align: e.target.value } as any)}
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </Field>
            <label className="flex items-end gap-1 text-xs text-neutral-300 pb-1.5">
              <input
                type="checkbox"
                checked={el.uppercase}
                onChange={(e) => set({ uppercase: e.target.checked } as any)}
              />
              uppercase
            </label>
          </div>
        </>
      )}

      {el.type === 'image' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="upload">
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];

                if (f) set({ src: URL.createObjectURL(f) } as any);
              }}
            />
          </Field>
          <Field label="radius">
            <NumberInput
              value={el.radius}
              min={0}
              onChange={(radius) => set({ radius } as any)}
            />
          </Field>
          <Field label="fit">
            <select
              className={inputCls}
              value={el.fit}
              onChange={(e) => set({ fit: e.target.value } as any)}
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </Field>
          <Field label="mask">
            <select
              className={inputCls}
              value={el.mask}
              onChange={(e) => set({ mask: e.target.value } as any)}
            >
              <option value="none">none</option>
              <option value="heart">heart</option>
            </select>
          </Field>
        </div>
      )}

      {el.type === 'shape' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="kind">
            <select
              className={inputCls}
              value={el.kind}
              onChange={(e) => set({ kind: e.target.value } as any)}
            >
              <option value="rect">rect</option>
              <option value="ellipse">ellipse</option>
            </select>
          </Field>
          <Field label="fill (css)">
            <input
              className={inputCls}
              value={
                el.fill.kind === 'theme-bg'
                  ? 'theme-bg'
                  : (el.fill as any).value ?? (el.fill as any).url
              }
              onChange={(e) => {
                const v = e.target.value;

                set({
                  fill: /gradient\(/.test(v)
                    ? { kind: 'gradient', value: v }
                    : { kind: 'color', value: v },
                } as any);
              }}
            />
          </Field>
          <Field label="radius">
            <NumberInput
              value={el.radius}
              min={0}
              onChange={(radius) => set({ radius } as any)}
            />
          </Field>
          <label className="flex items-end gap-1 text-xs text-neutral-300 pb-1.5">
            <input
              type="checkbox"
              checked={el.shadow}
              onChange={(e) => set({ shadow: e.target.checked } as any)}
            />
            shadow
          </label>
        </div>
      )}

      {el.type === 'flag' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="country code">
            <input
              className={inputCls}
              value={el.countryCode}
              maxLength={2}
              onChange={(e) =>
                set({ countryCode: e.target.value.toUpperCase() } as any)
              }
            />
          </Field>
          <Field label="shape">
            <select
              className={inputCls}
              value={el.shape}
              onChange={(e) => set({ shape: e.target.value } as any)}
            >
              <option value="heart">heart</option>
              <option value="round">round</option>
              <option value="rect">rect</option>
            </select>
          </Field>
        </div>
      )}

      {el.type === 'scoreboard' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="columns">
            <NumberInput
              value={el.columns}
              min={1}
              max={8}
              onChange={(columns) =>
                set({ columns: Math.round(columns) } as any)
              }
            />
          </Field>
          <Field label="item size">
            <select
              className={inputCls}
              value={el.itemSize}
              onChange={(e) => set({ itemSize: e.target.value } as any)}
            >
              {['sm', 'md', 'lg', 'xl', '2xl'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="rows (to)">
            <NumberInput
              value={el.to ?? 0}
              min={0}
              onChange={(to) =>
                set({ to: to > 0 ? Math.round(to) : undefined } as any)
              }
            />
          </Field>
          <div className="flex flex-col gap-1 text-xs text-neutral-300 justify-end">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={el.showPoints}
                onChange={(e) => set({ showPoints: e.target.checked } as any)}
              />
              points
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={el.showRankings}
                onChange={(e) => set({ showRankings: e.target.checked } as any)}
              />
              rankings
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

/** Question 2 of the PoC: a hand-rolled transform layer in a scaled stage. */
const EditorPanel: React.FC = () => {
  const design = useEditorStore((s) => s.design);
  const selectedId = useEditorStore((s) => s.selectedId);
  const zoom = useEditorStore((s) => s.zoom);
  const opCount = useEditorStore((s) => s.opCount);
  const {
    setDesign,
    setZoom,
    select,
    addElement,
    duplicateSelected,
    removeSelected,
  } = useEditorStore.getState();
  const past = useStore(editorHistory, (s) => s.pastStates.length);
  const future = useStore(editorHistory, (s) => s.futureStates.length);

  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const { startMove, startResize, startRotate, guides, active } =
    useGestures(stageRef);

  const data = useResolvedCountries(design.data);
  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  const [selfTest, setSelfTest] = useState<string[]>([]);
  const [engine, setEngine] = useState<ExportEngine>('html-to-image');
  const [exp, setExp] = useState<ExportResult | null>(null);
  const [exporting, setExporting] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const st = useEditorStore.getState();
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editorHistory.getState().redo();
        else editorHistory.getState().undo();

        return;
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        st.duplicateSelected();

        return;
      }
      if (!st.selectedId) return;
      const el = st.design.elements.find((x) => x.id === st.selectedId);

      if (!el) return;
      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          st.updateElement(el.id, { x: el.x - step });
          break;
        case 'ArrowRight':
          e.preventDefault();
          st.updateElement(el.id, { x: el.x + step });
          break;
        case 'ArrowUp':
          e.preventDefault();
          st.updateElement(el.id, { y: el.y - step });
          break;
        case 'ArrowDown':
          e.preventDefault();
          st.updateElement(el.id, { y: el.y + step });
          break;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          st.removeSelected();
          break;
        case '[':
          st.sendBackward(el.id);
          break;
        case ']':
          st.bringForward(el.id);
          break;
        case 'Escape':
          st.select(null);
          break;
        default:
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const add = useCallback(
    (type: DesignElement['type']) => {
      const base = {
        id: newId(type),
        x: 100,
        y: 100,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
      };
      const el: DesignElement =
        type === 'text'
          ? {
              ...base,
              type,
              w: 400,
              h: 60,
              text: 'New text',
              fontSize: 40,
              fontWeight: 700,
              color: '#ffffff',
              align: 'center',
              uppercase: false,
              shadow: true,
              fontSlot: 'ui',
            }
          : type === 'image'
          ? {
              ...base,
              type,
              w: 200,
              h: 200,
              src: '/img/favicon-128x128.png',
              fit: 'contain',
              radius: 0,
              mask: 'none',
            }
          : type === 'shape'
          ? {
              ...base,
              type,
              w: 300,
              h: 200,
              kind: 'rect',
              fill: { kind: 'color', value: 'rgba(255,255,255,0.25)' },
              radius: 24,
              strokeWidth: 0,
              shadow: false,
            }
          : type === 'flag'
          ? { ...base, type, w: 160, h: 140, countryCode: 'UA', shape: 'heart' }
          : {
              ...base,
              type: 'scoreboard',
              w: 600,
              h: 400,
              columns: 2,
              itemSize: 'md',
              showPoints: true,
              showRankings: true,
              shortNames: false,
              from: 0,
              to: 10,
            };

      addElement(el);
    },
    [addElement],
  );

  const doExport = async () => {
    if (!nodeRef.current) return;
    setExporting(true);
    try {
      select(null);
      await new Promise((r) => requestAnimationFrame(r));
      setExp(
        await exportNode(nodeRef.current, {
          engine,
          width: design.canvas.width,
          height: design.canvas.height,
          scale: 2,
          format: 'jpeg',
        }),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Section
        title="Editor"
        right={
          <span className="text-xs text-neutral-400 font-mono">
            ops {opCount} · undo {past} · redo {future} · {data.info}
            {active ? ` · ${active}` : ''}
          </span>
        }
      >
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-neutral-400">Add:</span>
          {(['text', 'image', 'shape', 'flag', 'scoreboard'] as const).map(
            (t) => (
              <Btn key={t} onClick={() => add(t)}>
                + {t}
              </Btn>
            ),
          )}
          <span className="w-px h-5 bg-neutral-700" />
          <Btn onClick={() => editorHistory.getState().undo()} disabled={!past}>
            Undo
          </Btn>
          <Btn
            onClick={() => editorHistory.getState().redo()}
            disabled={!future}
          >
            Redo
          </Btn>
          <Btn onClick={duplicateSelected} disabled={!selected}>
            Duplicate
          </Btn>
          <Btn onClick={removeSelected} disabled={!selected}>
            Delete
          </Btn>
          <span className="w-px h-5 bg-neutral-700" />
          <span className="text-xs text-neutral-400">Zoom:</span>
          {ZOOMS.map((z) => (
            <Btn key={z} active={zoom === z} onClick={() => setZoom(z)}>
              {z}×
            </Btn>
          ))}
          <span className="w-px h-5 bg-neutral-700" />
          <Btn
            onClick={() => {
              setDesign(buildLandscapeFixture());
              editorHistory.getState().clear();
            }}
          >
            Reset 1200×630
          </Btn>
          <Btn
            onClick={() => {
              setDesign(buildPortraitFixture());
              editorHistory.getState().clear();
            }}
          >
            Reset 1080×1920
          </Btn>
          <Btn onClick={() => setSelfTest(runGeometrySelfTest())}>
            Run geometry self-test
          </Btn>
        </div>
        <p className="text-[11px] text-neutral-500">
          Drag to move (snaps to canvas/siblings, Shift disables), handles to
          resize (Shift keeps aspect), top knob to rotate (Shift = 15° steps).
          Arrows nudge (Shift ×10), Delete, ⌘D duplicate, ⌘Z / ⇧⌘Z, [ ] z-order,
          Esc deselect. Check: the handle must stay under the pointer at every
          zoom; coordinates must not drift after many operations.
        </p>
      </Section>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Section
          title={`Stage · ${design.canvas.width}×${design.canvas.height} @ ${zoom}×`}
        >
          <div className="overflow-auto max-h-[75vh] rounded bg-neutral-950 p-4">
            <div ref={stageRef} className="w-fit relative select-none">
              <DesignStage
                design={design}
                countries={data.countries}
                zoom={zoom}
                nodeRef={nodeRef}
                onBackgroundPointerDown={() => select(null)}
                onElementPointerDown={(e, el) => {
                  select(el.id);
                  startMove(e, el.id);
                }}
                overlay={
                  <SelectionOverlay
                    element={selected}
                    zoom={zoom}
                    guides={guides}
                    canvas={design.canvas}
                    onResizeStart={startResize}
                    onRotateStart={startRotate}
                  />
                }
              />
            </div>
          </div>
        </Section>

        <div className="flex flex-col gap-3">
          <Section title="Inspector">
            {selected ? (
              <Inspector el={selected} />
            ) : (
              <p className="text-xs text-neutral-500">Select an element.</p>
            )}
          </Section>

          <Section title="Layers (top last)">
            <ul className="flex flex-col gap-0.5 text-xs">
              {[...design.elements].reverse().map((el) => (
                <li key={el.id}>
                  <button
                    type="button"
                    onClick={() => select(el.id)}
                    className={`w-full text-left px-2 py-1 rounded font-mono truncate ${
                      el.id === selectedId
                        ? 'bg-sky-600/40 text-white'
                        : 'hover:bg-neutral-800 text-neutral-300'
                    } ${el.hidden ? 'opacity-40' : ''}`}
                  >
                    {el.locked ? '🔒 ' : ''}
                    {el.name ?? el.id}
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Export this design (2×, jpeg)">
            <div className="flex gap-2 items-center">
              <select
                className={inputCls}
                value={engine}
                onChange={(e) => setEngine(e.target.value as ExportEngine)}
              >
                <option value="html-to-image">html-to-image</option>
                <option value="snapdom">snapdom</option>
              </select>
              <Btn onClick={doExport} disabled={exporting} active>
                {exporting ? '…' : 'Export'}
              </Btn>
            </div>
            {exp && (
              <>
                <Mono>
                  {exp.width}×{exp.height} · {formatMs(exp.timings.totalMs)} ·{' '}
                  {exp.warnings.length} warnings
                </Mono>
                <img
                  src={exp.dataUrl}
                  alt="export"
                  className="w-full rounded border border-neutral-800"
                />
              </>
            )}
          </Section>

          {selfTest.length > 0 && (
            <Section
              title={`Geometry self-test · ${
                selfTest.filter((l) => l.startsWith('PASS')).length
              }/${selfTest.length} pass`}
            >
              <Mono
                className={
                  selfTest.some((l) => l.startsWith('FAIL'))
                    ? 'text-red-300'
                    : 'text-emerald-300'
                }
              >
                {selfTest.join('\n')}
              </Mono>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
