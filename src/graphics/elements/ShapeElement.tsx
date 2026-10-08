'use client';
import React from 'react';

import { ShapeElement as ShapeElementModel } from '../model/design';
import { FillImg, useFillPresentation } from '../render/fills';

const ShapeElement: React.FC<{ el: ShapeElementModel }> = ({ el }) => {
  const { style, className, image } = useFillPresentation(el.fill);

  return (
    <div
      className={`w-full h-full ${
        image ? 'relative overflow-hidden' : ''
      } ${className}`}
      style={{
        ...style,
        opacity: el.fill.opacity,
        borderRadius: el.kind === 'ellipse' ? '50%' : `${el.radius}px`,
        border: el.strokeWidth
          ? `${el.strokeWidth}px solid ${el.strokeColor ?? '#ffffff'}`
          : undefined,
        boxShadow: el.shadow ? '0 12px 40px rgba(0, 0, 0, 0.35)' : undefined,
      }}
    >
      {image && <FillImg image={image} />}
    </div>
  );
};

export default ShapeElement;
