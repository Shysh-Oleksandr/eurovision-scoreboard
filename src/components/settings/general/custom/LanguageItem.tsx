import React from 'react';

import { LanguageSelector } from '../../LanguageSelector';

/** Language picker row for the Look & feel category (locale lives outside settings). */
export const LanguageItem: React.FC = () => (
  <div className="px-3 py-2">
    <LanguageSelector />
  </div>
);
