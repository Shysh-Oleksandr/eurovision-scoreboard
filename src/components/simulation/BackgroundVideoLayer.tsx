'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BackgroundVideoLayerProps {
  src: string;
  /** The theme's background image: shown until the video plays. */
  poster: string;
  color: string;
  shouldPlay: boolean;
  onFail: () => void;
}

/**
 * The theme's background video, muted and looped, behind the whole app.
 *
 * It sits in `<body>` at `z-index: -1`, and `<body>` is made a stacking
 * context while the layer is mounted, so the video paints above the body's
 * own background (the theme image `applyCustomTheme` sets) and below
 * everything else. `PageWrapper` drops its background meanwhile. Isolating
 * `<body>` instead of `#main` leaves the z-order between the app and its
 * portals (modals, menus, the winner screen) as it was.
 *
 * The file only starts loading the first time `shouldPlay` is true, and the
 * video fades in over the image once it really plays. Pausing keeps the
 * current frame. A load error or a refused `play()` (Low Power Mode on iOS,
 * autoplay blocked) calls `onFail`, and the image takes over.
 */
const BackgroundVideoLayer: React.FC<BackgroundVideoLayerProps> = ({
  src,
  poster,
  color,
  shouldPlay,
  onFail,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load lazily; drop a previous theme's video that hasn't started yet.
  useEffect(() => {
    setLoadedSrc((prev) => {
      if (shouldPlay) return src;

      return prev === src ? prev : null;
    });
  }, [shouldPlay, src]);

  useEffect(() => {
    setIsPlaying(false);
  }, [loadedSrc]);

  useEffect(() => {
    const { body } = document;
    const previous = body.style.isolation;

    body.style.isolation = 'isolate';

    return () => {
      body.style.isolation = previous;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !loadedSrc) return;

    if (!shouldPlay) {
      video.pause();

      return;
    }

    // Muted as a property before play(): autoplay policies check this.
    video.muted = true;
    video.defaultMuted = true;
    video.play()?.catch((error: unknown) => {
      // A pause() or a new src interrupting play() is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      onFail();
    });
  }, [shouldPlay, loadedSrc, onFail]);

  return createPortal(
    <div
      aria-hidden
      data-background-video
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: -1,
        backgroundColor: color,
        backgroundImage: `url(${poster})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {loadedSrc && (
        <video
          ref={videoRef}
          key={loadedSrc}
          src={loadedSrc}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          onPlaying={() => setIsPlaying(true)}
          onError={onFail}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: isPlaying ? 1 : 0 }}
        />
      )}
    </div>,
    document.body,
  );
};

export default BackgroundVideoLayer;
