# Native apps (Capacitor)

DouzePoints ships as iOS and Android apps by wrapping this same Next.js
frontend in **Capacitor 8**: a static export of the app runs inside the
system WebView (WKWebView on iOS, Android System WebView), and native
features are reached through Capacitor's JS bridge. There is no separate app
codebase. This document covers how the native build works today and the
rules for code that has to behave differently in the apps. The phased
roadmap, research findings and status live in
[plans/native-apps-plan.md](plans/native-apps-plan.md).

## 1. Build pipeline

- **Two flags.**
  - `NATIVE_EXPORT=1` is read by `next.config.ts` only. It spreads
    `output: 'export'`, `images.unoptimized: true` and
    `pageExtensions: ['tsx', 'jsx']`. The last one drops the
    `src/app/api/**/route.ts` handlers from the export without moving any
    file. Consequence: every page, layout and error file must stay `.tsx`;
    a new `.ts` special file (`route.ts`, `sitemap.ts`, `robots.ts`, …) is
    silently absent from the apps.
  - `NEXT_PUBLIC_NATIVE_APP=1` is the client-side flag, exported as
    `IS_NATIVE_APP` from `src/native/platform.ts`. It means "this is the app
    bundle". `yarn build:native` sets both flags, `yarn dev:native` sets only
    this one.
- **`yarn build:native`** runs `gen:messages`, then `next build` with both
  flags, `NEXT_PUBLIC_API_URL=https://api.douzepoints.app` and an empty
  Umami id (app sessions must not count as website traffic). Output: `out/`
  (gitignored), which holds the HTML, `/_next/static` and all of `public/`.
- **Locale on the server:** `src/i18n/request.ts` returns a fixed `en`
  when `NEXT_PUBLIC_NATIVE_APP` is set. A static export has no request, so
  `cookies()` / `headers()` would fail the build. The real locale is picked
  on the client (§5).
- **`yarn cap:sync`** = `build:native` + `cap sync`. It copies `out/` into
  `ios/App/App/public` and `android/app/src/main/assets/public` (both
  gitignored) and regenerates each platform's `capacitor.config.json` from
  `capacitor.config.ts`.
- **Native projects** `ios/` (Xcode project, Swift Package Manager, no
  CocoaPods) and `android/` (Gradle) are committed source. Native config
  (Info.plist, AndroidManifest, icons, signing) is edited there.
- **`capacitor.config.ts`**: `appId: 'app.douzepoints'` (becomes the
  permanent bundle ID / package name at the first store upload),
  `appName: 'DouzePoints'`, `webDir: 'out'`.
- **Origins:** the app runs at `capacitor://localhost` on iOS and
  `https://localhost` on Android. Capacitor serves the root `index.html`
  for every path without a file extension (SPA fallback).
- **Generated files:** every build regenerates
  `src/i18n/messagesManifest.generated.ts`. Commit it whenever it changes;
  `messagesManifest.test.ts` fails when the committed manifest is stale.
  Builds also flip `next-env.d.ts` between `.next/types` and
  `.next/dev/types`; revert that one.
- **Size:** `out/` is about 42 MB, of which about 22 MB is source maps
  (`productionBrowserSourceMaps`). They are kept for debugging for now;
  store builds should drop them (plan, Phase 3).

## 2. Commands

| Command | What it does |
|---|---|
| `yarn build:native` | Static export into `out/` |
| `yarn cap:sync` | Export + copy into both native projects |
| `yarn cap:open:ios` / `yarn cap:open:android` | Open Xcode / Android Studio |
| `yarn cap:android` | Build, install and launch on an emulator or USB device |
| `yarn cap:ios` | Same for iOS. **Broken on simulators with Xcode 27**, see below |
| `yarn dev:native` | Dev server with the app's code paths (`IS_NATIVE_APP`) |
| `yarn cap:dev ios\|android [--lan]` | Live reload in the native shell (§3) |

**Xcode 27:** it replaced `Simulator.app` with `DeviceHub.app`
(`com.apple.dt.Devices`). `native-run` 2.0.3, which `cap run ios` uses,
still opens `<Xcode>/Applications/Simulator.app` and fails after installing
the app. Until a fixed release ships, press Run in Xcode, or build headless:

```bash
U=<simulator udid>   # xcrun simctl list devices available
xcrun xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination id=$U -derivedDataPath ios/DerivedData/$U
xcrun simctl install $U ios/DerivedData/$U/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch --console-pty $U app.douzepoints   # JS console on stdout
```

**Real devices.** iPhone: Xcode → Settings → Accounts → add an Apple ID;
App target → Signing & Capabilities → Personal Team; enable Developer Mode on
the phone and trust the developer under General → VPN & Device Management.
Free-signed builds expire after 7 days. Android: enable USB debugging, then
`yarn cap:android` and pick the device. For a sideloadable APK:
`cd android && ./gradlew assembleDebug` →
`android/app/build/outputs/apk/debug/app-debug.apk`.

