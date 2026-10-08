'use client';
import React, { useEffect, useState } from 'react';

import EditorPanel from './EditorPanel';
import ExportPanel from './ExportPanel';
import RoundTripPanel from './RoundTripPanel';
import { Btn, Mono, Section } from './ui';

type Tab = 'export' | 'editor' | 'roundtrip' | 'gates';

const GATES = `Phase 0 exit gates (docs/plans/graphics-studio-plan.md)

1. Export fidelity — Chrome, Safari desktop, iOS Safari, Android Chrome, Firefox:
   pixel-faithful to the preview in ONE pass (no retry loop);
   2× export < 3 s on a mid-range phone.
   → Export tab: run both engines at 2×, compare to the preview, copy the table.
   → Also run with "skip preload" to see whether the legacy blank-background
     bug reproduces without the deterministic sequence.

2. Interaction — hand-rolled move/resize/rotate/snap in a CSS-scaled stage:
   handles track the pointer exactly at 0.25×, 0.5×, 1×; no drift after 50 ops;
   touch drag works on iOS.
   → Editor tab: ops counter top-right; geometry self-test button.

3. Model round-trip — zod Design → render → export → serialize → reload →
   identical render; a template with two bound fields renders from a saved
   contest snapshot.
   → Round-trip tab.

4. Bundle — this route is compiled out of production (constant-false branch,
   same as /dev/palette-lab); the PoC chunk is loaded via dynamic import.
   → \`yarn build\`: /dev/graphics-poc must 404 in prod; main bundle unchanged.

Fallbacks if a gate fails: export → snapdom → manual SVG foreignObject
rasteriser with inlined fonts → Fabric.js for the scoreboard element only;
interaction → react-moveable; phone export time → cap phones at 1×.`;

/** Dev-only PoC shell. See docs/plans/graphics-studio-plan.md, Phase 0. */
const GraphicsPoc: React.FC = () => {
  const [tab, setTab] = useState<Tab>('export');
  // Client-only: the stage reads window size and store state that differ on
  // the server, and nothing here needs SSR.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-3 md:p-5 flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold mr-2">Graphics studio · PoC</h1>
        {(
          [
            ['export', '1 · Export fidelity'],
            ['editor', '2 · Editor'],
            ['roundtrip', '3 · Round-trip & template'],
            ['gates', 'Gates'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <Btn key={id} active={tab === id} onClick={() => setTab(id)}>
            {label}
          </Btn>
        ))}
        <span className="text-xs text-neutral-500 ml-auto">
          dev-only · throwaway · theme/fonts come from your active theme
        </span>
      </header>

      {tab === 'export' && <ExportPanel />}
      {tab === 'editor' && <EditorPanel />}
      {tab === 'roundtrip' && <RoundTripPanel />}
      {tab === 'gates' && (
        <Section title="Exit gates">
          <Mono>{GATES}</Mono>
        </Section>
      )}
    </div>
  );
};

export default GraphicsPoc;
