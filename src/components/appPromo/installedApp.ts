import { ANDROID_PACKAGE } from '@/config/appStores';

type RelatedApp = { platform: string; id?: string };

let check: Promise<boolean> | null = null;
let result: boolean | null = null;

/**
 * Whether the Android app is installed, from Chrome's
 * `navigator.getInstalledRelatedApps()`. It answers only when both sides
 * vouch for each other: the website's manifest lists the app
 * (`related_applications` in public/app.webmanifest, linked while the store
 * links are live) and the app lists the website (`asset_statements` in
 * AndroidManifest.xml, since the 2026-11 store build). Other browsers lack
 * the API and get false. Asked once per page load.
 */
export function checkAndroidAppInstalled(): Promise<boolean> {
  check ??= (async () => {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
    };

    try {
      const apps = (await nav.getInstalledRelatedApps?.()) ?? [];

      result = apps.some(
        (app) => app.platform === 'play' && app.id === ANDROID_PACKAGE,
      );
    } catch {
      result = false;
    }

    return result;
  })();

  return check;
}

/** The answer if the check has finished, else null. */
export const androidAppInstalledResult = (): boolean | null => result;
