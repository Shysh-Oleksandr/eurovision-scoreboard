# Sign-in methods

One account can sign in with up to three methods: Google, Apple and email
codes, at most one of each (added 2026-11-06). Signed-in users see and
change them in Edit profile → Sign-in methods, on the website and in both
apps. Accounts are never merged: a method that already opens another
account is refused.

Before this, accounts were only joined by address: an email code opened a
Google or Apple account with that address, and Google and Apple matched an
existing account by a verified address ([email-sign-in.md](email-sign-in.md)
§2). That still holds. What it missed: Sign in with Apple's Hide My Email
(the relay address matches nothing), different addresses per provider, and
any way to see what opens the account.

The backend side lives in the private `douze-points-backend` repo:
`src/auth/sign-in-methods.{service,controller}.ts`,
`src/auth/link-intent.service.ts`, `src/auth/google-callback.guard.ts`, the
web flows in `AuthController`, and `ProfilesService.linkGoogleId` /
`linkAppleId` / `setEmail` / `removeSignInMethod`.

## 1. Model

| Profile field | Method | Notes |
|---|---|---|
| `googleId` | Google | `googleEmail`: the Google account's verified address, shown to the owner only |
| `appleId` | Apple | `appleEmail` (may be a relay address); `appleRefreshToken` + `appleTokenClientId` for revocation |
| `email` | Email codes | The address codes go to. Also what Google and Apple sign-ins fall back to |

- `googleId`, `appleId` and `email` have unique sparse indexes, so each
  identity belongs to one account. Never set one to `null` (the index would
  count it as a value): removal `$unset`s it.
- **Sign-in order** is unchanged: Google and Apple match by their ID, then
  by a verified address. A match by address now also stores the ID on that
  profile when it has none (never replacing one), so the account survives
  the Google account changing its address.
- `googleEmail` / `appleEmail` are refreshed on every sign-in. Profiles made
  before 2026-11-06 get them on their next sign-in; until then the row says
  "Connected" with no address.

## 2. Rules

- **Proof in the same step.** Connecting needs a signed-in session and a
  fresh proof of the new method: a verified Google ID token or Apple
  identity token, or an email code.
- **`in_use` (409).** The method already signs in to another account, by
  its ID or by its address (another profile's `email` is the provider's
  verified address, so a sign-in with it opens that account). The way out
  is in the error message: sign in with it, delete that account (in-app
  deletion), then connect it here.
- **`already_connected` (409).** A different Google account (or Apple ID) is
  connected. Remove it first. Connecting the same one again is a no-op that
  refreshes its address.
- **Adopting an address.** Connecting Google or Apple to an account without
  an `email` also stores the provider's address as `email`, so a later email
  code to it opens this account instead of creating a second one.
- **Email** is added or changed (Change replaces the address codes go to).
  `start` answers as sign-in's does whether or not another account has the
  address; `in_use` only comes after the code proves the inbox.
- **Removal** is refused with `last_method` (400) for the only method, in a
  single conditional update, so two removals at once can't leave an account
  nobody can open. Removing Apple revokes its tokens (best effort, as on
  account deletion) and clears them.
- **Removing a provider that shares the address.** A Google account (or
  Apple ID) whose address is the account's `email` keeps opening the
  account through that address, and the next sign-in connects it again.
  This is the common case (every account made with Google has its Gmail as
  `email`). The confirmation says so (`removeSharedEmailDescription`); to
  stop it, change the email too.

## 3. API

All need the access token (`JwtAuthGuard`); each change answers with the
updated list.

| Route | Body | Use |
|---|---|---|
| `GET /auth/methods` | | `{ google: {email?} \| null, apple: {email?, hiddenEmail} \| null, email: {address, hiddenEmail} \| null }` |
| `POST /auth/methods/google` | `idToken` | Apps: the Google sheet's ID token |
| `POST /auth/methods/apple` | `identityToken`, `authorizationCode?` | iOS: the Apple sheet's token; the code is redeemed for the revocation token |
| `POST /auth/methods/email/start` | `email`, `locale?` | Same email, limits and answers as `/auth/email/start` |
| `POST /auth/methods/email/verify` | `email`, `code` | Adds or changes the address |
| `POST /auth/methods/link` | `provider` | Website: sets the link cookie (§4) |
| `DELETE /auth/methods/:method` | | `google`, `apple` or `email` |

Error bodies carry `code`: `in_use`, `already_connected`, `last_method`,
`not_connected`, plus the email codes of
[email-sign-in.md](email-sign-in.md) §1. The frontend maps them in
`src/api/signInMethods.ts` (`parseSignInMethodError`, `errorKey`) and
`parseEmailSignInError` (`in_use` → `inUse`).

## 4. Website: redirect connects

Google and Apple sign in on the website with full-page redirects, which
can't carry the access token. So:

1. `connectProvider()` posts `POST /auth/methods/link {provider}`. The
   response sets `link_intent`: a JWT (user ID, provider, random nonce, 10
   minutes) signed with a key derived from `JWT_SECRET`, so it never passes
   as an access token. httpOnly, path `/auth`, SameSite=None in production
   (Apple posts its callback cross-site), Lax on a localhost backend.
