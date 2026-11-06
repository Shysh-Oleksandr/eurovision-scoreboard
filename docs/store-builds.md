# Store builds

The iOS and Android store builds, uploads and listings, with fastlane
(`fastlane/Fastfile`, run as `yarn fastlane …`), and the same steps by hand
at the end. Why the steps are in this order (signing, native runtimes, live
updates): [native-apps.md](native-apps.md) §2 and §11. Store forms and
review notes: [store-submission.md](store-submission.md).

## Once

- `android/keystore.properties` is filled in (template:
  `android/keystore.properties.example`). To check the password, run
  `keytool -list -keystore ~/keys/douzepoints-upload.jks` and type it: it
  must list `upload, …, PrivateKeyEntry`.
- `.env` has `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` and
  `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- Xcode → Settings → Accounts shows your Apple ID with team `524WC6G2D9`.
  fastlane signs like Product → Archive does: automatic signing with that
  account.
- fastlane needs a Homebrew Ruby (`brew install ruby`; macOS's own 2.6 is
  too old). `yarn fastlane --version` installs the gems into
  `vendor/bundle` (gitignored) from `Gemfile.lock`.
- Store credentials: run `scripts/fastlane-credentials.sh`. It walks
  through an App Store Connect API key (App Manager) and a Google Play
  service account, moves both key files into `~/keys`, writes
  `fastlane/.env` (gitignored; template `fastlane/.env.example`) and runs
  `yarn fastlane check`. Never commit a key: the repository is public.

## Release with fastlane

```bash
cd eurovision-scoreboard
yarn fastlane release version:1.2
```

1. Checks the tree is clean.
2. Picks the next build numbers: one above the highest in TestFlight and
   in any Play track. Writes them and the version into
   `ios/App/App.xcodeproj/project.pbxproj` and `android/app/build.gradle`
   and commits "Release 1.2 (iOS build N, Android M)". Version numbers are
   not part of the native runtime.
3. `prepare`: `yarn cap:sync`, puts `next-env.d.ts` back, and stops if the
   sync changed anything (files under `ios/` or `android/` are part of the
   native runtime: commit them and run it again).
4. Archives the iOS app and uploads it to TestFlight, then builds the
   Android bundle and uploads it to internal testing.
5. Tags the commit `app-<version>-ios<N>-android<M>` and pushes the tag
   (`push:false` skips the push). To send a live update to this binary
   after native files have changed, publish from this tag plus the fix.

Then:

- Wait for the "completed processing" email (10 to 30 minutes), add the
  build to the internal TestFlight group, and install it with TestFlight.
  The Android build is on internal testing straight away.
- Screenshots and listing texts, if they changed (below).
- Submit: `yarn fastlane ios submit` sends the processed build of the
  project's version for review (`auto_release:true` releases it once
  approved; the default waits for you). `yarn fastlane android promote`
  moves the internal build to production, which Google reviews
  (`rollout:0.2` starts a staged rollout at 20%).

One platform at a time: `yarn fastlane ios beta` (archive → TestFlight)
and `yarn fastlane android internal` (bundle → internal testing). Both take
`version:` and `build:`, write the numbers into the project files without
committing, and skip `prepare`, so run `yarn fastlane prepare` first.
`yarn fastlane ios build` / `android build` only build, without uploading
(the `.ipa` lands in `fastlane/build/`, the `.aab` in
`android/app/build/outputs/bundle/release/`).

## Listings and screenshots

- **Once:** `yarn fastlane ios pull_metadata` and `yarn fastlane android
  pull_metadata` download the current listings into
  `fastlane/metadata/ios/<locale>/` and `fastlane/metadata/android/<locale>/`.
  Commit the texts (Play's downloaded images stay gitignored).
- **Texts:** edit the files, then `yarn fastlane ios metadata` /
  `yarn fastlane android metadata`.
- **What's new:** every update after the first version needs it in every
  language. iOS: `fastlane/metadata/ios/<locale>/release_notes.txt`,
  uploaded by `ios metadata`. Play: `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`,
  uploaded with the bundle by `release` and `android internal` (and kept
  when `promote` moves it to production). The trademark rules for the name,
  subtitle and keywords are in [store-submission.md](store-submission.md) §4.
- **Screenshots:** `yarn store-screenshots`
  ([store-submission.md](store-submission.md) §6), then `yarn fastlane ios
  screenshots` and `yarn fastlane android screenshots`. Each replaces that
  language's screenshots in every slot: iPhone 6.9″ and iPad 13″, Play phone
  and both tablet sizes (the same 16:9 files).
- **Languages:** both lanes upload every language whose listing has a
  description in `fastlane/metadata` (`description.txt` for iOS,
  `full_description.txt` for Android), or only `locales:en,fr` (app locale
  codes; `gr` is Greek). A store won't show screenshots for a language its
  listing lacks, so a new language needs its texts first. App locales map
  to store locales in `STORE_LOCALES` (Fastfile).
- **App Store:** texts and screenshots belong to a version. They go to the
  version in the iOS project (`version:1.2` to pick another); fastlane
  creates it in App Store Connect if it isn't there yet. Once a version is
  approved, its listing only changes with the next version. **Play:**
  listings change any time (Google reviews them again).

## By hand

### 1. Prepare (both platforms)

```bash
cd eurovision-scoreboard
git status                   # commit everything first
yarn cap:sync                # note the "[live-update] … runtimes ios …, android …" line
git checkout next-env.d.ts   # the build flips it
git status                   # commit anything else that changed
```

- Files that changed under `ios/` or `android/` belong in that commit:
  they are part of the native runtime.
- From now until both uploads are done, don't edit anything under `ios/`,
  `android/` or `capacitor.config.ts` (Xcode edits to `Info.plist` count).
  A live update only reaches a binary built from the same native files.

### 2. iOS

1. `yarn cap:open:ios`
2. App target → General → raise **Build** (every upload) and **Version**
   (every App Store release).
3. Destination at the top of the window: **Any iOS Device (arm64)**.
4. **Product → Archive.** If macOS asks whether `codesign` may use a key,
   choose Always Allow.
5. In the Organizer that opens: **Distribute App → App Store Connect →
   Distribute.**
6. Wait for the "completed processing" email (10 to 30 minutes). App Store
   Connect → TestFlight → add the build to the internal group, then install
   it with the TestFlight app.

### 3. Android

1. In `android/app/build.gradle`, raise `versionCode` (+1 for every upload)
   and `versionName`.
2. Build:

   ```bash
   cd android && ./gradlew bundleRelease
   ```

   The bundle is `android/app/build/outputs/bundle/release/app-release.aab`.
3. Play Console → DouzePoints → Test and release → Testing → **Internal
   testing** → Create new release → upload the `.aab` → Next → Save and
   publish.
4. Testers tab: add your Google account to an email list, open the opt-in
   link on your phone and install the app from Play.

The first `.aab` uploaded made `~/keys/douzepoints-upload.jks` the app's
upload key: every later upload must be signed with it.

### 4. Tag the commit

```bash
git tag app-1.2-ios3-android2   # app-<version>-ios<build>-android<versionCode>
git push origin app-1.2-ios3-android2
```

`yarn live-update status` shows the runtimes of the current tree.

### 5. Submit for review

Before the first submission: the forms in
[store-submission.md](store-submission.md), and the backend and website
deployed with account deletion, email sign-in and `/terms`.

- **iOS:** App Store Connect → the app → the version → Build → pick the
  TestFlight build → Add for Review → Submit.
- **Android:** Test and release → Production → Create new release → Add
  from library → the same bundle → send it for review.

## Later updates

- **Web-only change:** `yarn live-update publish` from a clean commit
  ([native-apps.md](native-apps.md) §11). The first time, run
  `npx wrangler login`. Add `--mode prompt` to ask users to restart, or
  `--mode required` when an old bundle would break.
- **Native change** (a plugin or its version, `capacitor.config.ts`,
  `Info.plist`, entitlements, `AndroidManifest.xml`, Swift or Java code,
  icons, the app name): a new store build, `yarn fastlane release
  version:<next>`. Once it is live in the store, nudge older binaries with
  `yarn live-update store <ios|android> --recommended <version>`, or block
  them with `--required <version>` if they can't keep working
  ([native-apps.md](native-apps.md) §11, Update levels and the store gate).
