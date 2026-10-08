/**
 * Deterministic DOM → image export for the PoC.
 *
 * Sequence (the plan's "preload → fonts.ready → one snapshot"):
 *  1. inline every <img> and CSS background-image under `node` as data URLs,
 *     force eager loading and await decode;
 *  2. await document.fonts.ready + two animation frames;
 *  3. snapshot once with the chosen engine.
 *
 * No retry loop. The engine is behind `exportNode` so html-to-image and
 * snapdom can be A/B'd with identical inputs.
 */

export type ExportEngine = 'html-to-image' | 'snapdom';

export interface ExportOptions {
  engine: ExportEngine;
  /** Design size of `node` (its CSS size before any preview scaling). */
  width: number;
  height: number;
  /** Output multiplier. */
  scale: number;
  format: 'png' | 'jpeg';
  quality?: number;
  /** Skip step 1 (reproduces the legacy behaviour the retry loop papered over). */
  skipPreload?: boolean;
}

export interface ExportTimings {
  preloadMs: number;
  fontsMs: number;
  captureMs: number;
  encodeMs: number;
  totalMs: number;
}

export interface ExportResult {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  timings: ExportTimings;
  warnings: string[];
  /** Verified retries (snapdom `image-fallback` → one re-capture). */
  retries: number;
  inlinedImages: number;
  inlinedBackgrounds: number;
}

const now = () => performance.now();

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const dataUrlCache = new Map<string, Promise<string>>();

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  let pending = dataUrlCache.get(url);

  if (!pending) {
    // No cache mode for blob: URLs (Firefox is strict about it).
    pending = fetch(
      url,
      url.startsWith('blob:') ? undefined : { cache: 'force-cache' },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);

        return r.blob();
      })
      .then(blobToDataUrl);
    // Blob URLs are revoked by callers; don't cache them.
    if (!url.startsWith('blob:')) dataUrlCache.set(url, pending);
    pending.catch(() => dataUrlCache.delete(url));
  }

  return pending;
}

const URL_RE = /url\((['"]?)(.*?)\1\)/g;

/**
 * Inline images under `node`. Returns a restore function and counts.
 * Mutates the live DOM; React only re-sets `src`/`style` on prop changes, so
 * temporary edits survive until restore.
 */
export async function preloadNode(
  node: HTMLElement,
  warnings: string[],
): Promise<{ restore: () => void; images: number; backgrounds: number }> {
  const restores: Array<() => void> = [];
  let images = 0;
  let backgrounds = 0;

  const imgs = Array.from(node.querySelectorAll('img'));

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;

      if (!src) return;
      const prevSrc = img.getAttribute('src');
      const prevSrcset = img.getAttribute('srcset');
      const prevLoading = img.getAttribute('loading');

      try {
        const dataUrl = await toDataUrl(src);

        img.removeAttribute('srcset');
        img.setAttribute('loading', 'eager');
        img.src = dataUrl;
        await img.decode().catch(() => undefined);
        // decode() alone was not enough everywhere: insist on a loaded image.
        if (!img.complete || !img.naturalWidth) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            const timer = setTimeout(() => {
              warnings.push(`img load timeout: ${src.slice(0, 60)}`);
              resolve();
            }, 3000);

            img.addEventListener('load', () => {
              clearTimeout(timer);
              done();
            });
            img.addEventListener('error', () => {
              clearTimeout(timer);
              warnings.push(`img load error: ${src.slice(0, 60)}`);
              done();
            });
          });
        }
        images += 1;
        restores.push(() => {
          if (prevSrc !== null) img.setAttribute('src', prevSrc);
          if (prevSrcset !== null) img.setAttribute('srcset', prevSrcset);
          if (prevLoading !== null) img.setAttribute('loading', prevLoading);
          else img.removeAttribute('loading');
        });
      } catch (e) {
        warnings.push(`img not inlined: ${String(e)}`);
      }
    }),
  );

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
        backgrounds += 1;
        restores.push(() => {
          el.style.backgroundImage = prevInline;
        });
      } catch (e) {
        warnings.push(`background not inlined: ${String(e)}`);
      }
    }),
  );

  return {
    restore: () => restores.reverse().forEach((fn) => fn()),
    images,
    backgrounds,
  };
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function captureHtmlToImage(
  node: HTMLElement,
  o: ExportOptions,
): Promise<HTMLCanvasElement> {
  const mod = await import('html-to-image');
  const toCanvas = (mod as any).toCanvas ?? mod.default?.toCanvas;

  return toCanvas(node, {
    width: o.width,
    height: o.height,
    canvasWidth: o.width * o.scale,
    canvasHeight: o.height * o.scale,
    pixelRatio: 1,
    style: { transform: 'none' },
    includeQueryParams: true,
    cacheBust: false,
  });
}

interface CaptureOutcome {
  canvas: HTMLCanvasElement;
  retries: number;
}

/**
 * snapdom reports degradations in `result.warnings`; `image-fallback` means an
 * image failed to inline and a grey placeholder was drawn (seen once on
 * Firefox with a freshly uploaded blob image). That is detectable, so the
 * capture is retried once with the resource cache invalidated. This is a
 * verified, bounded retry — not the blind five-attempt loop of the old code.
 */
