import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Screens that cover the simulation (every `Modal`, the winner screen, the
 * graphics editor) register here while open, and the background video
 * pauses under them: nobody watches it there, and a blurred overlay over a
 * playing video repaints on every frame.
 */
const useCoversStore = create<{ count: number }>(() => ({ count: 0 }));

export function useCoversBackgroundVideo(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;

    useCoversStore.setState((state) => ({ count: state.count + 1 }));

    return () => {
      useCoversStore.setState((state) => ({ count: state.count - 1 }));
    };
  }, [active]);
}

export const useIsBackgroundVideoCovered = (): boolean =>
  useCoversStore((state) => state.count > 0);
