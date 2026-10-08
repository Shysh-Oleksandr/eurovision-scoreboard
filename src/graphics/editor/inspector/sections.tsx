'use client';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Database,
  Info,
  Maximize,
  Palette,
  Type,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { BRANDING_DEFAULTS } from '../../elements/BrandingElement';
import { useStatsSource } from '../../elements/StatsElement';
import {
  BrandingElement,
  DesignElement,
  Fill,
  ITEM_SIZES,
  ItemSize,
  ShapeElement,
  StackElement,
  StatsElement,
  TextElement,
} from '../../model/design';
import {
  buildGradient,
  CANVAS_PRESETS,
  DEFAULT_COLOR_FILL,
  DEFAULT_GRADIENT_FILL,
  findPreset,
  parseGradient,
} from '../../model/presets';
import { fitScoreboard, rowsHeightIn } from '../../model/scoreboardFit';
import { useDesignData } from '../../render/DesignDataContext';
import { useEditorStore } from '../editorStore';
import {
  Chip,
  ColorField,
  Field,
  Hint,
  Note,
  NumberField,
  RangeField,
  Row,
  Seg,
  SelectInput,
  TextArea,
  Toggle,
} from '../ui/controls';
import { useDataLabel, useThemeName } from '../useEditorContext';
import { ElementBox } from '../useElementBoxes';

import FontField from './FontField';
import ImageSourceField from './ImageSourceField';
import LayoutSection from './LayoutSection';
import ThemeSection from './ThemeSection';

import Button from '@/components/common/Button';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface InspectorSection {
  id: string;
  title: string;
  /** Collapsed until the user opens it (desktop). */
  collapsed?: boolean;
  content: React.ReactNode;
}

export interface SectionContext {
  box: ElementBox;
  onTooLarge: (info: { fileName: string; size: number }) => void;
  openDataPanel: () => void;
  /** Phone: rendered at the top of the Layout tab. */
  layoutPrefix?: React.ReactNode;
}

const ROW_SIZE_LABELS: Record<ItemSize, string> = {
  sm: 'S',
  md: 'M',
  lg: 'L',
  xl: 'XL',
  '2xl': '2XL',
};

/** The four weights every font (bundled or uploaded) renders; see docs. */
const WEIGHTS = [
  { value: 400, key: 'regular' },
  { value: 500, key: 'medium' },
  { value: 600, key: 'semibold' },
  { value: 700, key: 'bold' },
] as const;

/** Nearest offered weight (older documents may carry 800). */
const nearestWeight = (w: number): number =>
  WEIGHTS.find((x) => x.value === w)
    ? w
    : w <= 400
    ? 400
    : w >= 700
    ? 700
    : w < 550
    ? 500
    : 600;

const WeightSelect: React.FC<{
  value: number;
  onChange: (w: number) => void;
}> = ({ value, onChange }) => {
  const t = useTranslations('graphics.inspector.text');

  return (
    <SelectInput<number>
      value={nearestWeight(value)}
      onChange={onChange}
      options={WEIGHTS.map((w) => ({
        value: w.value,
        label: t(`weights.${w.key}`),
      }))}
      ariaLabel={t('weight')}
    />
  );
};

/* ---------------------------------------------------------------- */

const DataSection: React.FC<{ openDataPanel: () => void }> = ({
  openDataPanel,
}) => {
  const t = useTranslations('graphics.inspector.data');
  const data = useEditorStore((s) => s.design.data);
  const label = useDataLabel(data);

  return (
    <>
      <div className="gfx-data-sum">
        <Chip tone="data" icon={<Database className="size-[13px]" />}>
          {label}
        </Chip>
        <button type="button" className="gfx-link" onClick={openDataPanel}>
          {t('change')}
        </button>
      </div>
      <Hint>{t('elementsUseDesignData')}</Hint>
    </>
  );
};

