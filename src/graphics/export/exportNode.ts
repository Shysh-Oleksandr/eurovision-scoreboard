/**
 * Deterministic DOM → image export.
 *
 * Sequence: inline every <img> and CSS background-image under `node` as data
 * URLs and wait for them to be decoded; await `document.fonts.ready` and two
 * animation frames; snapshot once. snapdom is the default engine; it reports
 * degradations (`image-fallback` = an image could not be inlined and a grey
 * placeholder was drawn), which triggers at most one re-capture with its
 * resource cache invalidated. If snapdom throws, html-to-image runs as the
 * fallback engine. This replaces the old five-attempt loop that compared
 * output sizes because it had no signal for "an image is missing".
 *
 * Proven in the Phase 0 PoC on Chrome, Safari, Firefox and iOS; numbers in
 * docs/plans/graphics-poc-results.md.
 */

export type ExportEngine = 'snapdom' | 'html-to-image';

export interface ExportOptions {
  /** Design size of `node` (its CSS size before any preview scaling). */
  width: number;
  height: number;
  /** Output multiplier (2 = "high quality"). */
  scale?: number;
  format?: 'png' | 'jpeg';
  /** JPEG quality 0..1. */
  quality?: number;
  engine?: ExportEngine;
  /** Disable the html-to-image fallback (tests, diagnostics). */
  noFallback?: boolean;
}

export interface ExportResult {
  dataUrl: string;
  width: number;
  height: number;
  engine: ExportEngine;
  /** Verified retries (snapdom `image-fallback` → one re-capture). */
  retries: number;
  /** Whether the fallback engine produced the result. */
  usedFallback: boolean;
  warnings: string[];
  durationMs: number;
}

const DEFAULT_ENGINE: ExportEngine = 'snapdom';

/* ------------------------------------------------------------------ */
/* Resource inlining                                                   */
/* ------------------------------------------------------------------ */

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const dataUrlCache = new Map<string, Promise<string>>();

const fetchDataUrl = (url: string, init?: RequestInit): Promise<string> =>
  fetch(url, init)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);

      return r.blob();
    })
    .then(blobToDataUrl);

const isCrossOrigin = (url: string) => {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

async function loadDataUrl(url: string): Promise<string> {
  // No cache mode for blob: URLs (Firefox is strict about it).
  if (url.startsWith('blob:')) return fetchDataUrl(url);
  if (!isCrossOrigin(url)) return fetchDataUrl(url, { cache: 'force-cache' });
  // The preview already loaded this image without CORS (CSS background,
  // plain <img>), so its HTTP cache entry has no Access-Control-Allow-Origin.
  // A cache-first CORS fetch reuses that entry and fails; `no-cache`
  // revalidates with an Origin header and the CDN answers with CORS headers.
  try {
    return await fetchDataUrl(url, { mode: 'cors', cache: 'no-cache' });
  } catch (e) {
    if (!url.startsWith('https://')) throw e;

    // Origin not on the host's CORS allowlist (R2 allows only some app
    // origins): go through the same-origin proxy instead.
    return fetchDataUrl(`/api/image-proxy?url=${encodeURIComponent(url)}`, {
      cache: 'force-cache',
    });
  }
}

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  let pending = dataUrlCache.get(url);

  if (!pending) {
    pending = loadDataUrl(url);
    // Blob URLs are revoked by their owners; never cache them.
    if (!url.startsWith('blob:')) dataUrlCache.set(url, pending);
    pending.catch(() => dataUrlCache.delete(url));
  }

  return pending;
}

const URL_RE = /url\((['"]?)(.*?)\1\)/g;

const waitForImage = (img: HTMLImageElement, timeoutMs: number) =>
  new Promise<'ok' | 'error' | 'timeout'>((resolve) => {
    if (img.complete && img.naturalWidth) {
      resolve('ok');

      return;
    }
    const timer = setTimeout(() => resolve('timeout'), timeoutMs);
    const done = (result: 'ok' | 'error') => () => {
      clearTimeout(timer);
      resolve(result);
    };

    img.addEventListener('load', done('ok'), { once: true });
    img.addEventListener('error', done('error'), { once: true });
  });

/**
 * Inline images under `node` and wait until they are decoded. Mutates the
 * live DOM; React only re-sets `src`/`style` on prop changes, so the
 * temporary edits survive until `restore()`.
 */
export async function inlineResources(
  node: HTMLElement,
  warnings: string[],
): Promise<() => void> {
  const restores: Array<() => void> = [];
  const imgs = Array.from(node.querySelectorAll('img'));

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;

      if (!src) return;
      const prevSrc = img.getAttribute('src');
      const prevSrcset = img.getAttribute('srcset');
      const prevSizes = img.getAttribute('sizes');
      const prevLoading = img.getAttribute('loading');

      try {
        const dataUrl = await toDataUrl(src);

        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.setAttribute('loading', 'eager');
        img.src = dataUrl;
        await img.decode().catch(() => undefined);
        const state = await waitForImage(img, 3000);

        if (state !== 'ok') warnings.push(`img ${state}: ${src.slice(0, 80)}`);
        restores.push(() => {
          if (prevSrc !== null) img.setAttribute('src', prevSrc);
          if (prevSrcset !== null) img.setAttribute('srcset', prevSrcset);
          if (prevSizes !== null) img.setAttribute('sizes', prevSizes);
          if (prevLoading !== null) img.setAttribute('loading', prevLoading);
          else img.removeAttribute('loading');
        });
      } catch (e) {
        warnings.push(`img not inlined: ${String(e)}`);
      }
    }),
  );

  // CSS backgrounds are inlined too, but Safari drops url() backgrounds from
  // the first render of a snapshot (no warning; only a second, different
  // snapshot paints them). Image fills therefore render as <img> (see
  // render/fills.tsx); this pass covers what is left.
  const all = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))];

  await Promise.all(
    all.map(async (el) => {
      const bg = getComputedStyle(el).backgroundImage;

      if (!bg || bg === 'none' || !bg.includes('url(')) return;
      const urls = Array.from(bg.matchAll(URL_RE)).map((m) => m[2]);

      if (!urls.length || urls.every((u) => u.startsWith('data:'))) return;
      const prevInline = el.style.backgroundImage;

      try {
        let next = bg;

        for (const u of urls) {
          // eslint-disable-next-line no-await-in-loop
          const d = await toDataUrl(u);

          next = next.replace(u, d);
        }
        el.style.backgroundImage = next;
        restores.push(() => {
          el.style.backgroundImage = prevInline;
        });
      } catch (e) {
        warnings.push(`background not inlined: ${String(e)}`);
      }
    }),
  );

  return () => restores.reverse().forEach((fn) => fn());
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/* ------------------------------------------------------------------ */
/* Engines                                                             */
/* ------------------------------------------------------------------ */

