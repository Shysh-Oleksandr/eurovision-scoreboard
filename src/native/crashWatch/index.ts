/**
 * Crash reports for the apps (docs/native-apps.md §14). A crash of the
 * WebView's renderer, or of the whole app, gives the page no chance to
 * report anything, so each launch keeps a record of its session
 * (`./core.ts`) and the next launch reports a crash to `/errors`, with what
 * the app showed and the last things that changed. On Android,
 * RendererCrashRecovery replaces a dead renderer instead of letting the app
 * crash, and `DouzeDiagnostics.takeLastExit` says how the last launch
 * ended.
 *
 * `localStorage['dp-crash-watch-debug'] = '1'` logs the record's changes and
 * the reports to the console.
 */

import {
  assessPreviousSession,
  buildCrashReport,
  canSendReport,
  createSessionTracker,
  NO_LAST_EXIT,
  noteReportSent,
  parseLastExit,
  queueReport,
  readPendingReports,
  removePendingReport,
  type KeyValueStorage,
  type LastExit,
  type SessionContext,
  type SessionRecord,
  type SessionState,
} from './core';
import { setCrumbSink } from './crumbs';

import { openOverlayCount } from '@/hooks/useBackHandler';
import { LIVE_BUNDLE_VERSION, liveUpdateBoot } from '@/native/liveUpdate';
import { IS_NATIVE_APP } from '@/native/platform';
import { noteReviewSetback } from '@/native/review';
import { isOffline, onReconnect } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/** How often the record notes what the app shows, while on screen. */
const SAMPLE_MS = 5000;
/** Reports wait for the launch to settle (and a live-update switch). */
const SEND_DELAY_MS = 5000;
/** The page's session, in sessionStorage: survives reloads, not relaunches. */
const PAGE_SESSION_KEY = 'dp:app-session-page';

type DouzeDiagnosticsPlugin = {
  takeLastExit(): Promise<unknown>;
};

let started = false;
let sending = false;
let waitingForReconnect = false;

const isDebug = () => {
  try {
    return localStorage.getItem('dp-crash-watch-debug') === '1';
  } catch {
    return false;
  }
};

const debugLog = (...args: unknown[]) => {
  if (isDebug()) console.info('[crash-watch]', ...args);
};

function getStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Labels of the open dialogs, innermost last. */
function dialogLabels(): string[] {
  return Array.from(
    document.querySelectorAll('[role="dialog"], [role="alertdialog"]'),
  )
    .map((element) => {
      const labelledBy = element.getAttribute('aria-labelledby')?.split(' ')[0];

      return (
        element.getAttribute('aria-label') ||
        (labelledBy && document.getElementById(labelledBy)?.textContent) ||
        element.id ||
        element.tagName.toLowerCase()
      )
        .trim()
        .slice(0, 40);
    })
    .slice(-3);
}

function readContext(): SessionContext {
  const scoreboard = useScoreboardStore.getState();
  const general = useGeneralStore.getState();
  const stage = Array.isArray(scoreboard.eventStages)
    ? scoreboard.eventStages.find(
        (item) => item?.id === scoreboard.currentStageId,
      )
    : undefined;
  const params = Array.from(new URLSearchParams(window.location.search).keys());

  return {
    path:
      window.location.pathname + (params.length ? `?${params.join('&')}` : ''),
    overlays: openOverlayCount(),
    dialogs: dialogLabels(),
    editor: !!document.querySelector('.gfx-editor'),
    stage: stage
      ? `${stage.name} (${stage.votingMode}${stage.isOver ? ', over' : ''})`
      : null,
    winner: !!scoreboard.winnerCountry,
    theme: general.customTheme ? 'custom' : String(general.themeYear),
    domNodes: document.getElementsByTagName('*').length,
    canvases: document.getElementsByTagName('canvas').length,
  };
}

function userDetails(): Record<string, unknown> {
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    appBundle: LIVE_BUNDLE_VERSION || undefined,
    deviceMemoryGB: (navigator as { deviceMemory?: number }).deviceMemory,
    cpuCores: navigator.hardwareConcurrency,
  };
}

/** How the last launch ended, from the native side (Android). */
async function takeLastExit(): Promise<LastExit> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');

    // Binaries built before the plugin don't have it.
    if (
      Capacitor.getPlatform() !== 'android' ||
      !Capacitor.isPluginAvailable('DouzeDiagnostics')
    ) {
      return NO_LAST_EXIT;
    }

    const plugin = registerPlugin<DouzeDiagnosticsPlugin>('DouzeDiagnostics');

    return parseLastExit(await plugin.takeLastExit());
  } catch {
    return NO_LAST_EXIT;
  }
}

/**
 * Whether this page load replaces the previous one in the same WebView, and
 * notes this one for the next.
 */
