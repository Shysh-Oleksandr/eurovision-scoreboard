'use client';
import React from 'react';

import Link from 'next/link';

/**
 * Development only (the settings model gates it): the way into the Haptics
 * lab from inside the app shell, which has no address bar. English only.
 */
export const HapticsLabLink: React.FC = () => (
  <div className="flex items-center gap-4 rounded-[10px] px-3 py-[11px]">
    <div className="min-w-0 flex-1">
      <div className="text-[14.5px] font-semibold text-white">Haptics lab</div>
      <p className="mt-0.5 text-[12.5px] text-white/50">
        Dev only: play and tune every cue on this phone.
      </p>
    </div>
    <Link
      href="/dev/haptics-lab"
      className="shrink-0 rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-white"
    >
      Open
    </Link>
  </div>
);
