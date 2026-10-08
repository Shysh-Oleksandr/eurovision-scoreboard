'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import Button from '@/components/common/Button';
import { Dialog } from '@/graphics/editor/chrome/EditorDialogs';
import { Field } from '@/graphics/editor/ui/controls';

interface Props {
  open: boolean;
  title: string;
  label: string;
  value: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

/** A one-field dialog (rename) in the editor's dialog style. */
const PromptDialog: React.FC<Props> = ({
  open,
  title,
  label,
  value,
  confirmLabel,
  onConfirm,
  onClose,
}) => {
  const t = useTranslations('graphics.dialogs');
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText(value);
    setTimeout(() => inputRef.current?.select(), 30);
  }, [open, value]);

  if (!open) return null;
  const trimmed = text.trim();
  const submit = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  return (
    <Dialog onClose={onClose} ariaLabelledBy="gfx-prompt-t">
      <h3 id="gfx-prompt-t">{title}</h3>
      <form
        className="gfx-prompt-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={label}>
          <input
            ref={inputRef}
            className="gfx-input"
            value={text}
            maxLength={80}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div className="gfx-dlg-row">
          <Button variant="cta" size="md" disabled={!trimmed}>
            {confirmLabel}
          </Button>
          <Button variant="surface" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default PromptDialog;
