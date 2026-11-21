---
version: 1
slug: "section-user-profile-userprofilemodal-tsx-d91e653c"
primary_target: "src/components/setup/widgets-section/user-profile/UserProfileModal.tsx"
related_targets: ["src/components/setup/widgets-section/profile/ProfileModal.tsx","src/components/setup/widgets-section/profile/FollowingFeedSection.tsx","src/components/setup/widgets-section/user-profile"]
---

# Profile modals (your profile, another fan's profile)

Scope: `ProfileModal` (Your profile + Following feed, signed-out prompt) and `UserProfileModal` (another fan), with their lists (`UserContentSection`, `FollowingFeedSection`) and the shared list toolbar pieces (`ContentTypeBadges`, `WidgetSortBadges`, `WidgetPager`), which the Themes, Contests and Graphics libraries use too. Mode: Operate. Platform: adaptive (website + Capacitor apps).

Audience and job: a fan looks at a creator (or at themselves): who they are, how many follow them, and their public themes, contests and designs, to apply, load, like, save or remix one; on their own profile they also reach Edit profile, Account, and what the people they follow published.

Constraints from the owner (2026-11-21): functionality stays the same, only more convenient; theme, contest and design cards keep their UI (designs may pair two per row); the toolbar changes everywhere it's shared; sort and date are used often, so they stay visible (as two selects); the Themes/Contests modals may be redesigned in parallel by another session, so shared components keep their props and library files aren't edited.

Chosen direction: Identity column (picked 2026-11-21 over "Today's layout, fixed" and "Identity band, pinned toolbar").

Open decisions: none. Built and reviewed 2026-11-21 (finish review: ship); `menuitemradio` for CaptionSelect once AnchoredMenu is free; device and signed-out checks pending.

## Direction contract

THESIS: Who it is stays beside what they made. From 1024px the person sits in a column on the left, like the simulation's spokesperson column, and the list gets the whole height. Refuses the stacked gradient header card over four rows of chips that pushes the content below the fold.

OWN-WORLD: The Green Room's tokens only (DESIGN.md): flat `--p-950` column with a hairline, 16px radius; surface buttons, one accent CTA (Follow); the simulation's segmented well for the type switch and for the own profile's two views on phones; selects with their name as a caption inside; sentence case, plain numbers, 13px body at 72% white.

STORY: The visitor sees the person (avatar, name, heart flag, @username, joined date, followers and public items), follows or shares in one tap, then scans or narrows the list without scrolling past filters.

FIRST VIEWPORT: Desktop modal about 1040px wide. Left: 290px column, 88px avatar, 22px name with the heart flag, @username, joined date, a hairline-framed stats row (followers opens the list, public items), Follow (46px CTA) then Share profile and Entry leaderboard as full-width surface buttons; ⋯ in the column's corner. Own profile: Edit profile, Account, Share profile. Frame (owner, 2026-11-21): the libraries' header with "Profile", the two views (Your profile, Following feed) as tabs beside it and ×, no Close bar; phones put the views in a bottom bar. Right: type switch + search, then Sort by and Created selects with the count on the right, then the list. Phones: the column becomes a band on top that scrolls away.

FORM: Identity column, position 3 on the ordered list (dealt by the roll; lead was position 6). seed:62459a79bbdf0082

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
