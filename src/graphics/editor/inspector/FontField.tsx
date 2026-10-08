'use client';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { Design, DesignFont, FontSlot, walkElements } from '../../model/design';
import { designFontLabel, useElementFont } from '../../render/useElementFont';
import { useEditorStore } from '../editorStore';
import { Field, Hint, Seg } from '../ui/controls';

import { FontSelection } from '@/components/setup/widgets-section/custom-themes/fonts/fontPickerTypes';
import { cn } from '@/helpers/utils';
import { DEFAULT_FONT_ALIAS, FONT_OPTION_LABELS } from '@/theme/fontAliases';

const FontPickerModal = dynamic(
  () =>
    import(
      '@/components/setup/widgets-section/custom-themes/fonts/FontPickerModal'
    ),
  { ssr: false },
);

const fontKey = (font: DesignFont): string =>
  font.kind === 'builtin' ? `builtin:${font.alias}` : `custom:${font.font._id}`;

/** Distinct fonts the design's elements already use (quick picks). */
export function usedDesignFonts(design: Design): DesignFont[] {
  const seen = new Set<string>();
  const out: DesignFont[] = [];

  walkElements(design.elements, (el) => {
    if (
      (el.type === 'text' || el.type === 'branding') &&
      el.fontSlot === 'custom' &&
      el.font
    ) {
      const key = fontKey(el.font);

      if (!seen.has(key)) {
        seen.add(key);
        out.push(el.font);
      }
    }
  });

  return out;
}

const FontChip: React.FC<{
  font: DesignFont;
  on: boolean;
  onClick: () => void;
}> = ({ font, on, onClick }) => {
  const style = useElementFont('custom', font);

  return (
    <button
      type="button"
      className={cn('gfx-fontchip', on && 'is-on')}
      style={style.style}
      onClick={onClick}
      title={designFontLabel(font, FONT_OPTION_LABELS)}
    >
      {designFontLabel(font, FONT_OPTION_LABELS)}
    </button>
  );
};

const FontTrigger: React.FC<{ font: DesignFont; onClick: () => void }> = ({
  font,
  onClick,
}) => {
  const t = useTranslations('graphics.inspector.text');
  const style = useElementFont('custom', font);

  return (
    <button
      type="button"
      className="gfx-fontbtn"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <span className="gfx-fontbtn-name" style={style.style}>
        {designFontLabel(font, FONT_OPTION_LABELS)}
      </span>
      {font.kind === 'custom' && (
        <span className="gfx-fontbtn-tag">{t('libraryFont')}</span>
      )}
      <ChevronDown className="size-[15px] opacity-60" />
    </button>
  );
};

interface Props {
  slot: FontSlot;
  font?: DesignFont;
  onChange: (slot: FontSlot, font?: DesignFont) => void;
}

/**
 * "Font": the design theme's UI or scoreboard font, or a font of the
 * element's own picked from the font library (bundled, mine, public,
 * upload). Fonts already used elsewhere in the design are one click away.
 */
const FontField: React.FC<Props> = ({ slot, font, onChange }) => {
  const t = useTranslations('graphics.inspector.text');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pushModal = useEditorStore((s) => s.pushModal);
  const popModal = useEditorStore((s) => s.popModal);
  const design = useEditorStore((s) => s.design);

  // The picker is not one of the editor's own dialogs: pause the editor
  // shortcuts (Delete would remove the element being styled) while open.
  useEffect(() => {
    if (!pickerOpen) return undefined;
    pushModal();

    return () => popModal();
  }, [pickerOpen, pushModal, popModal]);
  const used = useMemo(() => usedDesignFonts(design), [design]);
  const current = useMemo<DesignFont>(
    () => font ?? { kind: 'builtin', alias: DEFAULT_FONT_ALIAS },
    [font],
  );
  const quick = useMemo(
    () =>
      used.filter(
        (f) => !(slot === 'custom' && fontKey(f) === fontKey(current)),
      ),
    [used, slot, current],
  );

  return (
    <>
      <Field label={t('font')}>
        <Seg<FontSlot>
          value={slot}
          onChange={(next) => {
            // Switching to "Custom" starts from the default face; the
            // fonts already used in the design are one click below.
            if (next === 'custom') onChange('custom', font ?? current);
            else onChange(next, font);
          }}
          options={[
            { value: 'ui', label: t('uiFont') },
            { value: 'scoreboard', label: t('scoreboardFont') },
            { value: 'custom', label: t('customFont') },
          ]}
        />
      </Field>
      {slot === 'custom' && (
        <>
          <FontTrigger font={current} onClick={() => setPickerOpen(true)} />
          {quick.length > 0 && (
            <div className="gfx-fontquick">
              <span className="gfx-field-label">{t('inThisDesign')}</span>
              <div className="gfx-fontchips">
                {quick.map((f) => (
                  <FontChip
                    key={fontKey(f)}
                    font={f}
                    on={false}
                    onClick={() => onChange('custom', f)}
                  />
                ))}
              </div>
            </div>
          )}
          {!quick.length && <Hint>{t('customFontHint')}</Hint>}
        </>
      )}
      {pickerOpen && (
        <FontPickerModal
          isOpen
          slot="element"
          value={current as FontSelection}
          overlayClassName="!z-[1012]"
          onSelect={(selection) => {
            onChange('custom', selection as DesignFont);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
};

export default FontField;
