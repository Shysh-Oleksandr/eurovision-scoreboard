/**
 * Crumbs from anywhere in the app for the apps' crash reports
 * (docs/native-apps.md §14), for steps the five-second samples can't see:
 * an image export, the system share sheet. A no-op until the crash watch
 * starts (the website, or before the apps' bootstrap), and free of imports,
 * so any module can call it without pulling the crash watch into its bundle.
 */

let sink: ((label: string) => void) | null = null;

/** Notes something that just happened, e.g. `share:sheet`. */
export function noteCrumb(label: string): void {
  try {
    sink?.(label);
  } catch {
    // A crumb must never break what it describes.
  }
}

/** Where crumbs go: this launch's session record (`./index.ts`). */
export function setCrumbSink(next: ((label: string) => void) | null): void {
  sink = next;
}
