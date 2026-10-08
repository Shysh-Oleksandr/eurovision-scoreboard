'use client';
import {
  Copy,
  Eye,
  EyeOff,
  Flag,
  Group,
  Image as ImageIcon,
  Lock,
  Maximize,
  Mic,
  Rows3,
  Shapes,
  Table,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useShallow } from 'zustand/shallow';

import { DesignElement, ElementType } from '../../model/design';
import { canDelete, canHide, elementLabel } from '../../model/elements';
import { selectSelectedElements, useEditorStore } from '../editorStore';
import {
  Hint,
  IconButton,
  Row,
  Section,
  TextInput,
  Toggle,
} from '../ui/controls';
import { BoxMap, boxOf } from '../useElementBoxes';

import {
  InspectorSection,
  SectionContext,
  useCanvasSections,
  useElementSections,
} from './sections';

export const TYPE_ICONS: Record<ElementType, React.ReactNode> = {
  text: <Type className="size-[14px]" />,
  image: <ImageIcon className="size-[14px]" />,
  shape: <Shapes className="size-[14px]" />,
  flag: <Flag className="size-[14px]" />,
  scoreboard: <Rows3 className="size-[14px]" />,
  stats: <Table className="size-[14px]" />,
  branding: <Mic className="size-[14px]" />,
  stack: <Group className="size-[14px]" />,
};

/** Type chip + name input + lock / hide / duplicate / delete. */
export const ElementHeader: React.FC<{
  el: DesignElement;
  hideName?: boolean;
}> = ({ el, hideName }) => {
  const t = useTranslations('graphics.inspector');
  const update = useEditorStore((s) => s.updateElement);
  const duplicate = useEditorStore((s) => s.duplicateSelected);
  const remove = useEditorStore((s) => s.removeSelected);

  return (
    <div className={`gfx-insp-h${hideName ? '' : ' has-name'}`}>
      <span className="gfx-tchip">
        {TYPE_ICONS[el.type]}
        {t(`types.${el.type}`)}
      </span>
      <div className="gfx-insp-actions">
        <IconButton
          size="sm"
          on={el.locked}
          label={el.locked ? t('unlock') : t('lock')}
          onClick={() => update(el.id, { locked: !el.locked })}
        >
          {el.locked ? (
            <Lock className="size-[15px]" />
          ) : (
            <Unlock className="size-[15px]" />
          )}
        </IconButton>
        {canHide(el) && (
          <IconButton
            size="sm"
            on={el.hidden}
            label={el.hidden ? t('show') : t('hide')}
            onClick={() => update(el.id, { hidden: !el.hidden })}
          >
            {el.hidden ? (
              <EyeOff className="size-[15px]" />
            ) : (
              <Eye className="size-[15px]" />
            )}
          </IconButton>
        )}
        {canDelete(el) && (
          <>
            <IconButton size="sm" label={t('duplicate')} onClick={duplicate}>
              <Copy className="size-[15px]" />
            </IconButton>
            <IconButton size="sm" danger label={t('delete')} onClick={remove}>
              <Trash2 className="size-[15px]" />
            </IconButton>
          </>
        )}
      </div>
      {!hideName && (
        <TextInput
          className="gfx-insp-name"
          value={el.name ?? ''}
          placeholder={elementLabel(el)}
          aria-label={t('elementName')}
          onValue={(name) => update(el.id, { name })}
        />
      )}
    </div>
  );
};

export const MultiHeader: React.FC<{ count: number }> = ({ count }) => {
  const t = useTranslations('graphics.inspector');
  const duplicate = useEditorStore((s) => s.duplicateSelected);
  const remove = useEditorStore((s) => s.removeSelected);

  return (
    <div className="gfx-insp-h">
      <span className="gfx-tchip">
        <Group className="size-[14px]" />
        {t('nElements', { count })}
      </span>
      <div className="gfx-insp-actions ml-auto">
        <IconButton size="sm" label={t('duplicate')} onClick={duplicate}>
          <Copy className="size-[15px]" />
        </IconButton>
        <IconButton size="sm" danger label={t('delete')} onClick={remove}>
          <Trash2 className="size-[15px]" />
        </IconButton>
      </div>
    </div>
  );
};

