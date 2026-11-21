'use client';

import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { useNextYearStore } from '@/state/nextYearStore';

const NextYearModal = dynamic(() => import('./NextYearModal'), { ssr: false });

/**
 * The one Next year dialog (in Providers), opened from wherever its button
 * is (`openNextYear`). Loaded the first time it's asked for and mounted per
 * open, so it starts from the finished contest as it is then.
 */
const NextYearHost: React.FC = () => {
  const isOpen = useNextYearStore((state) => state.isOpen);
  const close = useNextYearStore((state) => state.close);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (isOpen) setOpenCount((count) => count + 1);
  }, [isOpen]);

  return openCount > 0 ? (
    <NextYearModal key={openCount} isOpen={isOpen} onClose={close} />
  ) : null;
};

export default NextYearHost;