/** "Rows follow the design theme …" with a jump to the Theme section. */
/** Stats elements without a source: say why and point at the Data panel. */
const StatsSourceNote: React.FC<{
  el: StatsElement;
  openDataPanel: () => void;
}> = ({ el, openDataPanel }) => {
  const t = useTranslations('graphics.inspector.stats');
  const source = useStatsSource(el);

  if (source) return null;

  return (
    <Note
      tone="warn"
      icon={<Info className="size-[15px]" />}
      action={
        <Button
          variant="surface"
          size="sm"
          className="w-full justify-center"
          Icon={<Database className="size-[14px]" />}
          onClick={openDataPanel}
        >
          {t('changeDataSource')}
        </Button>
      }
    >
      <b>{t('noSourceTitle')}</b> {t('noSourceBody')}
    </Note>
  );
};

const RowStyleNote: React.FC<{ cells?: boolean }> = ({ cells }) => {
  const t = useTranslations('graphics.inspector.rowStyle');
  const themeName = useThemeName();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const focusSection = useEditorStore((s) => s.focusSection);
  const setSheet = useEditorStore((s) => s.setSheet);
  const goToTheme = () => {
    clearSelection();
    if (desktop) focusSection('theme');
    else setSheet('canvas', 'theme');
  };

  return (
    <Note
      tone="theme"
      icon={<Palette className="size-4" />}
      action={
        <Button
          variant="surface"
          size="sm"
          className="w-full justify-center"
          Icon={<Palette className="size-[14px]" />}
          onClick={goToTheme}
        >
          {t('changeTheme')}
        </Button>
      }
    >
      <span>
        {cells
          ? t.rich('cellsFollowTheme', {
              name: themeName,
              b: (chunks) => <b>{chunks}</b>,
            })
          : t.rich('rowsFollowTheme', {
              name: themeName,
              b: (chunks) => <b>{chunks}</b>,
            })}
      </span>
      <em>{t('setInThemeEditor')}</em>
    </Note>
  );
};

const BrandingStyle: React.FC<{ el: BrandingElement }> = ({ el }) => {
  const t = useTranslations('graphics.inspector');
  const update = useEditorStore((s) => s.updateElement);
  const set = (patch: Partial<BrandingElement>) => update(el.id, patch);

  return (
    <>
      <Row>
        <Field label={t('branding.size')}>
          <NumberField
            value={el.fontSize}
            step={2}
            min={12}
            max={64}
            unit="px"
            onChange={(fontSize) => set({ fontSize })}
            ariaLabel={t('branding.size')}
          />
        </Field>
        <Field label={t('text.weight')}>
          <WeightSelect
            value={el.fontWeight ?? BRANDING_DEFAULTS.fontWeight}
            onChange={(fontWeight) => set({ fontWeight })}
          />
        </Field>
      </Row>
      <Field label={t('text.colour')}>
        <ColorField
          value={el.color ?? BRANDING_DEFAULTS.color}
          onChange={(color) => set({ color })}
          ariaLabel={t('text.colour')}
        />
      </Field>
      <FontField
        slot={el.fontSlot ?? 'ui'}
        font={el.font}
        onChange={(fontSlot, font) => set({ fontSlot, font })}
      />
      <Toggle
        label={t('branding.showIcon')}
        checked={el.showIcon ?? BRANDING_DEFAULTS.showIcon}
        onChange={(showIcon) => set({ showIcon })}
      />
      <Toggle
        label={t('text.shadow')}
        checked={el.shadow ?? BRANDING_DEFAULTS.shadow}
        onChange={(shadow) => set({ shadow })}
      />
      <Toggle
        label={t('text.uppercase')}
        checked={el.uppercase ?? BRANDING_DEFAULTS.uppercase}
        onChange={(uppercase) => set({ uppercase })}
      />
      <Hint icon>{t('branding.staysOnEveryDesign')}</Hint>
    </>
  );
};

