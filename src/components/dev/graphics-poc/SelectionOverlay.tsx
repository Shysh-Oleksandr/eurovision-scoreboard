'use client';
import React from 'react';

import { HandleId, HANDLES, SnapGuide } from './geometry';
import { DesignElement } from './model';

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

const HANDLE_PX = 12;

interface Props {
  element: DesignElement | null;
  zoom: number;
  guides: SnapGuide[];
  canvas: { width: number; height: number };
  onResizeStart: (e: React.PointerEvent, id: string, h: HandleId) => void;
  onRotateStart: (e: React.PointerEvent, id: string) => void;
}

/**
 * Screen-space selection box, 8 resize handles, a rotate handle and snap
 * guides. Handles keep a constant pixel size regardless of zoom.
 */
const SelectionOverlay: React.FC<Props> = ({
  element,
  zoom,
  guides,
  canvas,
  onResizeStart,
  onRotateStart,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {guides.map((g) =>
        g.axis === 'x' ? (
          <div
            key={`${g.axis}-${g.at}`}
            className="absolute top-0 bottom-0 w-px bg-pink-400"
            style={{ left: g.at * zoom }}
          />
        ) : (
          <div
            key={`${g.axis}-${g.at}`}
            className="absolute left-0 right-0 h-px bg-pink-400"
            style={{ top: g.at * zoom }}
          />
        ),
      )}

      {element && !element.hidden && (
        <div
          className="absolute"
          style={{
            left: element.x * zoom,
            top: element.y * zoom,
            width: element.w * zoom,
            height: element.h * zoom,
            transform: element.rotation
              ? `rotate(${element.rotation}deg)`
              : undefined,
            transformOrigin: 'center center',
          }}
        >
          <div className="absolute inset-0 border-2 border-sky-400 pointer-events-none" />

          {!element.locked &&
            HANDLES.map((h) => {
              const left = h.includes('w')
                ? 0
                : h.includes('e')
                ? '100%'
                : '50%';
              const top = h.includes('n')
                ? 0
                : h.includes('s')
                ? '100%'
                : '50%';

              return (
                <div
                  key={h}
                  role="presentation"
                  className="absolute bg-white border-2 border-sky-500 rounded-sm pointer-events-auto"
                  style={{
                    width: HANDLE_PX,
                    height: HANDLE_PX,
                    left,
                    top,
                    marginLeft: -HANDLE_PX / 2,
                    marginTop: -HANDLE_PX / 2,
                    cursor: CURSORS[h],
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => onResizeStart(e, element.id, h)}
                />
              );
            })}

          {!element.locked && (
            <>
              <div
                className="absolute left-1/2 w-px bg-sky-400 pointer-events-none"
                style={{ top: -28, height: 28 }}
              />
              <div
                role="presentation"
                className="absolute left-1/2 rounded-full bg-white border-2 border-sky-500 pointer-events-auto"
                style={{
                  width: HANDLE_PX + 2,
                  height: HANDLE_PX + 2,
                  top: -28 - (HANDLE_PX + 2) / 2,
                  marginLeft: -(HANDLE_PX + 2) / 2,
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => onRotateStart(e, element.id)}
              />
            </>
          )}

          <div
            className="absolute left-0 text-[10px] font-mono bg-black/70 text-white px-1 rounded pointer-events-none whitespace-nowrap"
            style={{ top: '100%', marginTop: 4 }}
          >
            {Math.round(element.x)},{Math.round(element.y)} ·{' '}
            {Math.round(element.w)}×{Math.round(element.h)} ·{' '}
            {Math.round(element.rotation)}°
          </div>
        </div>
      )}

      {/* canvas outline */}
      <div
        className="absolute left-0 top-0 border border-white/20"
        style={{ width: canvas.width * zoom, height: canvas.height * zoom }}
      />
    </div>
  );
};

export default SelectionOverlay;
