# Store builds

Step by step for the iOS and Android store builds. Why the steps are in
this order (signing, native runtimes, live updates):
[native-apps.md](native-apps.md) §2 and §11. Store forms and review notes:
[store-submission.md](store-submission.md).

## Once

- `android/keystore.properties` is filled in (template:
  `android/keystore.properties.example`). To check the password, run
  `keytool -list -keystore ~/keys/douzepoints-upload.jks` and type it: it
  must list `upload, …, PrivateKeyEntry`.
- `.env` has `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` and
  `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- Xcode → Settings → Accounts shows your Apple ID with team `524WC6G2D9`.

## 1. Prepare (both platforms)

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
- Version numbers are not part of the runtime. The first release is already
  1.0 (build 1) on both platforms; later releases raise them in steps 2
  and 3.

## 2. iOS

1. `yarn cap:open:ios`
2. Later releases only: App target → General → raise **Build** (every
   upload) and **Version** (every App Store release).
3. Destination at the top of the window: **Any iOS Device (arm64)**.
4. **Product → Archive.** If macOS asks whether `codesign` may use a key,
   choose Always Allow.
5. In the Organizer that opens: **Distribute App → App Store Connect →
   Distribute.**
6. Wait for the "completed processing" email (10 to 30 minutes). App Store
   Connect → TestFlight → add the build to the internal group, then install
   it with the TestFlight app.

## 3. Android

1. Later releases only: in `android/app/build.gradle`, raise `versionCode`
   (+1 for every upload) and `versionName`.
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

The first `.aab` you upload makes `~/keys/douzepoints-upload.jks` the app's
upload key: every later upload must be signed with it.

## 4. Tag the commit

```bash
git tag app-1.0-1            # app-<version>-<build>
git push origin app-1.0-1
```

To send a live update to this binary after native files have changed,
publish from this tag plus the fix. `yarn live-update status` shows the
runtimes of the current tree.

## 5. Submit for review

Before submitting: the forms in [store-submission.md](store-submission.md),
and the backend and website deployed with account deletion, email sign-in
and `/terms`.

- **iOS:** App Store Connect → the app → version 1.0 → Build → pick the
  TestFlight build → Add for Review → Submit.
- **Android:** Test and release → Production → Create new release → Add
  from library → the same bundle → send it for review.

## Later updates

- **Web-only change:** `yarn live-update publish` from a clean commit
  ([native-apps.md](native-apps.md) §11). The first time, run
  `npx wrangler login`.
- **Native change** (a plugin or its version, `capacitor.config.ts`,
  `Info.plist`, entitlements, `AndroidManifest.xml`, Swift or Java code,
  icons, the app name): a new store build, from step 1, with raised
  versions.
