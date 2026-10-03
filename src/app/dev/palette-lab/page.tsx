import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Palette Lab',
  robots: { index: false, follow: false },
};

/**
 * Dev-only Palette Lab: tunes the interface accents (see
 * docs/event-setup-hub-and-design-tokens.md). The import sits in a branch
 * that is constant-false in production builds, so it is compiled out there
 * and the route 404s.
 */
export default async function PaletteLabPage() {
  if (process.env.NODE_ENV === 'development') {
    const { default: PaletteLab } = await import(
      '@/components/dev/palette/PaletteLab'
    );

    return <PaletteLab />;
  }

  notFound();
}
