'use client';
import React from 'react';

import { BrandingElement as BrandingElementModel } from '../model/design';
import { useElementFont } from '../render/useElementFont';

export const BRANDING_DEFAULTS = {
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  shadow: true,
  showIcon: true,
  uppercase: false,
} as const;

/** "DouzePoints.app" with the favicon, as on every share image. */
const BrandingElement: React.FC<{ el: BrandingElementModel }> = ({ el }) => {
  const font = useElementFont(el.fontSlot ?? 'ui', el.font);
  const showIcon = el.showIcon ?? BRANDING_DEFAULTS.showIcon;
  const shadow = el.shadow ?? BRANDING_DEFAULTS.shadow;

  return (
    <div
      className={`relative flex justify-center items-center w-full px-2 flex-shrink-0 ${font.className}`}
      style={{ fontSize: `${el.fontSize}px`, ...font.style }}
    >
      {showIcon && (
        <img
          src="/img/favicon-128x128.png"
          alt="DouzePoints.app"
          className="mr-2"
          width={32}
          height={32}
          style={{
            width: `${el.fontSize * 1.4}px`,
            height: `${el.fontSize * 1.4}px`,
          }}
        />
      )}
      <span
        style={{
          fontWeight: el.fontWeight ?? BRANDING_DEFAULTS.fontWeight,
          color: el.color ?? BRANDING_DEFAULTS.color,
          textShadow: shadow ? '0 0 10px rgba(0, 0, 0, 0.4)' : 'none',
          textTransform:
            el.uppercase ?? BRANDING_DEFAULTS.uppercase ? 'uppercase' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        DouzePoints.app
      </span>
    </div>
  );
};

export default BrandingElement;
