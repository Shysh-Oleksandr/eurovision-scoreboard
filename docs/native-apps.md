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
    silently absent from the apps. The web build adds `web.tsx` to its page
    extensions, so a `page.web.tsx` is a website-only page: `/about`,
    `/privacy`, `/admin/errors` and `/dev/*` use it (§4, website-only
    features).
  - `NEXT_PUBLIC_NATIVE_APP=1` is the client-side flag, exported as
    `IS_NATIVE_APP` from `src/native/platform.ts`. It means "this is the app
    bundle". `yarn build:native` sets both flags, `yarn dev:native` sets only
    this one.
- **`yarn build:native`** runs `gen:messages`, then `next build` with both
  flags, `NEXT_PUBLIC_API_URL=https://api.douzepoints.app` and an empty
  Umami id (app sessions must not count as website traffic). Output: `out/`
  (gitignored), which holds the HTML, `/_next/static` and all of `public/`.
  `next.config.ts` also bakes in the live-update values: the bundle version
  (the UTC build time) and both native runtime fingerprints (§11). The build
  log prints them (`[live-update] bundle …, runtimes ios …, android …`).
- **Locale on the server:** `src/i18n/request.ts` returns a fixed `en`
  when `NEXT_PUBLIC_NATIVE_APP` is set. A static export has no request, so
  `cookies()` / `headers()` would fail the build. The real locale is picked
  on the client (§5).
- **`yarn cap:sync`** = `scripts/native-config.mjs` + `build:native` +
  `cap sync`. The first step updates `Info.plist` before the build
  fingerprints it (§11); sync runs it again as its hook. It copies `out/` into
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
- **Env:** besides the flags, the native build reads
  `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  from `.env` (§7).
- **Generated files:** every build regenerates
  `src/i18n/messagesManifest.generated.ts`. Commit it whenever it changes;
  `messagesManifest.test.ts` fails when the committed manifest is stale.
  Builds also flip `next-env.d.ts` between `.next/types` and
  `.next/dev/types`; revert that one.
- **Size:** `out/` is about 18 MB. The native build has no browser source
  maps (they were 22 MB); `NATIVE_SOURCEMAPS=1 yarn cap:sync` adds them
  for a debugging session.

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
| `yarn assets:native` | Regenerate icons and splash screens from `assets/` (§8) |
| `yarn live-update publish` | Build, sign and upload a live update to R2 (§11) |
| `yarn live-update status` | What is published for this tree's native runtimes |

`cap sync` also runs the app's `capacitor:sync:after` hook,
`scripts/native-config.mjs` (§7).

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
- **Never return a plugin object from an async function.** Capacitor
  plugin proxies answer to every property, `then` included, so
  `async () => (await import('…')).SomePlugin` resolves by calling a native
  "then" method ("`SecureStorage.then()` is not implemented on android").
  Destructure the plugin where it is used (see `src/native/nativeAuth.ts`).
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
  WKWebView bug where IndexedDB connections drop after long backgrounding.
  IndexedDB holds graphics drafts and voting presets; `getDB()`
  (`src/helpers/indexedDB.ts`) opens a fresh connection per call, which is
  the usual workaround. "Clear data" (`localStorage.clear()`) also wipes the
  app's saved language, which then falls back to the device language.
- **Website-only features** (decided 2026-10-09) are hidden with
  `IS_NATIVE_APP` rather than ported: the fullscreen toggle (the settings
  row, and `useFullscreen` does nothing, so the account-synced
  `enableFullscreen` is never reset by the app) and vote spreadsheet
  import/export (`.xlsx`: the Voting Predefinition menu and the Final Stats
  export button). The about, privacy, admin and dev pages are `page.web.tsx`
  and absent from the export (§1). Add to this list rather than porting a
  desktop-shaped feature by default.
- **Files and links go through `src/helpers/fileActions.ts`.** Never use
  `<a download>`, `navigator.share` or `window.location` for a share link
  directly: `saveFile()`, `shareFile()` and `shareLink()` pick the native
  path (§6), and `buildShareUrl()` (`src/helpers/shareUrl.ts`) points app
  links at `https://douzepoints.app/`. Show `common.savedTo` when
  `saveFile()` returns `saved`.
- **Every dismissable overlay registers for Android back** with
  `useBackHandler(open, close)` (`src/hooks/useBackHandler.ts`). `Modal`,
  `AnchoredMenu`, `OverflowMenu`, `VotingBarMenu`, the editor's `Dialog`
  and popovers already do; a custom overlay that doesn't is skipped and back
  closes whatever is under it. An overlay that must not close registers a
  no-op (as `Modal` does without `onClose`). See §8.
