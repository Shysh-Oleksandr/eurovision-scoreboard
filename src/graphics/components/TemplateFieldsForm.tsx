'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { DataBinding, Design, ManualRow } from '../model/design';
import { CANVAS_PRESETS } from '../model/presets';
import {
  applyTemplateField,
  FieldControl,
  ResolvedField,
  resolveTemplateFields,
} from '../templates/fields';

import DataSourceControl from './DataSourceControl';

import ImageSourceField from '@/graphics/editor/inspector/ImageSourceField';
import {
  Field,
  Hint,
  NumberField,
  RangeField,
  SelectInput,
  TextInput,
} from '@/graphics/editor/ui/controls';
import { useCountryOptions } from '@/graphics/editor/useEditorContext';

interface Props {
  design: Design;
  /** Receives the design with the field applied (publish preview). */
  onChange?: (design: Design) => void;
  /** Receives the raw change; the owner derives the design (template sheet). */
  onField?: (path: string, value: unknown) => void;
  /** Override the fields (publish dialog preview); default = the design's. */
  fields?: ResolvedField[];
  /** One column (publish preview). */
  compact?: boolean;
  /** The rows the template shipped with, so "Manual" stays reachable. */
  manualRows?: { source: 'manual'; rows: ManualRow[] } | null;
  onTooLarge?: (info: { fileName: string; size: number }) => void;
}

const sizeOptions = (current: string) => {
  const presets = CANVAS_PRESETS.map((p) => ({
    value: `${p.width}x${p.height}`,
    label: `${p.width} × ${p.height}`,
  }));

  return presets.some((p) => p.value === current)
    ? presets
    : [{ value: current, label: current.replace('x', ' × ') }, ...presets];
};

const FieldInput: React.FC<{
  field: ResolvedField;
  design: Design;
  set: (value: unknown) => void;
  manualRows?: Props['manualRows'];
  onTooLarge?: Props['onTooLarge'];
}> = ({ field, design, set, manualRows, onTooLarge }) => {
  const t = useTranslations('graphics.fields');
  const countries = useCountryOptions();
  const { control } = field;

  switch (control.kind) {
    case 'text':
      return (
        <TextInput
          value={String(field.value ?? '')}
          aria-label={field.label}
          onValue={set}
        />
      );
    case 'select':
      return (
        <SelectInput<string | number>
          value={field.value as string | number}
          options={control.options.map((o) => ({
            value: o,
            label: control.labelKeys ? t(`${control.labelKeys}.${o}`) : o,
          }))}
          onChange={(v) =>
            set(typeof control.options[0] === 'number' ? Number(v) : v)
          }
          ariaLabel={field.label}
        />
      );
    case 'number':
      return (
        <NumberField
          value={Number(field.value ?? 0)}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={set}
          ariaLabel={field.label}
        />
      );
    case 'range':
      return (
        <RangeField
          value={Number(field.value ?? 1)}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={set}
          ariaLabel={field.label}
        />
      );
    case 'country':
      return (
        <SelectInput<string>
          value={String(field.value ?? '')}
          options={countries}
          onChange={set}
          ariaLabel={field.label}
        />
      );
    case 'size':
      return (
        <>
          <SelectInput<string>
            value={String(field.value)}
            options={sizeOptions(String(field.value))}
            onChange={set}
            ariaLabel={field.label}
          />
          <Hint>{t('sizeHint')}</Hint>
        </>
      );
    case 'image':
      return (
        <ImageSourceField
          src={String(field.value ?? '')}
          onChange={set}
          onTooLarge={onTooLarge ?? (() => undefined)}
        />
      );
    case 'data':
      return (
        <DataSourceControl
          value={design.data}
          onChange={(binding: DataBinding) => set(binding)}
          manualRows={
            manualRows ?? (design.data.source === 'manual' ? design.data : null)
          }
        />
      );
    default:
      return null;
  }
};

const isWide = (control: FieldControl) =>
  control.kind === 'data' || control.kind === 'image';

/** The short form a template exposes (handoff §1, §3). */
const TemplateFieldsForm: React.FC<Props> = ({
  design,
  onChange,
  onField,
  fields,
  compact,
  manualRows,
  onTooLarge,
}) => {
  const resolved = useMemo(
    () => fields ?? resolveTemplateFields(design),
    [fields, design],
  );

  if (!resolved.length) return null;

  return (
    <div className={`gfx-tpl-fields${compact ? ' is-one' : ''}`}>
      {resolved.map((field) => (
        <Field
          key={field.path}
          label={field.label}
          className={isWide(field.control) ? 'is-wide' : undefined}
        >
          <FieldInput
            field={field}
            design={design}
            manualRows={manualRows}
            onTooLarge={onTooLarge}
            set={(value) => {
              onField?.(field.path, value);
              onChange?.(applyTemplateField(design, field.path, value));
            }}
          />
        </Field>
      ))}
    </div>
  );
};

export default TemplateFieldsForm;
