# Email sign-in

Passwordless sign-in with an emailed 6-digit code, on the website and in
both apps, next to Google and Apple (added 2026-10-10). One flow signs in
and signs up: the user types an address, gets a code, types it, and is
signed in; a new address creates the account at that moment. There are no
passwords.

Why codes and no passwords (decided 2026-10-10; most users are children):
nothing to forget or share with friends, no reset flow, one screen instead
of "do I have an account?", and the address is proven before an account
exists, so linking to a Google or Apple profile with the same address is
safe. Codes rather than links: a link would have to open the app (universal
links deliberately skip the sign-in paths, see
[native-apps.md](native-apps.md) §12), fails across devices, and mail
scanners "click" one-time links.

The backend side lives in the private `douze-points-backend` repo
(`src/auth/email-login*.ts`, `src/auth/rate-limit*.ts`, `src/mail/`).

## 1. Flow

**UI.** `SignInButtons` shows "Continue with email" on every platform. It
calls `openEmailSignIn()` (`src/state/emailSignInStore.ts`), and
`EmailSignInHost` (mounted in `src/app/providers.tsx`) lazy-loads
`EmailSignInModal` (`src/components/auth/`) over whatever modal holds the
buttons (`z-[1120]`, above reports at 1110).

1. **Email step.** A plain format check (`looksLikeEmail`), then
   `requestEmailCode()` (`src/api/emailSignIn.ts`) with the UI locale, which
   picks the email's language.
2. **Code step.** One numeric field with `autocomplete="one-time-code"`
   (iOS offers the code from Mail above the keyboard). Six digits submit by
   themselves; spaces and dashes from autofill or paste are dropped. Under
   it: "Send a new code" with the server's 60 s countdown, "Use a different
   email", and a spam-folder hint.
3. **Success** calls `useAuthStore.loginWithEmailCode()`, then the usual
   `handlePostLogin(true)`, a success toast, and closes.

The inputs go `readOnly`, not `disabled`, while a request runs: disabling
drops focus, which closes the phone keyboard after a wrong code. The request
in flight is kept in localStorage (`email-sign-in-pending`, until the code
expires), so reopening the dialog after a reload, or after the app was
killed while the user read their mail, resumes at the code step without
sending another email.

**API.**

| Route | Body | Answer |
|---|---|---|
| `POST /auth/email/start` | `email`, `locale?` | 200 `{ resendAfter: 60, expiresIn: 600 }`, whether or not an account exists |
| `POST /auth/email/verify` | `email`, `code` (6 digits), `locale?`, `native?` | 200; website: `{ accessToken }` + the refresh cookie; apps (`native: true`): `{ accessToken, refreshToken }` like `/auth/google/native` |

`locale` on verify only sets a new account's `preferredLocale`. The apps
store the refresh token in the Keychain / Keystore exactly as after a native
Google sign-in ([native-apps.md](native-apps.md) §7).

**Errors** carry a `code` that `parseEmailSignInError()` maps to a message
(`widgets.profile.emailSignIn.errors.*`):

| `code` | Status | When |
|---|---|---|
| `too_many_requests` | 429 | Any rate limit (§3); `retryAfter` in seconds |
| `undeliverable` | 400 | The provider refuses the address (suppressed after a hard bounce or complaint, or a permanent bounce) |
| `send_failed` | 503 | Any other sending failure, or no email transport configured |
| `invalid_code` | 400 | Wrong code; `attemptsLeft` |
| `too_many_attempts` | 400 | The fifth wrong code; the code is deleted |
| `code_expired` | 400 | No live code: expired, used, killed, or never sent |

A 400 without a `code` is the request validation (a malformed address or
code).

## 2. Accounts

- **Addresses are normalized** (trimmed, lowercased: `normalizeEmail`,
  backend `src/utils/email.ts`) when stored and looked up, for every
  provider. `ProfilesService.findByEmail` is case-insensitive: the exact
  match finds new profiles, and a regex fallback finds profiles saved with
  capitals before 2026-10-10.
- **Linking.** A verified code signs in to any profile with that address,
  including one made with Google or Apple. The reverse already held: Google
  and Apple link by address only when they vouch for it (`email_verified`).
  The website's Google strategy now checks that too; before, it took the
  address unchecked.
- **New profiles** get a random `adjective-noun` username
  (`generateRandomUsername`), never one built from the address: usernames are
  public and children's addresses often contain their real name. Google and
  Apple sign-ups without a name get one too (they used to get the address).
  `preferredLocale` is the app language at sign-up.
- **Hide My Email.** An iPhone user who hid their address with Sign in with
  Apple can type the relay address on Android (no Apple button there) to
  reach the same account, but Apple only forwards mail from senders
  registered for its relay (§5, setup).

## 3. Codes and limits

- `crypto.randomInt`, 6 digits, valid 10 minutes, single use, one live code
  per address (a new one replaces it), 5 guesses. The database
  (`email_login_codes`) holds HMAC-SHA256s keyed with `JWT_SECRET`, never the
  address or the code; rotating `JWT_SECRET` just invalidates pending codes.
- **Limits** (`EMAIL_LOGIN_LIMITS` in `email-login.service.ts`), fixed
  windows in MongoDB (`auth_rate_limits`, TTL-indexed, shared by every
  server instance):

