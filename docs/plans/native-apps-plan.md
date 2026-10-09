# Plan: Native iOS and Android apps (Capacitor)

> Status: **Phase 1 done (2026-10-09).** Phase 0 (spike) ran on the iOS
> simulator and Android emulator and was confirmed by the owner on a real
> iPhone and a real Android phone (2026-10-09, "minor issues, fine for
> now"). Live reload (`yarn cap:dev`) was added the same day. Work is on
> branch `feat/capacitor-port`. Next: Phase 2. How the native build works:
> [../native-apps.md](../native-apps.md).

## Goal

Ship DouzePoints to the App Store and Google Play from this codebase, with
an experience at least as good as the mobile website. The owner has a Google
Play developer account and experience with both stores. As of 2026-10-04
they had no Apple Developer Program membership.

## Decision: Capacitor 8

Researched 2026-10-04. Capacitor wraps the existing web app, has the
strongest mobile plugin ecosystem, and supports over-the-air web updates.
The alternatives:

- **Tauri 2 mobile** works, but its mobile plugin ecosystem is thin, it has
  no OTA updates, and it adds a Rust toolchain for no gain here.
- **Expo / React Native** would be a rewrite.
- **Trusted Web Activity (Bubblewrap)** is Android-only: it runs the live
  site in Chrome. It can't reach the App Store.
- **PWABuilder's iOS package** is effectively abandoned, and the site has no
  manifest or service worker anyway.

Rendering uses the same engines as Safari and Chrome, so animation
performance matches the mobile website. The apps gain no browser chrome,
assets served from disk, storage that Safari's 7-day eviction doesn't
touch, and native share and haptics. They cost store-review release cycles
(unless live updates are used) and a second build target with its own auth
path.

Pointing the app at the live website (`server.url`) was rejected. Capacitor
documents it as dev-only, it breaks offline use, and it is exactly what
Apple's reviewers flag as a wrapped website. The apps ship the static
export.

## Store constraints (researched 2026-10-04)

- **Apple 4.2 (minimum functionality):** thin website wrappers get rejected.
  Ship native share, haptics and a proper icon and splash screen in v1 so
  the app reads as an app. The risk is low for an interactive simulator.
- **Apple 4.8 (login services):** an app whose only login is a third-party
  social login (Google) must also offer Sign in with Apple.
- **Apple 5.1.1(v):** apps that let users create an account must let them
  delete it from inside the app. Check whether the profile UI has this
  before submitting.
- **Google OAuth** refuses embedded WebViews (`disallowed_useragent`), so
  sign-in must be native.
- **Apple Developer Program:** $99 a year. Individual enrollment usually
  clears in 1 to 3 days, but ID verification can stall for weeks, so enroll
  well before Phase 4.
- **Google Play:** personal accounts created after 2023-11-13 must run a
  closed test with 12 testers for 14 consecutive days before production.
  Older accounts and organization accounts are exempt.
- **Live updates:** Ionic Appflow is shutting down (end of 2027). The
  options are Capgo or Capawesome Cloud, at about $9 to $14 a month, or a
  self-hosted updater. Apple allows downloaded interpreted code that doesn't
  change the app's purpose, and Google exempts WebView JavaScript.

## Phases

Estimates are for the owner, who knows the codebase. Total: about 15 to 20
working days, or 4 to 8 weeks of calendar time including Apple enrollment
and review rounds.

### Phase 0: spike (done 2026-10-09)

- [x] Static export behind `NATIVE_EXPORT`, without touching the Cloudflare
      build.
- [x] Capacitor 8.5 with `ios/` and `android/`; app ID `app.douzepoints`.
- [x] Runs on the iOS 26.4 simulator, the Android 14 emulator and real
      devices. A full semi-final (jury, televote, GSAP, qualifiers) works,
      and state persists across restarts.
- [x] Live reload: `yarn cap:dev`, `yarn dev:native` (added after Phase 0).

### Phase 1: static-export compatibility (done 2026-10-09)

- [x] Locale chosen on the client: saved choice, else device language, else
      English. Live switching, persistence, preferred-locale sync, `el` → `gr`.
- [x] Message catalogs bundled; no `/api/messages` fallback in the apps.
- [x] Image proxy replaced by native HTTP in `exportNode` (no backend change
      needed); display uses the raw URL.
- [x] `next/image` unoptimized in the export.
- [x] Verified on Android (CDP-driven) and the iOS simulator (device
      language); unit tests in `src/i18n/nativeLocale.test.ts`.

### Phase 2: auth and backend access (4 to 5 days)

- [ ] **CORS:** allow `capacitor://localhost` and `https://localhost`
      through a **new** backend env var merged into `corsOrigins`. Never
      append them to `FRONTEND_URL`: `auth.controller.ts` computes
      `isDev = FRONTEND_URL.includes('localhost')`, so that would downgrade
      the production refresh cookie (SameSite=Lax, no domain) and break
      website login.
- [ ] **Refresh token without cookies:** WKWebView won't keep the
      cross-site httpOnly cookie for `api.douzepoints.app` from
      `capacitor://localhost`. Native clients need the refresh token in the
      response body, kept in secure storage (Keychain or Keystore plugin).
      `/auth/refresh` already accepts `Authorization: Bearer <refresh>`;
      logout currently only revokes the cookie token.
- [ ] **Native Google Sign-In** with `@capgo/capacitor-social-login` or
      Capawesome's google-sign-in. The plugin returns an ID token; a new
      backend endpoint verifies it and issues tokens. This needs iOS and
      Android OAuth client IDs in Google Cloud.
- [ ] **Sign in with Apple** (guideline 4.8): plugin plus backend
      identity-token verification. Needs the paid Apple account.
- [ ] **R2 CORS:** add the app origins to the R2 allowlist
      (`npm run r2:cors` in the backend) so uploaded fonts load in the UI
      and in exports.
- [ ] Optional: show an error state instead of an empty list when a
      backend call fails (Public Contests currently says "Found 0").

### Phase 3: native polish (3 to 5 days)

- [ ] **Downloads and sharing:** replace `<a download>` on data URLs (share
      images, stats) and `XLSX.writeFile` with `@capacitor/filesystem`
      (cache directory) plus `@capacitor/share`. Users also get "Save to
      Photos".
- [ ] **Share links:** they are built from `window.location.href`
      (`useHandleShare`, `ThemeListItem`, `ShareResultsModal`). Use
      `https://douzepoints.app`. Optionally add universal links and Android
      app links so shared links open the app.
- [ ] **Android back button** (`@capacitor/app`): close the top modal, then
      go back in history, then exit.
- [ ] **System bars:** theme-coloured status and navigation bars via
      Capacitor's SystemBars or StatusBar. `useStatusBarThemeColor` only
      rewrites the `theme-color` meta tag, which native ignores, so the
      Android bars are white today.
- [ ] **Safe areas:** CSS uses `env(safe-area-inset-*)` only. For Android 15
      edge-to-edge on WebViews older than 140, use
      `var(--safe-area-inset-top, env(safe-area-inset-top))`, which
      Capacitor 8 injects.
- [ ] Hide the fullscreen toggle in the apps (WKWebView has no Fullscreen
      API).
- [ ] Move the custom background image (base64, up to about 5 MB, in
      IndexedDB) to the filesystem, because of the iOS 17.4+ WKWebView
      IndexedDB connection bug.
- [ ] Keyboard behaviour (`@capacitor/keyboard`), haptics, splash screen and
      icons (`@capacitor/assets`), orientation, sound autoplay check, iOS
      per-app language list (`CFBundleLocalizations`).
- [ ] Drop source maps from store builds (about 22 MB of the 42 MB bundle).

### Phase 4: store preparation (2 to 3 days plus review)

- [ ] Apple Developer enrollment (start early), signing, TestFlight.
- [ ] Final app ID decision before the first upload; it is permanent.
- [ ] Privacy: App Store privacy labels, Play Data safety form, privacy
      policy URL, in-app account deletion (5.1.1(v)).
- [ ] Screenshots, descriptions, age rating, review notes (and a demo login
      if sign-in gates anything reviewers need).
- [ ] Decide on live updates and set them up before the first release.
- [ ] Google Play closed test if the account requires it.

## Open decisions

- App ID: `app.douzepoints` unless changed before the first upload.
- Live updates: provider and whether to use them at launch.
- Native sign-in plugin: Capgo social-login (Google and Apple in one plugin)
  or separate Capawesome plugins.
