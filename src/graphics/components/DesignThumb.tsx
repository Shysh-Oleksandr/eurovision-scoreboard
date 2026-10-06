'use client';
import React, { useCallback, useState } from 'react';

import { Design } from '../model/design';
import { DesignStage } from '../render/DesignStage';

/**
 * A design scaled into a fixed box (template rows, gallery cards). Must be
 * rendered inside a `DesignDataProvider` so bound elements have rows.
 * Content-sized designs (stats) are measured first so the whole table fits.
 */
const DesignThumb: React.FC<{
  design: Design;
  width: number;
  height: number;
  className?: string;
}> = ({ design, width, height, className }) => {
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const onMeasured = useCallback(
    (size: { width: number; height: number }) =>
      setMeasured((prev) =>
        prev && prev.width === size.width && prev.height === size.height
          ? prev
          : size,
      ),
    [],
  );
  const cw =
    design.canvas.autoSize && measured ? measured.width : design.canvas.width;
  const ch =
    design.canvas.autoSize && measured ? measured.height : design.canvas.height;
  const k = Math.min(width / cw, height / ch);

  return (
    <div
      className={`gfx-thumb ${className ?? ''}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <div
        className="gfx-thumb-inner"
        style={{
          width: Math.round(cw * k),
          height: Math.round(ch * k),
        }}
      >
        <DesignStage
          design={design}
          zoom={k}
          onMeasured={design.canvas.autoSize ? onMeasured : undefined}
        />
      </div>
    </div>
  );
};

export default DesignThumb;
