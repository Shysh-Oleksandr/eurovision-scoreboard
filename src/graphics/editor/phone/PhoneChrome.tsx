'use client';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  Database,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Maximize,
  Plus,
  Redo2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';
import { useStore } from 'zustand';

import { useShallow } from 'zustand/shallow';

import {
  editorHistory,
  selectSelectedElements,
  SheetId,
  useEditorStore,
} from '../editorStore';
import {
  CanvasHeader,
  ElementHeader,
  MultiBody,
  MultiHeader,
} from '../inspector/Inspector';
import {
  InspectorSection,
  SectionContext,
  useCanvasSections,
  useElementSections,
} from '../inspector/sections';
import AddPanel from '../panels/AddPanel';
import DataPanel from '../panels/DataPanel';
import LayersPanel from '../panels/LayersPanel';
import TemplatesPanel from '../panels/TemplatesPanel';
import { IconButton } from '../ui/controls';
import { useDataLabel, useThemeName } from '../useEditorContext';
import { BoxMap, boxOf } from '../useElementBoxes';

import Button from '@/components/common/Button';
import { cn } from '@/helpers/utils';

/* ---------------- top bar ---------------- */

export const PhoneTopBar: React.FC<{
  onClose: () => void;
  onExport: () => void;
}> = ({ onClose, onExport }) => {
  const t = useTranslations('graphics.editor');
  const name = useEditorStore((s) => s.design.name);
  const data = useEditorStore((s) => s.design.data);
  const dirty = useEditorStore((s) => s.dirty);
  const draftId = useEditorStore((s) => s.draftId);
  const rename = useEditorStore((s) => s.rename);
  const setSheet = useEditorStore((s) => s.setSheet);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const { undo, redo, pastStates, futureStates } = useStore(editorHistory);
  const dataLabel = useDataLabel(data);
  const themeName = useThemeName();

  return (
    <div className="gfx-ph-top">
      <IconButton label={t('close')} onClick={onClose}>
        <ChevronLeft className="size-[18px]" />
      </IconButton>
      <div className="gfx-ph-title">
        <input
          className="gfx-name"
          value={name}
          aria-label={t('designName')}
          onChange={(e) => rename(e.target.value)}
          onBlur={() => {
            if (!name.trim()) rename(t('untitled'));
          }}
        />
        {/* Data · theme · state; tapping opens the Canvas sheet on Theme. */}
        <button
          type="button"
          className="gfx-saved gfx-ph-sub"
          title={t('themeChip')}
          onClick={() => {
            clearSelection();
            setSheet('canvas', 'theme');
          }}
        >
          {dataLabel} · {themeName} ·{' '}
          {!draftId && !dirty
            ? t('notSavedYet')
            : dirty
            ? t('unsaved')
            : t('saved')}
        </button>
      </div>
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
      <Button
        variant="cta"
        size="md"
        Icon={<ImageIcon className="size-4" />}
        onClick={onExport}
      >
        {t('export')}
      </Button>
    </div>
  );
};

/* ---------------- bottom bar ---------------- */

const BAR: { id: SheetId; icon: React.ReactNode }[] = [
  { id: 'add', icon: <Plus className="size-5" /> },
  { id: 'layers', icon: <Layers className="size-5" /> },
  { id: 'data', icon: <Database className="size-5" /> },
  { id: 'canvas', icon: <Maximize className="size-5" /> },
  { id: 'templates', icon: <LayoutTemplate className="size-5" /> },
];

export const PhoneBar: React.FC<{ onPublish: () => void }> = ({
  onPublish,
}) => {
  const t = useTranslations('graphics.editor.sheet');
  const setSheet = useEditorStore((s) => s.setSheet);
  const cloudId = useEditorStore((s) => s.cloudId);

  return (
    <div className="gfx-ph-bar" role="toolbar" aria-label={t('toolbar')}>
      {BAR.map((item) => (
        <button key={item.id} type="button" onClick={() => setSheet(item.id)}>
          {item.icon}
          <span>{item.id === 'add' ? t('addShort') : t(item.id)}</span>
        </button>
      ))}
      <button type="button" onClick={onPublish}>
        {cloudId ? <Globe className="size-5" /> : <Upload className="size-5" />}
        <span>{cloudId ? t('published') : t('publish')}</span>
      </button>
    </div>
  );
};

/* ---------------- d-pad ---------------- */