const TextStyle: React.FC<{ el: TextElement }> = ({ el }) => {
  const t = useTranslations('graphics.inspector.text');
  const update = useEditorStore((s) => s.updateElement);
  const set = (patch: Partial<TextElement>) => update(el.id, patch);

  return (
    <>
      <FontField
        slot={el.fontSlot}
        font={el.font}
        onChange={(fontSlot, font) => set({ fontSlot, font })}
      />
      <Row>
        <Field label={t('size')}>
          <NumberField
            value={el.fontSize}
            step={2}
            min={8}
            max={400}
            unit="px"
            onChange={(fontSize) => set({ fontSize })}
            ariaLabel={t('size')}
          />
        </Field>
        <Field label={t('weight')}>
          <WeightSelect
            value={el.fontWeight}
            onChange={(fontWeight) => set({ fontWeight })}
          />
        </Field>
      </Row>
      <Row>
        <Field label={t('colour')}>
          <ColorField
            value={el.color}
            onChange={(color) => set({ color })}
            ariaLabel={t('colour')}
          />
        </Field>
        <Field label={t('align')}>
          <Seg<'left' | 'center' | 'right'>
            icons
            value={el.align}
            onChange={(align) => set({ align })}
            options={[
              {
                value: 'left',
                label: <AlignLeft className="size-[15px]" />,
                title: t('alignLeft'),
              },
              {
                value: 'center',
                label: <AlignCenter className="size-[15px]" />,
                title: t('alignCentre'),
              },
              {
                value: 'right',
                label: <AlignRight className="size-[15px]" />,
                title: t('alignRight'),
              },
            ]}
          />
        </Field>
      </Row>
      <Toggle
        label={t('uppercase')}
        checked={el.uppercase}
        onChange={(uppercase) => set({ uppercase })}
      />
      <Toggle
        label={t('shadow')}
        checked={!!el.shadow}
        onChange={(on) =>
          set({ shadow: on ? '0 2px 10px rgba(0, 0, 0, 0.45)' : null })
        }
      />
      <Field label={t('lineHeight')}>
        <NumberField
          value={el.lineHeight}
          step={0.05}
          min={0.8}
          max={2}
          onChange={(lineHeight) => set({ lineHeight })}
          ariaLabel={t('lineHeight')}
        />
      </Field>
    </>
  );
};

const FillFields: React.FC<{
  fill: Fill;
  onChange: (fill: Fill) => void;
  allowTheme: boolean;
  allowImage: boolean;
  onTooLarge: SectionContext['onTooLarge'];
  labels: { solid: string; gradient: string; theme: string; image: string };
}> = ({ fill, onChange, allowTheme, allowImage, onTooLarge, labels }) => {
  const t = useTranslations('graphics.inspector.fill');
  const kind =
    fill.kind === 'theme-surface' || fill.kind === 'theme-bg'
      ? 'theme'
      : fill.kind;
  const gradient = fill.kind === 'gradient' ? parseGradient(fill.value) : null;
  const options = [
    ...(allowTheme ? [{ value: 'theme', label: labels.theme }] : []),
    { value: 'color', label: labels.solid },
    { value: 'gradient', label: labels.gradient },
    ...(allowImage ? [{ value: 'image', label: labels.image }] : []),
  ];

  return (
    <>
      <Field label={t('fill')}>
        <Seg<string>
          value={kind}
          onChange={(k) => {
            const { opacity } = fill;

            if (k === 'theme')
              onChange({
                kind: allowImage ? 'theme-bg' : 'theme-surface',
                opacity,
              });
            else if (k === 'color')
              onChange({ ...DEFAULT_COLOR_FILL, opacity });
            else if (k === 'gradient')
              onChange({ ...DEFAULT_GRADIENT_FILL, opacity });
            else if (k === 'image')
              onChange({
                kind: 'image',
                url: 'theme:bg',
                fit: 'cover',
                opacity,
              });
          }}
          options={options}
        />
      </Field>
      {fill.kind === 'color' && (
        <Field label={t('colour')}>
          <ColorField
            value={fill.value}
            onChange={(value) => onChange({ ...fill, value })}
            ariaLabel={t('colour')}
          />
        </Field>
      )}
      {fill.kind === 'gradient' && gradient && (
        <>
          <Row>
            <Field label={t('from')}>
              <ColorField
                value={gradient.from}
                onChange={(from) =>
                  onChange({
                    ...fill,
                    value: buildGradient({ ...gradient, from }),
                  })
                }
                ariaLabel={t('from')}
              />
            </Field>
            <Field label={t('to')}>
              <ColorField
                value={gradient.to}
                onChange={(to) =>
                  onChange({
                    ...fill,
                    value: buildGradient({ ...gradient, to }),
                  })
                }
                ariaLabel={t('to')}
              />
            </Field>
          </Row>
          <Field label={t('angle')}>
            <NumberField
              value={gradient.angle}
              step={5}
              min={0}
              max={360}
              unit="°"
              onChange={(angle) =>
                onChange({
                  ...fill,
                  value: buildGradient({ ...gradient, angle }),
                })
              }
              ariaLabel={t('angle')}
            />
          </Field>
        </>
      )}
      {fill.kind === 'image' && (
        <>
          <ImageSourceField
            src={fill.url}
            onChange={(url) => onChange({ ...fill, url })}
            onTooLarge={onTooLarge}
          />
          <Field label={t('fit')}>
            <Seg<'cover' | 'contain'>
              value={fill.fit}
              onChange={(fit) => onChange({ ...fill, fit })}
              options={[
                { value: 'cover', label: t('cover') },
                { value: 'contain', label: t('contain') },
              ]}
            />
          </Field>
        </>
      )}
      {fill.kind === 'theme-surface' && <Hint>{t('themeSurfaceHint')}</Hint>}
    </>
  );
};

