# Plan: Native iOS and Android apps (Capacitor)

> Status: **Phase 3 (native polish) done 2026-10-09** apart from a check on
> real phones. **Phase 2 code done
> (2026-10-09), except Sign in with Apple** (deferred until there is an
> Apple Developer account). Not live yet: the
> backend changes must be deployed, the Google Cloud OAuth clients created,
> the client IDs set, and the R2 CORS rule applied (checklist below).
> Placeholder icon and splash screen added the same day. Phase 1
> (static-export compatibility) and Phase 0 (spike, confirmed by the owner on
> a real iPhone and Android phone) were done 2026-10-09 too, plus live reload
> (`yarn cap:dev`). Frontend branch `feat/capacitor-port`; the backend work is
> on its own `feat/capacitor-port` branch. How the native build works:
> [../native-apps.md](../native-apps.md). **2026-10-10:** the owner now has
> an individual Apple Developer Program membership; Phase 4 lists the account
> setup that unblocks Sign in with Apple, universal links and the uploads.
> **2026-10-10:** live updates implemented (self-hosted Capgo updater, signed
> bundles on R2), verified on the Android emulator and iOS simulator against
> a local server; the first R2 upload waits for the first store release.
> **2026-10-10:** universal links and App Links implemented (Android 15+
> only); live once the website with the `.well-known` files is deployed.
> **2026-10-10:** review requirements in code: account deletion, blocking,
> reports for every content type and users, an admin report queue, the
> Patreon card hidden in the apps, a rewritten privacy policy and new terms
> of use (branch `feat/app-store-readiness` in both repos, uncommitted).
> Details: [../moderation-and-account-deletion.md](../moderation-and-account-deletion.md).



## Goal

Ship DouzePoints to the App Store and Google Play from this codebase, with
an experience at least as good as the mobile website. The owner has a Google
Play developer account (exempt from the closed-test rule) and experience
with both stores, and enrolled in the Apple Developer Program as an
individual by 2026-10-10.

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
Older accounts and organization accounts are exempt. The owner's account
is exempt (confirmed 2026-10-10).
- **Apple 1.2 (user-generated content):** public contests, themes and
designs need a way to report content, a way to block abusive users,
terms that forbid objectionable content, action on reports within 24
hours, and published contact information. All in place since 2026-10-10
(the 24 hours depend on the owner checking `/admin/reports`).
- **Apple 3.1.1:** an in-app donation link (the Patreon card in the
feedback modal) is treated as an unpaid digital purchase outside the US
storefront. Hide it in the apps.
- **Sign in with Apple and account deletion:** deleting an account must
also revoke the user's Apple tokens (Apple's REST API, signed with the
Sign in with Apple key).
- **Toolchain (checked 2026-10-10):** App Store uploads need Xcode 26+ with
the iOS 26 SDK (since 2026-04-28); the installed Xcode 27.0 is a release
build. Play needs target API 36 for new apps (since 2026-08-31);
`targetSdkVersion` is 36.
- **China mainland** needs an ICP filing number; leave it out of the App
Store availability.
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
  ```
  build.
  ```
- [x] Capacitor 8.5 with `ios/` and `android/`; app ID `app.douzepoints`.
- [x] Runs on the iOS 26.4 simulator, the Android 14 emulator and real
  ```
  devices. A full semi-final (jury, televote, GSAP, qualifiers) works,
  and state persists across restarts.
  ```
- [x] Live reload: `yarn cap:dev`, `yarn dev:native` (added after Phase 0).



### Phase 1: static-export compatibility (done 2026-10-09)

- [x] Locale chosen on the client: saved choice, else device language, else
  ```
  English. Live switching, persistence, preferred-locale sync, `el` → `gr`.
  ```