const Nudge: React.FC = () => {
  const t = useTranslations('graphics.editor.nudge');
  const nudge = useEditorStore((s) => s.nudge);
  const updateElements = useEditorStore((s) => s.updateElements);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const press = (dx: number, dy: number) => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      nudge(dx * 10, dy * 10);
    }, 450);
  };
  const release = (dx: number, dy: number) => {
    if (timer.current) clearTimeout(timer.current);
    if (!held.current) nudge(dx, dy);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const centre = () => {
    const s = useEditorStore.getState();
    const { width, height } = s.design.canvas;

    s.selectedIds.forEach((id) => {
      const el = s.design.elements.find((e) => e.id === id);

      if (!el || el.locked || el.w === undefined) return;
      updateElements([id], {
        x: Math.round((width - el.w) / 2),
        ...(el.h !== undefined ? { y: Math.round((height - el.h) / 2) } : {}),
      });
    });
  };
  const key = (
    dx: number,
    dy: number,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={() => press(dx, dy)}
      onPointerUp={() => release(dx, dy)}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
    >
      {icon}
    </button>
  );

  return (
    <div className="gfx-nudge" role="group" aria-label={t('move')}>
      <span className="gfx-field-label">
        {t('move')}
        <em>{t('holdForTen')}</em>
      </span>
      <div className="gfx-dpad">
        {key(0, -1, t('up'), <ArrowUp className="size-4" />)}
        {key(-1, 0, t('left'), <ArrowLeft className="size-4" />)}
        <button type="button" aria-label={t('centre')} onClick={centre}>
          <Maximize className="size-[14px]" />
        </button>
        {key(1, 0, t('right'), <ArrowRight className="size-4" />)}
        {key(0, 1, t('down'), <ArrowDown className="size-4" />)}
      </div>
    </div>
  );
};

/* ---------------- sheet ---------------- */

const SectionTabs: React.FC<{
  sections: InspectorSection[];
  layoutLabel?: string;
}> = ({ sections, layoutLabel }) => {
  const tab = useEditorStore((s) => s.sheetTab);
  const setSheetTab = useEditorStore((s) => s.setSheetTab);
  const current = sections.find((s) => s.id === tab) ?? sections[0];

  return (
    <>
      <div className="gfx-ptabs" role="tablist">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === current.id}
            className={s.id === current.id ? 'is-on' : ''}
            onClick={() => setSheetTab(s.id)}
          >
            {s.id === 'layout' && layoutLabel ? layoutLabel : s.title}
          </button>
        ))}
      </div>
      <div className="gfx-sheet-b">{current.content}</div>
    </>
  );
};

const ElementSheet: React.FC<{ ctx: SectionContext }> = ({ ctx }) => {
  const t = useTranslations('graphics.inspector.sections');
  const selected = useEditorStore(useShallow(selectSelectedElements));
  const [el] = selected;
  const sections = useElementSections(el, { ...ctx, layoutPrefix: <Nudge /> });

  return <SectionTabs sections={sections} layoutLabel={t('layout')} />;
};

const CanvasSheet: React.FC<{ ctx: SectionContext }> = ({ ctx }) => {
  const sections = useCanvasSections(ctx);

  return <SectionTabs sections={sections} />;
};

interface SheetProps {
  boxes: BoxMap;
  onTooLarge: SectionContext['onTooLarge'];
}

/** The 52 % bottom sheet (§7); closing the inspector sheet clears selection. */
export const PhoneSheet: React.FC<SheetProps> = ({ boxes, onTooLarge }) => {
  const t = useTranslations('graphics.editor.sheet');
  const sheet = useEditorStore((s) => s.sheet);
  const setSheet = useEditorStore((s) => s.setSheet);
  const selected = useEditorStore(useShallow(selectSelectedElements));
  const one = selected.length === 1 ? selected[0] : null;
  const ctx: SectionContext = {
    box: one
      ? boxOf(boxes, one)
      : { x: 0, y: 0, w: 0, h: 0, rotation: 0, inFlow: false },
    onTooLarge,
    openDataPanel: () => setSheet('data'),
  };

  if (!sheet) return null;
  if (sheet === 'inspector' && !selected.length) return null;

  const close = () => setSheet(null);
  let header: React.ReactNode;
  let body: React.ReactNode;

  if (sheet === 'inspector') {
    if (selected.length > 1) {
      header = <MultiHeader count={selected.length} />;
      body = (
        <div className="gfx-sheet-b">
          <MultiBody selected={selected} />
          <Nudge />
        </div>
      );
    } else {
      header = <ElementHeader el={one!} hideName />;
      body = <ElementSheet key={one!.id} ctx={ctx} />;
    }
  } else if (sheet === 'canvas') {
    header = <CanvasHeader />;
    body = <CanvasSheet ctx={ctx} />;
  } else {
    header = <h3>{t(sheet)}</h3>;
    body = (
      <div className="gfx-sheet-b">
        {sheet === 'add' && <AddPanel onAdded={() => setSheet('inspector')} />}
        {sheet === 'layers' && <LayersPanel compact />}
        {sheet === 'data' && <DataPanel />}
        {sheet === 'templates' && <TemplatesPanel onApplied={close} />}
      </div>
    );
  }

  return (
    <div
      className={cn('gfx-sheet', `gfx-sheet--${sheet}`)}
      role="dialog"
      aria-label={t(sheet)}
    >
      <button
        type="button"
        className="gfx-sheet-grab"
        aria-label={t('close')}
        onClick={close}
      >
        <span />
      </button>
      <div className="gfx-sheet-h">
        {header}
        <IconButton size="sm" label={t('close')} onClick={close}>
          <X className="size-[15px]" />
        </IconButton>
      </div>
      {body}
    </div>
  );
};
