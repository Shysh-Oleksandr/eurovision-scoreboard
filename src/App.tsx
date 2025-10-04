import React, { useEffect } from 'react';

import { useFullscreen } from './hooks/useFullscreen';
import { Main } from './pages/Main';
import { useAuthStore } from './state/useAuthStore';

export const App = () => {
  useFullscreen();

  const { handlePostLogin } = useAuthStore();

  useEffect(() => {
    // Immediately strip auth-related query params on app load
    const url = new URL(window.location.href);

    if (url.searchParams.has('provider')) {
      window.history.replaceState({}, '', url.origin + url.pathname);
    }
    // Initialize session: refresh -> me
    handlePostLogin();
  }, [handlePostLogin]);

  return (
    <>
      <Main />
    </>
  );
};
