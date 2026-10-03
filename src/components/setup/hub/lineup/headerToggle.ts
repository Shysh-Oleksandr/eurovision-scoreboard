import type React from 'react';

const INTERACTIVE_SELECTOR = 'button, a, input, label, select, textarea';

/**
 * Click handler for a collapsible header: toggles unless the click landed on
 * one of the header's own controls (chevron/title buttons toggle themselves,
 * count pills and pencils open menus/modals).
 */
export const headerToggleHandler =
  (toggle: () => void) => (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;

    toggle();
  };
