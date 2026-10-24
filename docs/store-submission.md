# Store submission: privacy forms, ratings and review notes

Answers for the App Store Connect and Google Play Console forms, drafted
2026-10-23 from the privacy policy (`src/views/PrivacyPolicy.tsx`) and the
code. The store forms are edited in the consoles and never change with a
live update, so when the apps start collecting something new (a new upload
type, analytics, a new sign-in provider), update the privacy policy, this
document and both forms together. How the builds are made:
[native-apps.md](native-apps.md) §2.

## 1. What the apps collect

The facts every answer below rests on:

- **No account needed.** Settings, the current simulation, presets and
  drafts stay on the device until the user signs in and saves something.
- **Account data.** Google: account ID, name, email, profile picture.
  Apple: user ID, email (possibly a relay address), the name on the first
  sign-in, and Apple's refresh token (kept only to revoke it on deletion).
  Email: the address. Every account: a generated username, plus the display
  name, country and profile picture the user sets.
- **Content saved to the account.** Contests (setup, results, name,
  description, logo), custom themes with uploaded images, sounds and fonts,
  designs with uploaded images, the font library, custom entries and their
  flags, folders, quick-select pins, synced preferences.
- **Activity.** Follows, likes, saves, remix origins, reports (reason and
  note), blocks.
- **Technical.** Session records (hashed token, user agent, IP address);
  sign-in rate limits per IP address and hashed email for up to a day.
  Error reports (message, stack, platform, user agent, language, screen
  size, live-update bundle, settings and scoreboard state) are **not linked
  to the user**: `POST /errors` has no auth guard, so the backend never sets
  their `userId`.
