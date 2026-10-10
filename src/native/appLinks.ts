import { liveUpdateBoot } from './liveUpdate';

import { parsePublicSiteUrl } from '@/helpers/shareUrl';

let installed = false;

/**
 * Universal links (iOS) and Android App Links: a tapped douzepoints.app
 * share link opens the app instead of the website, and `onLink` gets the
 * link. The website's `.well-known` files and the native configuration decide
 * which links (docs/native-apps.md §12).
 *
 * `appUrlOpen` covers both a link that reaches the running app and the one
 * that launched it: the plugin retains that event until a listener exists.
 * Listening consumes it, so the listener waits for a live-update switch,
 * whose WebView reload would otherwise lose the launch link.
 */
export async function installAppLinkHandler(
  onLink: (url: URL) => void,
): Promise<void> {
  if (installed) return;
  installed = true;

  const { Capacitor } = await import('@capacitor/core');

  if (!Capacitor.isNativePlatform()) return;

  await liveUpdateBoot();

  const { App } = await import('@capacitor/app');

  await App.addListener('appUrlOpen', ({ url }) => {
    // Other URLs reach this event too (iOS URL-scheme callbacks).
    const link = parsePublicSiteUrl(url);

    if (link) onLink(link);
  });
}
