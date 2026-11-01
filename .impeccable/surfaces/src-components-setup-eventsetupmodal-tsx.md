---
version: 1
slug: "src-components-setup-eventsetupmodal-tsx"
primary_target: "src/components/setup/EventSetupModal.tsx"
related_targets: ["src/components/setup/hub","src/components/setup/widgets-section/WidgetsSection.tsx","src/components/setup/widgets-section/contests/ContestCard.tsx"]
---

# Event Setup panel (main menu)

Scope: the Event Setup modal's main view (`EventSetupModal` and the hub header, library row, contest card, lineup, footer). Mode: Operate. Platform: adaptive (web + Capacitor apps).

Audience and job: a fan (13+, very online) picks an edition or their own contest, adjusts the lineup and presses Start. The simulation is where the show happens and looks playful yet professional; this panel is its quiet prelude.

Constraints from the owner (2026-10-25): keep the structure, every control, flow and behaviour; no new features; keep the heart flags; colours come from the selected theme (built-in and user-made); usable at 390px and 1440px; no new font or dependency without asking; copy changes listed separately for review; build behind a dev-only toggle to compare with the current look.

Chosen direction: Board Preview (decided 2026-10-25 over Scorecard Notes and "Today's look, fixed"; the ticket-wallet idea was shelved as too structural).

Open decisions: adopt or drop after the toggle comparison; final wording of the new copy in all 9 locales.

## Direction contract

THESIS: The setup panel previews the board it is about to start. Lineup tiles take the theme's own scoreboard look and everything around them goes quiet. Refuses the uniform tinted-card hub: same gradient, hairline and shadow on every box, and the icon-tile feature-card row.

OWN-WORLD: Theme tokens only. Flat surfaces (the modal gradient, stages on one --p-900 fill, one hairline, no inset highlights or drop shadows). Stage tiles are the theme's jury-state board row in miniature: scoreboard font slot, the theme's name case, jury row colours, the jury points box as the trailing menu cap, row shape from the theme (pill when rounded, near-square otherwise), heart flags always. Pool, draw and not-qualified tiles stay quiet setup tiles. Stage numbers are the board's jury place badges. Chrome stays in the interface font.

STORY: The fan sees their lineup already looking like their board, adjusts it, and starts the show.

FIRST VIEWPORT: Header with the two pickers (caption inside the control, no caps label above), account and settings cluster on the right. One slim library row of three equal buttons with counts. The contest card: 40px host heart, the contest name at 22-24px, one plain summary line, toolbar on the right. Semi-Final 1 with board-row tiles. Sticky footer with Start.

SIGNATURE: a country that lands in a stage slides in like a row joining the board (about 0.4s, staggered for bulk moves, off under reduced motion).

FORM: Board Preview, position 1 on the ordered list (picked over the roll's assigned position 4). seed:e1c3d120566295f8

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
