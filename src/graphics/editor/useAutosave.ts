'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useGraphicsStudioStore } from '../state/graphicsStudioStore';
import { newRecordId, putDesignRecord } from '../storage/designsDb';

import { useEditorStore } from './editorStore';

/**
 * Drafts in IndexedDB. `save()` writes now (creating the record on the first
 * call). Every change autosaves 1.5 s after the last edit — a fresh design
 * gets its record on its first edit, so closing never has to ask whether to
 * keep it (drafts are free and live in this browser). The write validates
 * the document first; a document that would not load again is never stored
 * and `save()` resolves `null`.
 */
export function useAutosave() {
  const [saving, setSaving] = useState(false);
  const createdAtRef = useRef<number | null>(null);

  const save = useCallback(async (): Promise<string | null> => {
    const { design, draftId, cloudId, markSaved } = useEditorStore.getState();
    const id = draftId ?? newRecordId('d');
    const now = Date.now();

    if (!createdAtRef.current) createdAtRef.current = now;
    setSaving(true);
    try {
      await putDesignRecord({
        id,
        name: design.name,
        createdAt: createdAtRef.current,
        updatedAt: now,
        design,
        cloudId: cloudId ?? undefined,
      });
      // Only mark clean if nothing changed while writing.
      if (useEditorStore.getState().design === design) markSaved(id, now);
      else useEditorStore.setState({ draftId: id, savedAt: now });
      useEditorStore.setState({ saveFailed: false });
      useGraphicsStudioStore.getState().bumpDrafts();

      return id;
    } catch (err) {
      console.error('Failed to save design', err);
      useEditorStore.setState({ saveFailed: true });

      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const dirty = useEditorStore((s) => s.dirty);
  const design = useEditorStore((s) => s.design);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = setTimeout(() => {
      save();
    }, 1500);

    return () => clearTimeout(timer);
  }, [dirty, design, save]);

  return { save, saving };
}