const ShapeStyle: React.FC<{
  el: ShapeElement;
  onTooLarge: SectionContext['onTooLarge'];
}> = ({ el, onTooLarge }) => {
  const t = useTranslations('graphics.inspector.shape');
  const update = useEditorStore((s) => s.updateElement);
  const set = (patch: Partial<ShapeElement>) => update(el.id, patch);

  return (
    <>
      <Field label={t('shape')}>
        <Seg<'rect' | 'ellipse'>
          value={el.kind}
          onChange={(kind) => set({ kind })}
          options={[
            { value: 'rect', label: t('rectangle') },
            { value: 'ellipse', label: t('ellipse') },
          ]}
        />
      </Field>
      <FillFields
        fill={el.fill}
        onChange={(fill) => set({ fill })}
        allowTheme
        allowImage={false}
        onTooLarge={onTooLarge}
        labels={{
          solid: t('solid'),
          gradient: t('gradient'),
          theme: t('themeSurface'),
          image: t('image'),
        }}
      />
      {el.kind === 'rect' && (
        <Field label={t('cornerRadius')}>
          <NumberField
            value={el.radius}
            step={2}
            min={0}
            unit="px"
            onChange={(radius) => set({ radius })}
            ariaLabel={t('cornerRadius')}
          />
        </Field>
      )}
      <Row>
        <Field label={t('stroke')}>
          <NumberField
            value={el.strokeWidth}
            step={1}
            min={0}
            max={40}
            unit="px"
            onChange={(strokeWidth) => set({ strokeWidth })}
            ariaLabel={t('stroke')}
          />
        </Field>
        {el.strokeWidth > 0 && (
          <Field label={t('strokeColour')}>
            <ColorField
              value={el.strokeColor ?? 'rgba(255, 255, 255, 0.6)'}
              onChange={(strokeColor) => set({ strokeColor })}
              ariaLabel={t('strokeColour')}
            />
          </Field>
        )}
      </Row>
      <Toggle
        label={t('shadow')}
        checked={el.shadow}
        onChange={(shadow) => set({ shadow })}
      />
    </>
  );
};

type ScoreboardModel = Extract<DesignElement, { type: 'scoreboard' }>;

/** Columns and row size an auto-fit scoreboard resolves to in `box`. */
const resolvedFit = (el: ScoreboardModel, box: ElementBox, rows: number) =>
  fitScoreboard(rows, box.w, rowsHeightIn(el.h ?? box.h, el.paddingY));

