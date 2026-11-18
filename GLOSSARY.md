# DouzePoints

A Eurovision-style scoreboard simulator: people set up a contest, run its
stages and watch the votes come in. This glossary covers the frontend and
the backend.

## Simulation controls

**Keyboard shortcut**:
A key or key combination that runs a simulation action (Random, Undo, open
Setup…). Each action has a default, and people can change it or turn
shortcuts off in settings.
_Avoid_: hotkey, keybinding, accelerator

**Shortcut hint**:
The small gray text on a button, menu row or tooltip that names the button's
keyboard shortcut. Only shown on the website with a mouse or trackpad.
_Avoid_: key label, keycap, badge

## Final reveal

**Final reveal**:
The Grand Final moment when every country but one has its televote, and the
scoreboard gives way to a head-to-head between the leader and the last
country, ending in the winner.
_Avoid_: final televote reveal panel, winner reveal, showdown

**Reveal style**:
How the final reveal is drawn: **Ladder** (the last country climbs a column
of places towards the leader) or **Bar** (the last country's points fill a
bar towards the leader's mark). Ladder is the default.
_Avoid_: gauge, reveal variant, reveal mode

**Leader**:
The country first on the scoreboard among those that already have their
televote, when the final reveal starts.
_Avoid_: current winner, top country

**Last country**:
The one country still waiting for its televote when the final reveal starts.
_Avoid_: challenger, remaining country, pending country

**Points to win**:
The fewest televote points that would put the last country first,
counting a tie as won or lost the same way the scoreboard breaks ties.
_Avoid_: points needed, gap, target

**Place**:
A country's position on the scoreboard, 1 being first. The numbers on the
ladder are places.
_Avoid_: rank, position, standing

## Themes

**Background image**:
The still picture behind the app for a theme. Every theme has one; when the
theme also has a background video, the image is that video's still and
stands in for it wherever the video doesn't play.
_Avoid_: wallpaper, backdrop, poster

**Background video**:
An optional silent, looping video a custom theme can play behind the
simulation instead of showing its background image. It plays only while the
simulation is on screen.
_Avoid_: animated background, video wallpaper, live background

**Background music**:
The looping audio a custom theme can play while the simulation runs.
_Avoid_: background sound, simulation background
