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

/** Icon side, in em of the branding font size. */
const ICON_SIZE = 1.75;

/** "DouzePoints.app" with the app icon's mark, as on every share image. */
const BrandingElement: React.FC<{ el: BrandingElementModel }> = ({ el }) => {
  const font = useElementFont(el.fontSlot ?? 'ui', el.font);
  const showIcon = el.showIcon ?? BRANDING_DEFAULTS.showIcon;
  const shadow = el.shadow ?? BRANDING_DEFAULTS.shadow;

  return (
    <div
      className={`relative flex justify-center items-center w-full flex-shrink-0 ${font.className}`}
      style={{ fontSize: `${el.fontSize}px`, ...font.style }}
    >
      {showIcon && (
        <img
          src="/img/brand/mark.png"
          alt="DouzePoints.app"
          className="mr-2"
          width={32}
          height={32}
          style={{
            width: `${el.fontSize * ICON_SIZE}px`,
            height: `${el.fontSize * ICON_SIZE}px`,
            // The row keeps its old 1.4em height, so a bigger icon doesn't
            // shift the elements laid out around it in saved designs.
            marginBlock: `${(el.fontSize * (1.4 - ICON_SIZE)) / 2}px`,
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