- **Not collected.** Analytics (`build:native` blanks the Umami ID), ads or
  advertising IDs, location, contacts, purchases, search queries (profile
  search isn't stored). Feedback goes through a `mailto:` link. The
  live-update plugin's device ID never leaves the device.
- **No sharing or tracking.** Cloudflare, MongoDB Atlas and the API host
  process data on our behalf (service providers, which both stores exclude
  from "sharing"); Google and Apple only provide sign-in.

## 2. App Store Connect: App Privacy

- Do you or your partners collect data from this app? **Yes.**
- Used to track users: **No**, for every data type.
- Privacy Policy URL: `https://douzepoints.app/privacy`. User Privacy
  Choices URL (optional): `https://douzepoints.app/privacy#delete-account`.

| Category | Data type | Linked to the user | Purpose | What it covers |
|---|---|---|---|---|
| Contact Info | Name | Yes | App Functionality | Google / Apple name, display name |
| Contact Info | Email Address | Yes | App Functionality | Sign-in, account linking |
| User Content | Photos or Videos | Yes | App Functionality | Profile pictures, theme backgrounds, design images, contest logos, flags |
| User Content | Audio Data | Yes | App Functionality | Theme sounds users upload |
| User Content | Other User Content | Yes | App Functionality | Contests, themes, designs, fonts, custom entries, report notes |
| Identifiers | User ID | Yes | App Functionality | Account ID, Google and Apple IDs |
| Usage Data | Product Interaction | Yes | App Functionality | Likes, saves, follows, blocks |
| Diagnostics | Crash Data | No | App Functionality | Error reports |
| Diagnostics | Other Diagnostic Data | No | App Functionality | Device details and app state in error reports |
| Other Data | Other Data Types | Yes | App Functionality | IP address and user agent on sessions and sign-in rate limits |

Apple's App Functionality purpose includes preventing fraud, security
measures and minimizing crashes, so nothing here is Analytics. The label
then reads: Data Linked to You (Contact Info, User Content, Identifiers,
Usage Data, Other Data), Data Not Linked to You (Diagnostics).

## 3. Google Play: Data safety

- Does your app collect or share any of the required user data types?
  **Yes.**
- Is all of the user data collected by your app encrypted in transit?
  **Yes** (HTTPS only).
- Account creation: **OAuth** (Google) and email with a one-time code (the
  closest option, such as "Username and other authentication").
- Delete account URL: `https://douzepoints.app/privacy#delete-account`
  (section 6 of the policy lists the in-app steps and the email fallback).
- Can users request deletion of some data without deleting the account?
  **Yes**: they can delete any contest, theme, design, font or entry, and
  undo likes, saves and follows.
- **Shared: nothing.** Collected: as below. None of it is processed
  ephemerally.

| Data type | Required or optional | Purposes | What it covers |
|---|---|---|---|
| Personal info → Name | Optional | App functionality, Account management | Google / Apple name, display name |
| Personal info → Email address | Optional | App functionality, Account management | Sign-in codes, account linking |
| Personal info → User IDs | Optional | App functionality, Account management | Account ID, Google and Apple IDs |
| Photos and videos → Photos | Optional | App functionality | Uploaded images |
| Audio → Other audio files | Optional | App functionality | Theme sounds |
| Files and docs | Optional | App functionality | Uploaded fonts |
| App activity → App interactions | Optional | App functionality | Likes, saves, follows |
| App activity → Other user-generated content | Optional | App functionality | Contests, themes, designs, custom entries, report notes |
| App activity → Other actions | Optional | Fraud prevention, security, and compliance | Reports, blocks |
| App info and performance → Crash logs | Required | Analytics | Error reports |
| App info and performance → Diagnostics | Required | Analytics | Device details and app state in error reports |
| Device or other IDs | Optional | Fraud prevention, security, and compliance; Account management | IP address on sessions and sign-in rate limits |

"Optional" because all of it needs an account, which the simulator doesn't.
Error reports are sent without asking, hence "Required". Play's Analytics
purpose is the one that names diagnosing bugs and crashes. Play's FAQ says
to declare IP addresses according to their use; they aren't used for
location, and Device or other IDs is the nearest type.

## 4. Ratings and other content forms

**App Store age rating.** The questionnaire gained social media questions
in July 2026 (required for submissions since September 2026). A social
media capability is "the ability to redistribute, amplify, or interact with
user-generated content through a social feed or similar discovery method";
Explore, Public Contests and Public Themes, with likes, saves, remixes and
follows, are that. Answers:

- User-generated content: **Yes.** Social media capabilities: **Yes**
  (reportedly a 13+ floor and a Social Media descriptor; the terms say 13+
  anyway).
- Messaging or chat: **No** (no comments, no direct messages).
- Unrestricted web access: **No** (legal pages open in the browser).
- Violence, mature themes, gambling, contests with prizes, medical,
  alcohol and the rest: **None.** Made for Kids: **No.**
- If the result comes out below 13+, raise it to 13+ to match the terms.

**App Store, other fields.** Price free; availability without China
mainland (no ICP filing); category Entertainment (secondary: Music);
copyright line; support URL `https://douzepoints.app/about` (Apple wants
contact details at the support URL, and the home page only has them inside
the Feedback modal); screenshots for the
6.9″ iPhone and the 13″ iPad (§6).

**Google Play.**

- Content rating questionnaire: users can share content with each other,
  **Yes**; shares the user's location, **No**; digital purchases, **No**;
  no violence, sexual content, gambling or drugs.
- Target audience: **13–15, 16–17 and 18+**. Picking an under-13 group
  puts the app under the Families policy.
- Ads: **No.** Government, financial, health and news app: **No.**
- App access: **All or some functionality is restricted** → the demo
  account (§5).
- Category Entertainment; the 512 px icon is
  `assets/store/play-store-icon-512.png`; phone and tablet screenshots in
  §6. The 1024×500 feature graphic is still to be made.

**Trademarks (both stores).** Keep "Eurovision" out of the app name, the
App Store subtitle and keyword field, and the start of Play's short
description: App Store guideline 2.3.7 bans trademarked terms there, and
Play's metadata policy is similar. The descriptions may mention it
descriptively, with "Unofficial fan project, not affiliated with or
endorsed by the EBU". The apps bundle official contest logos
(`public/hostingCountryLogos/<Country><Year>.svg`) and themes modelled on
broadcast graphics, so a guideline 5.2.1 (intellectual property) question
from review is possible; see the not-affiliated line in the review notes.
The screenshots (§6) show the 2026 theme and host logo anyway (owner's
decision, 2026-10-24: the themes imitate the broadcasts, they don't copy
them); if review objects, retake them with a custom theme.

## 5. Review notes and demo account

**Demo account.** Email sign-in with a fixed code
([email-sign-in.md](email-sign-in.md) §6): set `EMAIL_REVIEW_ADDRESS` and
a 6-digit `EMAIL_REVIEW_CODE` on the backend and leave them set. Play wants
App access credentials "accessible at all times" and can review the app
again whenever it likes, and Apple reviews every update. The backend takes
one pair, so both stores get the same address and code and their reviewers
share one account; if one of them deletes it, the next sign-in creates it
again. No email is sent for that address. Never commit the pair; this
repository is public. If it leaks, change the code on the backend and in
both consoles.

- App Store Connect → App Review Information → Sign-in required: user name
  = the review address, password = the code.
- Play Console → App access → instructions: name "Demo account", the
  address and the code in the two fields, and under "Any other
  information": *Tap Sign in at the top of Event Setup, then Continue with
  email. Enter the address, then the code. No email is sent for this
  address. The simulator itself works without signing in.*

**App Store review notes.** The numbered sections answer what Apple's
"Guideline 2.1 - Information Needed" request asks for (purpose, steps to
the main features, external services, regional differences, regulated
industries, a screen recording from a physical device), so review doesn't
stop to ask. Paste into App Review Information → Notes (4,000 characters;
this is about 2,900), and attach the recording in the same section; without
one, drop section 8.

**Screen recording.** On an iPhone, with the build being submitted (from
TestFlight), Control Center's Screen Recording with the microphone off, and
Do Not Disturb on. Two to three minutes, trimmed in Photos, following the
notes' order:

1. Start on the Home Screen and tap the app icon, which shows a real device.
2. Event Setup: pick 2026 in the contest dropdown, tap Start.
3. Give one jury's points by hand, then let presentation mode play the rest
   of the jury, the televote and the winner.
4. Share → the share sheet → Save Image (the photo library prompt appears
   the first time).
5. Sign in → Continue with email → the review address and code.
6. Themes → Public Themes → an item's "…" → Report: show the dialog and
   cancel. On a creator's profile, "…" → Report user and Block user, and
   cancel those too; real reports and blocks would reach the queue and the
   shared review account.
7. Edit Profile → the profile picture → Take Photo: the camera prompt shows,
   then cancel.
8. Edit Profile → Account → Delete account → confirm. Last, because it ends
   the session; the next sign-in creates the account again.

```text
DouzePoints is an unofficial, fan-made simulator of Eurovision-style song contest scoreboards. It is not affiliated with or endorsed by the European Broadcasting Union (EBU).

1. PURPOSE
Song contest fans use DouzePoints to replay or invent a contest's vote: pick a year's lineup or build their own, reveal the jury and televote points one by one, and share the results as images. The contests are simulations: there is no real voting, no prizes and no money involved.

2. ACCESS AND MAIN FEATURES
No account is needed for the main feature. The Event Setup screen opens at launch.
* Pick a contest year in the dropdown at the top, then tap Start.
* Step through the jury and televote reveals until the winner is shown.
* Share (top bar) makes an image of the scoreboard.

3. OPTIONAL SIGN-IN AND DEMO ACCOUNT
Signing in saves contests, themes and designs to an account and lets users publish them.
* Tap Sign in at the top of Event Setup and choose Apple, Google or email.
* Demo account: choose "Continue with email", enter the user name from the sign-in information, then the password as the 6-digit code. No email is sent for this address. Sign in with Apple also works with any Apple ID.
* Account deletion: tap the profile button at the top of Event Setup → Edit Profile → Account → Delete account.

4. USER-GENERATED CONTENT AND MODERATION
Users' public content appears under Themes → Public Themes, Contests → Public Contests, Graphics → Explore, and Public fonts in the theme editor's font picker.
* Every item has Report in its "…" menu, and other users' profiles have Report user and Block user in theirs.
* Blocking hides both users' content from each other.
* The Terms of Use, linked under the sign-in buttons, forbid objectionable content.
* Reports go to a moderation queue checked every day, and content or accounts that break the terms are removed within 24 hours.
* Contact: sasha.shysh23@gmail.com

5. EXTERNAL SERVICES
* Our own API server, hosted on Railway behind Cloudflare: accounts, saved and published content, follows, likes, reports and error reports.
* MongoDB Atlas: the API's database.
* Cloudflare R2: uploaded images, sounds and fonts, and the app's signed web-content updates.
* Cloudflare Email Service: sign-in code emails.
* Sign in with Apple and Google Sign-In: authentication.
No analytics, advertising, tracking, payment or AI services are used.

6. REGIONAL DIFFERENCES AND REGULATED CONTENT
The app works the same in every region; only the interface language follows the device (9 languages). It is not in a regulated industry and has no gambling, prizes, health or financial features.

7. DEVICE FEATURES
The system share sheet and Save to Photos for the images the app generates, the photo library or camera (Take Photo) for image uploads, haptics during the vote reveal, and Sign in with Apple. No location, contacts or tracking.

8. SCREEN RECORDING
A screen recording made on an iPhone is attached.
```

The external services are the processors in the privacy policy's
section 4 (which calls Railway "our cloud hosting provider"); change both
together.

On Play, the App access instructions above are what the reviewers read;
the release notes ("What's new") can stay short.

## 6. Screenshots

`yarn store-screenshots` (`scripts/store-screenshots.mjs`) renders them
from the static export, so run `yarn build:native` first (and again after
UI changes). Playwright WebKit renders the iOS sizes and Chromium the
Android ones, in English, into `assets/store/screenshots/<device>/`
(gitignored). Every run plays the same seeded contest: 2026, Grand Final
only, 16 random juries, then one jury by hand with the 12 to the
runner-up. `--device` and `--scene` take comma-separated names; `--url`
uses a running server instead of `out/`.

| Folder | Pixels | Upload to |
|---|---|---|
| `iphone` | 1320×2868 | App Store, iPhone 6.9″; smaller iPhones are scaled from it |
| `ipad` | 2752×2064, landscape | App Store, iPad 13″: required, the app runs on iPad |
| `android-phone` | 1242×2208 (9:16) | Play, phone screenshots |
| `android-tablet` | 2560×1440 (16:9) | Play, 7-inch and 10-inch tablet screenshots (the same files) |

Scenes, in upload order: `01-scoreboard` (a jury vote with the douze
points hearts frozen mid-sweep), `02-winner` (the winner modal with
confetti), `03-setup` (Event Setup).

- A browser has no status bar or home indicator, so the script draws them
  (9:41 on iOS, 12:00 on Android) and passes the devices' safe areas in
  as `--safe-area-inset-*`. The home indicator / gesture handle turns dark
  over light content, as on the devices.
- Apple's spec page also names the 6.1″ "Dynamic Island (medium display)"
  slot as required, filled by scaling down the 6.9″ screenshots. If App
  Store Connect asks for it anyway, add a device with a 402×874 viewport at
  3× (1206×2622).
- Play needs 2 phone screenshots to publish and 4 at 1080 px or more to be
  eligible for its recommendations. Tablet screenshots are optional;
  tablets can install the app either way.
- App Store screenshots belong to a version: once it is approved, they
  only change with the next version's submission. Play's can change any
  time (they are reviewed again).
- The app removes the douze points hearts 3 s after they start
  (`ANIMATION_DURATION`). The script fails if that happens before the
  screenshot; run it again.
- Adding a scene: a step in the script's Scenes section and its name in
  `SCENES`.
