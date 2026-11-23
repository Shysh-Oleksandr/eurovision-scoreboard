---
name: write-updates-entry
description: Write the What's new (updates list) entry for today, or a given date, in src/components/feedbackInfo/data.ts from the changes made since the last entry. Use when the owner asks to write down, log or announce their improvements in the updates list, What's new, or changelog.
---

# Write the updates list entry

The updates list is `WEBSITE_UPDATES` in `src/components/feedbackInfo/data.ts`, shown in Feedback → What's new on the website and in the apps. Its newest entry also lights the feedback button's dot and, in the apps, shows the one-time What's new toast (`LATEST_UPDATE_KEY` = date + title, `announcedUpdate.ts`).

Paths are relative to the frontend package, `eurovision-scoreboard/`. The skill is also linked into the monorepo root's `.claude/skills/`, so in a session started at the root, run commands from `eurovision-scoreboard/`. The backend is the sibling `douze-points-backend/` (its own git repo).

## 1. Find the window

- Read the top of `WEBSITE_UPDATES`: the newest entry's date and items. Anything listed there is already announced: never repeat it.
- The window runs from that entry's date to today (or the date the owner named). If an entry for the target date already exists, even as a `'<list></list>'` placeholder the owner left, fill or extend that entry instead of adding a second one.

## 2. Collect what changed

Work is often left uncommitted for days, and parallel sessions share the trees, so look at all of these in both repos:

- `git log --since=<last entry date> --format='%h %ad %s' --date=short` (frontend and backend).
- `git status --short` and `git diff --stat` / `git diff --cached --stat`: new files and folders usually name the feature.
- `git diff [--cached] messages/en.json` (plus the same for commits in the window): new and changed UI strings are the best map of what a user will see, and give the exact labels to quote.
- For settings, `src/components/settings/general/model/settingsModel.tsx`: which category a new setting lives in. Name it the way the UI does, from `messages/en.json` (for example `settings.general2.effects` = "Effects & motion").
- The auto-memory notes (`MEMORY.md` index and the files it points to) dated in the window: they say what each feature is, when it was built, the owner's decisions, and what's held back (a store build, a parked branch, a backend deploy). Use them to date work and to word it, but check against the code.

Something built before the last entry but not mentioned in it, or finished in the window, belongs in this entry.

## 3. Decide what goes in

- User-facing changes only. Leave out docs, tests, scripts, dev pages (`/dev/*`), refactors, admin, CI, store listings.
- Small fixes and polish fold into a closing "Bug fixes & small improvements" item; don't list them one by one.
- Features hidden behind a flag, parked on a branch or waiting for a store build: leave them out, or word them for where they really work (e.g. "to the iPhone and iPad app" when Android waits for a store build). Say which in your reply.
- Biggest and most visible first (new animations, themes, redesigns, features), then settings and smaller features, then the bug fixes item.

## 4. Write it

Format, matching the recent entries:

```ts
  {
    date: 'YYYY-MM-DD',
    title:
      '<list><item>…</item><item>…</item><item>Bug fixes & small improvements</item></list>',
  },
```

- A single change can be a plain string without `<list>` (e.g. `'Added the ESC 2027 lineup'`).
- `RichText` renders only `<list>`, `<item>` and `<strong>`. No other tags, no Markdown.
- One sentence or two short ones per item, sentence case, no trailing full stop. Lead with what the user gets ("Added …", "Redesigned …", "Choose …"), not how it's built. Point to where to find a new setting ("Find them in Settings → Effects & motion").
- English only (the list isn't translated). Use typographic apostrophes (`’`) like the messages, straight double quotes for UI labels ("With video"), British spelling as in the UI ("colours"). Never U+00A0 (the 2026 theme's font draws it 25em wide).
- The title is part of `LATEST_UPDATE_KEY`: editing the newest entry after it has shipped shows the dot and the apps' toast again. Fine before release, worth a mention after.

## 5. Check and report

- `npx prettier --check src/components/feedbackInfo/data.ts` and `npx eslint src/components/feedbackInfo/data.ts`. A cSpell note on British spellings is fine.
- Don't touch `OLD_WHATS_NEW`. If an `UPCOMING_FEATURES` item has now shipped, suggest removing it rather than removing it yourself.
- Reply with the items as written, then the calls you made: what you left out or reworded and why, and anything credited to a different day.
- End with the live-update line from `CLAUDE.md` ("Releasing to the apps"): the entry ships in the native bundle with the features it announces, so pick the mode for those features, and name what must happen first (backend deploy, commit). Never run `yarn live-update publish` or `store` yourself.
