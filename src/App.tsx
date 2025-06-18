import React from 'react';

import { Analytics } from '@vercel/analytics/react';

import { Main } from './pages/Main';

export const App = () => {
  return (
    <>
      <Main />
      <Analytics />
    </>
  );
};
