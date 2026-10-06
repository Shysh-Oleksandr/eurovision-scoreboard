'use client';
import React, { useCallback } from 'react';

import dynamic from 'next/dynamic';

import { useGraphicsStudioStore } from '../state/graphicsStudioStore';

// The editor (store, gestures, inspector, panels, editor.css) is its own
// chunk and only loads the first time the user opens it.
const GraphicsEditor = dynamic(() => import('../editor/GraphicsEditor'), {
  ssr: false,
});
const TemplateSheet = dynamic(() => import('./TemplateSheet'), {
  ssr: false,
});

/**
 * Mounted once in `Main`. Opens the editor for whatever request the studio
 * store holds (Hub, template, "Open in editor" from a share modal), and the
 * template sheet (Use template, `?design=` links).
 */
const GraphicsEditorHost: React.FC = () => {
  const open = useGraphicsStudioStore((s) => s.editorOpen);
  const request = useGraphicsStudioStore((s) => s.editorRequest);
  const sheet = useGraphicsStudioStore((s) => s.sheetRequest);
  const closeEditor = useGraphicsStudioStore((s) => s.closeEditor);
  const closeSheet = useGraphicsStudioStore((s) => s.closeSheet);
  const handleClose = useCallback(() => closeEditor(), [closeEditor]);

  return (
    <>
      {sheet && <TemplateSheet request={sheet} onClose={closeSheet} />}
      {open && request && (
        <GraphicsEditor request={request} onClose={handleClose} />
      )}
    </>
  );
};

export default GraphicsEditorHost;
