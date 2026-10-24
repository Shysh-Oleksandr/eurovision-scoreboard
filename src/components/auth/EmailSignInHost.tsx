'use client';

import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { useEmailSignInStore } from '@/state/emailSignInStore';

const EmailSignInModal = dynamic(() => import('./EmailSignInModal'), {
  ssr: false,
});

/** Mounts the shared email sign-in dialog the first time it is opened. */
const EmailSignInHost: React.FC = () => {
  const isRequested = useEmailSignInStore((s) => s.isOpen);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isRequested) setIsLoaded(true);
  }, [isRequested]);

  return isLoaded ? <EmailSignInModal /> : null;
};

export default EmailSignInHost;
