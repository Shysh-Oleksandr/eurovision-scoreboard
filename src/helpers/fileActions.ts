import { IS_NATIVE_APP } from '@/native/platform';

/**
 * Saving and sharing generated files (share images, stats, design backups)
 * and links, on the website and in the native apps. The apps have no
 * downloads and (on Android) no Web Share API: sharing opens the system share
 * sheet, and saving writes to shared storage on Android or opens the sheet
 * on iOS, whose sheet offers saving (`src/native/nativeShare.ts`). Callers
 * confirm a `saved` result with the `common.savedTo` toast.
 */

/**
 * `saved`: written to the device's shared storage (Android app), `folder`
 * says where. `shared`: the share sheet was used (iOS app).
 */
export type SaveFileResult =
  | { kind: 'downloaded' }
  | { kind: 'saved'; folder: string }
  | { kind: 'shared' }
  | { kind: 'cancelled' };
export type ShareResult = 'shared' | 'cancelled' | 'unsupported';
export type ShareLinkResult = ShareResult | 'copied';

const nativeShare = () => import('@/native/nativeShare');

/** True inside the iOS/Android shell (not `yarn dev:native` in a browser). */
async function isNativeShell(): Promise<boolean> {
  if (!IS_NATIVE_APP) return false;
  const { Capacitor } = await import('@capacitor/core');

  return Capacitor.isNativePlatform();
}

const dataToBlob = async (data: string | Blob): Promise<Blob> =>
  typeof data === 'string' ? (await fetch(data)).blob() : data;

/**
 * Downloads the file on the website; in the apps, saves it to shared storage
 * (Android) or opens the share sheet (iOS). `data` is a data URL or a Blob.
 * Throws when the native save or share fails.
 */
export async function saveFile(
  data: string | Blob,
  fileName: string,
): Promise<SaveFileResult> {
  if (await isNativeShell()) {
    return (await nativeShare()).saveFileNatively({
      data,
      fileName,
      title: fileName,
    });
  }

  const href = typeof data === 'string' ? data : URL.createObjectURL(data);
  const link = document.createElement('a');

  link.download = fileName;
  link.href = href;
  link.click();
  if (typeof data !== 'string') {
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  return { kind: 'downloaded' };
}

/** Shares a file (with optional text and link) through the share sheet. */
export async function shareFile(options: {
  data: string | Blob;
  fileName: string;
  title?: string;
  text?: string;
  url?: string;
}): Promise<ShareResult> {
  if (await isNativeShell()) {
    return (await (await nativeShare()).shareFileNatively(options))
      ? 'shared'
      : 'cancelled';
  }

  const blob = await dataToBlob(options.data);
  const file = new File([blob], options.fileName, {
    type: blob.type || 'image/png',
  });
  const shareData: ShareData = {
    title: options.title,
    text: options.text,
    url: options.url,
    files: [file],
  };

  if (!navigator.canShare?.(shareData)) return 'unsupported';
  try {
    await navigator.share(shareData);

    return 'shared';
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') return 'cancelled';
    throw error;
  }
}

/**
 * Shares a link through the share sheet, or copies it where there is none
 * (desktop browsers).
 */
export async function shareLink(
  url: string,
  title?: string,
): Promise<ShareLinkResult> {
  if (await isNativeShell()) {
    return (await (await nativeShare()).shareLinkNatively(url, title))
      ? 'shared'
      : 'cancelled';
  }

  const shareData: ShareData = { title, url };

  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);

      return 'shared';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);

    return 'copied';
  }

  return 'unsupported';
}
