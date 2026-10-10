/**
 * Hides the native splash screen once the app's first screen has painted:
 * called by the first modal to open (usually Event Setup), the simulation
 * board, and a fallback timer in `src/app/(main)/page.tsx`.
 * capacitor.config.ts keeps it up (with a timeout as a safety net) so the
 * launch goes splash → app instead of splash → bare theme background → app.
 */
let hidden = false;

export async function hideSplashWhenPainted(): Promise<void> {
  if (hidden) return;
  hidden = true;

  const { Capacitor } = await import('@capacitor/core');

  if (!Capacitor.isNativePlatform()) return;

  // Two frames: React has committed, and the browser has painted it.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  const { SplashScreen } = await import('@capacitor/splash-screen');

  await SplashScreen.hide();
}
