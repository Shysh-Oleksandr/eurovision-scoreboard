import { LATEST_UPDATE_KEY } from './data';

/**
 * The apps' What's new toast (`WhatsNewToast`, docs/native-apps.md §11)
 * announces each What's new entry once per device: the newest entry it
 * announced lives under this key. A first launch stores the current entry
 * without a toast, since nothing is new to someone who just installed.
 */
const ANNOUNCED_KEY = 'dp-whats-new-announced';

export function shouldAnnounceLatestUpdate({
  latest,
  announced,
  lastSeenUpdate,
}: {
  /** `LATEST_UPDATE_KEY`. */
  latest: string | null;
  /** What this device announced last (`readAnnouncedUpdate()`). */
  announced: string | null;
  /** The newest entry the user opened What's new on (`generalStore`). */
  lastSeenUpdate: string | null;
}): boolean {
  return latest !== null && latest !== announced && latest !== lastSeenUpdate;
}

export function readAnnouncedUpdate(): string | null {
  try {
    return window.localStorage.getItem(ANNOUNCED_KEY);
  } catch {
    return null;
  }
}

export function markLatestUpdateAnnounced(): void {
  if (!LATEST_UPDATE_KEY) return;

  try {
    window.localStorage.setItem(ANNOUNCED_KEY, LATEST_UPDATE_KEY);
  } catch {
    // Storage unavailable: at worst the toast shows again next launch.
  }
}