async function captureSnapdom(
  node: HTMLElement,
  o: ExportOptions,
  warnings: string[],
): Promise<CaptureOutcome> {
  const { snapdom } = await import('@zumer/snapdom');
  // snapdom captures the element as laid out; neutralise the preview scale
  // for the duration of the capture. The wrapper clips, so no page reflow.
  const prevTransform = node.style.transform;

  node.style.transform = 'none';
  try {
    let retries = 0;
    let capture = await snapdom(node, {
      width: o.width,
      height: o.height,
      dpr: 1,
      embedFonts: true,
      fast: true,
    });
    const collect = (label: string) =>
      capture.warnings.forEach((w) =>
        warnings.push(`snapdom${label}: ${w.code} — ${w.message}`),
      );

    collect('');
    if (capture.warnings.some((w) => w.code === 'image-fallback')) {
      retries = 1;
      capture = await snapdom(node, {
        width: o.width,
        height: o.height,
        dpr: 1,
        embedFonts: true,
        fast: true,
        invalidate: true,
      });
      collect(' (retry)');
    }

    const canvas = await capture.toCanvas({ dpr: o.scale, width: o.width });

    return { canvas, retries };
  } finally {
    node.style.transform = prevTransform;
  }
}

export async function exportNode(
  node: HTMLElement,
  o: ExportOptions,
): Promise<ExportResult> {
  const warnings: string[] = [];
  const t0 = now();
  let restore: (() => void) | null = null;
  let images = 0;
  let backgrounds = 0;

  try {
    if (!o.skipPreload) {
      ({ restore, images, backgrounds } = await preloadNode(node, warnings));
    }
    const t1 = now();

    await document.fonts.ready;
    await nextFrame();
    await nextFrame();
    const t2 = now();

    const { canvas, retries } =
      o.engine === 'snapdom'
        ? await captureSnapdom(node, o, warnings)
        : { canvas: await captureHtmlToImage(node, o), retries: 0 };
    const t3 = now();

    const mime = o.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, o.quality ?? 0.92);
    const t4 = now();

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      bytes: Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4),
      timings: {
        preloadMs: t1 - t0,
        fontsMs: t2 - t1,
        captureMs: t3 - t2,
        encodeMs: t4 - t3,
        totalMs: t4 - t0,
      },
      warnings,
      retries,
      inlinedImages: images,
      inlinedBackgrounds: backgrounds,
    };
  } finally {
    restore?.();
  }
}

/* ------------------------------------------------------------------ */
/* Comparison helpers                                                  */
/* ------------------------------------------------------------------ */

/** FNV-1a (two lanes) — fallback when `crypto.subtle` is unavailable. */
function fnvHash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;

  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);

    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x811c9dc5) >>> 0;
  }

  return `fnv-${a.toString(16).padStart(8, '0')}${b
    .toString(16)
    .padStart(8, '0')}`;
}

/**
 * Content hash. `crypto.subtle` only exists in secure contexts (https or
 * localhost), so a phone on the LAN dev URL falls back to FNV.
 */
export async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return fnvHash(text);
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );

  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

export interface PixelDiff {
  sampled: number;
  differing: number;
  /** 0..1 share of sampled pixels whose max channel delta exceeds `tolerance`. */
  ratio: number;
  sizeMismatch: boolean;
}

/**
 * Cheap pixel comparison: sample every `step`-th pixel, count those whose max
 * channel delta exceeds `tolerance` (JPEG noise stays under ~8).
 */
export async function pixelDiff(
  a: string,
  b: string,
  step = 4,
  tolerance = 12,
): Promise<PixelDiff> {
  const [ia, ib] = await Promise.all([loadImage(a), loadImage(b)]);
  const w = Math.min(ia.naturalWidth, ib.naturalWidth);
  const h = Math.min(ia.naturalHeight, ib.naturalHeight);
  const sizeMismatch =
    ia.naturalWidth !== ib.naturalWidth ||
    ia.naturalHeight !== ib.naturalHeight;

  const draw = (img: HTMLImageElement) => {
    const c = document.createElement('canvas');

    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;

    ctx.drawImage(img, 0, 0, w, h);

    return ctx.getImageData(0, 0, w, h).data;
  };
  const da = draw(ia);
  const db = draw(ib);
  let sampled = 0;
  let differing = 0;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const d = Math.max(
        Math.abs(da[i] - db[i]),
        Math.abs(da[i + 1] - db[i + 1]),
        Math.abs(da[i + 2] - db[i + 2]),
      );

      sampled += 1;
      if (d > tolerance) differing += 1;
    }
  }

  return {
    sampled,
    differing,
    ratio: sampled ? differing / sampled : 0,
    sizeMismatch,
  };
}

export const formatMs = (ms: number) => `${ms.toFixed(0)} ms`;
export const formatBytes = (b: number) =>
  b > 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(2)} MB`
    : `${(b / 1024).toFixed(0)} KB`;