export const MultiBody: React.FC<{ selected: DesignElement[] }> = ({
  selected,
}) => {
  const t = useTranslations('graphics.inspector');
  const updateElements = useEditorStore((s) => s.updateElements);
  const ids = selected.map((el) => el.id);

  return (
    <div className="gfx-sec-b pt-4">
      <Hint>{t('multiHint')}</Hint>
      <Row>
        <Toggle
          label={t('lockAll')}
          checked={selected.every((el) => el.locked)}
          onChange={(locked) => updateElements(ids, { locked })}
        />
        <Toggle
          label={t('hideAll')}
          checked={selected.every((el) => el.hidden)}
          onChange={(hidden) =>
            updateElements(
              ids.filter((id) => canHide(selected.find((el) => el.id === id)!)),
              { hidden },
            )
          }
        />
      </Row>
    </div>
  );
};

export const CanvasHeader: React.FC = () => {
  const t = useTranslations('graphics.inspector');

  return (
    <div className="gfx-insp-h">
      <span className="gfx-tchip">
        <Maximize className="size-[14px]" />
        {t('canvasLabel')}
      </span>
      <span className="gfx-insp-title">{t('nothingSelected')}</span>
    </div>
  );
};

/** Sections stacked as collapsible groups (desktop inspector). */
export const SectionStack: React.FC<{ sections: InspectorSection[] }> = ({
  sections,
}) => {
  const openSections = useEditorStore((s) => s.openSections);
  const toggleSection = useEditorStore((s) => s.toggleSection);
  const focusRequest = useEditorStore((s) => s.focusRequest);

  return (
    <>
      {sections.map((sec) => {
        const defaultOpen = !sec.collapsed;
        const open = openSections[sec.id] ?? defaultOpen;

        return (
          <Section
            key={sec.id}
            title={sec.title}
            open={open}
            onToggle={() => toggleSection(sec.id, defaultOpen)}
            flashKey={
              focusRequest?.id === sec.id ? focusRequest.nonce : undefined
            }
          >
            {sec.content}
          </Section>
        );
      })}
    </>
  );
};

const ElementSections: React.FC<{ el: DesignElement; ctx: SectionContext }> = ({
  el,
  ctx,
}) => {
  const sections = useElementSections(el, ctx);

  return <SectionStack sections={sections} />;
};

const CanvasSections: React.FC<{ ctx: SectionContext }> = ({ ctx }) => {
  const sections = useCanvasSections(ctx);

  return <SectionStack sections={sections} />;
};

interface Props {
  boxes: BoxMap;
  onTooLarge: SectionContext['onTooLarge'];
  openDataPanel: () => void;
}

/** The 320 px desktop inspector (handoff §4–5). */
const Inspector: React.FC<Props> = ({ boxes, onTooLarge, openDataPanel }) => {
  const t = useTranslations('graphics.inspector');
  const selected = useEditorStore(useShallow(selectSelectedElements));
  const one = selected.length === 1 ? selected[0] : null;
  const ctx: SectionContext = {
    box: one
      ? boxOf(boxes, one)
      : { x: 0, y: 0, w: 0, h: 0, rotation: 0, inFlow: false },
    onTooLarge,
    openDataPanel,
  };

  return (
    <aside className="gfx-inspector" aria-label={t('properties')}>
      {selected.length > 1 ? (
        <>
          <MultiHeader count={selected.length} />
          <MultiBody selected={selected} />
        </>
      ) : one ? (
        <>
          <ElementHeader el={one} />
          <ElementSections key={one.id} el={one} ctx={ctx} />
        </>
      ) : (
        <>
          <CanvasHeader />
          <CanvasSections ctx={ctx} />
        </>
      )}
    </aside>
  );
};

export default Inspector;
