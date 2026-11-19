# Offline mode

Built 2026-11-08 for the native apps; the same code runs on the website.
Without a connection the app keeps doing everything that doesn't need the
API (simulations, setup, built-in contests and themes, settings, graphics
drafts and export, the applied custom theme and loaded contest) and says so
in place of everything that does. Nothing blocks the screen.

## 1. Connectivity (`src/state/connectivityStore.ts`)

`status` is one of:

- `offline`: the device has no network. The apps ask `@capacitor/network`
  (native path monitor); the website, `yarn dev:native` in a browser and a
  binary without the plugin use `navigator.onLine` and the window's
  `online`/`offline` events.
- `unreachable`: the device is online but the API doesn't answer (Wi-Fi
  without internet, the API down). A failed request triggers a probe
  (`HEAD API_BASE_URL`, `no-cors`, any answer counts, 8 s timeout); only a
  failed probe sets it. Probes repeat after 5, 10, 20, 40, then every 60 s,
  and on returning to the app. Any answered request clears it.
- `online`.

`useIsOffline()` / `isOffline()` are true for both non-online states.
`onReconnect(listener)` fires when the status turns `online`.
`startConnectivityMonitor()` runs once from AppBootstrap; before it the
store says `online`, so nothing rendered from it can mismatch hydration.

React Query's `onlineManager` follows the store (`src/api/queryClient.ts`),
not the window events (unreliable in the WebViews, and it assumes online at
launch). Queries pause while offline and refetch on reconnect.

## 2. Requests (`src/api/client.ts`)

- A request that gets no answer (no connection, timeout, DNS, CORS, a
  connection lost mid-body) throws `NetworkError`: an `ApiError` with status
  0, as XHR failures always were, whose `response.data.message` is the
  translated `offline.requestFailed` (set by AppBootstrap via
  `setNetworkErrorMessage`). Existing error toasts that show
  `error.response.data.message` therefore say "Couldn't reach DouzePoints"
  without handling it themselves. Test with `isNetworkError(error)`.
- Timeouts: 20 s for GET, 60 s for writes (contest snapshots on a slow
  link); uploads (XHR) have none.
- While the store knows the app is offline, requests fail at once instead
  of waiting out a timeout (`NetworkReporter.isKnownOffline`).
- Mutations use `networkMode: 'always'`: the default would pause them while
  offline (a spinner) and fire them whenever the connection came back.

## 3. Session (`src/state/useAuthStore.ts`)

- Only a server's answer ends a session. A network error during
  `refresh()` / `fetchMe()` keeps the persisted `user` and sets
  `sessionStatus: 'unverified'` (not persisted). AppBootstrap runs
  `handlePostLogin()` again on reconnect and on returning to the app while
  unverified.
- A rejection (`endSession()`) signs out and drops the account's cached
  queries, again once the saved copy has been restored (`§5`).
- `refresh()` shares one in-flight request between callers: the native
  refresh token rotates, so two refreshes with the same token could end
  the session.
- Native `logout()` is all or nothing: offline it throws before touching
  the stored token. The profile disables Edit profile and Account (which
  holds Log out) offline ("Needs a connection").

## 4. UI

- **Strip** (`src/components/offline/OfflineStrip.tsx`): pinned over the
  status bar, "You're offline. Simulations still work." / "Can't reach
  DouzePoints. …", a shorter form when the sentence doesn't fit
  (`useFitStep`), "Back online" for 2 s on reconnect. It sets
  `--offline-strip-h` (28px while shown, animated through `@property`);
  `.safe-area-padding`, `Modal` `fullScreenOnPhone`, the graphics editor and
  top toasts add it to their top inset. **A new full-screen surface that
  pads with `--safe-top` must add `var(--offline-strip-h, 0px)` too.**
