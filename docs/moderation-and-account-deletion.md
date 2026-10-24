# Moderation, blocking and account deletion

Added 2026-10-10 for the App Store and Google Play submissions. App Store
guideline 1.2 asks apps with user-generated content for a way to report
content, a way to block abusive users, terms that forbid objectionable
content, and action on reports within 24 hours. Guideline 5.1.1(v) asks for
account deletion inside the app. This document covers both repos: the
frontend paths are relative to `eurovision-scoreboard/`, the backend paths
to `douze-points-backend/`.

## 1. Reports

Users can report themes, contests, designs, fonts and profiles.

- **Opening the dialog.** Any component calls
  `openReportDialog({ type, id, name, creator })`
  (`src/state/reportDialogStore.ts`). One `ReportModal`
  (`src/components/moderation/`) is mounted by `ReportDialogHost` in
  `src/app/providers.tsx`. The host lazy-loads it the first time a report
  is requested, so cards don't own dialog state and the main chunk doesn't
  grow. The modal sits at `z-[1110]`, above the profile modals
  (1100 to 1102).
- **Where Report appears.** The "…" menu of `ThemeListItem`,
  `ContestListItem` and the design cards (`CloudDesignCards.tsx`), the
  byline of the design sheet (`TemplateSheet.tsx`), a "…" next to public
  fonts (`PublicFontsTab.tsx`), and "Report user" in the "…" of another
  user's profile header (`UserModerationMenu`). Report shows to signed-out
  users too. The modal then asks them to sign in, so a reviewer browsing
  without an account still finds it.
- **The dialog.** It has four reasons, an optional note (500 characters)
  and "Also block {creator}" when the item belongs to someone else. The
  server keeps one report per user and target, and a repeat comes back as
  `alreadyReported`. Only design cards show a disabled "Reported" state,
  through `useReportsStateQuery`. Theme and contest cards rely on the
  toast instead of a per-card state query.
- **Backend** (`src/reports`). `POST /reports` checks that the target
  exists and that the reporter can see it. Private contests and private
  fonts can only be reported by their owner. Private themes and designs
  stay reachable by link, so anyone can report them. Every report stores
  `targetOwnerId`. `ReportsService` reads the content models directly
  rather than through the feature services, so the account and moderation
  modules can import it without cycles.

## 2. Moderation queue (admins)

The website page `/admin/reports` (`src/app/admin/reports/page.web.tsx`)
is left out of the apps. It lists open or resolved reports grouped by
target, newest activity first. Each group shows the reasons, the notes,
the reporters, the owner and a link to the item. The actions are:

| Action | Endpoint | Effect |
| --- | --- | --- |
| Dismiss | `POST /moderation/reports/dismiss` | Closes the target's open reports (`resolution: 'dismissed'`). |
| Remove content | `POST /moderation/content/remove` | Deletes the item through its owner's normal delete path, so R2 uploads are released too, then closes its reports (`'removed'`). For a profile, this deletes the account. |
| Delete creator's account | `DELETE /moderation/users/:id` | Removes the user and everything they own (§4). |

Every `/moderation/*` route needs `JwtAuthGuard` and `AdminGuard`
(`Profile.isAdmin`). There are no notifications yet, so someone has to
check the queue every day to meet the 24-hour expectation. Deleting an
account doesn't stop the person from signing in again with the same Google
or Apple ID. A ban list would need a new collection checked by
`AuthService`.

## 3. Blocking

- **Semantics.** A block hides each user's content from the other in both
  directions. It also removes any follow between them (follower counts are
  adjusted) and refuses new follows with a 403. Anonymous viewers are not
  affected.
