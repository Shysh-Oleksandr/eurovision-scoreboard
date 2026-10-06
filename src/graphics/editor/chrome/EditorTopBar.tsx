'use client';
import {
  ChevronLeft,
  Database,
  Image as ImageIcon,
  Link2,
  Maximize,
  Palette,
  Redo2,
  Save,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useStore } from 'zustand';

import { editorHistory, useEditorStore } from '../editorStore';
import { Chip, IconButton } from '../ui/controls';
import { useDataLabel, useThemeName } from '../useEditorContext';

import Button from '@/components/common/Button';

interface Props {
  onClose: () => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  exportAnchorRef: React.RefObject<HTMLButtonElement | null>;
}

/** Desktop top bar (§4): back, name, saved state, undo/redo, chips, actions. */
const EditorTopBar: React.FC<Props> = ({
  onClose,
  onSave,
  onPublish,
  saving,
  exportAnchorRef,
}) => {
  const t = useTranslations('graphics.editor');
  const name = useEditorStore((s) => s.design.name);
  const remixedFrom = useEditorStore((s) => s.design.remixedFrom);
  const data = useEditorStore((s) => s.design.data);
  const canvas = useEditorStore((s) => s.design.canvas);
  const dirty = useEditorStore((s) => s.dirty);
  const draftId = useEditorStore((s) => s.draftId);
  const cloudId = useEditorStore((s) => s.cloudId);
  const rename = useEditorStore((s) => s.rename);
  const setPanel = useEditorStore((s) => s.setPanel);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const focusSection = useEditorStore((s) => s.focusSection);
  const exportOpen = useEditorStore((s) => s.exportOpen);
  const setExport = useEditorStore((s) => s.setExport);
  const { undo, redo, pastStates, futureStates } = useStore(editorHistory);
  const dataLabel = useDataLabel(data);
  const themeName = useThemeName();
  // The canvas chips show the canvas inspector and jump to their section.
  const showCanvasSection = (id: string) => {
    clearSelection();
    focusSection(id);
  };

  return (
    <div className="gfx-top">
      <IconButton label={t('close')} onClick={onClose}>
        <ChevronLeft className="size-[18px]" />
      </IconButton>
      <input
        className="gfx-name"
        value={name}
        aria-label={t('designName')}
        onChange={(e) => rename(e.target.value)}
        onBlur={() => {
          // A design always has a name (the stored record requires one).
          if (!name.trim()) rename(t('untitled'));
        }}
      />
      <span className="gfx-saved">
        {!draftId && !dirty
          ? t('notSavedYet')
          : dirty
          ? t('unsaved')
          : t('saved')}
      </span>
      <div className="gfx-hist">
        <IconButton
          size="sm"
          label={t('undo')}
          disabled={!pastStates.length}
          onClick={() => undo()}
        >
          <Undo2 className="size-[15px]" />
        </IconButton>
        <IconButton
          size="sm"
          label={t('redo')}
          disabled={!futureStates.length}
          onClick={() => redo()}
        >
          <Redo2 className="size-[15px]" />
        </IconButton>
      </div>
      <div className="gfx-chips">
        <Chip
          tone="data"
          icon={<Database className="size-[13px]" />}
          onClick={() => setPanel('data')}
        >
          {dataLabel}
        </Chip>
        <Chip
          icon={<Maximize className="size-[13px]" />}
          title={t('canvasSizeChip')}
          onClick={() => showCanvasSection('size')}
        >
          {canvas.autoSize ? t('sizedToTable') : null}
          {canvas.autoSize ? ' · ' : ''}
          {canvas.width} × {canvas.height}
        </Chip>
        <Chip
          icon={<Palette className="size-[13px]" />}
          title={t('themeChip')}
          onClick={() => showCanvasSection('theme')}
        >
          {themeName}
        </Chip>
        {remixedFrom && (
          <Chip
            icon={<Link2 className="size-[13px]" />}
            title={t('remixChipTitle')}
          >
            {t('remixOf', { name: remixedFrom.name })}
          </Chip>
        )}
      </div>
      <div className="flex-1" />
      <button
        type="button"
        className="dp-act text-white gfx-act"
        onClick={onPublish}
      >
        <Upload className="size-4" />
        <span>{cloudId ? t('updateTemplate') : t('publishAsTemplate')}</span>
      </button>
      <button
        ref={exportAnchorRef}
        type="button"
        className="dp-act text-white gfx-act"
        aria-haspopup="dialog"
        aria-expanded={exportOpen}
        onClick={() => setExport({ open: !exportOpen })}
      >
        <ImageIcon className="size-4" />
        <span>{t('export')}</span>
      </button>
      <Button
        variant="cta"
        size="md"
        isLoading={saving}
        Icon={<Save className="size-4" />}
        onClick={onSave}
      >
        {t('save')}
      </Button>
      <IconButton label={t('close')} onClick={onClose}>
        <X className="size-[18px]" />
      </IconButton>
    </div>
  );
};

export default EditorTopBar;
