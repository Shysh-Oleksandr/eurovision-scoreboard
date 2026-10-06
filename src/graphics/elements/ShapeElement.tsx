'use client';
import React from 'react';

import { ShapeElement as ShapeElementModel } from '../model/design';
import { useFillPresentation } from '../render/fills';

const ShapeElement: React.FC<{ el: ShapeElementModel }> = ({ el }) => {
  const { style, className } = useFillPresentation(el.fill);

  return (
    <div
      className={`w-full h-full ${className}`}
      style={{
        ...style,
        opacity: el.fill.opacity,
        borderRadius: el.kind === 'ellipse' ? '50%' : `${el.radius}px`,
        border: el.strokeWidth
          ? `${el.strokeWidth}px solid ${el.strokeColor ?? '#ffffff'}`
          : undefined,
        boxShadow: el.shadow ? '0 12px 40px rgba(0, 0, 0, 0.35)' : undefined,
      }}
    />
  );
};

export default ShapeElement;
