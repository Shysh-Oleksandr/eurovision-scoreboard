# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Three groups, none named as dominant:

- **Fans replaying contests.** Song contest fans who replay a real edition's vote or invent their own, usually on their own and for fun, then share the result as an image.
- **Fan contest hosts.** Communities that run their own fictional song contests and use DouzePoints to present the results.
- **Theme and graphic makers.** People who mostly build and publish themes, fonts and graphics for others to use.

The audience is 13 and older, enthusiastic, very online and opinionated. Many dislike AI-generated content and spot generic "AI design" immediately.

## Product Purpose

DouzePoints simulates a song contest's vote from setup to winner. You pick an edition's official lineup (Eurovision 2004–2026, Junior Eurovision 2016–2025 and other series) or build your own, run the semi-finals and the final, reveal jury and televote points one by one, then save, share and compare the results. The contests are simulations: there is no real voting, no prizes and no money involved.

## Positioning

What a neighboring scoreboard simulator can't truthfully claim:

- **The most complete contest model.** Semi-finals and final, the allocation draw, unlimited custom stages, per-stage voting modes and points systems, per-voter jury/televote channels, a vote engine with odds and diaspora, hand-predefined votes and documented tiebreaks.
- **Make it yours.** Custom themes (colors, uploaded fonts, flag shapes, animations, sound), custom entries and a graphics studio.
- **Community and sharing.** Public themes, contests and graphics, with likes, saves, follows and remixing; share links and images; a global leaderboard built from users' public contests.

## Operating Context

- One page does the work: the Event Setup modal opens at launch, then the simulation (board, controls, presentation mode that auto-plays the reveal). There is no persistent navigation; everything else opens as a modal.
- The website (Cloudflare Workers) and the iOS/Android apps (Capacitor static export) share one design language. Native behavior (haptics, back button, safe areas, share sheet) is behavior, not a separate visual style.
- Results leave the app as PNG images (scoreboard, stats, running order, custom graphics) and share links.
- Feature inventory: `docs/general-app-features-overview.md`.

## Capabilities and Constraints

- **The core simulator never requires an account.** Sign-in (Google, Apple, email code) is only for saving, sharing and community features.
- **Nine languages:** English, French, German, Italian, Polish, Ukrainian, Greek, Portuguese and Spanish. Every UI string is translated, and German and Greek copy runs long.
- **Audience is 13+.** User-generated content comes with reports and blocking (`docs/moderation-and-account-deletion.md`).
- **Not decided:** monetization (there are no ads or purchases today), and how the unofficial, not-EBU-affiliated status is presented beyond the store listings.

## Brand Commitments

- **Name:** DouzePoints.
- **Voice:** mostly plain, clear and neutral, with a little fan-made playfulness drawn from Eurovision camp and the drama of the scoreboard. Never at the expense of clarity.

## Evidence on Hand

- Official lineups with artists, songs and flags; hosting-country logos in `public/hostingCountryLogos/`; flags in `public/flags/`.
- App icon variants (heart + mic) in `assets/brand/`; splash screens and store screenshots in `assets/`.
- Real community content in production: public themes, contests and graphics, and the global leaderboard.
- No testimonials, ratings, user counts or press are recorded here. Don't invent them.

## Product Principles

1. **Nothing between a fan and a running contest.** Picking a year and starting needs no account and no setup beyond the defaults.
2. **Depth stays optional.** The contest model is the most complete one around, but every advanced option is opt-in and the simple path stays simple.
3. **What fans make is the content.** Themes, contests, entries and graphics are first-class. Creators get credit, and their work is easy to share and remix.
4. **Clarity first, then camp.** The scoreboard supplies the drama; the interface's job is to be understood, with a light fan's wink.
5. **Hand-made, not generic.** This audience notices generic AI design and AI-generated content, and it costs trust. Nothing should look templated or machine-made.

## Accessibility & Inclusion

- No formal standard (no WCAG target).
- **Reduced motion:** animations are central, so `prefers-reduced-motion` must still give a complete, readable reveal.
- **Low-end phones:** the board and its animations must stay smooth on weak Android devices (`useIsLowPerfDevice`).
- Layouts must survive the longest translation (see Capabilities and Constraints).
