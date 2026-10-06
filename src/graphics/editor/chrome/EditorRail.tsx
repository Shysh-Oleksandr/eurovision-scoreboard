'use client';
import { Database, Layers, LayoutTemplate, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { PanelId, useEditorStore } from '../editorStore';
import AddPanel from '../panels/AddPanel';
import DataPanel from '../panels/DataPanel';
import LayersPanel from '../panels/LayersPanel';
import TemplatesPanel from '../panels/TemplatesPanel';
import { IconButton } from '../ui/controls';

import { cn } from '@/helpers/utils';

const RAIL: { id: PanelId; icon: React.ReactNode }[] = [
  { id: 'add', icon: <Plus className="size-5" /> },
  { id: 'templates', icon: <LayoutTemplate className="size-5" /> },
  { id: 'layers', icon: <Layers className="size-5" /> },
  { id: 'data', icon: <Database className="size-5" /> },
];

/** The 64 px rail (§4): Add (accent tint), Templates, Layers, Data. */
export const EditorRail: React.FC = () => {
  const t = useTranslations('graphics.editor.rail');
  const panel = useEditorStore((s) => s.panel);
  const togglePanel = useEditorStore((s) => s.togglePanel);

  return (
    <nav className="gfx-rail" aria-label={t('aria')}>
      {RAIL.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn('gfx-rail-btn', panel === item.id && 'is-on')}
          aria-pressed={panel === item.id}
          onClick={() => togglePanel(item.id)}
        >
          {item.icon}
          <span>{t(item.id)}</span>
        </button>
      ))}
    </nav>
  );
};

/** The 290 px panel next to the rail; slides in (CSS) when opened. */
export const EditorPanel: React.FC = () => {
  const t = useTranslations('graphics.editor.panel');
  const panel = useEditorStore((s) => s.panel);
  const setPanel = useEditorStore((s) => s.setPanel);

  if (!panel) return null;

  return (
    <section className="gfx-panel" aria-label={t(panel)}>
      <div className="gfx-panel-h">
        <h3>{t(panel)}</h3>
        <IconButton size="sm" label={t('close')} onClick={() => setPanel(null)}>
          <X className="size-[15px]" />
        </IconButton>
      </div>
      <div className="gfx-panel-b">
        {panel === 'add' && <AddPanel />}
        {panel === 'templates' && <TemplatesPanel />}
        {panel === 'layers' && <LayersPanel />}
        {panel === 'data' && <DataPanel />}
      </div>
    </section>
  );
};
