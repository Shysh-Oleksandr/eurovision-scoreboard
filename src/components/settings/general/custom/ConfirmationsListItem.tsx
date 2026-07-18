import React from 'react';

import { ConfirmationsSettings } from '../../ConfirmationsSettings';

/** Suppressed-dialog list + reset controls, reusing the existing component wholesale. */
export const ConfirmationsListItem: React.FC = () => (
  <div className="px-3 py-1">
    <ConfirmationsSettings />
  </div>
);