const ScoreboardRows: React.FC<{
  el: ScoreboardModel;
  box: ElementBox;
}> = ({ el, box }) => {
  const t = useTranslations('graphics.inspector.scoreboard');
  const update = useEditorStore((s) => s.updateElement);
  const { countries } = useDesignData();
  const total = countries.length;
  const shown = el.limit > 0 ? Math.min(el.limit, total) : total;
  const set = (patch: Partial<typeof el>) => update(el.id, patch);
  const auto = el.fit === 'auto';

  return (
    <>
      <Field label={t('layout')}>
        <Seg<'auto' | 'fixed'>
          value={el.fit}
          onChange={(fit) => {
            if (fit === el.fit) return;
            if (fit === 'auto') {
              // A free scoreboard fits into its current box.
              set({ fit, h: box.inFlow ? el.h : Math.round(box.h) });

              return;
            }
            // Keep what is on screen: freeze the fitted columns and size.
            const { columns, itemSize } = resolvedFit(el, box, shown);

            set({
              fit,
              columns,
              itemSize,
              h: box.inFlow ? el.h : undefined,
            });
          }}
          options={[
            { value: 'auto', label: t('autoFit') },
            { value: 'fixed', label: t('fixed') },
          ]}
        />
      </Field>
      {auto ? (
        <Hint>{t('autoFitHint')}</Hint>
      ) : (
        <>
          <Field label={t('columns')}>
            <Seg<number>
              value={el.columns}
              onChange={(columns) => set({ columns })}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n }))}
            />
          </Field>
          <Field label={t('rowSize')}>
            <Seg<ItemSize>
              value={el.itemSize}
              onChange={(itemSize) => set({ itemSize })}
              options={ITEM_SIZES.map((s) => ({
                value: s,
                label: ROW_SIZE_LABELS[s],
              }))}
            />
          </Field>
        </>
      )}
      <Toggle
        label={t('showPoints')}
        checked={el.showPoints}
        onChange={(showPoints) => set({ showPoints })}
      />
      <Toggle
        label={t('showRankings')}
        checked={el.showRankings}
        onChange={(showRankings) => set({ showRankings })}
      />
      <Toggle
        label={t('shortNames')}
        checked={el.shortNames}
        onChange={(shortNames) => set({ shortNames })}
      />
      <Field
        label={t('rowLimit')}
        hint={
          el.limit > 0
            ? t('nOfTotal', { n: shown, total })
            : t('allN', { total })
        }
      >
        <NumberField
          value={el.limit}
          step={1}
          min={0}
          max={Math.max(total, 1)}
          onChange={(limit) => set({ limit })}
          ariaLabel={t('rowLimit')}
        />
      </Field>
      <Field label={t('status')}>
        <Seg<'live' | 'uniform'>
          value={el.statusMode}
          onChange={(statusMode) => set({ statusMode })}
          options={[
            { value: 'live', label: t('liveColours') },
            { value: 'uniform', label: t('uniform') },
          ]}
        />
      </Field>
      <Field label={t('order')}>
        <Seg<'ranked' | 'runningOrder'>
          value={el.rowOrder}
          onChange={(rowOrder) => set({ rowOrder })}
          options={[
            { value: 'ranked', label: t('ranked') },
            { value: 'runningOrder', label: t('runningOrder') },
          ]}
        />
      </Field>
    </>
  );
};

const ScoreboardSize: React.FC<{
  el: ScoreboardModel;
  box: ElementBox;
}> = ({ el, box }) => {
  const t = useTranslations('graphics.inspector.scoreboard');
  const update = useEditorStore((s) => s.updateElement);
  const canvasWidth = useEditorStore((s) => s.design.canvas.width);
  const { countries } = useDesignData();
  const total = countries.length;
  const shown = el.limit > 0 ? Math.min(el.limit, total) : total;
  const auto = el.fit === 'auto';
  const fit = resolvedFit(el, box, shown);

  return (
    <Note
      icon={<Info className="size-[15px]" />}
      action={
        !box.inFlow && (
          <Button
            variant="surface"
            size="sm"
            className="w-full justify-center"
            Icon={<Maximize className="size-[14px]" />}
            onClick={() =>
              update(el.id, { x: 60, w: Math.max(200, canvasWidth - 120) })
            }
          >
            {t('fitCanvasWidth')}
          </Button>
        )
      }
    >
      <b>{t(auto ? 'fitsToBox' : 'sizesToContent')}</b>{' '}
      {t.rich(auto ? 'fitSummary' : 'sizeSummary', {
        rows: shown,
        columns: auto ? fit.columns : el.columns,
        size: ROW_SIZE_LABELS[auto ? fit.itemSize : el.itemSize],
        w: Math.round(box.w),
        h: Math.round(box.h),
        b: (chunks) => <b>{chunks}</b>,
      })}
    </Note>
  );
};

