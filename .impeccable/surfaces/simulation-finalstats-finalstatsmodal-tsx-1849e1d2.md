---
version: 1
slug: "simulation-finalstats-finalstatsmodal-tsx-1849e1d2"
primary_target: "src/components/simulation/finalStats/FinalStatsModal.tsx"
related_targets: ["src/components/simulation/finalStats"]
---

# Final stats modal: Votes tab (voting graphic)

Mode: Operate, with one authored motion moment. Audience: fans replaying or hosting contests, many on phones (web + Capacitor apps). Job: after a stage, see who gave a country its points (or whom it gave points), country by country, and explore by clicking flags. Constraints: a fourth tab beside Summary / Split / Breakdown, stage picked by the modal's stage control; every colour from theme tokens; 9 languages; reduced motion; low-end Android; no artist/song data exists. Owner answers (2026-11-24): Sweep entrance, touch = card then Open, Share keeps the tables in v1, tab named "Votes". Reference: eurovisionworld.com voting graphics (`.scratch/animations/`), not to be copied.

## Direction contract

THESIS: One country in the middle, every vote it got (or gave) as a flag on a ring around it, sized by the points, with a spoke to the middle. The graphic is explored by clicking flags, not read as a table. Refuses the broadcast's red/blue pills, eight decorative arrows and a name printed over a flag.

OWN-WORLD: The stats modal's flat --p-950 surface; the graph in a dark well (black 24%, hairline, 14px) like the share picture slot. Flags are circles with a hairline ring; numbers in the theme's scoreboard font, white over the flag with a legibility shadow. Jury pill near-white with --p-950 ink, televote pill the accent with accent-ink, always jury counter-clockwise of televote. Spokes white 7-30% by points, the pointed one in the accent; the middle flag ringed in the accent. Controls are the simulation's segmented well, icon buttons and surface buttons, sentence case.

STORY: The fan sees at once who gave the country the most (biggest at 12 o'clock, clockwise down to the least), reads jury and televote from the pills and the legend, points at a flag for its card (tap on touch, then Open), clicks it to make it the middle, flips Received / Given, picks any entry or voting-only country from the Countries board, replays the entrance, goes full screen.

FIRST VIEWPORT: Under the modal's controls row, the well fills the tab. Top band inside it: the middle country's name (20px 800) over "Winner, 516 points" and the legend pills on the left, Received / Given on the right (band stacks when it doesn't fit). The ring fills the middle: an ellipse fitted to the free area, the middle flag about a fifth of the short side with its total. Bottom toolbar: Countries on the left; Jury and televote toggle, Replay and Full screen on the right. Opens on the stage's winner, Received. Signature interaction: clicking a flag glides it to the middle while the old middle shrinks back onto the ring and shared flags slide to their new places, then the sweep.

FORM: Extension of the established stats modal surface, no roll. seed: none (pinned) "displaying all the voting countries that awarded points to the selected country, or displaying all the participants the selected country awarded points"

MOTION: Sweep: flags land as small dots, then grow to size one after another clockwise from 12 o'clock while the middle's total counts up with each arrival and its spoke draws in; pills pop last (about 1.5 s). Changes: numbers and pills out (180 ms), glide (550 ms, power3.inOut), sweep (about 0.9 s). Reduced motion: a 200 ms crossfade, no movement, no count-up.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
