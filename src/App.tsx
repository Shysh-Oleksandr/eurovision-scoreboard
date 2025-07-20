import React from 'react';

import { useFullscreen } from './hooks/useFullscreen';
import { Main } from './pages/Main';

export const App = () => {
  useFullscreen();

  return (
    <>
      <Main />
    </>
  );
};
