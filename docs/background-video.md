# Background video

A custom theme can have a **background video**: a silent, looping video that
plays behind the simulation. The theme's **background image** stays and is the
video's still: it shows while the video loads, wherever the video doesn't play,
and in share images and graphics designs. Terms: `GLOSSARY.md` → Themes.

Built-in year themes don't have videos (v1 decision: everyone on the default
theme would download one).

## 1. Data

`Theme` (backend) and `CustomTheme` (frontend) carry `backgroundVideoUrl` and,
for uploads, `backgroundVideoKey` (R2 key under `themes/bg-videos/<userId>/`).
The URL is either our CDN (upload) or any https link.

- `POST /themes/:id/background-video`: multipart `file`. Multer stops at
  15 MB; `ThemesService.uploadBackgroundVideo` identifies the container from
  the bytes (`sniffThemeBgVideo` in `theme-background.constants.ts`): MP4
  brands browsers play, or WebM. QuickTime (`.mov`), plain Matroska and
  HEIF/AVIF are refused. Stored with `Cache-Control: immutable` (fresh key per
  upload); the previous upload is deleted when nothing else references it.
- Create/update take `backgroundVideoUrl` (https only, `''` on update
  removes it). A link replaces an upload; sending back the uploaded video's
  own URL keeps it. `deleteR2ObjectIfUnreferenced` counts
  `backgroundVideoKey` and `backgroundVideoUrl`, so a remix that copied the URL
  keeps the file alive. Theme delete (and account deletion and moderation,
  which go through it) deletes the uploaded video.
- `POST /themes/:id/background` (images) now checks the bytes too: PNG, JPEG
  or WebP up to 2 MB (the client limit is 1.5 MB). SVG is refused.
- Theme lists (`/themes/public`, `/themes/me`, `/themes/me/saved`, a user's
  public themes) take `hasBackgroundVideo=true`, the "With video" filter next
  to "With audio" in Public themes. It matches `backgroundVideoUrl: {$exists:
  true}` (`THEME_HAS_BACKGROUND_VIDEO_FILTER`): the URL is never stored empty,
  so there's no denormalized flag to keep in sync, and a partial index on
  `backgroundVideoUrl` holds only the themes that have one.
- The content fingerprints (backend `theme-fingerprint.ts`, frontend
  `themeFingerprint.ts`) include `backgroundVideo` only when set, so existing
  themes keep their fingerprint.

## 2. Limits (client)

`src/theme/backgroundVideo/backgroundVideoRules.ts`: MP4 or WebM, 15 MB,
60 seconds, 1920 px on the longer side (1080p, portrait included). The server
can't check length or size without decoding, so only the client does. A WebM
without a duration in its header reports `Infinity` and passes.

Links: https only, and links to video pages (YouTube, Drive, Vimeo, TikTok…)
are refused with a hint; they aren't video files.

## 3. The editor

`BackgroundVideoField` sits under the background image in Customize theme →
Look. Picking a file runs `readBackgroundVideo`: it loads the local file in a
detached `<video>` (no CORS involved), checks length and size, seeks to the
first frame and encodes it (WebP, else JPEG under 1.5 MB). The frame becomes
the picked background image, so the still matches the video and there's no
jump when it starts. The person can pick another image afterwards. A file the
browser can't decode is refused as `unplayable`.

On save, the image uploads first, then the video through `api.upload` (XHR
with progress, no request timeout), shown as a percentage under the field. The
preview (`ThemePreviewCountryItemCompact`, `backgroundVideo` prop) plays a
picked file from an object URL and a link 500 ms after typing stops; a link
that fails there shows "This link doesn't play as a video". Theme lists don't
play anything: they show the image and a "Video" label.

## 4. Playback

`useBackgroundVideo()` decides, `BackgroundVideoLayer` plays. Only `PageWrapper`
(the main view) uses them, so other pages never load a video.

The video is shown (`src` set) when the active custom theme has one, "Play
background videos" is on (`settings.playBackgroundVideos`, per device: not in
`SYNCED_SETTINGS_KEYS`), `prefers-reduced-motion` is off, and it hasn't failed
in this session. It plays (`shouldPlay`) only while:

- stages exist (the simulation is on screen),
- the Event Setup modal is closed,
- nothing covers it: every `Modal` (while active), the winner screen and the
  graphics editor register through `useCoversBackgroundVideo` (`covers.ts`),
- the page is visible.

Otherwise it pauses on the current frame. The file only starts loading the
first time `shouldPlay` is true. A load error or a refused `play()` (iOS Low
Power Mode, blocked autoplay) calls `onFail`, and the image takes over until
reload.

Layering: the layer is portalled into `<body>` at `z-index: -1` with the image
and theme colour as its own background, and `<body>` gets
`isolation: isolate` while it's mounted. `#main` drops its background
meanwhile. Isolating `<body>` (not `#main`) puts the video above the body's
own background (the image `applyCustomTheme` sets) without changing the
z-order between the app and its portals.

Native apps: Capacitor already allows inline muted autoplay on both platforms
(`allowsInlineMediaPlayback`, `mediaTypesRequiringUserActionForPlayback = []`;
`setMediaPlaybackRequiresUserGesture(false)`), so no native change was needed.
The video isn't stored for offline use; offline, the image shows.

## 5. Performance

A muted looping video is decoded by the GPU; the costs are memory (decoder
buffers, which matters on low-end Android given the WebView renderer crashes in
`native-apps.md` §14), data (one download per theme, cached after) and
`backdrop-filter` over a playing video repainting every frame. Hence the
limits, pausing under every overlay, and the per-device switch.

## 6. Not done

- Built-in year themes with videos.
- Server-side length and size checks (would need ffprobe).
- A Save-Data or low-memory automatic fallback.
- A pause button on the simulation screen (the setting and reduced motion are
  the way to turn it off).
