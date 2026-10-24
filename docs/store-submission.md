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
copyright line; support URL `https://douzepoints.app`; screenshots for the
6.9″ iPhone and the 13″ iPad.

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
  `assets/store/play-store-icon-512.png`; the 1024×500 feature graphic and
  phone screenshots are still to be made.

**Trademarks (both stores).** Keep "Eurovision" out of the app name, the
App Store subtitle and keyword field, and the start of Play's short
description: App Store guideline 2.3.7 bans trademarked terms there, and
Play's metadata policy is similar. The descriptions may mention it
descriptively, with "Unofficial fan project, not affiliated with or
endorsed by the EBU". The apps bundle official contest logos
(`public/hostingCountryLogos/<Country><Year>.svg`) and themes modelled on
broadcast graphics, so a guideline 5.2.1 (intellectual property) question
from review is possible; keep them out of the first screenshots, and see
the not-affiliated line in the review notes.

## 5. Review notes and demo account

**Demo account.** Email sign-in with a fixed code
([email-sign-in.md](email-sign-in.md) §6): set `EMAIL_REVIEW_ADDRESS` and
a 6-digit `EMAIL_REVIEW_CODE` on the backend before submitting, keep them
while any review is open, and unset them afterwards. No email is sent for
that address. If a reviewer deletes the account, the next sign-in creates
it again. Never commit the pair; this repository is public.

- App Store Connect → App Review Information → Sign-in required: user name
  = the review address, password = the code.
- Play Console → App access → instructions: name "Demo account", the
  address and the code in the two fields, and under "Any other
  information": *Tap Sign in on the Profile card, then Continue with email.
  Enter the address, then the code. No email is sent for this address. The
  simulator itself works without signing in.*

**App Store review notes** (paste, then fill in the contact address):

> DouzePoints is an unofficial, fan-made simulator of Eurovision-style song
> contest scoreboards. It is not affiliated with or endorsed by the
> European Broadcasting Union.
>
> No account is needed for the main feature. The Event Setup screen opens
> at launch: pick a contest year in the dropdown at the top, tap Start,
> then step through the jury and televote reveals until the winner is
> shown.
>
> Signing in is optional. It saves contests, themes and designs to an
> account and lets users publish them. Tap Sign in on the Profile card in
> Event Setup and choose Apple, Google or email. For the demo account,
> choose Continue with email, enter the address from the sign-in fields,
> then the code from the password field; no email is sent for it.
>
> Account deletion: Profile → Edit Profile → Account → Delete account.
>
> User-generated content appears under Public Contests, Public Themes,
> Graphics → Explore and public fonts. Every item has Report in its "…"
> menu, and other users' profiles have Report user and Block in theirs.
> Blocking hides both users' content from each other. The Terms of Use,
> linked under the sign-in buttons, forbid objectionable content. Reports
> go to a moderation queue we check every day, and content or accounts
> that break the terms are removed within 24 hours. Contact: <contact
> address>.
>
> The app uses the system share sheet and Save to Photos for the images it
> generates, haptics during the vote reveal, and Sign in with Apple. It has
> no in-app purchases, ads or tracking.

On Play, the App access instructions above are what the reviewers read;
the release notes ("What's new") can stay short.
