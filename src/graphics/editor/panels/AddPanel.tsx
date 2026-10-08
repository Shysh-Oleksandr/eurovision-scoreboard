'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { ElementType } from '../../model/design';
import { ADDABLE_TYPES } from '../../model/elements';
import { useEditorStore } from '../editorStore';
import { createElement } from '../elementFactory';
import { TYPE_ICONS } from '../inspector/Inspector';

interface Props {
  /** Phone: close the sheet after adding. */
  onAdded?: () => void;
}

/** List of element types; adds at the canvas centre and selects it (§6). */
const AddPanel: React.FC<Props> = ({ onAdded }) => {
  const t = useTranslations('graphics.add');
  const addElement = useEditorStore((s) => s.addElement);
  const canvas = useEditorStore((s) => s.design.canvas);

  const add = (type: ElementType) => {
    addElement(createElement(type, canvas));
    onAdded?.();
  };

  return (
    <div className="gfx-add-list">
      {ADDABLE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className="gfx-add-row"
          onClick={() => add(type)}
        >
          <span className="gfx-add-icon">{TYPE_ICONS[type]}</span>
          <span>
            <b>{t(`${type}.name`)}</b>
            <em>{t(`${type}.description`)}</em>
          </span>
        </button>
      ))}
    </div>
  );
};

export default AddPanel;
