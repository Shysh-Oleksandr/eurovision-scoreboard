import { createContext, useContext } from 'react';

/**
 * Elements that settle their own layout after the first paint (auto-fit
 * scoreboards measure the space they have) call this once they have, so
 * the editor re-measures element boxes even when no box changed size.
 */
export const LayoutSignalContext = createContext<() => void>(() => {});

export const useLayoutSignal = () => useContext(LayoutSignalContext);