- **Lists**: `useQueryView(query)` (`src/hooks/useQueryView.ts`) →
  `loading | offline | error | ready`; render `QueryNotice`
  (`src/components/offline/OfflineNotice.tsx`) for anything but `ready`.
  Cached data always wins (`ready` offline too). Count headers ("Found N
  …") only show with data.
- **Sign-in**: `SignInButtons` renders `OfflineNotice` ("You can sign in
  once you're back online") offline, which covers every sign-in prompt.
- **Disabled offline**: Edit profile, Account (Log out, sign-in methods,
  blocked users, deletion), follow, theme and contest
  like / save / edit, contest Load (needs the snapshot), sign-in method
  changes, theme and contest Save in their editors. Anything else that
  needs the API fails fast with the translated toast.
- **Library counts**: no skeleton offline; names alone, or the saved
  counts (`§5`).
- Strings live in the `offline` namespace, which is a shell namespace
  (`SHELL_NAMESPACES`): the strip can render before the full catalog.

## 5. Offline copy of the account's lists

`src/api/persistedQueries.ts` + `src/api/queryPersistence.ts` (lazy,
`@tanstack/react-query-persist-client`) keep the account's own lists in
IndexedDB (`DouzePoints` / `appAssets` / key `queryCache`): profile summary,
custom entries and groups, theme and contest groups, quick-select lists, and
the first page of yours/saved themes, yours/saved contests and your fonts
(no search, no group filter). Not: preferences (`§6` decides those),
per-item state, public content.

- Saved 1 s after cache changes, restored at launch, dropped after 14 days
  unused, when `VERSION` is bumped (do it when a persisted response changes
  shape) or when the launch account differs (the buster includes the
  persisted user's id).
- **`gcTime` must stay under 2^31 - 1 ms (24.8 days).** A longer timer
  fires at once, and React Query then garbage-collects every restored query
  no screen is showing (`persistedQueries.test.ts` guards this).
- The persisted lists get `refetchOnMount: true` (the app default is
  `false`), so a list restored from disk refreshes when it mounts online.
- Offline, "Yours" lists show a caption ("Offline: this is the copy saved
  on this device"). Applying a theme falls back to the copy on screen or in
  the cache (`useApplyCustomTheme`); the account's active theme isn't
  updated then.
- To keep another list offline, add its key prefix to
  `PERSISTED_PREFIXES`.

## 6. Preferences changed offline (`SyncUserPreferences`)

A change made while offline (before the account's preferences arrived) or
a save that got no answer sets `dp:prefs-unsynced` in localStorage. The next
hydrate then pushes this device's state instead of applying the account's
older copy; a reconnect re-sends it. Signing out clears the flag.

## 7. Custom entries

Line-ups store entry codes; names and flags of the user's own custom entries
came only from the server list. `customCountries` is now persisted
(`countries-storage`), and `SyncCustomEntries` replaces it only when the list
loaded or the user is signed out.

## 8. Testing

- Unit: `connectivityStore.test.ts`, `authOffline.test.ts`,
  `client.test.ts`, `useQueryView.test.ts`, `persistedQueries.test.ts`,
  `SyncCustomEntries.test.tsx`.
- Browser: `yarn dev:native` + chrome-devtools. Seed `auth-store` (a user)
  and `capacitor-storage_refresh-token` in localStorage. With no backend on
  `NEXT_PUBLIC_API_URL` the app is `unreachable`; network emulation
  "Offline" gives `offline`. For the full cycle (back online, restore, saved
  copy) run a stand-in API on :8001 that answers `/auth/refresh`,
  `/auth/me` and the lists with the app origin's CORS headers, then stop it
  and reload.
- Devices: Android emulator airplane mode; the iOS simulator uses the
  Mac's network, so use Network Link Conditioner (100% loss; "Very bad
  network" for the hanging case) or turn off Wi-Fi.

## 9. Not covered

Queuing writes made offline, browsing public content offline, loading a
saved contest whose snapshot was never fetched, and caching remote images,
fonts and audio (custom flags, theme backgrounds, uploaded fonts) beyond the
WebView's HTTP cache.
