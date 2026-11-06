import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Haptics Lab',
  robots: { index: false, follow: false },
};

/**
 * Dev-only Haptics lab: plays and tunes every haptic cue (docs/haptics.md
 * §5). Use it inside the app shell with live reload (`yarn dev:native` +
 * `yarn cap:dev ios --lan`); Settings → Effects links here in development.
 * The import sits in a branch that is constant-false in production builds,
 * so it is compiled out there and the route 404s.
 */
export default async function HapticsLabPage() {
  if (process.env.NODE_ENV === 'development') {
    const { default: HapticsLab } = await import(
      '@/components/dev/haptics/HapticsLab'
    );

    return <HapticsLab />;
  }

  notFound();
}