function checkSameWebView(
  previous: SessionRecord | null,
  current: SessionRecord | null,
): boolean {
  try {
    const same =
      !!previous &&
      sessionStorage.getItem(PAGE_SESSION_KEY) === String(previous.startedAt);

    if (current) {
      sessionStorage.setItem(PAGE_SESSION_KEY, String(current.startedAt));
    }

    return same;
  } catch {
    return false;
  }
}

/** Sends the queued reports once the API answers again (one wait at a time). */
function sendOnReconnect(storage: KeyValueStorage) {
  if (waitingForReconnect) return;
  waitingForReconnect = true;

  const stop = onReconnect(() => {
    stop();
    waitingForReconnect = false;
    void sendPendingReports(storage);
  });
}

/**
 * Sends the queued reports. Without a connection they wait for it; any
 * other failure leaves them queued for the next launch.
 */
async function sendPendingReports(storage: KeyValueStorage): Promise<void> {
  if (sending || !readPendingReports(storage).length) return;

  if (isOffline()) {
    sendOnReconnect(storage);

    return;
  }

  sending = true;

  try {
    const { api } = await import('@/api/client');

    for (const pending of readPendingReports(storage)) {
      // Over the daily cap (a crash loop): drop rather than pile up.
      if (!canSendReport(storage, Date.now())) {
        removePendingReport(storage, pending.id);
        continue;
      }

      await api.post('/errors', pending.report);
      removePendingReport(storage, pending.id);
      noteReportSent(storage, Date.now());
      debugLog('sent', pending.report.message);
    }
  } catch (error) {
    // The failure makes the connectivity store check the API, so a lost
    // connection comes back as a reconnect.
    const { isNetworkError } = await import('@/api/client');

    debugLog('send failed', error);
    if (isNetworkError(error)) sendOnReconnect(storage);
  } finally {
    sending = false;
  }
}

async function reportPreviousSession(
  storage: KeyValueStorage,
  previous: SessionRecord | null,
  sameWebView: boolean,
): Promise<void> {
  const exit = await takeLastExit();
  const message = assessPreviousSession(previous, exit, sameWebView);

  debugLog('previous session', { previous, exit, sameWebView, message });

  if (message) {
    queueReport(storage, {
      id: String(previous?.startedAt ?? exit.renderer?.at ?? Date.now()),
      report: buildCrashReport(message, previous, exit, userDetails()),
    });
    // A crash: the apps won't ask for a store rating this session.
    noteReviewSetback();
  }

  if (!readPendingReports(storage).length) return;

  // A launch that switches to a live update reloads the page: send after.
  await liveUpdateBoot();
  await new Promise((resolve) => window.setTimeout(resolve, SEND_DELAY_MS));
  await sendPendingReports(storage);
}

/** Starts this launch's session record (apps only, once per page load). */
export function startCrashWatch(): void {
  if (started || !IS_NATIVE_APP || typeof window === 'undefined') return;
  started = true;

  const storage = getStorage();

  if (!storage) return;

  const tracker = createSessionTracker({
    storage,
    readContext,
    bundle: LIVE_BUNDLE_VERSION || 'built-in',
  });
  const visibility = (): SessionState =>
    document.visibilityState === 'hidden' ? 'hidden' : 'visible';
  const setState = (state: SessionState) => {
    tracker.setState(state);
    debugLog('state', state);
  };
  const previous = tracker.start(visibility());
  const sameWebView = checkSameWebView(previous, tracker.current());

  setCrumbSink((label) => {
    tracker.note(label);
    debugLog('crumb', label);
  });

  document.addEventListener('visibilitychange', () => setState(visibility()));
  // Unloads (reloads, live-update switches) are clean ends too.
  window.addEventListener('pagehide', () => setState('closed'));
  window.addEventListener('pageshow', () => setState(visibility()));
  // The WebView reports "hidden" seconds after the app leaves the screen
  // (Android); the app's pause comes at once, and also covers sheets and
  // dialogs of the system over the app.
  void import('@capacitor/app')
    .then(async ({ App }) => {
      await App.addListener('pause', () => setState('hidden'));
      await App.addListener('resume', () => setState(visibility()));
    })
    .catch(() => undefined);
  window.setInterval(() => {
    if (document.visibilityState !== 'hidden') tracker.sample();
  }, SAMPLE_MS);
  // A new stage or the winner: note it now, not at the next sample.
  useScoreboardStore.subscribe((state, prev) => {
    if (
      state.currentStageId !== prev.currentStageId ||
      !!state.winnerCountry !== !!prev.winnerCountry
    ) {
      tracker.sample();
    }
  });

  void reportPreviousSession(storage, previous, sameWebView).catch((error) =>
    debugLog('report failed', error),
  );
}
