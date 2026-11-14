---
version: 1
slug: "src-components-simulation-simulation-tsx"
primary_target: "src/components/simulation/Simulation.tsx"
related_targets: ["src/components/controlsPanel","src/components/presentationPanel","src/components/board"]
---

# Simulation view (board + voting chrome)

Mode: Operate. Audience: fans replaying or hosting contests, 60% on phones (web + Capacitor apps). Job: run a vote (tap a country, enter televote, random/auto present), watch the board, act on results. Constraints: board rows and the theme's jury points strip are untouchable components; every colour from theme tokens; 9 languages; reduced motion; low-end Android. New layout ships behind a dev toggle (`?simLayout=column`) until the owner approves it. Approved states: `.impeccable/mocks/sim-column-states.html`.

## Direction contract

THESIS: Where the broadcast shows the spokesperson, the app shows the voter and their controls. Refuses the old stacked control panels under the board and the generic bottom dock.

OWN-WORLD: The active theme's tokens only (p-950/900 flat surfaces, hairlines, one accent fill for Present/Vote/Continue), Gotham-or-theme UI font in sentence case. The voter window is a full-bleed flag with a flat caption bar (name uppercase 800, ordinal 600 at 72% ink) and a 3px accent progress line. Board rows and VotingPointsInfo render exactly as the theme draws them.

STORY: The fan always sees who votes, how far the vote is ("17th of 37 countries"), and the value they give next; tapping a country shows the result without scrolling; random actions name their scope ("7 points", "Germany", "All juries"); Present turns the screen into a clean broadcast for recording.

FIRST VIEWPORT: Desktop ≥1024: header row (host logo, stage title + contest caption, minimal-view icon, labelled Setup, ⋯ menu). Below, the board takes the left area (two columns scaled with the screen but with air around it: never past 1.25× the chrome's zoom, a semi's rows as big as a final's) and a 320-440px column on the right: the voter window is the flag's own 3:2 at the column's width (down to 2:1 when held), then hint, theme points strip, "At random" group, free space, Present CTA + options gear pinned at the bottom (Pause + speed there while presenting). The column is as tall as the board while it fits the screen; past that it takes the screen's height and stays put while the board scrolls. Same side inset on both sides: the logo lines up with the board. Phones: compact header (title, Setup icon, ⋯), two-column board only when every name fits at the theme's size (else one column that scrolls; names never shrink), a bottom sheet whose peek shows flag, name, ordinal, Random and the points strip (or the televote field). Signature interaction: when the voter changes, only the window's flag and caption change in place (crossfade), nothing else moves. Minimal view: column and header buttons go, the title centres, board centres wider, a floating stripe holds voter and the controls (one size in every round; presenting only swaps Present for Pause and empties the hand controls' places), the progress as a hairline on its top edge. A presentation runs in either view; the minimal view is one switch that Present and Pause never touch. The final televote reveal keeps the controls until the last points are given, then gets the stage: the controls step aside while the bar runs (no spoiler) and return after it with "View scoreboard". Relayouts snap; new stages make every row rise in (nothing slides between stages). Pick qualifiers mode (option A of `.impeccable/mocks/sim-pick-qualifiers.html`): the board is the line-up (qualified rows dim in place), the window shows the latest qualifier (split screen: the candidates as tiles; the end: the qualifiers' flags), the column lists the numbered places.

FORM: Spokesperson column, position 1 of 7 on the ordered list (dealt 3rd, chosen by the user). seed:4a4d32461c1c590e

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
