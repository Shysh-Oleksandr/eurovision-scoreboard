'use client';
import { ImageOff } from 'lucide-react';
import React from 'react';

import {
  CONTEST_LOGO_SRC,
  THEME_BG_SRC,
  useLocalAssetUrl,
} from '../assets/localAssets';
import { ImageElement as ImageElementModel } from '../model/design';

import { heartMaskStyle } from './eurovisionHeart';

import { useShareBgImage } from '@/components/simulation/share/useShareBgImage';
import { getBackgroundImageForImageGeneration } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogoForImageGeneration } from '@/theme/hosting';

export const maskStyle = (
  mask: 'none' | 'heart' | 'circle',
  radius = 0,
): React.CSSProperties => {
  if (mask === 'heart') return heartMaskStyle;
  if (mask === 'circle') return { borderRadius: '50%' };

  return radius ? { borderRadius: `${radius}px` } : {};
};

/**
 * Resolve an image source: uploaded assets (`asset:<id>`) come from
 * IndexedDB, `theme:bg` is the active theme background, `contest:logo` is
 * the loaded contest's logo (or the hosting country's), anything else is a
 * URL (foreign origins go through the image proxy so exports can inline them).
 */
export function useImageSource(src: string): string | null {
  const themeBg = useShareBgImage();
  const local = useLocalAssetUrl(src);
  const contestLogo = useGeneralStore((s) => s.activeContest?.logoUrl ?? null);
  const hostingCode = useGeneralStore((s) => s.settings.hostingCountryCode);

  if (src === THEME_BG_SRC)
    return getBackgroundImageForImageGeneration(themeBg);
  if (src === CONTEST_LOGO_SRC) {
    return contestLogo
      ? getBackgroundImageForImageGeneration(contestLogo)
      : getHostingCountryLogoForImageGeneration(hostingCode).logo;
  }
  if (local === null) return null;
  if (local.startsWith('data:') || local.startsWith('blob:')) return local;

  return getBackgroundImageForImageGeneration(local);
}

const ImageElement: React.FC<{ el: ImageElementModel }> = ({ el }) => {
  const src = useImageSource(el.src);

  if (!src) {
    return (
      <div
        className="w-full h-full grid place-items-center text-white/50 bg-white/[0.06] border border-dashed border-white/25"
        style={maskStyle(el.mask, el.radius)}
      >
        <ImageOff className="size-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="block w-full h-full"
      style={{ objectFit: el.fit, ...maskStyle(el.mask, el.radius) }}
    />
  );
};

export default ImageElement;
