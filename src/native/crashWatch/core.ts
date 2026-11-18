/**
 * The storage and decisions behind the apps' crash reports, kept free of the
 * app's stores and Capacitor so they can be tested (the wiring is in
 * `./index.ts`; docs/native-apps.md §14).
 *
 * Each launch keeps a record of its session in localStorage: whether the app
 * is on screen, what it shows, and the last few things that changed. A
 * session whose record still says "on screen" at the next launch may have
 * crashed, but the record alone can't tell: the WebView reports "hidden"
 * about two seconds after the app leaves the screen, and its localStorage
 * reaches the disk later still, so a swipe-away right after leaving looks
 * the same. A crash is only reported with native evidence:
 *
 * - Android: DouzeDiagnostics says the app was in the foreground when its
 *   process ended, or RendererCrashRecovery recorded a renderer death;
 * - iOS: the same WebView loaded the page again (sessionStorage survived)
 *   without unloading it first, which is Capacitor reloading after the
 *   WebContent process died. Untested on a device.
 */

import type { CreateErrorInput } from '@/api/errors';

export const SESSION_KEY = 'dp:app-session';
export const PENDING_KEY = 'dp:app-crash-reports';
export const SENT_KEY = 'dp:app-crash-sent';

const MAX_CRUMBS = 30;
const MAX_LABEL = 80;
const MAX_PENDING = 3;

/** Reports per device per day; a crash loop must not flood `/errors`. */
export const MAX_SENT_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `hidden` and `closed` (unloaded) are clean ends; `visible` is not. */
export type SessionState = 'visible' | 'hidden' | 'closed';

/** Seconds since the session started, and what happened. */
export type Crumb = [number, string];

/** What the app showed at the last sample. */
export type SessionContext = {
  /** Path plus the names (not values) of the query parameters. */
  path: string;
  /** Dismissable overlays open: modals, menus, popovers. */
  overlays: number;
  /** Labels of the open `role="dialog"` elements, innermost last. */
  dialogs: string[];
  /** The graphics editor is open. */
  editor: boolean;
  /** The current stage: name, voting mode, whether it's over. */
  stage: string | null;
  winner: boolean;
  theme: string;
  domNodes: number;
  canvases: number;
};

export type SessionRecord = {
  v: 1;
  startedAt: number;
  updatedAt: number;
  /** The live-update bundle, or `built-in`. */
  bundle: string;
  state: SessionState;
  ctx: SessionContext | null;
  peakDomNodes: number;
  crumbs: Crumb[];
};

/** A renderer death RendererCrashRecovery recorded (Android). */
export type RendererGone = {
  at: number;
  /** Crashed, as opposed to killed by Android to free memory. */
  didCrash: boolean;
  /** 0 waived, 1 bound, 2 important (Android's RENDERER_PRIORITY_*). */
  rendererPriority: number | null;
  /** The app was on screen. */
  visible: boolean;
  /** False once the loop guard gave up and let the app crash. */
  recovered: boolean;
  recentRecoveries: number | null;
};

/** How the previous launch ended, from the native side (Android). */
export type LastExit = {
  /** In the foreground when its process ended; null when unknown. */
  foreground: boolean | null;
  renderer: RendererGone | null;
};

export const NO_LAST_EXIT: LastExit = { foreground: null, renderer: null };

export type PendingReport = { id: string; report: CreateErrorInput };

/** localStorage, or what a test passes instead. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

// ---------------------------------------------------------------- decisions

/**
 * The report message for how the previous session ended, or null when it
 * ended cleanly or there's no native evidence of a crash. A renderer killed
 * in the background is Android freeing memory, not a crash.
 * `sameWebView`: this page load found the previous one's sessionStorage.
 */
