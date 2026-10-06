'use client';
import React from 'react';

import {
  DesignElement,
  StackElement as StackElementModel,
} from '../model/design';

import BrandingElement from './BrandingElement';
import FlagElement from './FlagElement';
import ImageElement from './ImageElement';
import ScoreboardElement from './ScoreboardElement';
import ShapeElement from './ShapeElement';
import StatsElement from './StatsElement';
import TextElement from './TextElement';

/**
 * Element registry: one renderer per element type. Renderers get only their
 * element; data comes from `DesignDataContext`, theme from the document.
 * The stack is defined here (not in its own file) because it and the
 * generic view are mutually recursive.
 */

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
} as const;

/** Flow child: no x/y; missing w/h = fill cross axis / auto. */
const FlowChild: React.FC<{ el: DesignElement }> = ({ el }) => {
  if (el.hidden) return null;

  return (
    <div
      data-element-id={el.id}
      className="relative flex-shrink-0"
      style={{
        width: el.w !== undefined ? `${el.w}px` : '100%',
        height: el.h !== undefined ? `${el.h}px` : undefined,
        opacity: el.opacity !== 1 ? el.opacity : undefined,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        // Each element is its own stacking context: paint order follows
        // the layer list, whatever z-index the row components use inside.
        isolation: 'isolate',
      }}
    >
      <ElementView el={el} />
    </div>
  );
};

/** Absolute child: positioned by x/y/w/h in canvas px. */
export const AbsoluteChild: React.FC<{
  el: DesignElement;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}> = ({ el, onPointerDown }) => {
  if (el.hidden) return null;

  return (
    <div
      data-element-id={el.id}
      className="absolute"
      style={{
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        opacity: el.opacity !== 1 ? el.opacity : undefined,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        isolation: 'isolate',
      }}
      onPointerDown={onPointerDown}
    >
      <ElementView el={el} />
    </div>
  );
};

const StackElement: React.FC<{ el: StackElementModel }> = ({ el }) => (
  <div
    className="flex"
    style={{
      flexDirection: el.direction,
      gap: `${el.gap}px`,
      paddingLeft: `${el.paddingX}px`,
      paddingRight: `${el.paddingX}px`,
      paddingTop: `${el.paddingY}px`,
      paddingBottom: `${el.paddingY}px`,
      alignItems: ALIGN[el.align],
      justifyContent: JUSTIFY[el.justify],
      width: '100%',
      height: '100%',
    }}
  >
    {el.children.map((child) => (
      <FlowChild key={child.id} el={child} />
    ))}
  </div>
);

export const ElementView: React.FC<{ el: DesignElement }> = ({ el }) => {
  switch (el.type) {
    case 'text':
      return <TextElement el={el} />;
    case 'image':
      return <ImageElement el={el} />;
    case 'shape':
      return <ShapeElement el={el} />;
    case 'flag':
      return <FlagElement el={el} />;
    case 'scoreboard':
      return <ScoreboardElement el={el} />;
    case 'stats':
      return <StatsElement el={el} />;
    case 'branding':
      return <BrandingElement el={el} />;
    case 'stack':
      return <StackElement el={el} />;
    default:
      return null;
  }
};
