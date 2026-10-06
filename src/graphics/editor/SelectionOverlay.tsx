'use client';
import { Lock, RotateCw } from 'lucide-react';
import React from 'react';

import { DesignElement } from '../model/design';
import {
  canRotate,
  elementLabel,
  isBound,
  resizeModeOf,
} from '../model/elements';
import {
  HandleId,
  HANDLES,
  Rect,
  SIDE_HANDLES,
  signedAngle,
  unionBox,
} from '../model/geometry';

import { BoxMap, boxOf } from './useElementBoxes';
import { GestureFeedback } from './useGestures';

const CURSORS: Record<HandleId, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

interface Props {
  selected: DesignElement[];
  hover: DesignElement | null;
  boxes: BoxMap;
  zoom: number;
  /** Canvas size in design px (the part of the stage that is exported). */
  canvas: { width: number; height: number };
  feedback: GestureFeedback;
  /** Phones: no handles or knob, tap-select and drag only. */
  compact: boolean;
  labels: {
    heightFollowsRows: string;
    sizesToContent: string;
    elements: (n: number) => string;
    centred: (n: number) => string;
    resize: string;
    rotate: string;
  };
  onResizeStart: (e: React.PointerEvent, id: string, h: HandleId) => void;
  onRotateStart: (e: React.PointerEvent, id: string) => void;
  onMoveStart: (e: React.PointerEvent, ids: string[]) => void;
}

