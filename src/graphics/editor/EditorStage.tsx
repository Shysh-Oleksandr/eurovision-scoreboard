'use client';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useShallow } from 'zustand/shallow';

import { findElement } from '../model/elements';
import { useDesignData } from '../render/DesignDataContext';
import { DesignStage } from '../render/DesignStage';

import { selectSelectedElements, useEditorStore } from './editorStore';
import { visibleElementIds } from './flatten';
import SelectionOverlay from './SelectionOverlay';
import { BoxMap, useElementBoxes } from './useElementBoxes';
import { useGestures } from './useGestures';
import { usePinchZoom } from './usePinchZoom';

interface Props {
  /** The exported node (design size, unscaled); the editor exports it. */
  designNodeRef: React.RefObject<HTMLDivElement | null>;
  compact: boolean;
  /** Called with the measured boxes so the inspector can show sizes. */
  onBoxes?: (boxes: BoxMap) => void;
}

const ZOOM_CHIPS: { value: 'fit' | number; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 0.5, label: '50%' },
  { value: 1, label: '100%' },
];

/**
 * The stage: a neutral dotted viewport, the design centred and scaled to
 * fit (or to a fixed zoom), and the selection chrome as a sibling of the
 * exported node. Pointer-down on the design node resolves the element under
 * the pointer (stack children included) and starts a move for free elements.
 */
