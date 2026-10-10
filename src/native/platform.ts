/**
 * Build-time flag for the Capacitor (iOS/Android) bundle, set by
 * `yarn build:native` and `yarn dev:native` (see docs/native-apps.md).
 *
 * Turbopack does not constant-fold this across modules, so native branches
 * stay in the web build as runtime-false checks. Keep `@capacitor/core`
 * behind dynamic `import()` inside them: it then lands in a lazy chunk the
 * website never fetches. The flag says "this is the app bundle", not "this
 * is running inside the native shell" (`yarn dev:native` in a desktop
 * browser sets it too); use `Capacitor.isNativePlatform()` where the native
 * bridge itself is needed.
 */
export const IS_NATIVE_APP = process.env.NEXT_PUBLIC_NATIVE_APP === '1';

/**
 * The native shell's platform, read synchronously from the `Capacitor`
 * global its bridge injects before the page loads; 'web' on the website and
 * in `yarn dev:native` in a desktop browser. For render-time decisions —
 * async code keeps importing `@capacitor/core` lazily.
 */
export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (!IS_NATIVE_APP || typeof window === 'undefined') return 'web';

  const platform = (
    window as { Capacitor?: { getPlatform?: () => string } }
  ).Capacitor?.getPlatform?.();

  return platform === 'ios' || platform === 'android' ? platform : 'web';
}
