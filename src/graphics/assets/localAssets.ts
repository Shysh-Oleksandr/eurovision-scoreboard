'use client';
import { useEffect, useState } from 'react';

import { ASSET_PREFIX, assetIdFromSrc, isAssetSrc } from '../model/assetRefs';
import { MAX_IMAGE_BYTES } from '../model/presets';
import { getAsset, newRecordId, putAsset } from '../storage/designsDb';

/**
 * Image sources in a design are plain URLs, or one of two conventions:
 *   `asset:<id>`  an image the user uploaded (IndexedDB `graphicsAssets`)
 *   `theme:bg`    the active theme's background image
 * `useResolvedImageSrc` turns either into something an `<img>` can load.
 */

export {
  ASSET_PREFIX,
  assetIdFromSrc,
  CONTEST_LOGO_SRC,
  isAssetSrc,
  THEME_BG_SRC,
} from '../model/assetRefs';

/** Module cache: id → data URL. Seeded on upload so the first paint is sync. */
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export function getCachedAsset(id: string): string | undefined {
  return cache.get(id);
}

export function loadAsset(id: string): Promise<string | null> {
  const hit = cache.get(id);

  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);

  if (inflight) return inflight;
  const p = getAsset(id)
    .then((rec) => {
      if (rec) cache.set(id, rec.dataUrl);

      return rec?.dataUrl ?? null;
    })
    .finally(() => pending.delete(id));

  pending.set(id, p);

  return p;
}

export class ImageTooLargeError extends Error {
  constructor(public readonly fileName: string, public readonly size: number) {
    super('image-too-large');
  }
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Store an uploaded image; returns the `asset:<id>` source. */
export async function storeUploadedImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError(file.name, file.size);
  }
  const dataUrl = await readAsDataUrl(file);
  const id = newRecordId('a');

  await putAsset({
    id,
    dataUrl,
    name: file.name,
    size: file.size,
    createdAt: Date.now(),
  });
  cache.set(id, dataUrl);

  return `${ASSET_PREFIX}${id}`;
}

/**
 * Resolve an element/fill image source for rendering. Local assets resolve
 * asynchronously the first time (then from the cache); `null` while loading.
 */
export function useLocalAssetUrl(src: string): string | null {
  const isAsset = isAssetSrc(src);
  const id = isAsset ? assetIdFromSrc(src) : '';
  const [url, setUrl] = useState<string | null>(() =>
    isAsset ? cache.get(id) ?? null : src,
  );

  useEffect(() => {
    if (!isAsset) {
      setUrl(src);

      return undefined;
    }
    const cached = cache.get(id);

    if (cached) {
      setUrl(cached);

      return undefined;
    }
    let cancelled = false;

    setUrl(null);
    loadAsset(id).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [src, isAsset, id]);

  return url;
}

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
