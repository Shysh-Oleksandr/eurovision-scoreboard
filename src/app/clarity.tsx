'use client';

import { useEffect } from 'react';

import Clarity from '@microsoft/clarity';

export const ClarityAnalytics = () => {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!projectId || isDev) {
      return;
    }

    Clarity.init(projectId);
  }, [projectId, isDev]);

  return <></>;
};
