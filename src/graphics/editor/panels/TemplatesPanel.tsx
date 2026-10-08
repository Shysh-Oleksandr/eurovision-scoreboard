'use client';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import DesignThumb from '../../components/DesignThumb';
import { useGraphicsStudioStore } from '../../state/graphicsStudioStore';
import { EDITOR_TEMPLATES } from '../../templates/editor';
import { useEditorStore } from '../editorStore';
import { Hint } from '../ui/controls';
import { useTemplateContext } from '../useEditorContext';

import Button from '@/components/common/Button';

interface Props {
  onApplied?: () => void;
}

/**
 * Built-in starters; applying one replaces the canvas (undoable).
 * "Explore community designs" leaves for the Graphics modal.
 */
const TemplatesPanel: React.FC<Props> = ({ onApplied }) => {
  const t = useTranslations('graphics.templates');
  const tg = useTranslations('graphics.gallery');
  const replaceDesign = useEditorStore((s) => s.replaceDesign);
  const closeEditor = useGraphicsStudioStore((s) => s.closeEditor);
  const setGalleryOpen = useGraphicsStudioStore((s) => s.setGraphicsModalOpen);
  const ctx = useTemplateContext();
  const built = useMemo(
    () =>
      EDITOR_TEMPLATES.filter((tpl) => tpl.inEditor && !tpl.hidden).map(
        (tpl) => ({
          tpl,
          design: tpl.build(ctx),
        }),
      ),
    [ctx],
  );

  return (
    <>
      <Hint>{t('replacesEverything')}</Hint>
      <div className="gfx-tpl-list">
        {built.map(({ tpl, design }) => (
          <button
            key={tpl.id}
            type="button"
            className="gfx-tpl-row"
            onClick={() => {
              replaceDesign(tpl.build(ctx));
              onApplied?.();
            }}
          >
            <DesignThumb design={design} width={84} height={54} />
            <span>
              <b>{t(`builtin.${tpl.id}.name`)}</b>
              <em>
                {tpl.autoSize
                  ? tg('contentSized')
                  : `${tpl.width} × ${tpl.height}`}
              </em>
            </span>
          </button>
        ))}
      </div>
      <Button
        variant="surface"
        size="md"
        className="w-full justify-center"
        Icon={<Globe className="size-4" />}
        onClick={() => {
          closeEditor();
          setGalleryOpen(true, 'explore');
        }}
      >
        {t('browseCommunity')}
      </Button>
    </>
  );
};

export default TemplatesPanel;