- **Safe areas: use `var(--safe-top)` etc.** (`src/styles.css` `:root`),
  never `env(safe-area-inset-*)` directly, also in Tailwind arbitrary values
  (`pt-[var(--safe-top)]`). Capacitor's Android `SystemBars` sets
  `--safe-area-inset-*` because old WebViews report wrong `env()` values
  edge to edge; the variables fall back to `env()` everywhere else.
- **Live updates ship JS, never native changes.** A web change reaches
  installed apps through `yarn live-update publish` (§11). Anything that
  changes the native runtime fingerprint (a plugin or its version,
  `capacitor.config.ts`, the iOS delegates, `Info.plist`, entitlements,
  Android's Java code, `AndroidManifest.xml`, `res/xml`) needs a store
  release, and its bundles only reach the new binary.

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

## 6. Images, saving and sharing

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
- **Saving** (`saveFile()`: share images, stats images, editor exports,
  design JSON backups). WKWebView ignores `<a download>`, so:
  - Android 10+: the app's own `MediaSaver` plugin
    (`android/app/src/main/java/app/douzepoints/MediaSaverPlugin.java`,
    registered in `MainActivity`) writes through MediaStore, which needs no
    permission: images to `Pictures/DouzePoints` (they show in the
    gallery), other files to `Download/DouzePoints`. The caller toasts
    "Saved to …". Android 9 and older fall back to the share sheet.
  - iOS: the share sheet on the file; its "Save Image" needs
    `NSPhotoLibraryAddUsageDescription` (Info.plist, set).
- **Sharing** (`shareFile()`, `shareLink()`): `@capacitor/filesystem`
  writes the file to `cache/exports/` (emptied before each new file) and
  `@capacitor/share` opens the system sheet on it. Android's WebView has no
  Web Share API, so this path is required there. Dismissing the sheet is
  not an error.
- **Copy image** buttons are hidden in the apps: async clipboard image
  writes are unreliable in the WebViews, and the share sheet has Copy.
- Verified 2026-10-09 on the Android 14 emulator: saving a share image
  (MediaStore row in `Pictures/DouzePoints`, toast), and the share sheet
  with the image preview. Not yet tried on iOS.

## 7. Sign-in and tokens

The website signs in with a full-page redirect to the backend's Google OAuth
flow and keeps the refresh token in an httpOnly cookie on
`api.douzepoints.app`. Neither works in the apps: Google refuses OAuth inside
WebViews (`disallowed_useragent`), and the WebView won't keep that cross-site
cookie. The app flow (`src/native/nativeAuth.ts`, native branches in
`src/state/useAuthStore.ts`):

1. `login()` opens the platform's Google account sheet
   (`@capgo/capacitor-social-login`, `mode: 'online'`) and gets an ID token.
   Dismissing the sheet does nothing; a failure shows the usual login-error
   toast (the store fires `NATIVE_LOGIN_EVENT`, `AppBootstrap` shows it).
2. `POST /auth/google/native { idToken }` verifies the token with
   `google-auth-library` (signature, issuer, expiry, audience = the backend's
   `GOOGLE_CLIENT_ID` plus `GOOGLE_NATIVE_CLIENT_IDS`), finds or creates the
   profile like the web strategy (email is only used for linking when
   `email_verified`), and returns `{ accessToken, refreshToken }` in the body.
3. The refresh token goes to the Keychain / Android Keystore
   (`@aparajita/capacitor-secure-storage`, key `refresh-token`). Then the
   normal `handlePostLogin(true)` path runs.
4. `/auth/refresh` and `/auth/logout` get `Authorization: Bearer <refresh>`
   (an explicit header wins over the access token in `src/api/client.ts`).
   When the backend rotates a header-borne token, the successor comes back as
   `refreshToken` in the body and replaces the stored one. Only a 401 deletes
   the stored token; a network error keeps it for the next launch.
5. On launch, the app restores the session when a refresh token is stored
   (not when a user is persisted, as on the web), so an offline launch
   doesn't sign the user out.
6. Logout revokes the token on the server, deletes it locally and signs out
   of the Google SDK so the next sign-in shows the account sheet.

The backend allows the app origins for CORS through `NATIVE_APP_ORIGINS`
(default `capacitor://localhost,https://localhost`), never through
`FRONTEND_URL`: any `FRONTEND_URL` containing "localhost" makes the auth
controller treat the server as dev and weaken the refresh cookie.

**Configuration (all public values):**

| Where | Name | Value |
|---|---|---|
| Frontend `.env` | `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The "Web application" OAuth client = the backend's `GOOGLE_CLIENT_ID` |
| Frontend `.env` | `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The "iOS" OAuth client for bundle ID `app.douzepoints` |
| Backend env | `GOOGLE_NATIVE_CLIENT_IDS` | The iOS client ID (iOS may put it in `aud`); comma-separated |
| Google Cloud | "Android" OAuth client | Package `app.douzepoints` + the SHA-1 of every signing key (debug, upload, Play App Signing); its ID is never passed to the app |

`scripts/native-config.mjs` writes the iOS client's reversed ID
(`com.googleusercontent.apps.…`) into `Info.plist` as a URL scheme on every
sync; GoogleSignIn throws at sign-in without it. `SceneDelegate.swift` passes
URL callbacks to `GIDSignIn` as the plugin's docs ask (iOS 15+ normally
completes inside the auth session). Without the env values the app refuses
to start Google sign-in with a readable error. Debug SHA-1:
`cd android && ./gradlew signingReport`. Android needs a Google account on
the device or emulator.