interface Capture {
  canvas: HTMLCanvasElement;
  retries: number;
}

async function captureHtmlToImage(
  node: HTMLElement,
  width: number,
  height: number,
  scale: number,
): Promise<Capture> {
  const mod = await import('html-to-image');
  const toCanvas = (mod as any).toCanvas ?? mod.default?.toCanvas;
  const canvas: HTMLCanvasElement = await toCanvas(node, {
    width,
    height,
    canvasWidth: width * scale,
    canvasHeight: height * scale,
    pixelRatio: 1,
    style: { transform: 'none' },
    includeQueryParams: true,
    cacheBust: false,
  });

  return { canvas, retries: 0 };
}

async function captureSnapdom(
  node: HTMLElement,
  width: number,
  height: number,
  scale: number,
  warnings: string[],
): Promise<Capture> {
  const { snapdom } = await import('@zumer/snapdom');
  // Tables and inline text can re-wrap once fonts are embedded; snapdom can
  // verify the layout (`reconcile`) at roughly twice the capture time. Only
  // pay for it where it matters.
  const reconcile = node.querySelector('table') !== null;
  const run = (invalidate: boolean) =>
    snapdom(node, {
      width,
      height,
      dpr: 1,
      embedFonts: true,
      fast: true,
      reconcile,
      invalidate,
    });
  // snapdom captures the element as laid out: neutralise the preview scale
  // for the duration of the capture (the preview wrapper clips, no reflow).
  const prevTransform = node.style.transform;

  node.style.transform = 'none';
  try {
    let retries = 0;
    let capture = await run(false);
    const collect = (label: string) =>
      capture.warnings.forEach((w) =>
        warnings.push(`snapdom${label}: ${w.code} — ${w.message}`),
      );

    collect('');
    if (capture.warnings.some((w) => w.code === 'image-fallback')) {
      retries = 1;
      capture = await run(true);
      collect(' (retry)');
    }
    const canvas = await capture.toCanvas({ dpr: scale, width });

    return { canvas, retries };
  } finally {
    node.style.transform = prevTransform;
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function exportNode(
  node: HTMLElement,
  options: ExportOptions,
): Promise<ExportResult> {
  const {
    width,
    height,
    scale = 1,
    format = 'png',
    quality = 0.92,
    engine = DEFAULT_ENGINE,
    noFallback = false,
  } = options;
  const warnings: string[] = [];
  const t0 = performance.now();
  const restore = await inlineResources(node, warnings);

  try {
    await document.fonts.ready;
    await nextFrame();
    await nextFrame();

    let usedEngine = engine;
    let usedFallback = false;
    let capture: Capture;

    try {
      capture =
        engine === 'snapdom'
          ? await captureSnapdom(node, width, height, scale, warnings)
          : await captureHtmlToImage(node, width, height, scale);
    } catch (e) {
      if (noFallback) throw e;
      warnings.push(`${engine} failed, falling back: ${String(e)}`);
      usedEngine = engine === 'snapdom' ? 'html-to-image' : 'snapdom';
      usedFallback = true;
      capture =
        usedEngine === 'snapdom'
          ? await captureSnapdom(node, width, height, scale, warnings)
          : await captureHtmlToImage(node, width, height, scale);
    }

    const mime = format === 'png' ? 'image/png' : 'image/jpeg';

    return {
      dataUrl: capture.canvas.toDataURL(mime, quality),
      width: capture.canvas.width,
      height: capture.canvas.height,
      engine: usedEngine,
      retries: capture.retries,
      usedFallback,
      warnings,
      durationMs: performance.now() - t0,
    };
  } finally {
    restore();
  }
}
