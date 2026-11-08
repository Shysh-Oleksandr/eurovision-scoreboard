import { create } from 'zustand';

import { setNetworkReporter } from '@/api/client';
import { API_BASE_URL } from '@/config';
import { IS_NATIVE_APP } from '@/native/platform';

/**
 * Whether the app can reach the API (see docs/offline-mode.md):
 * - `offline`: the device has no network (the native Network plugin in the
 *   apps, `navigator.onLine` elsewhere);
 * - `unreachable`: the device is online but the API doesn't answer (a request
 *   failed and a probe confirmed it), e.g. Wi-Fi without internet;
 * - `online`: neither.
 */
export type ConnectivityStatus = 'online' | 'offline' | 'unreachable';

interface ConnectivityState {
  deviceOnline: boolean;
  apiReachable: boolean;
}

/**
 * Starts online on the server and on the first client render, so nothing
 * that renders from it can mismatch hydration; `startConnectivityMonitor()`
 * sets the real state after mount.
 */
export const useConnectivityStore = create<ConnectivityState>()(() => ({
  deviceOnline: true,
  apiReachable: true,
}));

export const connectivityStatus = ({
  deviceOnline,
  apiReachable,
}: ConnectivityState): ConnectivityStatus => {
  if (!deviceOnline) return 'offline';
  if (!apiReachable) return 'unreachable';

  return 'online';
};

export const getConnectivityStatus = () =>
  connectivityStatus(useConnectivityStore.getState());

/** True while offline or unreachable: anything that needs the API won't work. */
export const isOffline = () => getConnectivityStatus() !== 'online';

export const useConnectivityStatus = () =>
  useConnectivityStore(connectivityStatus);

export const useIsOffline = () =>
  useConnectivityStore((state) => connectivityStatus(state) !== 'online');

/** Calls `listener` whenever the status turns `online` again. */
export function onReconnect(listener: () => void): () => void {
  return useConnectivityStore.subscribe((state, prev) => {
    if (
      connectivityStatus(state) === 'online' &&
      connectivityStatus(prev) !== 'online'
    ) {
      listener();
    }
  });
}

/** A probe that gets no answer within this is a failure. */
const PROBE_TIMEOUT_MS = 8_000;
/** Re-probes while unreachable, then every minute. */
const PROBE_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000];

let probe: Promise<boolean> | null = null;
let probeTimer: ReturnType<typeof setTimeout> | undefined;
let probeAttempt = 0;

/**
 * Any HTTP answer from the API's origin, even a 404, means it's reachable.
 * `no-cors` keeps CORS out of it: the answer is opaque but it arrived.
 */
async function pingApi(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    await fetch(API_BASE_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function setApiReachable(reachable: boolean) {
  clearTimeout(probeTimer);

  if (reachable) {
    probeAttempt = 0;
    useConnectivityStore.setState({ apiReachable: true });

    return;
  }

  useConnectivityStore.setState({ apiReachable: false });

  // Offline devices wait for the network instead (setDeviceOnline).
  if (!useConnectivityStore.getState().deviceOnline) return;

  const delay =
    PROBE_DELAYS_MS[Math.min(probeAttempt, PROBE_DELAYS_MS.length - 1)];

  probeAttempt += 1;
  probeTimer = setTimeout(() => void checkApi(), delay);
}

/** Probes the API once (concurrent calls share the probe). */
export function checkApi(): Promise<boolean> {
  probe ??= pingApi().then((reachable) => {
    probe = null;
    setApiReachable(reachable);

    return reachable;
  });

  return probe;
}

function setDeviceOnline(online: boolean) {
  const { deviceOnline } = useConnectivityStore.getState();

  if (online === deviceOnline) return;

  clearTimeout(probeTimer);
  probeAttempt = 0;

  // A new connection: assume the API answers; the next request decides.
  useConnectivityStore.setState(
    online
      ? { deviceOnline: true, apiReachable: true }
      : { deviceOnline: false },
  );
}

/** Request outcomes from `src/api/client.ts`. */
function reportSuccess() {
  const { deviceOnline, apiReachable } = useConnectivityStore.getState();

  // An answer beats any signal that said otherwise.
  if (!deviceOnline) setDeviceOnline(true);
  else if (!apiReachable) setApiReachable(true);
}

function reportFailure() {
  const { deviceOnline, apiReachable } = useConnectivityStore.getState();

  // One failed request isn't proof (a CORS error, a server hiccup): only a
  // failed probe marks the API unreachable.
  if (deviceOnline && apiReachable) void checkApi();
}

/**
 * The apps ask the native Network plugin: WebViews don't report `onLine`
 * changes reliably. False when the plugin isn't there (`yarn dev:native` in
 * a browser, or a binary built before it was added).
 */
async function watchNativeNetwork(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');

    if (!Capacitor.isPluginAvailable('Network')) return false;

    const { Network } = await import('@capacitor/network');
    const { connected } = await Network.getStatus();

    setDeviceOnline(connected);
    await Network.addListener('networkStatusChange', (status) =>
      setDeviceOnline(status.connected),
    );

    return true;
  } catch (error) {
    console.warn('Network plugin unavailable', error);

    return false;
  }
}

function watchBrowserNetwork(): () => void {
  const onOnline = () => setDeviceOnline(true);
  const onOffline = () => setDeviceOnline(false);

  setDeviceOnline(navigator.onLine);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

let monitorStarted = false;

/** Starts watching the network (once per launch; AppBootstrap). */
export function startConnectivityMonitor(): void {
  if (monitorStarted || typeof window === 'undefined') return;
  monitorStarted = true;

  setNetworkReporter({
    isKnownOffline: isOffline,
    onSuccess: reportSuccess,
    onFailure: reportFailure,
  });

  // The browser's signal covers the wait for the plugin, and stays when the
  // plugin is missing.
  const stopBrowserWatch = watchBrowserNetwork();

  if (IS_NATIVE_APP) {
    void watchNativeNetwork().then((native) => {
      if (native) stopBrowserWatch();
    });
  }

  // Coming back to the app: re-check an API that stopped answering.
  document.addEventListener('visibilitychange', () => {
    const { deviceOnline, apiReachable } = useConnectivityStore.getState();

    if (
      document.visibilityState === 'visible' &&
      deviceOnline &&
      !apiReachable
    ) {
      void checkApi();
    }
  });
}
