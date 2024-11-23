import React from 'react';

import { Main } from './pages/Main';
import { AppProvider } from './state/AppContext';

export const App = () => {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
};