| Limit | Value | Against |
|---|---|---|
| Resend cooldown per address | 60 s | Double taps |
| Codes per address | 5 an hour, 10 a day | Flooding someone's inbox |
| Code requests per IP | 30 an hour | Spraying many addresses |
| Verify calls per IP | 60 an hour | Guessing across addresses |
| Codes in total | `EMAIL_LOGIN_DAILY_LIMIT`, default 1000 a day | Burning the quota and the sender reputation |

  The per-IP limits are generous on purpose: a school or a mobile carrier
  puts many children behind one address.
- **Client IP** is `CF-Connecting-IP` (`clientIp()`), which Cloudflare
  overwrites; `req.ip` comes from `X-Forwarded-For`, which clients can forge.
  The per-address and daily caps don't depend on the IP.

## 4. Sliding sessions

Refresh tokens used to rotate only in their last day, so everyone was signed
out 30 days after signing in. That is one tap with Google but a trip to the
inbox with email, so since 2026-10-10 a token at least a week old (a quarter
of a shorter `REFRESH_TTL_MS`) is replaced by one with a full TTL on its next
refresh: active users stay signed in, 30 days without use signs them out.

The replaced token is marked `replacedAt` and lives 60 s more
(`RefreshTokensService.retire`), so a request that raced the rotation with
the old token (a second tab, a retry) still gets an access token instead of
a 401 that would sign the user out. It is never rotated again, and only one
of two parallel refreshes rotates.

## 5. Sending email

`MailService` (backend `src/mail/`) posts to Cloudflare Email Service's REST
API (`/accounts/{id}/email/sending/send`). Without credentials, a backend
whose `FRONTEND_URL` is on localhost prints each email to its console (that
is how local development gets codes); anywhere else sending fails with
`send_failed` and logs an error. The sender is
`{ address, name }`; the REST docs only show a bare address, so if Cloudflare
rejects the named form the service switches to the bare address for good
and logs a warning.

The email (`buildLoginCodeEmail`, `src/mail/login-code-email.ts`) puts the
code first in the subject so it shows in the notification, has no links or
images (spam filters, school mail filters), and comes in the 9 app languages
(`gr` is written `lang="el"`). Its strings live in the backend, not in
`messages/`.

| Backend env | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account that holds the douzepoints.app zone and the Workers Paid plan |
| `CLOUDFLARE_EMAIL_TOKEN` | An API token with only "Email Sending: Edit" |
| `MAIL_FROM` | Default `login@douzepoints.app`; must be on an onboarded domain |
| `MAIL_FROM_NAME` | Default `DouzePoints`; empty for a bare address |
| `MAIL_REPLY_TO` | Optional, e.g. the contact address |
| `EMAIL_LOGIN_DAILY_LIMIT` | Optional, default 1000 |
| `EMAIL_REVIEW_ADDRESS`, `EMAIL_REVIEW_CODE` | Optional, §6 |

**Owner setup** (once):

1. Cloudflare dashboard → Compute → Email Service → Email Sending → Onboard
   Domain → `douzepoints.app`. It adds the MX, SPF and DKIM records on the
   `cf-bounce` subdomain and a DMARC record; existing `_dmarc` records need a
   look.
2. Create the API token, set the env above on the backend host, deploy.
3. Check the account's daily sending limit (new accounts start low) and ask
   for an increase before the launch if it is below a few hundred.
4. Apple Developer → Services → Sign in with Apple for Email Communication:
   register `douzepoints.app` and the sender address, so codes reach Hide My
   Email addresses. Then send a code to such an address to confirm Apple
   accepts mail sent through Cloudflare (SPF passes on `cf-bounce`).
5. Send codes to a Gmail, an Outlook and an iCloud address and check they
   land in the inbox, the sender name shows, and the subject leads with the
   code.

Pricing (checked 2026-10-10): Email Sending needs Workers Paid, which
includes 3,000 emails a month, then $0.35 per 1,000. It has been in public
beta since 2026-04-16. Swapping providers means one new `MailService`
implementation.

## 6. Review account

App reviewers have no inbox to read. With `EMAIL_REVIEW_ADDRESS` and a
6-digit `EMAIL_REVIEW_CODE` set, `start` sends nothing for that address and
`verify` accepts that code (still under the per-IP limit). Keep both set:
Google Play wants review credentials that work at any time, and Apple
reviews every update ([store-submission.md](store-submission.md) §5). Anyone
who learns the pair can sign in to that one account, which has no special
rights; if it leaks, change the code. Apple's reviewers can also use Sign in
with Apple.

## 7. Testing

- Unit tests: backend `email-login.service.spec.ts` (limits, guessing,
  single use, review account), `mail.service.spec.ts` (Cloudflare request
  and errors), `auth.controller.spec.ts` (transports, rotation),
  `auth.service.spec.ts` (accounts); frontend `src/api/emailSignIn.test.ts`.
- Locally: run the backend without `CLOUDFLARE_*` and read the code from its
  console. Never against the production database: the backend in the native
  apps' testing recipe ([native-apps.md](native-apps.md) §10) works, with
  `FRONTEND_URL` on localhost.
- Verified 2026-10-10 against a throwaway backend and MongoDB: 44 scripted
  checks (both transports, linking to a Google profile and to a mixed-case
  legacy address, guessing, limits, `X-Forwarded-For` spoofing, rotation and
  its grace period, account deletion), and the website UI in Chrome (desktop
  and phone width, Ukrainian). Not yet: real Cloudflare sending, the apps on
  a device, iOS code autofill.

## 8. Not done

- An age question at sign-up. The terms say 13+, nothing checks it.
- Changing the address of an account.
- Passkeys, with email codes as the recovery path.
- An optional password, if users ask for one.