export function assessPreviousSession(
  previous: SessionRecord | null,
  exit: LastExit,
  sameWebView: boolean,
): string | null {
  const { renderer } = exit;

  if (renderer && (renderer.didCrash || renderer.visible)) {
    const what = renderer.didCrash ? 'crashed' : 'was killed';
    const where = renderer.visible ? 'on screen' : 'in the background';
    const loop = renderer.recovered ? '' : ' (crash loop)';

    return `App crash: Android renderer ${what} ${where}${loop}`;
  }

  if (previous?.state !== 'visible') return null;
  if (sameWebView) return 'App crash: web content process ended on screen';
  if (exit.foreground === true) return 'App crash: app ended on screen';

  return null;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** A session record as it goes into a report. */
function sessionSummary(previous: SessionRecord) {
  return {
    startedAt: iso(previous.startedAt),
    lastSeenAt: iso(previous.updatedAt),
    durationS: Math.round((previous.updatedAt - previous.startedAt) / 1000),
    bundle: previous.bundle,
    state: previous.state,
    context: previous.ctx,
    peakDomNodes: previous.peakDomNodes,
    crumbs: previous.crumbs,
  };
}

/** The `/errors` body for a crash `assessPreviousSession` found. */
export function buildCrashReport(
  message: string,
  previous: SessionRecord | null,
  exit: LastExit,
  userDetails: Record<string, unknown>,
): CreateErrorInput {
  const { renderer } = exit;

  return {
    message,
    userDetails,
    generalInfo: {
      kind: 'app-crash',
      previousSession: previous && sessionSummary(previous),
      foregroundAtExit: exit.foreground,
      renderer: renderer && { ...renderer, at: iso(renderer.at) },
    },
  };
}

/** A live update the plugin rolled back: it never confirmed it had started. */
export type LiveUpdateRollback = {
  /** The bundle that was rolled back. */
  failedBundle: string;
  /** When this device downloaded it (ISO), if the plugin says. */
  downloadedAt: string | null;
  /** The bundle the app went back to and runs now (or `built-in`). */
  runningBundle: string;
  platform: string;
  /** The native runtime fingerprint the bundle was published for. */
  runtime: string;
  /** The binary: version (build). */
  appVersion: string | null;
};

/**
 * The `/errors` body for a rolled-back live update. When the last session
 * ran the failed bundle, its record comes along: the bundle's code started
 * but the main view never mounted in time. When it didn't, the bundle never
 * ran at all (a page that didn't load).
 */
export function buildRollbackReport(
  rollback: LiveUpdateRollback,
  previous: SessionRecord | null,
  userDetails: Record<string, unknown>,
): CreateErrorInput {
  const failedBundleRan = previous?.bundle === rollback.failedBundle;

  return {
    message: 'Live update rolled back',
    userDetails,
    generalInfo: {
      kind: 'live-update-rollback',
      ...rollback,
      failedBundleRan,
      previousSession: failedBundleRan ? sessionSummary(previous) : null,
    },
  };
}

/** What changed between two samples, as crumbs. */
export function contextCrumbs(
  before: SessionContext | null,
  after: SessionContext,
): string[] {
  if (!before) return [];

  const crumbs: string[] = [];

  if (after.path !== before.path) crumbs.push(`path:${after.path}`);
  if (after.overlays !== before.overlays) {
    crumbs.push(`overlays:${after.overlays}`);
  }

  const dialog = after.dialogs[after.dialogs.length - 1];

  if (dialog && dialog !== before.dialogs[before.dialogs.length - 1]) {
    crumbs.push(`dialog:${dialog}`);
  }
  if (after.editor !== before.editor) {
    crumbs.push(after.editor ? 'editor:open' : 'editor:closed');
  }
  if (after.stage !== before.stage) crumbs.push(`stage:${after.stage}`);
  if (after.winner && !before.winner) crumbs.push('winner');
  if (after.theme !== before.theme) crumbs.push(`theme:${after.theme}`);

  return crumbs;
}

// ---------------------------------------------------------------- parsing

function readJson(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: KeyValueStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: this launch goes unrecorded.
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The saved record, or null when there is none or it isn't one. */
export function readSessionRecord(
  storage: KeyValueStorage,
): SessionRecord | null {
  const value = readJson(storage, SESSION_KEY);

  if (
    !isObject(value) ||
    value.v !== 1 ||
    typeof value.startedAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !['visible', 'hidden', 'closed'].includes(value.state as string)
  ) {
    return null;
  }

  return {
    ...(value as SessionRecord),
    crumbs: Array.isArray(value.crumbs) ? (value.crumbs as Crumb[]) : [],
  };
}

/** The plugin's answer; whatever is missing reads as "no evidence". */
export function parseLastExit(result: unknown): LastExit {
  if (!isObject(result)) return NO_LAST_EXIT;

  const event = result.rendererGone;
  const numberOrNull = (value: unknown) =>
    typeof value === 'number' ? value : null;
  const renderer: RendererGone | null =
    isObject(event) && typeof event.at === 'number'
      ? {
          at: event.at,
          didCrash: event.didCrash === true,
          rendererPriority: numberOrNull(event.rendererPriority),
          visible: event.visible === true,
          recovered: event.recovered !== false,
          recentRecoveries: numberOrNull(event.recentRecoveries),
        }
      : null;

  return {
    foreground:
      typeof result.foreground === 'boolean' ? result.foreground : null,
    renderer,
  };
}

// ---------------------------------------------------------------- session

/**
 * This launch's record. Every change is written at once: a crash gives no
 * warning, so the record on disk must always be the latest.
 */
export function createSessionTracker({
  storage,
  readContext,
  bundle,
  now = Date.now,
}: {
  storage: KeyValueStorage;
  readContext: () => SessionContext;
  bundle: string;
  now?: () => number;
}) {
  let record: SessionRecord | null = null;

  const save = () => {
    if (!record) return;
    record.updatedAt = now();
    writeJson(storage, SESSION_KEY, record);
  };

  const addCrumb = (label: string) => {
    if (!record) return;
    record.crumbs.push([
      Math.round((now() - record.startedAt) / 1000),
      label.slice(0, MAX_LABEL),
    ]);
    if (record.crumbs.length > MAX_CRUMBS) {
      record.crumbs.splice(0, record.crumbs.length - MAX_CRUMBS);
    }
  };

  /** Reads what the app shows; notes what changed since the last time. */
  const sample = () => {
    if (!record) return;

    let ctx: SessionContext | null = null;

    try {
      ctx = readContext();
    } catch {
      // A broken store must not stop the record.
    }

    if (ctx) {
      contextCrumbs(record.ctx, ctx).forEach(addCrumb);
      record.ctx = ctx;
      record.peakDomNodes = Math.max(record.peakDomNodes, ctx.domNodes);
    }
    save();
  };

  return {
    /** Starts this launch's record and returns the previous launch's. */
    start(state: SessionState): SessionRecord | null {
      const previous = readSessionRecord(storage);
      const at = now();

      record = {
        v: 1,
        startedAt: at,
        updatedAt: at,
        bundle,
        state,
        ctx: null,
        peakDomNodes: 0,
        crumbs: [],
      };
      addCrumb(`start:${state}`);
      sample();

      return previous;
    },
    setState(state: SessionState) {
      if (!record || record.state === state) return;
      record.state = state;
      addCrumb(state);
      // Coming back: the screen may have changed while hidden.
      if (state === 'visible') sample();
      else save();
    },
    sample,
    /** A crumb from outside the samples (`./crumbs.ts`), saved at once. */
    note(label: string) {
      addCrumb(label);
      save();
    },
    current: () => record,
  };
}

// ---------------------------------------------------------------- queue

/** Reports waiting to be sent, oldest first. */
export function readPendingReports(storage: KeyValueStorage): PendingReport[] {
  const value = readJson(storage, PENDING_KEY);

  return Array.isArray(value)
    ? value.filter(
        (item): item is PendingReport =>
          isObject(item) &&
          typeof item.id === 'string' &&
          isObject(item.report),
      )
    : [];
}

/** Queues a report until it's sent; a long offline spell keeps the newest. */
export function queueReport(storage: KeyValueStorage, pending: PendingReport) {
  const queue = readPendingReports(storage).filter(
    (item) => item.id !== pending.id,
  );

  queue.push(pending);
  writeJson(storage, PENDING_KEY, queue.slice(-MAX_PENDING));
}

export function removePendingReport(storage: KeyValueStorage, id: string) {
  writeJson(
    storage,
    PENDING_KEY,
    readPendingReports(storage).filter((item) => item.id !== id),
  );
}

function sentTimes(storage: KeyValueStorage, at: number): number[] {
  const value = readJson(storage, SENT_KEY);

  return Array.isArray(value)
    ? value.filter(
        (time): time is number =>
          typeof time === 'number' && at - time < DAY_MS,
      )
    : [];
}

/** Whether this device may send another report today. */
export function canSendReport(storage: KeyValueStorage, at: number): boolean {
  return sentTimes(storage, at).length < MAX_SENT_PER_DAY;
}

export function noteReportSent(storage: KeyValueStorage, at: number) {
  writeJson(storage, SENT_KEY, [...sentTimes(storage, at), at]);
}
