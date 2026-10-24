'use client';

import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { useReportDialogStore } from '@/state/reportDialogStore';

const ReportModal = dynamic(() => import('./ReportModal'), { ssr: false });

/** Mounts the shared report dialog the first time something asks for it. */
const ReportDialogHost: React.FC = () => {
  const isRequested = useReportDialogStore((s) => !!s.target);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isRequested) setIsLoaded(true);
  }, [isRequested]);

  return isLoaded ? <ReportModal /> : null;
};

export default ReportDialogHost;
