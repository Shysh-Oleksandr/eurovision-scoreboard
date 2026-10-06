import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Graphics PoC',
  robots: { index: false, follow: false },
};

/**
 * Dev-only Graphics studio PoC (docs/plans/graphics-studio-plan.md, Phase 0).
 * Same pattern as /dev/palette-lab: the import sits in a branch that is
 * constant-false in production builds, so it is compiled out and the route
 * 404s there.
 */
export default async function GraphicsPocPage() {
  if (process.env.NODE_ENV === 'development') {
    const { default: GraphicsPoc } = await import(
      '@/components/dev/graphics-poc/GraphicsPoc'
    );

    return <GraphicsPoc />;
  }

  notFound();
}
