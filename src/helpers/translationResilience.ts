import { installTranslationResilience } from 'translation-resilience';

/**
 * Browser page translators replace the text nodes React owns, and React then
 * crashes removing or inserting next to a node that is no longer where it
 * left it (`removeChild` / `insertBefore` NotFoundError, facebook/react#11538).
 * `translate="no"` on <html> stops Chrome's translator, not Yandex Browser's,
 * which caused most of these crashes in 2026.
 *
 * Two layers, installed before hydration (`src/instrumentation-client.ts`):
 * - `translation-resilience` puts displaced text back for Chrome's, Edge's
 *   and Firefox's translators, so translated text keeps updating.
 * - The Yandex guard below catches what that package doesn't recognize:
 *   Yandex wraps text in `<ya-tr-span>`, not `<font>`.
 */
export function installDomResilience(onEvent: (message: string) => void) {
  const uninstallPackage = installTranslationResilience({ onEvent });
  const uninstallGuard = installYandexTranslationGuard(onEvent);

  return () => {
    uninstallGuard();
    uninstallPackage();
  };
}

const YANDEX_WRAPPER = 'ya-tr-span';

const isNotFoundError = (error: unknown) =>
  error instanceof DOMException && error.name === 'NotFoundError';

/**
 * On a page that shows Yandex's translation wrappers, a removal or insert
 * that would throw NotFoundError does the closest safe thing instead (remove
 * from the actual parent, append). Without the wrappers the error is thrown
 * as before, so a genuine renderer bug still reaches the error page.
 */
export function installYandexTranslationGuard(
  onEvent: (message: string) => void,
) {
  if (typeof Node !== 'function') return () => undefined;

  const proto = Node.prototype;
  const { removeChild, insertBefore } = proto;
  const yandexTranslated = (node: Node) =>
    !!(node.ownerDocument ?? document).querySelector(YANDEX_WRAPPER);

  proto.removeChild = function guardedRemoveChild<T extends Node>(
    this: Node,
    child: T,
  ): T {
    try {
      return removeChild.call(this, child) as T;
    } catch (error) {
      if (!isNotFoundError(error) || !yandexTranslated(this)) throw error;
      onEvent('Yandex: removeChild of a displaced node');
      child.parentNode?.removeChild(child);

      return child;
    }
  };

  proto.insertBefore = function guardedInsertBefore<T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    try {
      return insertBefore.call(this, node, child) as T;
    } catch (error) {
      if (!isNotFoundError(error) || !yandexTranslated(this)) throw error;
      onEvent('Yandex: insertBefore a displaced node, appended instead');
      this.appendChild(node);

      return node;
    }
  };

  return () => {
    proto.removeChild = removeChild;
    proto.insertBefore = insertBefore;
  };
}

const REPORTED_AT_KEY = 'dom-repair-reported-at';
const REPORT_EVERY_MS = 24 * 60 * 60 * 1000;
const COLLECT_MS = 5000;

let collected: Map<string, number> | null = null;

/**
 * Collects the repairs' events and posts them as one `/errors` report 5 s
 * after the first, at most once a day per browser. The message starts with
 * `DOM repaired:`, which keeps these apart from crash reports.
 */
export function reportDomRepair(message: string) {
  if (!collected) {
    if (reportedRecently()) return;
    collected = new Map();
    window.setTimeout(sendDomRepairReport, COLLECT_MS);
  }
  collected.set(message, (collected.get(message) ?? 0) + 1);
}

function reportedRecently() {
  try {
    const at = Number(localStorage.getItem(REPORTED_AT_KEY));

    return at > 0 && Date.now() - at < REPORT_EVERY_MS;
  } catch {
    return false;
  }
}

function sendDomRepairReport() {
  const events = [...(collected ?? [])].map(([message, count]) => ({
    message,
    count,
  }));

  if (events.length === 0) return;

  try {
    localStorage.setItem(REPORTED_AT_KEY, String(Date.now()));
  } catch {
    // Storage full or blocked: report anyway.
  }

  void import('@/api/client')
    .then(({ api }) =>
      api.post('/errors', {
        message: `DOM repaired: ${events[0].message}`.slice(0, 300),
        userDetails: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
        generalInfo: { domRepairs: events.slice(0, 20) },
      }),
    )
    .catch(() => {});
}
