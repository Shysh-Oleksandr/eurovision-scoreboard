import { toast } from 'react-toastify';

/**
 * Download / Web Share / clipboard for a generated image data URL. Shared by
 * the editor's export dialog and the template sheet. Toast copy comes from
 * the caller so each surface keeps its own namespace.
 */

export interface ImageActionMessages {
  downloaded: (name: string) => string;
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

export function downloadImage(
  dataUrl: string,
  fileName: string,
  messages: ImageActionMessages,
): void {
  const link = document.createElement('a');

  link.download = fileName;
  link.href = dataUrl;
  link.click();
  toast.success(messages.downloaded(fileName));
}

export async function shareImage(
  dataUrl: string,
  fileName: string,
  title: string,
  messages: ImageActionMessages,
): Promise<void> {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], fileName, {
      type: blob.type || 'image/png',
    });
    const shareData = { title, files: [file] };

    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      toast.error(messages.shareUnsupported);
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.error('Share failed:', err);
      toast.error(messages.shareFailed);
    }
  }
}

export async function copyImage(
  dataUrl: string,
  messages: ImageActionMessages,
): Promise<void> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('clipboard-unsupported');
    }
    let blob = await dataUrlToBlob(dataUrl);

    // Clipboards accept PNG only: re-encode JPEG exports.
    if (blob.type !== 'image/png') {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('encode'))),
          'image/png',
        ),
      );
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast.success(messages.copied);
  } catch (err) {
    console.error('Copy failed:', err);
    toast.error(messages.copyFailed);
  }
}
