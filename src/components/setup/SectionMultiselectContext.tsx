import React from 'react';

export interface SectionMultiselectContextValue {
  isMultiselectEnabled: boolean;
  isSelected: (countryCode: string) => boolean;
  onToggleSelect: (countryCode: string) => void;
}

export const SectionMultiselectContext =
  React.createContext<SectionMultiselectContextValue | null>(null);