const StackContent: React.FC<{ el: StackElement }> = ({ el }) => {
  const t = useTranslations('graphics.inspector.stack');
  const update = useEditorStore((s) => s.updateElement);
  const select = useEditorStore((s) => s.select);
  const set = (patch: Partial<StackElement>) => update(el.id, patch);

  return (
    <>
      <Field label={t('direction')}>
        <Seg<'row' | 'column'>
          value={el.direction}
          onChange={(direction) => set({ direction })}
          options={[
            { value: 'row', label: t('row') },
            { value: 'column', label: t('column') },
          ]}
        />
      </Field>
      <Row>
        <Field label={t('gap')}>
          <NumberField
            value={el.gap}
            step={4}
            min={0}
            unit="px"
            onChange={(gap) => set({ gap })}
            ariaLabel={t('gap')}
          />
        </Field>
        <Field label={t('padding')}>
          <NumberField
            value={el.paddingX}
            step={4}
            min={0}
            unit="px"
            onChange={(paddingX) => set({ paddingX })}
            ariaLabel={t('padding')}
          />
        </Field>
      </Row>
      <Field label={t('alignment')}>
        <Seg<StackElement['align']>
          value={el.align}
          onChange={(align) => set({ align })}
          options={[
            { value: 'start', label: t('start') },
            { value: 'center', label: t('centre') },
            { value: 'end', label: t('end') },
          ]}
        />
      </Field>
      <div className="gfx-children">
        <span className="gfx-field-label">{t('insideThisStack')}</span>
        {el.children.map((child) => (
          <button
            key={child.id}
            type="button"
            className="gfx-child-row"
            onClick={() => select([child.id])}
          >
            <Type className="size-[14px] opacity-50" />
            <span className="truncate">
              {child.name ?? (child.type === 'text' ? child.text : child.type)}
            </span>
            {child.type === 'text' && <em>{child.fontSize}px</em>}
          </button>
        ))}
      </div>
    </>
  );
};

/* ---------------------------------------------------------------- */

