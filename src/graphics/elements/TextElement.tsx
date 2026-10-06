'use client';
import React from 'react';

import { TextElement as TextElementModel } from '../model/design';
import { useElementFont } from '../render/useElementFont';

const JUSTIFY = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

const TextElement: React.FC<{ el: TextElementModel }> = ({ el }) => {
  const font = useElementFont(el.fontSlot, el.font);

  return (
    <div
      className={`relative flex items-center w-full ${font.className}`}
      style={{
        justifyContent: JUSTIFY[el.align],
        fontSize: `${el.fontSize}px`,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.align,
        textTransform: el.uppercase ? 'uppercase' : 'none',
        textShadow: el.shadow ?? 'none',
        lineHeight: el.lineHeight,
        marginTop: el.marginTop ? `${el.marginTop}px` : undefined,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        ...font.style,
      }}
    >
      <span>{el.text}</span>
    </div>
  );
};

export default TextElement;
