import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Douze Lab',
  robots: { index: false, follow: false },
};

/**
 * Dev-only Douze lab: plays the spec-driven douze animations (src/douze/)
 * on a themed row, holds them at any moment and lays a timeline of held
 * frames out for comparing against reference footage. Same pattern as
 * /dev/haptics-lab: the import is compiled out of production builds.
 */
export default async function DouzeLabPage() {
  if (process.env.NODE_ENV === 'development') {
    const { default: DouzeLab } = await import(
      '@/components/dev/douze/DouzeLab'
    );

    return <DouzeLab />;
  }

  notFound();
}