- [x] Message catalogs bundled; no `/api/messages` fallback in the apps.
- [x] Image proxy replaced by native HTTP in `exportNode` (no backend change
  ```
  needed); display uses the raw URL.
  ```
- [x] `next/image` unoptimized in the export.
- [x] Verified on Android (CDP-driven) and the iOS simulator (device
  ```
  language); unit tests in `src/i18n/nativeLocale.test.ts`.
  ```



### Phase 2: auth and backend access (code done 2026-10-09)

- [x] **CORS:** `NATIVE_APP_ORIGINS` (default
  ```
  `capacitor://localhost,https://localhost`) merged into `corsOrigins` in
  the backend's `src/config.ts`. Never append the app origins to
  `FRONTEND_URL`: `auth.controller.ts` computes
  `isDev = FRONTEND_URL.includes('localhost')`, which would downgrade the
  production refresh cookie (SameSite=Lax, no domain) and break website
  login.
  ```
- [x] **Refresh token without cookies:** `POST /auth/google/native` returns
  ```
  both tokens in the body; `/auth/refresh` and `/auth/logout` accept the
  refresh token as a bearer header, and a rotated header-borne token
  comes back in the body. The app keeps it in the Keychain / Keystore.
  Unit tests: `src/auth/auth.controller.spec.ts`,
  `src/auth/auth.service.spec.ts` (backend).
  ```
- [x] **Native Google Sign-In** with `@capgo/capacitor-social-login`
  ```
  (one plugin for Google now and Apple later); the backend verifies the
  ID token with `google-auth-library` 10.x (Node 18+).
  ```
- [x] **R2 CORS script:** `scripts/configure-r2-cors.ts` now merges the app
  ```
  origins into the bucket's existing allowlist instead of replacing it.
  ```
- [x] Verified 2026-10-09 against a local backend and a throwaway MongoDB:
  ```
  CORS for both app origins, bearer refresh, rotation, logout
  revocation and the unchanged cookie path (curl); in the Android app:
  session restore from the Keystore, rotation storing the new token,
  logout through the profile UI, and a readable error when Google
  sign-in isn't configured. Real Google sign-in is untested until the
  OAuth clients exist.
  ```
- [ ] **Owner:** deploy the backend (`feat/capacitor-port`), set
  ```
  `GOOGLE_NATIVE_CLIENT_IDS` there to the iOS client ID (Android tokens
  carry the web client ID, which `GOOGLE_CLIENT_ID` already covers), and
  keep `NATIVE_APP_ORIGINS` unset (the default is right). Checked
  2026-10-10: the website's cookie flow is unchanged; the deploy must
  install the new `google-auth-library` dependency.
  ```
- [x] **Owner (2026-10-10):** in the Google Cloud project of the backend's
  ```
  `GOOGLE_CLIENT_ID`, an "iOS" OAuth client (bundle ID
  `app.douzepoints`) and "Android" clients (package `app.douzepoints`;
  one SHA-1 each: debug and Play App Signing). Web and iOS client IDs
  are in the frontend `.env`. Optional: an Android client for the upload
  key, only needed by release builds installed outside Play.
  ```
- [ ] **Owner:** `npm run r2:cors` (dry run, check the merged list), then
  ```
  `npm run r2:cors -- --apply`, so uploaded fonts load in the apps.
  ```
- [x] **Sign in with Apple** (guideline 4.8), code done 2026-10-10: iOS app
  ```
  and website, backend verification and code redemption. Details:
  [../native-apps.md](../native-apps.md) §7. Untested end to end until
  the backend runs with the `APPLE_*` env (see Phase 4).
  ```
- [ ] Optional: show an error state instead of an empty list when a
  ```
  backend call fails (Public Contests currently says "Found 0").
  ```



### Phase 3: native polish (done 2026-10-09)

Verified on the Android 14 emulator (WebView 136) and, for bars, safe
areas and languages, the iOS 26 simulator. Details:
[../native-apps.md](../native-apps.md) §4, §6 and §8.

- [x] **Saving and sharing files** (`src/helpers/fileActions.ts`): Android
  ```
  10+ saves through the app's `MediaSaver` plugin (MediaStore, no
  permission) to `Pictures/DouzePoints` / `Download/DouzePoints`; iOS
  saves through the share sheet ("Save Image" to Photos,
  `NSPhotoLibraryAddUsageDescription` set). Share buttons use
  `@capacitor/filesystem` + `@capacitor/share`. Copy-image buttons are
  hidden in the apps. (`.xlsx` export is hidden in the apps instead.)
  ```
- [x] **Share links** point at `https://douzepoints.app/` in the apps
  ```
  (`buildShareUrl()`).
  ```
- [x] Universal links and Android App Links (2026-10-10): see Phase 4.
- [x] **Android back button** (`@capacitor/app`, `useBackHandler`): closes
  ```
  the innermost overlay, then goes back in history (graphics editor),
  then minimises the app.
  ```
- [x] **System bars:** light icons, edge to edge with the theme behind
  ```
  them; on WebViews older than 140 the bars show the splash navy
  instead of white. The edge to edge Android path (WebView 140+) is
  untested on a device.
  ```
- [x] **Safe areas:** `--safe-top` / `--safe-right` / `--safe-bottom` /
  ```
  `--safe-left` (`src/styles.css`) prefer Capacitor's injected
  `--safe-area-inset-*` over `env()`.
  ```
- [x] **Website-only features (2026-10-09):** hidden in the apps instead of
  ```
  ported: the fullscreen toggle (WKWebView has no Fullscreen API), vote
  spreadsheet import/export (`.xlsx`), and the about, privacy, admin
  and dev pages (`page.web.tsx`, left out of the export). Details:
  [../native-apps.md](../native-apps.md) §4.
  ```
- [x] **Custom background image removed** (2026-10-09) from the website
  ```
  and the apps; custom themes already cover it (themes can upload a
  background). Existing browsers delete the stored image once on load.
  This also dropped the plan to move it out of IndexedDB.
  ```
- [x] Placeholder icon and splash screen (`@capacitor/assets`,
  ```
  `@capacitor/splash-screen` hidden once the first screen paints).
  Real artwork later: replace `assets/` and run `yarn assets:native`.
  ```
- [x] **Splash hand-off:** hidden when the first modal or the board has
  ```
  painted, not when React first renders.
  ```
- [x] **Haptics** on douze points, qualifier reveals and the winner
  ```
  (`enableHaptics`, apps only).
  ```
- [x] **Keyboard:** no plugin needed (Android resizes, inputs stay
  ```
  visible). **Orientation:** left unlocked. **Sound autoplay:**
  Capacitor allows it on both platforms. **Per-app language:**
  `CFBundleLocalizations` (iOS) and `locales_config.xml` (Android 13+).
  ```
- [x] **Source maps** dropped from native builds (`out/` 42 MB → 18 MB;
  ```
  `NATIVE_SOURCEMAPS=1` keeps them).
  ```
- [ ] **Owner, on real phones:** save and share an image on iOS (Photos
  ```
  prompt) and Android; the bars and safe areas on an updated Android
  phone (WebView 140+); haptics on 12 points.
  ```



### Phase 4: store preparation (2 to 3 days plus review)

The owner's account setup was written up on 2026-10-10. Each owner step
produces a value the code work needs (in brackets).

**Owner: Apple Developer portal**

- [x] Team ID `524WC6G2D9`. The Phase 0 free team was upgraded in place
  ```
  (Xcode lists it as Individual, not free), so `DEVELOPMENT_TEAM` in the
  Xcode project is already right.
  ```
- [x] App ID `app.douzepoints`: Xcode registered it on 2026-10-09 as
  ```
  "XC app douzepoints" in this same team, which is why creating it again
  says "not available". Edit that identifier instead: enable Sign in with
  Apple (primary App ID) and Associated Domains.
  ```
- [x] Sign in with Apple key (2026-10-10). The `.p8` stays outside the repos
  ```
  until the backend code exists, then goes into the backend env with
  the Key ID. Used to redeem authorization codes and to revoke tokens on
  account deletion.
  ```
- [x] Services ID `app.douzepoints.web` for sign-in on the website: domains
  ```
  `douzepoints.app` and `api.douzepoints.app`, return URL
  `https://api.douzepoints.app/auth/apple/callback`.
  ```

**Owner: App Store Connect**

- [x] Pending agreements; Digital Services Act trader status (EU).
- [x] App record: name, bundle ID `app.douzepoints`, SKU, primary language.
  ```
  Creating it reserves the name.
  ```
- [x] TestFlight internal testing group.
- [ ] Before submission: free, without China mainland; category; age rating
  ```
  (user-generated content: yes); privacy labels; screenshots (6.9"
  iPhone and 13" iPad, since `TARGETED_DEVICE_FAMILY` includes iPad);
  support, privacy policy URLs; review notes.
  ```

**Owner: Google Play Console**

- [x] Create the app (free), 2026-10-10. Play App Signing key fingerprints
  ```
  noted (SHA-1 in a Google Cloud Android client; SHA-256 for
  `assetlinks.json`).
  ```
- [x] Upload keystore `~/keys/douzepoints-upload.jks` (alias `upload`),
  ```
  backed up; passwords go in a gitignored file.
  ```
- [ ] First AAB to internal testing.
- [ ] Before production: store listing, app content (privacy policy, app
  ```
  access, ads, content rating, target audience 13+, data safety).
  ```

**Owner: other**

- [x] Contact address: the owner's existing address (already public on the
  ```
  website), decided 2026-10-10. Changing it later is a listing edit.
  ```
- [ ] Review the rewritten privacy policy and the new terms of use
  (`/privacy`, `/terms`, written 2026-10-10). The privacy policy names the
  API host only as "our cloud hosting provider"; name it if you prefer.
- [ ] Check `/admin/reports` every day once the apps are live (there are no
  notifications yet).

**Code**

- [x] Sign in with Apple (2026-10-10): iOS (`apple: true`, entitlement),
  ```
  backend token verification and code redemption, the website through
  the Services ID. Android keeps Google only until email sign-in lands.
  Revoking the Apple tokens landed with account deletion (2026-10-10).
  ```
- [ ] **Owner:** set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
  ```
  and `APPLE_CALLBACK_URL` on the production backend and deploy; rename
  the Services ID's description (Apple's web sheet shows it as the app
  name); then try both flows (website, and an iPhone run from Xcode).
  ```
- [ ] Release signing: paid team in Xcode, Android `keystore.properties`.
- [x] In-app account deletion (5.1.1(v)), 2026-10-10: Edit profile →
  Delete account → `DELETE /account`. Deletes the content, uploads, social
  data and sessions and revokes Apple tokens.
- [x] Block users (1.2), 2026-10-10: from a profile's "…" or with "Also
  block" when reporting. Hidden both ways in community lists, search and
  profiles. Managed in Edit profile → Blocked users.
- [x] Reports for themes, contests, designs, fonts and users (1.2),
  2026-10-10, plus the admin queue at `/admin/reports` (dismiss, remove
  the content, delete the creator's account).
- [x] Hide the Patreon card in the apps (3.1.1), 2026-10-10.
- [x] Privacy policy rewritten and terms of use added (`/terms`),
  2026-10-10. The apps open both on the website, and the line under the
  sign-in buttons is where users agree to the terms. (Umami is already
  off in the apps: `build:native` blanks `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.)
- [ ] **Owner:** deploy the backend branch `feat/app-store-readiness` (new
  collections `blocks`; new fields on reports and profiles; no
  migration) before the website and app builds that use it.
- [x] Universal links and Android App Links (2026-10-10): only share links
  (`?profile=`, `?contest=`, `?theme=`, `?design=`) open the app.
  `public/.well-known/` files, the Associated Domains entitlement, an
  `autoVerify` filter that matches the query on Android 15+ and nothing on
  older Android (where the sign-in redirect would open the app too). The
  launch link and later links both arrive as `appUrlOpen`. Verified on
  Android 14 and 15 emulators; iOS untested until the website serves the
  Apple file. Details: [../native-apps.md](../native-apps.md) §12.
- [ ] **Owner:** deploy the website, then check
  `https://douzepoints.app/.well-known/apple-app-site-association` (JSON,
  no redirect) and Google's
  [statement list tester](https://developers.google.com/digital-asset-links/tools/generator),
  and try a share link from Messages / Notes on an iPhone (a build signed
  after Associated Domains was enabled) and on an Android 15+ phone with a
  Play build (internal testing). `assetlinks.json` lists the Play App
  Signing key only; add the upload key's SHA-256 if release builds are
  ever installed outside Play.
- [ ] Drafts of the privacy labels, the Data safety form and the review
  ```
  notes.
  ```
- [x] Live updates (2026-10-10): `@capgo/capacitor-updater` 8.52 in manual
  ```
  mode with Capgo's cloud and stats off, `yarn live-update publish`
  (build, zip, encrypt and sign, upload to R2 with wrangler), bundles
  filed per native runtime fingerprint, switch on the next launch,
  rollback of bundles that never confirm, signing key pair made.
  `ios/App/App/PrivacyInfo.xcprivacy` added with the required-reason
  APIs of the plugins that ship none. Details:
  [../native-apps.md](../native-apps.md) §11.
  ```
- [ ] **Owner:** back up `~/keys/douzepoints-live-update.pem` (losing it
  ```
  blocks live updates until a store release with a new key);
  `npx wrangler login` once. First publish after the first store
  release, then `yarn live-update status`; try one update on a real
  iPhone and Android phone.
  ```



## Later: email sign-in (not scheduled)

Decided 2026-10-09 to add email sign-in after the launch, not before. Not a
priority. On 2026-10-10 the owner chose email + password with an emailed
confirmation code, on every platform (website, iOS, Android). Notes from
the research on 2026-10-09:

- **Codes, not links.** Confirm the address (and reset a password, if there
are passwords) with a 6-digit emailed code. A link would need universal
links / app links to land in the app. Consider dropping passwords
entirely (email, then a code, then signed in): no hashing, reset flow or
password guessing, and the address is verified by construction. Refresh
tokens last 30 days, so sign-ins and emails are rare.
- **Backend:** `passwordHash` (if passwords; `bcryptjs` is already a
dependency) and `emailVerifiedAt` on `Profile`; endpoints for register /
login / verify / resend (+ forgot / reset); tokens issued exactly like
`/auth/google/native` (body for the apps) and the Google callback (cookie
for the web). Add `@nestjs/throttler` against guessing and against signup
spam burning the email quota. Estimate: 1.5 to 2.5 days.
- **Frontend:** an email form beside Google in the sign-in UI, the code
step, errors, strings in every locale; the app path reuses the Keychain /
Keystore storage. Estimate: 1.5 to 2 days.
- **Account linking (security):** `findOrCreateFromGoogle` links by email.
Never link a Google sign-in to an account whose email is not verified,
or someone who registered the address first keeps a password into the
owner's account. Registering an address that already has a Google
account should point to Google sign-in (or set a password through the
code flow).
- **Email provider:** Resend (free: 3,000 a month, 100 a day). Fallback:
Brevo (free: 300 a day). Cloudflare Email Service has no free tier
(needs Workers Paid). Domain setup is SPF / DKIM / DMARC records in
Cloudflare DNS. Check the free tiers again when starting.
- **Apple 4.8:** email sign-in does not replace Sign in with Apple while
Google sign-in is offered, because it does not let users hide their
address.



## Decisions (2026-10-10)

- App ID `app.douzepoints` on both platforms (permanent after the first
upload).
- Live updates at launch: self-hosted Capgo updater, bundles served from R2.
- Sign in with Apple on iOS and the website (otherwise an account made on an
iPhone with "Hide My Email" can't be reached on the website). Not on
Android.
- iPad kept (needs iPad screenshots).
- Native sign-in plugin: Capgo social-login (installed in Phase 2).
