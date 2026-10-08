'use client';
import React, { useMemo } from 'react';

import {
  Design,
  DesignElement,
  Fill,
  FlagElement,
  ImageElement,
  ScoreboardElement,
  ShapeElement,
  TextElement,
} from './model';

import ShareCountryItem from '@/components/simulation/share/ShareCountryItem';
import { useShareBgImage } from '@/components/simulation/share/useShareBgImage';
import {
  getBackgroundImageForImageGeneration,
  getFlagPathForImageGeneration,
} from '@/helpers/getFlagPath';
import { useReorderCountries } from '@/hooks/useReorderCountries';
import { Country } from '@/models';

/* A heart in a 100×100 box, used as a CSS mask (self-contained, no id refs). */
const HEART_PATH =
  'M50 90 L14 54 C-2 38 6 8 30 8 C40 8 47 14 50 21 C53 14 60 8 70 8 C94 8 102 38 86 54 Z';
const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${HEART_PATH}' fill='black'/></svg>`,
)}")`;

export const heartMaskStyle: React.CSSProperties = {
  WebkitMaskImage: HEART_MASK,
  maskImage: HEART_MASK,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
};

export function fillToStyle(fill: Fill, themeBg: string): React.CSSProperties {
  switch (fill.kind) {
    case 'color':
      return { background: fill.value };
    case 'gradient':
      return { background: fill.value };
    case 'image':
      return {
        backgroundImage: `url(${getBackgroundImageForImageGeneration(
          fill.url,
        )})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    case 'theme-bg':
    default:
      return {
        backgroundImage: `url(${getBackgroundImageForImageGeneration(
          themeBg,
        )})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
  }
}

const TextView: React.FC<{ el: TextElement }> = ({ el }) => (
  <div
    className={`w-full h-full flex items-center ${
      el.fontSlot === 'scoreboard' ? 'dp-scoreboard-font' : ''
    }`}
    style={{
      justifyContent:
        el.align === 'left'
          ? 'flex-start'
          : el.align === 'right'
          ? 'flex-end'
          : 'center',
      fontSize: `${el.fontSize}px`,
      fontWeight: el.fontWeight,
      color: el.color,
      textAlign: el.align,
      textTransform: el.uppercase ? 'uppercase' : 'none',
      textShadow: el.shadow ? '0 2px 12px rgba(0,0,0,0.45)' : 'none',
      lineHeight: 1.1,
      whiteSpace: 'pre-wrap',
    }}
  >
    {el.text}
  </div>
);

const ImageView: React.FC<{ el: ImageElement }> = ({ el }) => (
  <img
    src={el.src}
    alt=""
    draggable={false}
    className="w-full h-full block"
    style={{
      objectFit: el.fit,
      borderRadius: `${el.radius}px`,
      ...(el.mask === 'heart' ? heartMaskStyle : {}),
    }}
  />
);

const ShapeView: React.FC<{ el: ShapeElement; themeBg: string }> = ({
  el,
  themeBg,
}) => (
  <div
    className="w-full h-full"
    style={{
      ...fillToStyle(el.fill, themeBg),
      borderRadius: el.kind === 'ellipse' ? '50%' : `${el.radius}px`,
      border: el.strokeWidth
        ? `${el.strokeWidth}px solid ${el.strokeColor ?? '#fff'}`
        : undefined,
      boxShadow: el.shadow ? '0 12px 40px rgba(0,0,0,0.35)' : undefined,
    }}
  />
);

const FlagView: React.FC<{ el: FlagElement }> = ({ el }) => (
  <img
    src={getFlagPathForImageGeneration(el.countryCode, 'big-rectangle')}
    alt={el.countryCode}
    draggable={false}
    className="w-full h-full block object-cover"
    style={
      el.shape === 'heart'
        ? heartMaskStyle
        : el.shape === 'round'
        ? { borderRadius: '50%' }
        : { borderRadius: 4 }
    }
  />
);

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
};

const ScoreboardView: React.FC<{
  el: ScoreboardElement;
  countries: Country[];
}> = ({ el, countries }) => {
  const sliced = useMemo(
    () => countries.slice(el.from, el.to ?? countries.length),
    [countries, el.from, el.to],
  );
  const reordered = useReorderCountries(sliced, el.columns);

  return (
    <div className={`grid gap-x-3 w-full ${COLS[el.columns] ?? 'grid-cols-2'}`}>
      {reordered.map((country) => (
        <ShareCountryItem
          key={country.code}
          country={country}
          index={countries.findIndex((c) => c.code === country.code)}
          showPoints={el.showPoints}
          showRankings={el.showRankings}
          size={el.itemSize}
          shortCountryNames={el.shortNames}
          isVotingOver
          withConsistentCountryStatus
        />
      ))}
    </div>
  );
};

export const ElementView: React.FC<{
  el: DesignElement;
  countries: Country[];
  themeBg: string;
}> = ({ el, countries, themeBg }) => {
  switch (el.type) {
    case 'text':
      return <TextView el={el} />;
    case 'image':
      return <ImageView el={el} />;
    case 'shape':
      return <ShapeView el={el} themeBg={themeBg} />;
    case 'flag':
      return <FlagView el={el} />;
    case 'scoreboard':
      return <ScoreboardView el={el} countries={countries} />;
    default:
      return null;
  }
};

export interface DesignStageProps {
  design: Design;
  countries: Country[];
  zoom: number;
  /** The design-size node (what gets exported). */
  nodeRef?: React.Ref<HTMLDivElement>;
  onElementPointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    el: DesignElement,
  ) => void;
  onBackgroundPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Rendered in screen space over the scaled stage (selection, guides). */
  overlay?: React.ReactNode;
  className?: string;
}

/**
 * Renders a design at design size inside a wrapper that is scaled by `zoom`.
 * The wrapper has the scaled size so page layout is correct; the inner node
 * keeps design px so exports can neutralise the transform.
 */
export const DesignStage: React.FC<DesignStageProps> = ({
  design,
  countries,
  zoom,
  nodeRef,
  onElementPointerDown,
  onBackgroundPointerDown,
  overlay,
  className,
}) => {
  const themeBg = useShareBgImage();
  const { width, height, background } = design.canvas;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ width: width * zoom, height: height * zoom }}
    >
      <div
        ref={nodeRef}
        data-design-node
        className="absolute left-0 top-0 overflow-hidden text-black"
        style={{
          width,
          height,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          ...fillToStyle(background, themeBg),
        }}
        onPointerDown={onBackgroundPointerDown}
      >
        {design.elements.map((el) =>
          el.hidden ? null : (
            <div
              key={el.id}
              data-element-id={el.id}
              className="absolute"
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                transform: el.rotation
                  ? `rotate(${el.rotation}deg)`
                  : undefined,
                transformOrigin: 'center center',
                opacity: el.opacity,
                // Block page scrolling only where elements are draggable.
                touchAction: onElementPointerDown ? 'none' : undefined,
              }}
              onPointerDown={
                onElementPointerDown
                  ? (e) => {
                      e.stopPropagation();
                      onElementPointerDown(e, el);
                    }
                  : undefined
              }
            >
              <ElementView el={el} countries={countries} themeBg={themeBg} />
            </div>
          ),
        )}
      </div>
      {overlay}
    </div>
  );
};
