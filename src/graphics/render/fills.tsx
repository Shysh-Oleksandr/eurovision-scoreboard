'use client';
import React from 'react';

import { useLocalAssetUrl } from '../assets/localAssets';
import { Fill } from '../model/design';

import { useShareBgImage } from '@/components/simulation/share/useShareBgImage';
import { getBackgroundImageForImageGeneration } from '@/helpers/getFlagPath';

const imageStyle = (
  url: string,
  fit: 'cover' | 'contain',
): React.CSSProperties => ({
  backgroundImage: `url(${
    url.startsWith('data:') || url.startsWith('blob:')
      ? url
      : getBackgroundImageForImageGeneration(url)
  })`,
  backgroundSize: fit,
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

/** Inline style + class for one fill (used by shapes and background layers). */
export function useFillPresentation(fill: Fill): {
  style: React.CSSProperties;
  className: string;
} {
  const themeBg = useShareBgImage();
  // Image fills may reference an uploaded asset; other kinds resolve to ''.
  const local = useLocalAssetUrl(fill.kind === 'image' ? fill.url : '');

  switch (fill.kind) {
    case 'color':
    case 'gradient':
      return { style: { background: fill.value }, className: '' };
    case 'image':
      return {
        style: local ? imageStyle(local, fill.fit) : {},
        className: local ? '' : 'bg-white/[0.06]',
      };
    case 'theme-bg':
      return { style: imageStyle(themeBg, 'cover'), className: '' };
    case 'theme-surface':
    default:
      return {
        style: {},
        className:
          'bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900',
      };
  }
}

const FillLayer: React.FC<{ fill: Fill }> = ({ fill }) => {
  const { style, className } = useFillPresentation(fill);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ ...style, opacity: fill.opacity }}
    />
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
