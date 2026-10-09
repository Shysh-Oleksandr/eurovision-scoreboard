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
