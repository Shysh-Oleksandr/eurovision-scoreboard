'use client';
import { ArrowDown, ArrowUp, BringToFront, SendToBack } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { DesignElement } from '../../model/design';
import { canHide, canRotate, resizeModeOf } from '../../model/elements';
import { signedAngle } from '../../model/geometry';
import { useEditorStore } from '../editorStore';
import { Field, NumberField, RangeField, Row, Toggle } from '../ui/controls';
import { ElementBox } from '../useElementBoxes';

import Button from '@/components/common/Button';

interface Props {
  el: DesignElement;
  box: ElementBox;
  /** Phones put the d-pad above the fields. */
  children?: React.ReactNode;
}

/**
 * "Position & size": X, Y, W, H (read-only with a lock glyph when the
 * content decides), Rotation, Opacity, Lock, Hide and the z-order row.
 * Stack children have no position of their own, so only opacity and the
 * flags are offered.
 */
const LayoutSection: React.FC<Props> = ({ el, box, children }) => {
  const t = useTranslations('graphics.inspector.layout');
  const update = useEditorStore((s) => s.updateElement);
  const reorder = useEditorStore((s) => s.reorder);
  const set = (patch: Partial<DesignElement>) => update(el.id, patch);
  const mode = resizeModeOf(el);
  const wLocked = mode === 'none';
  const hLocked = mode !== 'all';
  const roTitle = t('setByContent');

  return (
    <>
      {children}
      {!box.inFlow && (
        <>
          <Row cols={4}>
            <Field label="X">
              <NumberField
                value={Math.round(el.x)}
                onChange={(x) => set({ x })}
                ariaLabel="X"
                compact
              />
            </Field>
            <Field label="Y">
              <NumberField
                value={Math.round(el.y)}
                onChange={(y) => set({ y })}
                ariaLabel="Y"
                compact
              />
            </Field>
            <Field label="W">
              <NumberField
                value={Math.round(box.w)}
                min={24}
                readOnly={wLocked}
                readOnlyTitle={roTitle}
                onChange={(w) => set({ w })}
                ariaLabel="W"
                compact
              />
            </Field>
            <Field label="H">
              <NumberField
                value={Math.round(box.h)}
                min={24}
                readOnly={hLocked}
                readOnlyTitle={roTitle}
                onChange={(h) => set({ h })}
                ariaLabel="H"
                compact
              />
            </Field>
          </Row>
          <Row>
            <Field label={t('rotation')}>
              <NumberField
                value={Math.round(signedAngle(el.rotation))}
                min={-180}
                max={180}
                unit="°"
                readOnly={!canRotate(el)}
                readOnlyTitle={roTitle}
                onChange={(rotation) =>
                  set({ rotation: ((rotation % 360) + 360) % 360 })
                }
                ariaLabel={t('rotation')}
              />
            </Field>
            <Field label={t('opacity')}>
              <RangeField
                value={el.opacity}
                onChange={(opacity) => set({ opacity })}
                ariaLabel={t('opacity')}
              />
            </Field>
          </Row>
        </>
      )}
      {box.inFlow && (
        <Field label={t('opacity')}>
          <RangeField
            value={el.opacity}
            onChange={(opacity) => set({ opacity })}
            ariaLabel={t('opacity')}
          />
        </Field>
      )}
      <Row>
        <Toggle
          label={t('lock')}
          checked={el.locked}
          onChange={(locked) => set({ locked })}
        />
        {canHide(el) && (
          <Toggle
            label={t('hide')}
            checked={el.hidden}
            onChange={(hidden) => set({ hidden })}
          />
        )}
      </Row>
      {!box.inFlow && (
        <div className="gfx-zrow">
          <span className="gfx-field-label">{t('order')}</span>
          <Button
            variant="surface"
            size="sm"
            title={t('sendBackward')}
            Icon={<ArrowDown className="size-[14px]" />}
            onClick={() => reorder(el.id, -1)}
          />
          <Button
            variant="surface"
            size="sm"
            title={t('bringForward')}
            Icon={<ArrowUp className="size-[14px]" />}
            onClick={() => reorder(el.id, 1)}
          />
          <Button
            variant="surface"
            size="sm"
            Icon={<SendToBack className="size-[14px]" />}
            onClick={() => reorder(el.id, 'back')}
          >
            {t('back')}
          </Button>
          <Button
            variant="surface"
            size="sm"
            Icon={<BringToFront className="size-[14px]" />}
            onClick={() => reorder(el.id, 'front')}
          >
            {t('front')}
          </Button>
        </div>
      )}
    </>
  );
};

export default LayoutSection;
