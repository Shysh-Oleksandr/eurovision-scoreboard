import {
  createJSONStorage,
  type PersistStorage,
  type StateStorage,
} from 'zustand/middleware';

/**
 * localStorage for zustand `persist` that can't crash the app. A write that
 * doesn't fit (about 5 MB per site, shared by every key; big contests hit it)
 * used to throw out of the store update and land on the error page. Now the
 * write is skipped and reported once per key per page load: the state stays
 * in memory, and the last value that fit stays saved.
 *
 * Like zustand's default storage, it is unavailable where `localStorage` is
 * (the server, blocked storage), which disables persisting there.
 */
export function safeLocalStorage<S>(): PersistStorage<S> | undefined {
  return createJSONStorage<S>(() => guardWrites(localStorage));
}

export function guardWrites(storage: Storage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      try {
        storage.setItem(name, value);
      } catch (error) {
        reportFailedWrite(storage, name, value, error);
      }
    },
    removeItem: (name) => storage.removeItem(name),
  };
}

const reportedKeys = new Set<string>();

const kilobytes = (chars: number) => Math.round((chars * 2) / 1024);

function reportFailedWrite(
  storage: Storage,
  name: string,
  value: string,
  error: unknown,
) {
  if (reportedKeys.has(name)) return;
  reportedKeys.add(name);

  // A DOMException isn't an `Error` everywhere (older Safari), so read its
  // fields as they come.
  const { name: errorName = 'Error', message: errorMessage = String(error) } =
    (error ?? {}) as { name?: string; message?: string };
  const sizes: { key: string; kb: number }[] = [];

  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);

      if (key) {
        sizes.push({
          key,
          kb: kilobytes(key.length + (storage.getItem(key)?.length ?? 0)),
        });
      }
    }
  } catch {
    // Sizes are a nice-to-have.
  }
  sizes.sort((a, b) => b.kb - a.kb);

  void import('@/api/client')
    .then(({ api }) =>
      api.post('/errors', {
        message: `Could not save '${name}' to localStorage (${errorName})`,
        userDetails: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
        generalInfo: {
          key: name,
          valueKB: kilobytes(value.length),
          storageKB: sizes.reduce((sum, size) => sum + size.kb, 0),
          largestKeys: sizes.slice(0, 8),
          error: errorMessage,
        },
      }),
    )
    .catch(() => {});
}
