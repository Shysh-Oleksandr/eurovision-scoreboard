import { useStatsCustomizationStore } from '@/state/statsCustomizationStore';

export const useBorderOpacity = (enable = true) => {
  const borderOpacity = useStatsCustomizationStore(
    (state) => state.settings.borderOpacity,
  );

  if (!enable) {
    return {};
  }

  // Clamp and expose as CSS variable to control Tailwind border opacity locally
  const borderOpacityClamped = Math.max(
    0,
    Math.min(1, isNaN(borderOpacity) ? 1 : borderOpacity),
  );
  const cssVars = {
    '--twc-primary-900-opacity': String(borderOpacityClamped),
  } as React.CSSProperties;

  return cssVars;
};
