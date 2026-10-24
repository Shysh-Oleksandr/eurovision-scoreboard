/**
 * Fetches a foreign image through the native HTTP stack (Capacitor's built-in
 * CapacitorHttp plugin) and returns it as a data URL.
 *
 * The web build reads foreign images for exports through the same-origin
 * `/api/image-proxy` route. The native bundle is a static export with no
 * routes, but native requests are not subject to CORS, so the app can read
 * the bytes itself. Only call this when `Capacitor.isNativePlatform()`.
 */
export async function fetchImageDataUrlNatively(url: string): Promise<string> {
  const { CapacitorHttp } = await import('@capacitor/core');

  const res = await CapacitorHttp.get({
    url,
    responseType: 'blob',
    // `url` is already a complete, encoded URL.
    shouldEncodeUrlParams: false,
    connectTimeout: 15000,
    readTimeout: 15000,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${res.status} ${url}`);
  }

  const contentType = Object.entries(res.headers)
    .find(([name]) => name.toLowerCase() === 'content-type')?.[1]
    ?.split(';')[0]
    ?.trim();

  // Same guard as the web proxy route.
  if (!contentType?.startsWith('image/') || typeof res.data !== 'string') {
    throw new Error(
      `Not an image (${contentType ?? 'no content type'}) ${url}`,
    );
  }

  // Binary responses arrive base64-encoded; Android wraps the lines.
  return `data:${contentType};base64,${res.data.replace(/\s/g, '')}`;
}
