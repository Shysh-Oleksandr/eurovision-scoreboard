# Live reload on real iPhone / Android devices

Cheat sheet. The background (why it works this way, Xcode 27, cleanup) is in
[native-apps.md](native-apps.md) §2–3.

The app shell loads the Next dev server instead of the bundled export, so
edits show up on the phone without rebuilding. Rebuild only after native
changes (plugins, `capacitor.config.ts`, Info.plist, manifest).

## One-time device setup

- **iPhone:** Xcode → Settings → Accounts → Apple ID; App target → Signing &
  Capabilities → your team. On the phone: Developer Mode on, trust the
  developer (General → VPN & Device Management). Free-signed builds expire
  after 7 days.
- **Android:** Developer options → USB debugging on, plug in, accept the RSA
  prompt. `adb devices` should list it as `device`.

## Android (USB) — no network setup needed

`adb reverse` tunnels the phone's ports 3000 and 8001 to the Mac, so
`localhost` works as on the web.

```bash
# terminal 1 — douze-points-backend/
npm run start:dev

# terminal 2 — eurovision-scoreboard/
yarn dev:native

# terminal 3 — eurovision-scoreboard/
yarn cap:dev android          # pick the phone; or add --target <id>
```

## iPhone — same Wi-Fi as the Mac

The phone reaches the Mac by its LAN IP. Get it with
`ipconfig getifaddr en0` (below: `<ip>`).

1. Backend: `douze-points-backend/.env` → append `http://<ip>:3000` to
   `FRONTEND_URL` (after the localhost entry; there is already a
   `192.168.1.83` entry, update it if the IP changed). Then:

   ```bash
   # douze-points-backend/
   npm run start:dev
   ```

2. Frontend, pointing the API at the Mac's IP:

   ```bash
   # eurovision-scoreboard/
   NEXT_PUBLIC_API_URL=http://<ip>:8001 yarn dev:native
   ```

3. Native shell:

   ```bash
   # eurovision-scoreboard/
   yarn cap:dev ios --lan
   ```

   Xcode opens: pick the iPhone, press Run (Cmd+R). Accept the "Local
   Network" prompt on the phone.

The same `--lan` setup works for an Android phone without USB
(`yarn cap:dev android --lan`).

## When you're done

- Ctrl+C the `cap:dev` terminal. It restores the native config, but the
  installed app still points at the dev server until it is rebuilt:
  iOS → press Run in Xcode once more; Android → `yarn cap:android`.
- If the terminal was closed instead of Ctrl+C: `yarn cap:sync`.

## Notes

- `yarn dev:native` runs the app's code paths (client-side locale, native
  sign-in). Plain `yarn dev` runs the website's code inside the app.
- Dev mode still has a server (`/api/*` works). Check anything that depends
  on the static export (missing routes, SPA fallback) in a `yarn cap:sync`
  build.
- Debugging: Safari → Develop → *iPhone* → `localhost`; Chrome →
  `chrome://inspect` for Android.
