/**
 * Sharing and saving files in the native apps (see docs/native-apps.md §6).
 *
 * WKWebView ignores `<a download>`, and Android's WebView has no Web Share
 * API, so the apps write the file to the cache directory
 * (`@capacitor/filesystem`) and open the system share sheet
 * (`@capacitor/share`) on it. On iOS that sheet is also how a file is saved
 * ("Save Image" to Photos, "Save to Files"). Android's sheet has no save
 * action, so saving there goes through the app's own `MediaSaver` plugin
 * (android/…/MediaSaverPlugin.java): images to Pictures/DouzePoints, other
 * files to Download/DouzePoints.
 *
 * Plugins are imported lazily so they stay out of the website's bundle; only
 * call these when `Capacitor.isNativePlatform()`.
 */

/** Subfolder of the cache directory; emptied before each new file. */
const EXPORT_DIR = 'exports';

export interface NativeShareFile {
  /** A data URL, or a Blob (read into base64 here). */
  data: string | Blob;
  fileName: string;
  title?: string;
  text?: string;
  url?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const toBase64 = (data: string | Blob): Promise<string> =>
  typeof data === 'string'
    ? Promise.resolve(data.slice(data.indexOf(',') + 1))
    : blobToBase64(data);

/** Both platforms reject a share sheet the user dismisses. */
const isCancel = (error: unknown) =>
  /cancel/i.test(String((error as Error)?.message ?? error));

/**
 * Writes the file to the cache and shares it. Resolves `false` when the user
 * dismissed the sheet; throws on real failures.
 */
export async function shareFileNatively(
  file: NativeShareFile,
): Promise<boolean> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  // Earlier exports are no longer needed once their sheet has closed.
  await Filesystem.rmdir({
    path: EXPORT_DIR,
    directory: Directory.Cache,
    recursive: true,
  }).catch(() => undefined);

  const { uri } = await Filesystem.writeFile({
    path: `${EXPORT_DIR}/${safeFileName(file.fileName)}`,
    data: await toBase64(file.data),
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title: file.title,
      text: file.text,
      url: file.url,
      files: [uri],
    });

    return true;
  } catch (error) {
    if (isCancel(error)) return false;
    throw error;
  }
}

interface MediaSaverPlugin {
  save(options: {
    data: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ uri: string; folder: string }>;
}

const mimeTypeOf = (data: string | Blob): string =>
  (typeof data === 'string' ? /^data:([^;,]+)/.exec(data)?.[1] : data.type) ||
  'application/octet-stream';

export type NativeSaveResult =
  | { kind: 'saved'; folder: string }
  | { kind: 'shared' }
  | { kind: 'cancelled' };

/**
 * Saves the file: to shared storage on Android 10+, through the share sheet
 * elsewhere (iOS, older Android).
 */
export async function saveFileNatively(
  file: NativeShareFile,
): Promise<NativeSaveResult> {
  const { Capacitor, registerPlugin } = await import('@capacitor/core');

  if (Capacitor.getPlatform() === 'android') {
    const MediaSaver = registerPlugin<MediaSaverPlugin>('MediaSaver');

    try {
      const { folder } = await MediaSaver.save({
        data: await toBase64(file.data),
        fileName: safeFileName(file.fileName),
        mimeType: mimeTypeOf(file.data),
      });

      return { kind: 'saved', folder };
    } catch (error) {
      // Android 9 and older: no MediaStore without a storage permission.
      if ((error as { code?: string })?.code !== 'UNAVAILABLE') throw error;
    }
  }

  return (await shareFileNatively(file))
    ? { kind: 'shared' }
    : { kind: 'cancelled' };
}

/** Shares a link. Resolves `false` when the user dismissed the sheet. */
export async function shareLinkNatively(
  url: string,
  title?: string,
): Promise<boolean> {
  const { Share } = await import('@capacitor/share');

  try {
    await Share.share({ title, url });

    return true;
  } catch (error) {
    if (isCancel(error)) return false;
    throw error;
  }
}

/** File names end up in a path: no separators or reserved characters. */
function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]+/g, '-').trim() || 'DouzePoints';
}