**Debugging:** Safari → Develop → *device* → `localhost` (enable "Show
features for web developers" first); Chrome → `chrome://inspect` for
Android. Debug builds are inspectable by default.

## 3. Live reload

```bash
yarn dev:native                 # or `yarn dev` for the website's code paths
yarn cap:dev ios                # simulator; opens Xcode, press Run
yarn cap:dev android            # emulator or USB phone
yarn cap:dev ios --lan          # real iPhone on the same Wi-Fi
```

`scripts/cap-dev.mjs` points the native shell at the dev server
(`server.url`) instead of the bundled export:

- The URL is `http://localhost:3000`, so the app's origin matches the web
  dev setup and the local backend's CORS and `NEXT_PUBLIC_API_URL` work
  unchanged. On Android the script keeps `adb reverse tcp:3000` and
  `tcp:8001` applied to every connected device (re-applied every 3 s,
  because `cap run` may boot an emulator later and `native-run` drops its
  own forwards on exit) and removes them on exit.
- iOS: the script writes `server.url` into
  `ios/App/App/capacitor.config.json` and opens Xcode; it does not use
  `cap run ios` (Xcode 27, §2). The file is bundled at build time, so it
  only has to hold the URL while Xcode builds.
- Android: `cap run android --live-reload`, which also allows cleartext.
- Ctrl+C restores the config, but the installed app keeps loading the dev
  server until it is built again without the script. If the terminal is
  closed instead, `yarn cap:sync` regenerates the config.
- `--lan` uses the Mac's Wi-Fi IP. The phone then also needs
  `NEXT_PUBLIC_API_URL=http://<ip>:8001` on the dev server, `http://<ip>:3000`
  appended to the local backend's `FRONTEND_URL` (after the localhost entry),
  and the iOS "Local Network" prompt accepted. The script prints these.
- Dev mode is still a server: `/api/*` routes exist and fetches to them
  succeed. Anything that depends on the export (missing routes, SPA
  fallback, bundled catalogs) must be checked in a `yarn cap:sync` build.

## 4. Writing native-aware code

- **Which check.** `IS_NATIVE_APP` = "this is the app bundle" (also true in
  `yarn dev:native` in a desktop browser). `Capacitor.isNativePlatform()` =
  "the native bridge is really there". Use the second before calling a
  plugin.
- **Keep `@capacitor/core` lazy.** Turbopack does not constant-fold
  `IS_NATIVE_APP` across modules, so native branches stay in the web build
  as runtime-false checks. Import Capacitor with `await import(...)` inside
  those branches: it then lands in a lazy chunk the website never fetches
  (checked 2026-10-09: only `react-loadable-manifest.json` references it).
- **No server in the apps.** No API routes, `cookies()`, `headers()`,
  server actions or middleware. Every same-origin `/api/*` fetch needs a
  native branch. Today's three routes and their native replacements:
  `/api/locale` → §5, `/api/messages` → §5, `/api/image-proxy` → §6.
- **Only `/` is safe to land on.** Client-side navigation with `next/link`
  works (it fetches the exported `.txt` payloads). A full navigation or a
  reload on another path (`<a href="/privacy">`, `location.reload()` on
  `/about`) gets the root `index.html` through Capacitor's SPA fallback and
  shows the main screen (verified on Android). The app never links to
  `/about` or `/privacy` today; link to `https://douzepoints.app/...` if it
  ever needs to.
- **CORS still applies to the WebView.** Requests from the app's origins
  (§1) need those origins on the server's allowlist. Native HTTP
  (`CapacitorHttp`, always registered in Capacitor 8) is not subject to CORS;
  it is used for export images (§6). Do not enable its global `fetch`
  patching: it changes upload, cookie and blob semantics app-wide.
- **Storage** is the WebView's localStorage / IndexedDB. iOS 17.4+ has a
  WKWebView bug where IndexedDB connections drop after long backgrounding
  (the custom background image lives there; plan, Phase 3). "Clear data"
  (`localStorage.clear()`) also wipes the app's saved language, which then
  falls back to the device language.

## 5. Locale

Website: the server reads a `locale` cookie (or `Accept-Language`) and
renders that language; switching POSTs to `/api/locale` and calls
`router.refresh()`. The app has neither a server nor a reliable cookie, so:

- `AppIntlProvider` renders the static English shell first, then resolves
  the locale after mount with `resolveNativeLocale()`
  (`src/i18n/nativeLocale.ts`): the saved choice under localStorage key
  `app-locale`, else the first supported entry of `navigator.languages`,
  else English. It fetches that locale's bundled catalog
  (`catalogUrlFor()`, `src/i18n/catalogUrl.ts`; the hashed
  `/messages/<locale>.<hash>.json` in builds, `/api/messages/<locale>` in
  dev) and only then marks the catalog ready, so the main view never paints
  in the wrong language. There is no `/api/messages` fallback in the apps.
- `useSetAppLocale()` switches and persists the locale on the client.
  `LanguageSelector` uses it in the apps, and still updates the signed-in
  user's `preferredLocale`. Switching is live, with no reload; the previous
  language keeps rendering until the new catalog is loaded.
- `AppBootstrap` applies the user's `preferredLocale` once per session
  when no in-app choice is saved (the cookie check it uses on the web is
  meaningless in the apps, where `IntlProvider` writes the cookie on every
  render).
- `<html lang>` is updated on the client; the layout skips the English
  catalog preload in native builds.
- `matchLocale()` (`src/i18n/catalog.ts`) maps the BCP 47 Greek tag `el`
  to the app's `gr`. This also fixed the website, where Greek browsers used
  to get English from `Accept-Language`.
- The WKWebView reports the device's preferred languages (checked on an
  iOS 26.4 simulator set to Ukrainian: the app came up in Ukrainian).