/** Axis-aligned bounds of a (possibly rotated) box. */
const aabbOf = (box: Rect): Rect => {
  if (!box.rotation) return box;
  const rad = (box.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const w = box.w * c + box.h * s;
  const h = box.w * s + box.h * c;

  return {
    x: box.x + box.w / 2 - w / 2,
    y: box.y + box.h / 2 - h / 2,
    w,
    h,
    rotation: 0,
  };
};

/**
 * The parts of a box that lie outside the canvas. The canvas node clips its
 * content, so an element pushed past the edge has nothing to grab on the
 * stage; these invisible pads in the overlay make it draggable back.
 */
const outsidePads = (
  box: Rect,
  canvas: { width: number; height: number },
): Rect[] => {
  const b = aabbOf(box);
  const pads: Rect[] = [];

  if (b.x < 0)
    pads.push({ x: b.x, y: b.y, w: Math.min(b.w, -b.x), h: b.h, rotation: 0 });
  if (b.x + b.w > canvas.width) {
    const x = Math.max(b.x, canvas.width);

    pads.push({ x, y: b.y, w: b.x + b.w - x, h: b.h, rotation: 0 });
  }
  if (b.y < 0)
    pads.push({ x: b.x, y: b.y, w: b.w, h: Math.min(b.h, -b.y), rotation: 0 });
  if (b.y + b.h > canvas.height) {
    const y = Math.max(b.y, canvas.height);

    pads.push({ x: b.x, y, w: b.w, h: b.y + b.h - y, rotation: 0 });
  }

  return pads.filter((p) => p.w > 0 && p.h > 0);
};

const handlePosition = (h: HandleId) => ({
  left: h.includes('w') ? '0%' : h.includes('e') ? '100%' : '50%',
  top: h.includes('n') ? '0%' : h.includes('s') ? '100%' : '50%',
});

/**
 * Screen-space chrome over the scaled stage: hover outline, selection boxes
 * (solid for one element, dashed per element + dashed union for several),
 * resize handles, the rotate knob, the label under the box, snap guides and
 * the distance pill. Lives in a sibling of the exported node so none of it
 * ever enters an export.
 */
const SelectionOverlay: React.FC<Props> = ({
  selected,
  hover,
  boxes,
  zoom,
  canvas,
  feedback,
  compact,
  labels,
  onResizeStart,
  onRotateStart,
  onMoveStart,
}) => {
  const multi = selected.length > 1;
  const selectedIds = new Set(selected.map((el) => el.id));
  const union = multi ? unionBox(selected.map((el) => boxOf(boxes, el))) : null;
  const movableIds = selected
    .filter((el) => !el.locked && !boxOf(boxes, el).inFlow)
    .map((el) => el.id);

  return (
    <div className="gfx-overlay">
      {selected.map((el) =>
        el.locked || boxOf(boxes, el).inFlow
          ? null
          : outsidePads(boxOf(boxes, el), canvas).map((pad, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`${el.id}-pad-${i}`}
                className="gfx-grabpad"
                style={{
                  left: pad.x * zoom,
                  top: pad.y * zoom,
                  width: pad.w * zoom,
                  height: pad.h * zoom,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  onMoveStart(
                    e,
                    movableIds.includes(el.id) ? movableIds : [el.id],
                  );
                }}
              />
            )),
      )}
      {hover && !selectedIds.has(hover.id) && !feedback.active && (
        <div
          className="gfx-hover"
          style={{
            left: boxOf(boxes, hover).x * zoom,
            top: boxOf(boxes, hover).y * zoom,
            width: boxOf(boxes, hover).w * zoom,
            height: boxOf(boxes, hover).h * zoom,
            transform: hover.rotation
              ? `rotate(${hover.rotation}deg)`
              : undefined,
          }}
        />
      )}

      {feedback.guides.map((g) => (
        <div
          key={`${g.axis}-${g.at}`}
          className={`gfx-guide gfx-guide--${g.axis}`}
          style={g.axis === 'x' ? { left: g.at * zoom } : { top: g.at * zoom }}
        />
      ))}

      {selected.map((el) => {
        const box = boxOf(boxes, el);
        const bound = isBound(el);
        const mode = el.locked || box.inFlow ? 'none' : resizeModeOf(el);
        const handles = compact
          ? []
          : mode === 'all'
          ? HANDLES
          : mode === 'horizontal'
          ? SIDE_HANDLES
          : [];
        const showKnob =
          !compact && !multi && !el.locked && !box.inFlow && canRotate(el);
        const sizeText = `${Math.round(box.w)} × ${Math.round(box.h)}`;
        const angle = signedAngle(el.rotation);
        const label =
          el.type === 'scoreboard' || el.type === 'stack'
            ? {
                text: `${elementLabel(el)} · ${sizeText}`,
                note: labels.heightFollowsRows,
              }
            : el.type === 'stats' || el.type === 'branding'
            ? {
                text: `${elementLabel(el)} · ${sizeText}`,
                note: labels.sizesToContent,
              }
            : {
                text: `${elementLabel(el)} · ${sizeText}${
                  angle ? ` · ${Math.round(angle)}°` : ''
                }`,
                note: null,
              };
        const hint =
          feedback.hint && feedback.hintFor === el.id ? feedback.hint : null;

        return (
          <div
            key={el.id}
            className={`gfx-selbox${multi ? ' is-multi' : ''}${
              el.locked ? ' is-locked' : ''
            }${bound ? ' is-bound' : ''}`}
            style={{
              left: box.x * zoom,
              top: box.y * zoom,
              width: box.w * zoom,
              height: box.h * zoom,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            }}
          >
            {!multi &&
              handles.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`gfx-handle gfx-handle--${h}`}
                  aria-label={`${labels.resize} ${h}`}
                  style={{ ...handlePosition(h), cursor: CURSORS[h] }}
                  onPointerDown={(e) => onResizeStart(e, el.id, h)}
                />
              ))}

            {showKnob && (
              <button
                type="button"
                className="gfx-knob"
                aria-label={labels.rotate}
                onPointerDown={(e) => onRotateStart(e, el.id)}
              >
                <RotateCw className="size-3" />
              </button>
            )}

            {hint && (
              <div
                className="gfx-dist"
                style={{ transform: `rotate(${-el.rotation}deg)` }}
              >
                {hint.centred
                  ? labels.centred(Math.round(hint.left))
                  : `${Math.round(hint.left)} · ${Math.round(hint.right)}`}
              </div>
            )}

            {!multi && (
              <span
                className="gfx-sellabel"
                style={{
                  transform: `translateX(-50%) rotate(${-el.rotation}deg)`,
                }}
              >
                {el.locked && <Lock className="size-[11px]" />}
                {label.text}
                {label.note && <i>{label.note}</i>}
              </span>
            )}
          </div>
        );
      })}

      {union && (
        <div
          className="gfx-selbox is-union"
          style={{
            left: union.x * zoom,
            top: union.y * zoom,
            width: union.w * zoom,
            height: union.h * zoom,
          }}
        >
          <span
            className="gfx-sellabel"
            style={{ transform: 'translateX(-50%)' }}
          >
            {labels.elements(selected.length)} · {Math.round(union.w)} ×{' '}
            {Math.round(union.h)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SelectionOverlay;
