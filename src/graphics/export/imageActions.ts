import { toast } from 'react-toastify';

import { saveFile, shareFile } from '@/helpers/fileActions';
import { askForReviewSoon } from '@/native/review';

/**
 * Download / Web Share / clipboard for a generated image data URL. Shared by
 * the editor's export dialog and the template sheet. Toast copy comes from
 * the caller so each surface keeps its own namespace. In the native apps
 * both download and share open the system share sheet (`fileActions`).
 */

export interface ImageActionMessages {
  downloaded: (name: string) => string;
  /** Saved to the device's shared storage (Android app). */
  saved: (folder: string) => string;
  copied: string;
  copyFailed: string;
  shareUnsupported: string;
  shareFailed: string;
}

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design';

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> =>
  (await fetch(dataUrl)).blob();

export async function downloadImage(
  dataUrl: string,
  fileName: string,
  messages: ImageActionMessages,
): Promise<void> {
  try {
    const result = await saveFile(dataUrl, fileName);

    if (result.kind === 'downloaded') {
      toast.success(messages.downloaded(fileName));
    } else if (result.kind === 'saved') {
      toast.success(messages.saved(result.folder));
    }
    if (result.kind !== 'cancelled') askForReviewSoon('image-shared');
  } catch (err) {
    console.error('Save failed:', err);
    toast.error(messages.shareFailed);
  }
}

export async function shareImage(
  dataUrl: string,
  fileName: string,
  title: string,
  messages: ImageActionMessages,
): Promise<void> {
  try {
    const result = await shareFile({ data: dataUrl, fileName, title });

    if (result === 'unsupported') toast.error(messages.shareUnsupported);
    if (result === 'shared') askForReviewSoon('image-shared');
  } catch (err) {
    console.error('Share failed:', err);
    toast.error(messages.shareFailed);
  }
}

/** Whether this browser can put an image on the clipboard. */
export const canCopyImages = (): boolean =>
  typeof ClipboardItem !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.clipboard?.write;

// Clipboards accept PNG only: re-encode JPEG exports.
const toPngBlob = async (dataUrl: string): Promise<Blob> => {
  const blob = await dataUrlToBlob(dataUrl);

  if (blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode'))),
      'image/png',
    ),
  );
};

/**
 * Copies an image that may still be on its way (a share modal's export).
 * The `ClipboardItem` is created in the click itself with a promise of the
 * PNG: Safari rejects a clipboard write that only starts after an await.
 */
export async function copyImageFrom(
  source: () => Promise<string | null>,
  messages: Pick<ImageActionMessages, 'copied' | 'copyFailed'>,
): Promise<void> {
  try {
    if (!canCopyImages()) throw new Error('clipboard-unsupported');
    const png = source().then((dataUrl) => {
      if (!dataUrl) throw new Error('no-image');

      return toPngBlob(dataUrl);
    });

    // Handled by the write below; keeps a failed export from also being
    // reported as an unhandled rejection.
    png.catch(() => undefined);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    toast.success(messages.copied);
  } catch (err) {
    console.error('Copy failed:', err);
    toast.error(messages.copyFailed);
  }
}

export const copyImage = (
  dataUrl: string,
  messages: ImageActionMessages,
): Promise<void> => copyImageFrom(async () => dataUrl, messages);
