import { runBackHandler } from '@/hooks/useBackHandler';

let installed = false;

/**
 * Android's back button: closes the innermost open overlay (`useBackHandler`),
 * else goes back in history (the graphics editor is a history entry), else
 * sends the app to the background like a launcher-started app's root screen.
 * A registered listener replaces Capacitor's default (history, then exit).
 */
export async function installBackButtonHandler(): Promise<void> {
  if (installed) return;
  installed = true;

  const { Capacitor } = await import('@capacitor/core');

  if (Capacitor.getPlatform() !== 'android') return;

  const { App } = await import('@capacitor/app');

  await App.addListener('backButton', ({ canGoBack }) => {
    if (runBackHandler()) return;
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}