const EditorStage: React.FC<Props> = ({ designNodeRef, compact, onBoxes }) => {
  const t = useTranslations('graphics.editor');
  const design = useEditorStore((s) => s.design);
  const zoomSetting = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selected = useEditorStore(useShallow(selectSelectedElements));
  const hoverId = useEditorStore((s) => s.hoverId);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const setHover = useEditorStore((s) => s.setHover);
  const setSheet = useEditorStore((s) => s.setSheet);
  const setExport = useEditorStore((s) => s.setExport);
  const flattenPending = useEditorStore((s) => s.flattenPending);
  const flatten = useEditorStore((s) => s.flatten);
  const { status: dataStatus } = useDesignData();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = viewportRef.current;

    if (!el) return undefined;
    const update = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver(update);

    observer.observe(el);
    update();

    return () => observer.disconnect();
  }, []);

  // Content-sized canvases (stats) fit to their measured size, not the
  // model's minimum; DesignStage reports it once the table has rendered.
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const handleMeasured = useCallback(
    (size: { width: number; height: number }) =>
      setMeasured((prev) =>
        prev && prev.width === size.width && prev.height === size.height
          ? prev
          : size,
      ),
    [],
  );

  // A new document starts without a measurement of its own.
  useEffect(() => {
    setMeasured(null);
  }, [design.id]);

  // Phones: pinch to zoom around the fingers, double-tap to toggle 2.5×.
  const pinch = usePinchZoom(compact, viewportRef);

  useEffect(() => {
    pinch.reset();
    // A new document starts at fit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id]);

  const pad = compact ? 14 : 48;
  const { autoSize } = design.canvas;
  const cw = autoSize && measured ? measured.width : design.canvas.width;
  const ch = autoSize && measured ? measured.height : design.canvas.height;
  const fitZoom =
    viewport.width > 0
      ? Math.min(
          (viewport.width - pad * 2) / cw,
          (viewport.height - pad * 2) / ch,
        )
      : 0.5;
  const zoom = Math.max(
    0.05,
    compact
      ? fitZoom * pinch.scale
      : zoomSetting === 'fit'
      ? fitZoom
      : zoomSetting,
  );
  const ox =
    (compact
      ? (viewport.width - cw * zoom) / 2
      : Math.max(pad, (viewport.width - cw * zoom) / 2)) +
    (compact ? pinch.pan.x : 0);
  const oy =
    (compact
      ? (viewport.height - ch * zoom) / 2
      : Math.max(pad, (viewport.height - ch * zoom) / 2)) +
    (compact ? pinch.pan.y : 0);

  const { boxes } = useElementBoxes(designNodeRef, design, zoom);
  const boxesRef = useRef<BoxMap>(boxes);
  const zoomRef = useRef(zoom);

  boxesRef.current = boxes;
  zoomRef.current = zoom;
  useEffect(() => {
    onBoxes?.(boxes);
  }, [boxes, onBoxes]);

  const { startMove, startResize, startRotate, feedback } = useGestures(
    designNodeRef,
    boxesRef,
    zoomRef,
  );

  // Templates open as flow stacks; once the rows are in and every visible
  // element has a measured box, replace the stacks with free elements at
  // those boxes so the design edits like a blank one (see flatten.ts).
  useEffect(() => {
    if (!flattenPending || dataStatus === 'loading') return;
    if (autoSize && !measured) return;
    const ids = visibleElementIds(design.elements);

    if (ids.length && !ids.every((id) => boxes.has(id))) return;
    flatten(boxes, measured);
  }, [flattenPending, dataStatus, autoSize, measured, boxes, design, flatten]);

  /** The element under a pointer event (ignores the full-canvas layout stack). */
  const resolveTarget = useCallback(
    (target: EventTarget | null): string | null => {
      const node = (target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-element-id]',
      );
      const id = node?.dataset.elementId ?? null;

      if (!id) return null;
      const found = findElement(design.elements, id);

      if (!found) return null;
      if (found.el.type === 'stack' && found.el.fillCanvas) return null;

      return id;
    },
    [design.elements],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Primary button / touch only: no moves from middle or right clicks.
      if (e.button !== 0) return;
      // A second finger means pinch/pan, not a move.
      if (pinch.isPinching) return;
      setExport({ open: false });
      const id = resolveTarget(e.target);
      const { selectedIds } = useEditorStore.getState();

      if (!id) {
        select([]);
        if (compact) setSheet(null);

        return;
      }
      let ids = selectedIds;

      if (e.shiftKey && !compact) {
        toggleSelect(id);
        ids = selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id];
      } else if (!selectedIds.includes(id)) {
        select([id]);
        ids = [id];
      }
      if (compact) setSheet('inspector');
      startMove(e, ids);
    },
    [
      resolveTarget,
      select,
      toggleSelect,
      startMove,
      compact,
      setSheet,
      setExport,
      pinch.isPinching,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (feedback.active || compact) return;
      setHover(resolveTarget(e.target));
    },
    [feedback.active, compact, resolveTarget, setHover],
  );

  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Clicks on the dotted background (outside the canvas) deselect.
      if (e.target === e.currentTarget) {
        select([]);
        setExport({ open: false });
        if (compact) setSheet(null);
      }
    },
    [select, compact, setSheet, setExport],
  );

  const hover = useMemo(
    () => (hoverId ? findElement(design.elements, hoverId)?.el ?? null : null),
    [hoverId, design.elements],
  );

  const overlayLabels = useMemo(
    () => ({
      heightFollowsRows: t('label.heightFollowsRows'),
      sizesToContent: t('label.sizesToContent'),
      elements: (n: number) => t('label.nElements', { count: n }),
      centred: (n: number) => t('label.centred', { px: n }),
      resize: t('label.resize'),
      rotate: t('label.rotate'),
    }),
    [t],
  );

  return (
    <div className="gfx-stage">
      <div
        ref={viewportRef}
        className="gfx-viewport"
        tabIndex={0}
        aria-label={t('canvasAria')}
        onPointerDown={handleViewportPointerDown}
        onPointerLeave={() => setHover(null)}
      >
        <div
          className="gfx-world"
          style={{ transform: `translate(${ox}px, ${oy}px)` }}
        >
          <DesignStage
            design={design}
            zoom={zoom}
            nodeRef={designNodeRef}
            className="gfx-canvas"
            onMeasured={autoSize ? handleMeasured : undefined}
            onBackgroundPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          />
        </div>
        <div
          className="gfx-world gfx-world--overlay"
          style={{ transform: `translate(${ox}px, ${oy}px)` }}
        >
          <SelectionOverlay
            selected={selected}
            hover={hover}
            boxes={boxes}
            zoom={zoom}
            canvas={{ width: cw, height: ch }}
            feedback={feedback}
            compact={compact}
            labels={overlayLabels}
            onResizeStart={startResize}
            onRotateStart={startRotate}
            onMoveStart={startMove}
          />
        </div>
      </div>

      {!compact && (
        <div className="gfx-zoom" role="group" aria-label={t('zoom')}>
          {ZOOM_CHIPS.map((chip) => (
            <button
              key={String(chip.value)}
              type="button"
              className={zoomSetting === chip.value ? 'is-on' : ''}
              onClick={() => setZoom(chip.value)}
            >
              {chip.label}
            </button>
          ))}
          <span className="gfx-zoom-k">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      {compact && (
        <p className="gfx-phone-hint">
          {pinch.scale > 1
            ? t('hint.zoomed', { pct: Math.round(pinch.scale * 100) })
            : selected.length
            ? t('hint.dragToMove')
            : t('hint.tapToEdit')}
        </p>
      )}
    </div>
  );
};

export default EditorStage;
