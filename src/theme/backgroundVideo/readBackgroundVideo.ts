import {
  BackgroundVideoProblem,
  checkBackgroundVideoFile,
  checkBackgroundVideoMeta,
} from './backgroundVideoRules';

/** The background image limit (`useImageUpload` in the theme editor). */
const FIRST_FRAME_MAX_BYTES = 1.5 * 1024 * 1024;
const LOAD_TIMEOUT_MS = 15_000;

export type ReadBackgroundVideoResult =
  | { problem: BackgroundVideoProblem }
  | { problem: null; firstFrame: File };

function waitForEvent(
  video: HTMLVideoElement,
  event: 'loadeddata' | 'seeked',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => finish(new Error('timeout')),
      LOAD_TIMEOUT_MS,
    );

    function finish(error?: unknown) {
      window.clearTimeout(timer);
      video.removeEventListener(event, onDone);
      video.removeEventListener('error', onError);
      if (error) reject(error);
      else resolve();
    }
    function onDone() {
      finish();
    }
    function onError() {
      finish(video.error ?? new Error('video error'));
    }

    video.addEventListener(event, onDone);
    video.addEventListener('error', onError);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The first frame as a compact image. WebP where the browser can encode it
 * (Safari returns PNG for an unsupported type, which would be far too big),
 * otherwise JPEG, with a lower quality if the first try is still too large.
 */
async function encodeFrame(canvas: HTMLCanvasElement): Promise<File | null> {
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);

  if (webp?.type === 'image/webp' && webp.size <= FIRST_FRAME_MAX_BYTES) {
    return new File([webp], 'background-video-frame.webp', {
      type: 'image/webp',
    });
  }

  for (const quality of [0.85, 0.7, 0.5]) {
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);

    if (jpeg && jpeg.size <= FIRST_FRAME_MAX_BYTES) {
      return new File([jpeg], 'background-video-frame.jpg', {
        type: 'image/jpeg',
      });
    }
  }

  return null;
}

/**
 * Checks a picked video file and grabs its first frame, which becomes the
 * theme's background image (the video's still). Everything happens on the
 * local file, so no CORS is involved. A video this browser can't decode is
 * refused as `unplayable`.
 */
export async function readBackgroundVideo(
  file: File,
): Promise<ReadBackgroundVideoResult> {
  const fileProblem = checkBackgroundVideoFile(file);

  if (fileProblem) return { problem: fileProblem };

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');

  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  try {
    const loaded = waitForEvent(video, 'loadeddata');

    video.src = objectUrl;
    await loaded;

    const metaProblem = checkBackgroundVideoMeta({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    });

    if (metaProblem) return { problem: metaProblem };

    // A seek makes Safari paint the frame; drawing right after `loadeddata`
    // can come out black there.
    const seeked = waitForEvent(video, 'seeked');

    video.currentTime = 0.001;
    await seeked;

    const canvas = document.createElement('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) return { problem: 'unplayable' };
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const firstFrame = await encodeFrame(canvas);

    if (!firstFrame) return { problem: 'unplayable' };

    return { problem: null, firstFrame };
  } catch {
    return { problem: 'unplayable' };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