2. The browser opens `GET /auth/google/link` or `GET /auth/apple/link`.
   Without a valid link cookie for that provider they land on
   `?link=<provider>&result=expired`.
   - Google: Passport with `state` = the cookie's nonce and
     `prompt=select_account` (the browser's current Google account is often
     the one that already opens the account).
   - Apple: the usual state + nonce cookie (`apple_oauth`) gets a third
     part, `.link`.
3. The callbacks (the same registered URLs as sign-in, so nothing changes in
   Google Cloud or the Apple portal) see a connect by the Google `state` or
   the Apple mark, require the link cookie (and, for Google, state = its
   nonce), connect, clear the cookie and land on
   `?link=<provider>&result=ok|cancelled|in_use|already_connected|expired|error`.
   The session doesn't change.
4. `AppBootstrap` strips the params, restores the session and toasts the
   result, but only when `dp:pending-web-link` (set in step 1, 30 minutes)
   says this browser started the connect: browsers keep the landing URL in
   history, as with `?provider=`.

**Never decide "connect" from the refresh cookie alone.** A forged callback
opened in a victim's browser would then attach the attacker's Google
account to the victim's profile, and the attacker could sign in to it. The
link cookie can only come from a signed-in `POST` (an access token in a
header, which a cross-site page can't send).

`GoogleCallbackGuard` replaced the plain `AuthGuard('google')` on the
callback: it never throws, so a cancelled consent screen returns to the
site (a sign-in used to land on a JSON 401 page) and other failures land on
`?provider=google&error=1`, which the site already handles.

## 5. Apps

`connectProvider()` shows the platform's sheet and posts its token to
`/auth/methods/google` or `/auth/methods/apple`. It signs out of the Google
SDK first so the sheet offers an account choice instead of reusing the
remembered one. Dismissing a sheet resolves to null (no toast). The Android
app has no Sign in with Apple, so the Apple row only shows there when an
Apple ID is already connected (so it can be removed).

## 6. UI

- `SignInMethodsSection` (in `EditProfileModal`, above Account): one row per
  method with its address or "Not connected", and Connect, Add / Change and
  Remove. Remove is hidden for the last method and asks for confirmation
  (`useConfirmation`, key `remove-sign-in-method`).
- **Fit steps** (`useFitStep`, `.dp-signin-list` in `styles.css`): the
  actions sit beside each method while every address fits uncut, otherwise
  they move under the text for the whole list.
- **Email** opens the shared email dialog in `link` mode (`openEmailLink()`,
  `emailSignInStore.mode`): "Add an email address" / "Change your email
  address", Confirm instead of Sign in, its own resume entry
  (`email-link-pending`, separate from sign-in's). After a change,
  `fetchMe()` updates `user.email`.
- **Query:** `queryKeys.user.signInMethods()`, cleared on logout with the
  other user queries; every change writes the answer into it.
- Strings: `widgets.profile.signInMethods.*`, `widgets.profile.emailSignIn`
  `linkTitle` / `changeTitle` / `linkEmailBody` / `changeEmailBody` /
  `confirm` / `linkSuccess` and `errors.inUse`, in all 9 languages.

## 7. Testing

- Unit tests: backend `sign-in-methods.service.spec.ts`,
  `auth.controller.spec.ts` (Google callback: sign-in, cancel, connect,
  forged state), `apple-auth.spec.ts` (website connect),
  `auth.service.spec.ts` (Google sign-in linking by address); frontend
  `src/api/signInMethods.test.ts`.
- Verified 2026-11-06 against a throwaway backend and MongoDB: 39 scripted
  checks (email change with real codes, `in_use`, `last_method`, parallel
  removals, `$unset` vs the sparse indexes, the link cookie and its use as a
  bearer token, both redirects with state / prompt / mark, forged states,
  cancels), and the UI in headless Chrome at 320, 390, 720 and 1280px in
  English, German and Ukrainian.
- The UI run went through the apps' code path: the owner's dev server was
  `yarn dev:native` with a LAN API host (`192.168.x.x:8001`), so the session
  came from the secure-storage plugin's web fallback (localStorage key
  `capacitor-storage_refresh-token`, a JSON string). Rewrite every host the
  dev server may use for the API, not just localhost.
- Not yet: a real Google or Apple connect (website redirect and native
  sheets). They need the deployed backend, and a device for the apps.

## 8. Not done

- Merging two accounts. Content lives in many collections (contests,
  themes, entries, designs, fonts, follows, blocks, reports) and usernames
  clash. A cheap step if users ask: let a connect take over an identity from
  an account with nothing saved.
- An email to the account's address when a method is added or removed.
- Asking for a fresh sign-in before connecting or removing (a stolen
  session can attach its own method).
- The plain Google sign-in sends no OAuth `state`, so a forged callback can
  sign a browser in to the attacker's account (login CSRF). Connects aren't
  affected (§4).
- A way to stop a removed provider that shares the address from connecting
  again (§2).
