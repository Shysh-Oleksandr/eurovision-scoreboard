'use client';
import React from 'react';

import { useLocalAssetUrl } from '../assets/localAssets';
import { Fill } from '../model/design';

import { useShareBgImage } from '@/components/simulation/share/useShareBgImage';
import { getBackgroundImageForImageGeneration } from '@/helpers/getFlagPath';

export interface FillImage {
  src: string;
  fit: 'cover' | 'contain';
}

const fillImage = (url: string, fit: 'cover' | 'contain'): FillImage => ({
  src:
    url.startsWith('data:') || url.startsWith('blob:')
      ? url
      : getBackgroundImageForImageGeneration(url),
  fit,
});

/**
 * Inline style + class for one fill (used by shapes and background layers).
 * Image fills come back as `image` and must be rendered with `FillImg`, not
 * as a CSS background: Safari leaves url() backgrounds out of the first
 * render of an export snapshot, while <img> elements always make it.
 */
export function useFillPresentation(fill: Fill): {
  style: React.CSSProperties;
  className: string;
  image: FillImage | null;
} {
  const themeBg = useShareBgImage();
  // Image fills may reference an uploaded asset; other kinds resolve to ''.
  const local = useLocalAssetUrl(fill.kind === 'image' ? fill.url : '');

  switch (fill.kind) {
    case 'color':
    case 'gradient':
      return { style: { background: fill.value }, className: '', image: null };
    case 'image':
      return {
        style: {},
        className: local ? '' : 'bg-white/[0.06]',
        image: local ? fillImage(local, fill.fit) : null,
      };
    case 'theme-bg':
      return {
        style: {},
        className: '',
        image: themeBg ? fillImage(themeBg, 'cover') : null,
      };
    case 'theme-surface':
    default:
      return {
        style: {},
        className:
          'bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900',
        image: null,
      };
  }
}

/** An image fill covering its positioned parent's padding box. */
export const FillImg: React.FC<{ image: FillImage }> = ({ image }) => (
  <img
    src={image.src}
    alt=""
    aria-hidden
    draggable={false}
    className="absolute inset-0 block w-full h-full pointer-events-none select-none"
    style={{ objectFit: image.fit, objectPosition: 'center' }}
  />
);

const FillLayer: React.FC<{ fill: Fill }> = ({ fill }) => {
  const { style, className, image } = useFillPresentation(fill);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ ...style, opacity: fill.opacity }}
    >
      {image && <FillImg image={image} />}
    </div>
  );
};

/** Canvas background: layers bottom → top. */
export const FillLayers: React.FC<{ fills: Fill[] }> = ({ fills }) => (
  <>
    {fills.map((fill, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <FillLayer key={`${fill.kind}-${i}`} fill={fill} />
    ))}
  </>
);