## 6. Images

- `next/image` is unoptimized in the export: it renders the raw `src`.
- **Foreign images in exports.** On the web, `getFlagPathForImageGeneration`
  and `getBackgroundImageForImageGeneration` rewrite non-DouzePoints image
  URLs to `/api/image-proxy?url=…`, so the preview and the export read them
  same-origin. In the apps they return the raw URL (`toImageProxyUrl` in
  `src/helpers/getFlagPath.ts`); a plain `<img>` displays fine without CORS.
  At export time `exportNode`'s `loadDataUrl` sends every cross-origin URL
  through `fetchImageDataUrlNatively()` (`src/native/nativeImage.ts`): a
  `CapacitorHttp.get` with `responseType: 'blob'` that returns base64. It
  enforces the proxy's `image/*` guard and strips the line breaks Android
  puts in the base64. Verified 2026-10-09 on Android by exporting a share
  image with an injected flagcdn.com image: the plugin call shows in logcat
  and the pixels are in the output.
- Custom fonts are fetched from R2 (`cdn.douzepoints.app`), whose CORS
  allowlist does not include the app origins yet, so uploaded fonts do not
  load in the apps (plan, Phase 2).

## 7. Not working yet

Tracked in the plan with the phase that fixes each item:

- Google sign-in (Google blocks OAuth in embedded WebViews) and every
  backend call (CORS). Lists such as Public Contests show an empty result
  rather than an error.
- Uploaded fonts (R2 CORS).
- Downloads: `<a download>` on data URLs (share images, stats) and
  `XLSX.writeFile` do nothing in WKWebView. Web Share with files, the
  fullscreen toggle and share links (built from `window.location`, so they
  point at `capacitor://localhost`) also need native replacements.
- Android back button, themed system bars, splash screen and icons.

## 8. Testing recipes

- **Android WebView over the DevTools protocol:** find the socket with
  `adb shell cat /proc/net/unix | grep webview_devtools_remote`, then
  `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`;
  `http://localhost:9333/json` lists the page. A small Node script with the
  global `WebSocket` can `Runtime.evaluate` (click buttons, read
  localStorage) and collect console errors via `Runtime.enable` /
  `Log.enable`. The UI follows the device language, so match aria-labels
  or translated text accordingly.
- **Logs:** `adb logcat | grep -E "Capacitor/Console|Capacitor/Plugin"`
  (debug builds log every plugin call with its arguments);
  `xcrun simctl launch --console-pty` for iOS.
- **Screenshots:** `adb exec-out screencap -p > shot.png`;
  `xcrun simctl io <udid> screenshot <absolute path>` (relative paths fail
  with "Read-only file system").
- **Emulator gotchas:** the AVD `Pixel_8a_API_35_KLUU_` hides newly
  installed apps (managed profile), so use `Pixel_8_API_34`. The emulator's
  GPU pipe can stall the whole guest: the status-bar clock freezes and
  `adb shell input` hangs. `adb emu screenrecord screenshot <path>` still
  works, and a cold boot fixes it. `-gpu swiftshader_indirect` is stable but
  too slow for share-image exports.
- **Do not click the iOS Simulator with AppleScript.** The window is often
  not frontmost and the clicks land in other apps. For iOS interaction, use
  Safari Web Inspector by hand or a real device.
- Capacitor 8 on Android logs "Error injecting safe area CSS" at startup.
  It is Capacitor's own injector running before the DOM exists, and it is
  harmless.
