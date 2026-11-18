/**
 * What a theme's background video may be (docs/background-video.md). The
 * backend checks the type and bytes again (`theme-background.constants.ts`);
 * length and size are only checked here, since the server doesn't decode.
 */

export const BACKGROUND_VIDEO_MAX_MB = 15;
export const BACKGROUND_VIDEO_MAX_BYTES = BACKGROUND_VIDEO_MAX_MB * 1024 * 1024;
export const BACKGROUND_VIDEO_MAX_SECONDS = 60;
/** 1080p: the longer side, so portrait videos fit too. */
export const BACKGROUND_VIDEO_MAX_EDGE = 1920;

/** For the file input. `.mov` is left out on purpose (see `checkBackgroundVideoFile`). */
export const BACKGROUND_VIDEO_ACCEPT = 'video/mp4,video/webm,.mp4,.webm';

export type BackgroundVideoProblem =
  | 'type'
  | 'size'
  | 'duration'
  | 'resolution'
  | 'unplayable';

export type BackgroundVideoLinkProblem = 'https' | 'page';

/**
 * Checks that need no decoding. Only MP4 and WebM: iPhone's `.mov` (usually
 * HEVC) doesn't play in Chrome on Windows or Android, so it has to be
 * converted first.
 */
export function checkBackgroundVideoFile(file: {
  name: string;
  type: string;
  size: number;
}): BackgroundVideoProblem | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const isMp4 = type === 'video/mp4' || (!type && name.endsWith('.mp4'));
  const isWebm = type === 'video/webm' || (!type && name.endsWith('.webm'));

  if (!isMp4 && !isWebm) return 'type';
  if (file.size > BACKGROUND_VIDEO_MAX_BYTES) return 'size';

  return null;
}

/**
 * Checks on what the browser read from the file. A WebM without a duration
 * in its header reports `Infinity`; that can't be measured, so it passes.
 */
export function checkBackgroundVideoMeta(meta: {
  duration: number;
  width: number;
  height: number;
}): BackgroundVideoProblem | null {
  if (!meta.width || !meta.height) return 'unplayable';
  if (
    Number.isFinite(meta.duration) &&
    meta.duration > BACKGROUND_VIDEO_MAX_SECONDS + 0.5
  ) {
    return 'duration';
  }
  if (Math.max(meta.width, meta.height) > BACKGROUND_VIDEO_MAX_EDGE) {
    return 'resolution';
  }

  return null;
}

/** Sites whose links open a player page, not a video file. */
const VIDEO_PAGE_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'drive.google.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'dailymotion.com',
  'twitch.tv',
  'x.com',
  'twitter.com',
];

/** A linked video must be an https link straight to a video file. */
export function checkBackgroundVideoLink(
  raw: string,
): BackgroundVideoLinkProblem | null {
  const trimmed = raw.trim();

  if (!trimmed) return null;

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return 'https';
  }
  if (url.protocol !== 'https:') return 'https';

  const host = url.hostname.toLowerCase();

  if (
    VIDEO_PAGE_HOSTS.some((page) => host === page || host.endsWith(`.${page}`))
  ) {
    return 'page';
  }

  return null;
}