- **Backend** (`src/blocks`). The routes are `POST` and `DELETE
  /profiles/:id/block` and `GET /profiles/me/blocks` (up to 500 rows, with
  public profile fields only). `BlocksService.hiddenUserIds(viewerId)`
  returns both directions. `excludeUsersFilter()` turns that list into the
  `userId: { $nin }` filter used by:
  - `GET /themes/public`, `/contests/public`, `/designs/public` and
    `/fonts/public`, all with `OptionalJwtAuthGuard`;
  - `GET /profiles/search`;
  - `GET /profiles/:userId/content`, which returns an empty page when a
    block exists in either direction.

  The following feed needs no filter, because blocking removes the follow.
  Items already saved, direct share links and leaderboards are not
  filtered. `BlocksModule` depends only on models (Block, Follow, Profile),
  so every content module can import it.
- **Frontend.** `src/api/blocks.ts` provides `useBlockedUserIds()`, which
  reads the cached block list. After a block or an unblock, the inactive
  `['public']`, `['users']` and `['follows']` queries are removed rather
  than just invalidated. They have to be removed because the query client
  sets `refetchOnMount: false`, so a stale list would never refetch.
  `useBlockActions()` handles the confirmation (`block-user`, never "don't
  show again") and the toasts. Users block from the "…" on a profile
  header, or with "Also block" when reporting. They unblock from the same
  menu, from the blocked-profile panel in `UserProfileModal`, or from Edit
  profile → Blocked users (`BlockedUsersModal`). `FollowButton` hides
  itself for blocked users.

## 4. Account deletion

Users delete their account from Edit profile → Account → Delete account.
The confirmation key is `delete-account`. The app calls
`useAuthStore.deleteAccount()`, which sends `DELETE /account`, clears the
Keychain or Keystore token and Google session in the apps, and runs the
same local cleanup as logout (`clearSignedInState`).

`AccountService.deleteAccount` (`src/account`) runs these steps in order:

1. **Apple.** It revokes the Sign in with Apple token
   (`AppleAuthService.revokeRefreshToken`, which posts to `/auth/revoke`
   with the client the token was issued to, stored in
   `Profile.appleTokenClientId`). Tokens stored before that field existed
   are tried against the bundle ID, then the Services ID. This step is
   best effort.
2. **Content, through each service's `deleteAllForUser`:**
   - themes (uploads, groups, quick-select pins, likes and saves on other
     users' themes with their counts decremented, remix provenance);
   - fonts (blobs are released once no other font references them, and
     `forkedFromUserId` is cleared on forks);
   - contests (snapshots, logos, groups, pins, likes and saves);
   - designs (uploads, likes, saves, duplicate markers, remix provenance);
   - custom entries and their groups (flags no other entry uses).
3. **Social data:** follows in both directions (follower counts are
   adjusted), blocks in both directions, and the reports the user filed
   or that are about them.
4. **Records:** error reports linked to the user, every refresh token and
   a pending email sign-in code ([email-sign-in.md](email-sign-in.md)).
5. **Profile:** the profile and its uploaded avatar, last. If anything
   fails before this step, the account still exists and the user can sign
   in and try again.

Other users' remixes, font forks and loaded copies are theirs and stay.
Their provenance keeps the source name but loses the deleted user's ID.
An access token that was already issued stays valid until it expires
(15 minutes). Routes that read the profile return 404, but a create
request in that window would leave an orphan document.

## 5. Legal pages

`/privacy` (`src/views/PrivacyPolicy.tsx`) and `/terms`
(`src/views/TermsOfUse.tsx`) share `src/views/legal/LegalPage.tsx`. Both are
`page.web.tsx` pages, so they are left out of the apps. The apps link to
`https://douzepoints.app/privacy` and `/terms` through
`PRIVACY_POLICY_URL` and `TERMS_OF_USE_URL` (`src/helpers/shareUrl.ts`),
and those links open in the browser. Universal links only match share
links, so these URLs never reopen the app.

`SignInButtons` shows "By continuing, you agree to the Terms of Use…"
under the buttons. That line is where users agree to the terms, because
signing in creates the account. The Feedback modal links both pages. The
Patreon card is hidden in the apps (App Store guideline 3.1.1).
