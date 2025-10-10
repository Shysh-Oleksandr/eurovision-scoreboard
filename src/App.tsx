import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, Zoom } from 'react-toastify';

import { CheckIcon } from './assets/icons/CheckIcon';
import { CircleXIcon } from './assets/icons/CircleXIcon';
import { InfoIcon } from './assets/icons/InfoIcon';
import { TriangleAlertIcon } from './assets/icons/TriangleAlertIcon';
import { useFullscreen } from './hooks/useFullscreen';
import { Main } from './pages/Main';
import { useAuthStore } from './state/useAuthStore';

const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const About = React.lazy(() => import('./pages/About'));

export const App = () => {
  useFullscreen();

  const { handlePostLogin } = useAuthStore();

  useEffect(() => {
    // Immediately strip auth-related query params on app load
    const url = new URL(window.location.href);

    if (url.searchParams.has('provider')) {
      window.history.replaceState({}, '', url.origin + url.pathname);

      handlePostLogin(true);

      return;
    }
    // Initialize session: refresh -> me
    handlePostLogin();
  }, [handlePostLogin]);

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>

      <ToastContainer
        draggable
        draggablePercent={20}
        transition={Zoom}
        theme="dark"
        closeButton={false}
        autoClose={2000}
        toastClassName={(context) => {
          const baseClassName = `${context?.defaultClassName} leading-5 bg-gradient-to-tl text-white`;

          if (context?.type === 'error') {
            return `${baseClassName} from-red-900 to-red-800 bg-red-800`;
          }
          if (context?.type === 'warning') {
            return `${baseClassName} from-yellow-900 to-yellow-800 bg-yellow-800`;
          }

          return `${baseClassName} from-primary-900 to-primary-800 bg-primary-800`;
        }}
        progressClassName={(context) => {
          const baseClassName = `${context?.defaultClassName} bg-gradient-to-r`;

          if (context?.type === 'error') {
            return `${baseClassName} from-red-800 to-red-600 bg-red-800`;
          }
          if (context?.type === 'warning') {
            return `${baseClassName} from-yellow-500 to-yellow-400 bg-yellow-500`;
          }

          return `${baseClassName} from-primary-900 to-primary-700 bg-primary-800`;
        }}
        limit={3}
        icon={(props) => {
          if (props.type === 'success') {
            return <CheckIcon />;
          }
          if (props.type === 'error') {
            return <CircleXIcon />;
          }
          if (props.type === 'warning') {
            return <TriangleAlertIcon />;
          }

          return <InfoIcon className="w-6 h-6" />;
        }}
      />
    </BrowserRouter>
  );
};