export function useElementSections(
  el: DesignElement,
  ctx: SectionContext,
): InspectorSection[] {
  const t = useTranslations('graphics.inspector');
  const update = useEditorStore((s) => s.updateElement);
  const countryOptions = useMemo(
    () =>
      [...ALL_COUNTRIES]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.code, label: c.name })),
    [],
  );
  const out: InspectorSection[] = [];

  switch (el.type) {
    case 'text':
      out.push({
        id: 'content',
        title: t('sections.content'),
        content: (
          <Field label={t('text.text')}>
            <TextArea
              rows={3}
              value={el.text}
              data-gfx-text-field
              onValue={(text) => update(el.id, { text })}
            />
          </Field>
        ),
      });
      out.push({
        id: 'style',
        title: t('sections.style'),
        content: <TextStyle el={el} />,
      });
      break;
    case 'image':
      out.push({
        id: 'content',
        title: t('sections.content'),
        content: (
          <ImageSourceField
            src={el.src}
            onChange={(src) => update(el.id, { src })}
            onTooLarge={ctx.onTooLarge}
          />
        ),
      });
      out.push({
        id: 'style',
        title: t('sections.style'),
        content: (
          <>
            <Field label={t('image.fit')}>
              <Seg<'cover' | 'contain'>
                value={el.fit}
                onChange={(fit) => update(el.id, { fit })}
                options={[
                  { value: 'cover', label: t('fill.cover') },
                  { value: 'contain', label: t('fill.contain') },
                ]}
              />
            </Field>
            <Field label={t('image.cornerRadius')}>
              <NumberField
                value={el.radius}
                step={2}
                min={0}
                unit="px"
                onChange={(radius) => update(el.id, { radius })}
                ariaLabel={t('image.cornerRadius')}
              />
            </Field>
            <Field label={t('image.mask')}>
              <Seg<'none' | 'circle' | 'heart'>
                value={el.mask}
                onChange={(mask) => update(el.id, { mask })}
                options={[
                  { value: 'none', label: t('image.none') },
                  { value: 'circle', label: t('image.circle') },
                  { value: 'heart', label: t('image.heart') },
                ]}
              />
            </Field>
          </>
        ),
      });
      break;
    case 'shape':
      out.push({
        id: 'style',
        title: t('sections.style'),
        content: <ShapeStyle el={el} onTooLarge={ctx.onTooLarge} />,
      });
      break;
    case 'flag':
      out.push({
        id: 'content',
        title: t('sections.content'),
        content: (
          <Field label={t('flag.country')}>
            <SelectInput<string>
              value={el.countryCode}
              onChange={(countryCode) => update(el.id, { countryCode })}
              options={countryOptions}
              ariaLabel={t('flag.country')}
            />
          </Field>
        ),
      });
      out.push({
        id: 'style',
        title: t('sections.style'),
        content: (
          <Field label={t('flag.shape')}>
            <Seg<'rect' | 'round' | 'heart'>
              value={el.shape}
              onChange={(shape) => update(el.id, { shape })}
              options={[
                { value: 'rect', label: t('flag.rectangle') },
                { value: 'round', label: t('flag.round') },
                { value: 'heart', label: t('flag.heart') },
              ]}
            />
          </Field>
        ),
      });
      break;
    case 'scoreboard':
      out.push({
        id: 'data',
        title: t('sections.data'),
        content: <DataSection openDataPanel={ctx.openDataPanel} />,
      });
      out.push({
        id: 'rows',
        title: t('sections.rows'),
        content: <ScoreboardRows el={el} box={ctx.box} />,
      });
      out.push({
        id: 'size',
        title: t('sections.size'),
        content: <ScoreboardSize el={el} box={ctx.box} />,
      });
      out.push({
        id: 'rowstyle',
        title: t('sections.rowStyle'),
        content: <RowStyleNote />,
      });
      break;
    case 'stats':
      out.push({
        id: 'data',
        title: t('sections.data'),
        content: <DataSection openDataPanel={ctx.openDataPanel} />,
      });
      out.push({
        id: 'table',
        title: t('sections.table'),
        content: (
          <>
            <StatsSourceNote el={el} openDataPanel={ctx.openDataPanel} />
            <Field label={t('stats.tableType')}>
              <Seg<StatsElement['table']>
                value={el.table}
                onChange={(table) => update(el.id, { table })}
                options={[
                  { value: 'Breakdown', label: t('stats.breakdown') },
                  { value: 'Split', label: t('stats.split') },
                  { value: 'Summary', label: t('stats.summary') },
                ]}
              />
            </Field>
            <Field label={t('stats.voteType')}>
              <Seg<StatsElement['voteType']>
                value={el.voteType}
                onChange={(voteType) => update(el.id, { voteType })}
                options={[
                  { value: 'Total', label: t('stats.total') },
                  { value: 'Jury', label: t('stats.jury') },
                  { value: 'Televote', label: t('stats.televote') },
                ]}
              />
            </Field>
          </>
        ),
      });
      out.push({
        id: 'size',
        title: t('sections.size'),
        content: (
          <Note icon={<Info className="size-[15px]" />}>
            {t.rich('stats.sizeSummary', {
              w: Math.round(ctx.box.w),
              h: Math.round(ctx.box.h),
              b: (chunks) => <b>{chunks}</b>,
            })}
          </Note>
        ),
      });
      out.push({
        id: 'rowstyle',
        title: t('sections.rowStyle'),
        content: <RowStyleNote cells />,
      });
      break;
    case 'branding':
      out.push({
        id: 'style',
        title: t('sections.style'),
        content: <BrandingStyle el={el} />,
      });
      break;
    case 'stack':
      out.push({
        id: 'content',
        title: t('sections.content'),
        content: <StackContent el={el} />,
      });
      break;
    default:
      break;
  }

  out.push({
    id: 'layout',
    title: t('sections.positionAndSize'),
    collapsed: true,
    content: (
      <LayoutSection el={el} box={ctx.box}>
        {ctx.layoutPrefix}
      </LayoutSection>
    ),
  });

  return out;
}

/* ---------------------------------------------------------------- */