**Sign in with Apple** (added 2026-10-10; App Store guideline 4.8 requires
it next to Google). `SignInButtons` (`src/components/common/`) shows
"Continue with Apple" on the website and in the iOS app, and hides it in the
Android app (`nativePlatform()` in `src/native/platform.ts` reads the
platform synchronously from the bridge's `window.Capacitor`). The button
uses Apple's white style for dark backgrounds (`Button` variant `apple`).

- **iOS app:** `getAppleCredential()` initializes the plugin's Apple provider
  with `useProperTokenExchange: true` and no redirect URL, so the system
  sheet's identity token, authorization code and (first time only) name come
  back to JS. `POST /auth/apple/native` verifies the token (audience = the
  bundle ID), redeems the code for Apple's refresh token, and returns the
  same token pair as Google; everything after that is the Google path. A
  dismissed sheet rejects with code `USER_CANCELLED` and does nothing. The
  entitlement is `ios/App/App/App.entitlements`
  (`com.apple.developer.applesignin`), referenced by `CODE_SIGN_ENTITLEMENTS`.
- **Website:** `login('apple')` navigates to `GET /auth/apple`, which sets a
  short-lived `apple_oauth` cookie (state + nonce, SameSite=None) and
  redirects to Apple with the Services ID `app.douzepoints.web`. Apple posts
  the result to `https://api.douzepoints.app/auth/apple/callback`, which sets
  the refresh cookie and redirects to `?provider=apple`, handled exactly like
  `?provider=google`. Failures add `&error=1` (AppBootstrap shows the error
  toast and keeps any earlier session); cancelling returns to the site
  without either. Apple refuses `localhost` return URLs, so this flow only
  runs against a public HTTPS backend.
- **Accounts:** profiles match by `appleId`, then by a verified email (which
  links the Apple ID to the existing profile, e.g. a Google account with the
  same address). A "Hide My Email" relay address matches nothing, so it
  makes a new account.
- **Revocation:** the backend keeps Apple's refresh token
  (`Profile.appleRefreshToken`, never selected) so in-app account deletion
  can revoke it, as Apple requires.

| Where | Name | Value |
|---|---|---|
| Backend env | `APPLE_TEAM_ID`, `APPLE_KEY_ID` | Team ID and the Sign in with Apple key's ID |
| Backend env | `APPLE_PRIVATE_KEY` | The `.p8` contents (literal `\n` line breaks are fine) |
| Backend env | `APPLE_CALLBACK_URL` | `https://api.douzepoints.app/auth/apple/callback` in production |
| Backend env | `APPLE_BUNDLE_ID`, `APPLE_SERVICES_ID` | Defaults `app.douzepoints`, `app.douzepoints.web` |
| Apple portal | Services ID `app.douzepoints.web` | Domains `douzepoints.app`, `api.douzepoints.app`; the return URL above. Its description is the name Apple's web sheet shows |

## 8. Shell: icons, splash, system bars, back button, haptics, languages

- Sources live in `assets/` (`icon-only`, `icon-foreground`,
  `icon-background`, `splash`, `splash-dark`; @capacitor/assets "Custom
  Mode"). The current art is a placeholder made by
  `scripts/compose-app-assets.mjs`: the website's microphone favicon on the
  2026 navy (`#070b24` → `#1c2360`). Replace the files and run
  `yarn assets:native`, which rewrites the iOS asset catalogs and the
  Android mipmaps and splash drawables.
- The asset tool also reformats `AndroidManifest.xml` (whitespace only);
  revert that.
- Android 12+ shows the launcher icon on `windowSplashScreenBackground`
  (`android/app/src/main/res/values/styles.xml`), kept in sync with
  `SPLASH_BACKGROUND` in `capacitor.config.ts`, which also colours the
  WebView before its first paint.
- `@capacitor/splash-screen` keeps the splash up until the first screen
  has painted: `hideSplashWhenPainted()` (`src/native/splash.ts`) runs when
  the first `Modal` becomes active (usually Event Setup) or the simulation
  board mounts; `src/app/(main)/page.tsx` calls it 1.5 s after the catalog
  is ready as a fallback, and `launchShowDuration: 4000` is the safety net.
- **System bars** (`SystemBars` in `capacitor.config.ts`): `style: 'DARK'`
  (light icons; every theme is dark) and edge to edge, so the theme shows
  behind the status and navigation bars and `--safe-*` (§4) pads content.
  Android WebViews older than 140 can't go edge to edge: Capacitor pads the
  WebView instead and the bars show `android:windowBackground`
  (`styles.xml`, the splash navy; the white of the default theme before).
  Verified on WebView 136 (emulator) and the iOS 26 simulator; the edge to
  edge Android path (WebView 140+, i.e. updated phones) is untested.
  `useStatusBarThemeColor` only matters on the website.
- **Android back button** (`src/native/backButton.ts`, `@capacitor/app`):
  closes the innermost overlay registered with `useBackHandler` (§4), else
  goes back in history (the graphics editor is a history entry; its own
  handler first unwinds export → panel → sheet → selection), else
  minimises the app. Verified on Android: nested modals close one by one,
  the editor closes, the root minimises. The keyboard takes the first press
  itself.
- **Haptics** (`src/native/haptics.ts`, `@capacitor/haptics`): ride on the
  theme sound events in `playThemeSound()` (douze points: heavy, qualifier
  reveal / pick: light, winner: success), independent of theme audio.
  Setting `enableHaptics` (Effects, shown only in the apps, device-local,
  default on).
- **Keyboard:** no plugin. Android resizes the WebView for the keyboard
  (Capacitor's insets handling) and focused inputs stay visible (checked in
  Event Setup's country search); iOS keeps WKWebView's default scrolling.
  Revisit with `@capacitor/keyboard` only for a concrete problem; with
  Capacitor 8 on Android, don't set `Keyboard.resizeOnFullScreen`.
- **Orientation:** not locked (portrait and landscape on phones, all four
  on iPad); the scoreboard uses the width in landscape.
- **Audio:** Capacitor lets media play without a user gesture on both
  platforms, so theme sounds and ambience behave as on desktop. iOS mutes
  them with the silent switch (the WebView's default audio session).
- **Per-app language:** iOS lists the app's languages in Settings via
  `CFBundleLocalizations` (Info.plist), Android 13+ via
  `res/xml/locales_config.xml` (`android:localeConfig`). The choice reaches
  `navigator.languages`, so it applies when no in-app language is saved
  (§5); verified on Android with `adb shell cmd locale set-app-locales
  app.douzepoints --locales uk`.

## 9. Not working yet

Tracked in the plan with the phase that fixes each item:

- Until the backend changes are deployed and the Google Cloud clients exist,
  sign-in and every backend call fail in the apps (lists such as Public
  Contests show an empty result rather than an error).
- Uploaded fonts until the R2 CORS rule includes the app origins
  (`npm run r2:cors -- --apply` in the backend).
- Shared links open the website, not the app: no universal links / Android
  app links yet (they need the Apple team ID and the release signing key).

## 10. Testing recipes

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
- **Auth end to end without Google:** run the backend on a spare port
  against a throwaway database (`docker run --rm -p 27018:27017 mongo:7`,
  `PORT=8011 MONGODB_URI=mongodb://localhost:27018/test node dist/src/main`),
  seed a profile plus a `refresh_tokens` document (sha256 `tokenHash` of a
  random hex token), and plant the raw token in the app with
  `Capacitor.nativePromise('SecureStorage', 'internalSetItem',
  { prefixedKey: 'capacitor-storage_refresh-token', data, sync: false })`.
  A relaunch then restores the session. Moving the document's `expiresAt`
  within a day forces a rotation. A test build that calls an `http://` API
  on Android needs `server.cleartext` and `android.allowMixedContent`
  temporarily (`ERR_CLEARTEXT_NOT_PERMITTED` otherwise). Never point these
  tests at the real database.
- **Do not click the iOS Simulator with AppleScript.** The window is often
  not frontmost and the clicks land in other apps. For iOS interaction, use
  Safari Web Inspector by hand or a real device.
- Capacitor 8 on Android logs "Error injecting safe area CSS" at startup.
  It is Capacitor's own injector running before the DOM exists, and it is
  harmless.

## 11. Live updates

The apps update their web bundle without a store release (added
2026-10-10): `@capgo/capacitor-updater` in manual mode, our own manifests
and bundles on R2, no Capgo account or cloud. Apple's license agreement
allows downloaded interpreted code that doesn't change the app's purpose,
and Google's device and network abuse policy exempts WebView JavaScript.
Native code,
plugins and anything the binary reads (`capacitor.config.ts`, `Info.plist`,
`AndroidManifest.xml`) still need a store release.

### How an app updates

1. **Check** (`startLiveUpdateChecks()`, `src/native/liveUpdate.ts`): 10 s
   after launch, and on resume when the last check is an hour old, the app
   fetches `https://cdn.douzepoints.app/app-updates/<platform>/<runtime>.json`
   with `CapacitorHttp` (native, so no CORS rule is needed). A 404 means
   nothing is published for its runtime. If the manifest's version is newer
   than the running bundle's and hasn't failed on this device,
   `CapacitorUpdater.download()` fetches the zip, verifies the signature and
   unzips it. Older downloads that never ran are deleted first.
2. **Switch on the next launch** (`liveUpdateBoot()`): every launch asks the
   plugin for a downloaded bundle newer than the running one
   (`pickBundleToApply()`, `liveUpdateManifest.ts`) and `set()`s it, which
   reloads the WebView. It runs before anything that must not be cut off:
   `AppBootstrap` awaits it before restoring the session (a reload during a
   refresh-token rotation would lose the new token), and
   `hideSplashWhenPainted()` awaits it, so the splash covers the switch
   (`SplashScreen.show()` brings it back if the launch splash already timed
   out). The plugin's own install-on-background (`next()`) is never used: it
   would reload the app whenever the user switches away, e.g. to share. A
   check that takes longer than 8 s gives up for that launch.
3. **Confirm** (`confirmLiveBundle()`): `src/app/(main)/page.tsx` calls
   `notifyAppReady()` once `Main` has mounted. A bundle that doesn't get
   there within `appReadyTimeout` (20 s; the plugin uses at least 30 s for a
   bundle's first run on Android) is rolled back to the last bundle that
   worked and deleted. The next launch reads `getFailedUpdate()` and stores
   the version under localStorage `live-update-failed`, so that version is
   never downloaded again on this device.
4. A store update drops all downloaded bundles (`resetWhenUpdate`, default),
   so the new binary starts from its own bundle.

Versions are the UTC build time, `YYYYMMDD.HHmmss`, baked into every native
build as `NEXT_PUBLIC_LIVE_UPDATE_VERSION`. A store binary built after a
published bundle therefore never downloads it. Error reports from the apps
carry the running version as `userDetails.appBundle`.

### Native runtimes

An app only reads the manifest of its own **runtime**, a fingerprint of its
native side per platform (`scripts/native-runtime.mjs`): the Capacitor
runtime and every native plugin with its installed version,
`capacitor.config.ts`, `live-update-public.pem`, and for iOS the Swift files,
`Info.plist` and the entitlements in `ios/App/App`; for Android the Java
sources, `AndroidManifest.xml` and `res/xml` (minus the generated
`config.xml`). Whitespace doesn't count. Version numbers, icons, Xcode and
Gradle settings are left out, so a release that only bumps the version keeps
its runtime and keeps receiving updates.

`build:native` bakes both runtimes into the bundle; `publish` files the
bundle under the runtimes of the tree it builds from. So:

- After a native change, bundles published from the new tree only reach
  binaries built from it. Users who haven't updated from the store stay on
  whatever their runtime last got.
- Build store binaries right after `yarn cap:sync` with no native edits in
  between (Xcode edits to `Info.plist` count), or the binary's real runtime
  differs from the baked one and it never sees an update.
- To ship a fix to an older runtime, publish from a checkout of the commit
  its binary was built from (plus the fix). `yarn live-update status` shows
  the runtimes of the current tree and what is published for them.

### Publishing

```bash
npx wrangler login                     # once; needs access to the R2 bucket
yarn live-update publish               # from a clean tree
yarn live-update publish --dry-run     # build and sign, upload nothing
yarn live-update status
```

`publish` refuses a dirty tree (`--allow-dirty` overrides; the manifest then
says `<commit>-dirty`). It runs `yarn build:native` with a fresh version,
checks that the version made it into the JS, zips `out/` (about 6.5 MB),
encrypts and signs it, verifies the result with the public key, and uploads
with `wrangler r2 object put --remote` to the `douzepoints-assets` bucket
(`LIVE_UPDATE_BUCKET` overrides): first
`app-updates/bundles/<version>.zip` (immutable, cached for a year), then one
`app-updates/<platform>/<runtime>.json` per platform (`no-cache`). The
manifest holds the version, platform, runtime, zip URL, signed checksum,
session key, size, commit and publish time.

- **Rolling back** means publishing again from a good commit: it gets a new,
  newer version. Apps that already run the bad bundle move to the new one
  on their next launch after a check. Deleting a manifest only stops further
  downloads.
- **Size:** every update downloads the whole zip; Capgo's delta updates
  (per-file manifests) are not used.

### Signing

The binaries carry the RSA public key `live-update-public.pem` (committed;
`capacitor.config.ts` reads it into `CapacitorUpdater.publicKey`). With a
key configured the plugin only accepts bundles encrypted with the plugin's
"encryption v2": the zip is AES-128-CBC encrypted with a random key, and
that key and the zip's SHA-256 are signed with the private key
(`privateEncrypt`, PKCS#1 v1.5). Someone with write access to the bucket but
without the private key cannot ship code to the apps.

- The private key lives at `~/keys/douzepoints-live-update.pem`
  (`LIVE_UPDATE_PRIVATE_KEY` overrides), outside both repos. **Back it up.**
  Without it no installed app can be updated until a store release ships a
  new public key.
- `yarn live-update keygen` made the pair on 2026-10-10. Running it again
  (`--force`) cuts off every installed app: their binaries keep the old key.
- `publish` refuses a private key that doesn't match the committed public
  key.

### Plugin configuration

`capacitor.config.ts` → `CapacitorUpdater`: `autoUpdate: false`, and
`updateUrl`, `channelUrl`, `statsUrl` all empty, so the plugin never talks to
Capgo (its stats would include crash and JS-error reports). It still keeps a
random device ID in the Keychain / app preferences, which nothing sends
anywhere. `responseTimeout: 120` (on iOS it caps the whole download),
`disableJSLogging: true` (Android still echoes its logs into the WebView
console after the first download; read them in logcat / Xcode either way).
The plugin uses UserDefaults, file timestamps and free disk space, declared
with the other plugins' required-reason APIs in
`ios/App/App/PrivacyInfo.xcprivacy`.

### Testing locally

Point a build and a publish at a local server instead of the CDN:

```bash
mkdir -p /tmp/lu/app-updates && python3 -m http.server 8787 --directory /tmp/lu
NEXT_PUBLIC_LIVE_UPDATE_URL=http://localhost:8787/app-updates yarn cap:sync
# build and install the app, launch it once, then:
NEXT_PUBLIC_LIVE_UPDATE_URL=http://localhost:8787/app-updates \
  yarn live-update publish --allow-dirty --out /tmp/lu/app-updates
```

Launch the app, wait for the check (logcat / the Xcode console show
`[live-update] downloaded bundle …`), then kill and relaunch it: it switches.
The iOS simulator reaches `http://localhost` as is. Android needs
`adb reverse tcp:8787 tcp:8787` and, temporarily,
`android:usesCleartextTraffic="true"` on `<application>` (which also changes
the Android runtime, consistently for the build and the publish). Run
`yarn cap:sync` without the variable afterwards, or the projects keep the
local URL.

Verified 2026-10-10 on the Android 14 emulator and the iOS 26 simulator:
download, switch on relaunch with the splash covering it, a bundle that
never confirms rolled back after 30 s and not downloaded again, a newer good
bundle installed after that, a bundle signed with another key rejected at
download, and old bundles deleted from disk. Not tried yet: real phones and
the R2 upload.