const CanvasSize: React.FC = () => {
  const t = useTranslations('graphics.inspector.canvas');
  const canvas = useEditorStore((s) => s.design.canvas);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const preset = findPreset(canvas.width, canvas.height);

  if (canvas.autoSize) {
    return (
      <Note icon={<Info className="size-[15px]" />}>
        <b>{t('sizedToTable')}</b> {t('sizedToTableHint')}
      </Note>
    );
  }

  return (
    <>
      <Field label={t('preset')}>
        <SelectInput<string>
          value={preset?.id ?? 'custom'}
          onChange={(id) => {
            const p = CANVAS_PRESETS.find((x) => x.id === id);

            if (p) setCanvasSize(p.width, p.height);
          }}
          options={[
            ...CANVAS_PRESETS.map((p) => ({
              value: p.id,
              label: `${p.label} · ${p.width} × ${p.height}`,
            })),
            { value: 'custom', label: t('custom') },
          ]}
          ariaLabel={t('preset')}
        />
      </Field>
      <Row>
        <Field label={t('width')}>
          <NumberField
            value={canvas.width}
            step={10}
            min={200}
            max={4000}
            unit="px"
            commitOnBlur
            onChange={(w) => setCanvasSize(Math.round(w), canvas.height)}
            ariaLabel={t('width')}
          />
        </Field>
        <Field label={t('height')}>
          <NumberField
            value={canvas.height}
            step={10}
            min={200}
            max={4000}
            unit="px"
            commitOnBlur
            onChange={(h) => setCanvasSize(canvas.width, Math.round(h))}
            ariaLabel={t('height')}
          />
        </Field>
      </Row>
    </>
  );
};

const CanvasBackground: React.FC<{
  onTooLarge: SectionContext['onTooLarge'];
}> = ({ onTooLarge }) => {
  const t = useTranslations('graphics.inspector.canvas');
  const background = useEditorStore((s) => s.design.canvas.background);
  const setBackground = useEditorStore((s) => s.setBackground);
  const themeName = useThemeName();
  const fill: Fill = background[0] ?? { kind: 'theme-bg', opacity: 1 };

  return (
    <>
      <FillFields
        fill={fill}
        onChange={setBackground}
        allowTheme
        allowImage
        onTooLarge={onTooLarge}
        labels={{
          solid: t('solid'),
          gradient: t('gradient'),
          theme: t('theme'),
          image: t('image'),
        }}
      />
      {fill.kind === 'theme-bg' && (
        <Hint>{t('themeBackgroundHint', { name: themeName })}</Hint>
      )}
      <Field label={t('opacity')}>
        <RangeField
          value={fill.opacity}
          onChange={(opacity) => setBackground({ ...fill, opacity })}
          ariaLabel={t('opacity')}
        />
      </Field>
    </>
  );
};

const CanvasData: React.FC<{ openDataPanel: () => void }> = ({
  openDataPanel,
}) => {
  const t = useTranslations('graphics.inspector.data');
  const data = useEditorStore((s) => s.design.data);
  const boundCount = useEditorStore((s) => {
    let n = 0;
    const walk = (els: DesignElement[]) =>
      els.forEach((el) => {
        if (el.type === 'scoreboard' || el.type === 'stats') n += 1;
        if (el.type === 'stack') walk(el.children);
      });

    walk(s.design.elements);

    return n;
  });
  const label = useDataLabel(data);

  return (
    <>
      <div className="gfx-data-sum">
        <Chip tone="data" icon={<Database className="size-[13px]" />}>
          {label}
        </Chip>
        <button type="button" className="gfx-link" onClick={openDataPanel}>
          {t('change')}
        </button>
      </div>
      <Hint>{t('nElementsUseThisData', { count: boundCount })}</Hint>
    </>
  );
};

export function useCanvasSections(
  ctx: Pick<SectionContext, 'onTooLarge' | 'openDataPanel'>,
): InspectorSection[] {
  const t = useTranslations('graphics.inspector');

  return [
    { id: 'size', title: t('sections.canvasSize'), content: <CanvasSize /> },
    { id: 'theme', title: t('sections.theme'), content: <ThemeSection /> },
    {
      id: 'bg',
      title: t('sections.background'),
      content: <CanvasBackground onTooLarge={ctx.onTooLarge} />,
    },
    {
      id: 'data',
      title: t('sections.dataSource'),
      content: <CanvasData openDataPanel={ctx.openDataPanel} />,
    },
  ];
}
