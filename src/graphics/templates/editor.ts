import { CONTEST_LOGO_SRC } from '../assets/localAssets';
import { createElement, textElement } from '../editor/elementFactory';
import {
  Design,
  DesignElement,
  ManualRow,
  TemplateField,
} from '../model/design';
import { DEFAULT_ELEMENT_NAMES, mapElements } from '../model/elements';
import { newElementId } from '../model/serialize';

import { buildResultsDesign } from './results';
import { buildStatsDesign } from './stats';

import { Country, StatsTableType } from '@/models';
import { DEFAULT_IMAGE_CUSTOMIZATION } from '@/state/generalStore';

/**
 * Built-in templates (handoff §2): plain functions of a small context so the
 * titles follow the loaded contest. Each declares the fields its template
 * sheet exposes (`templateFields`, see fields.ts); the gallery lists them
 * under "Built-in" next to the community ones.
 */

export interface TemplateContext {
  title: string;
  subtitle: string;
}

export type TemplateTag = 'scoreboard' | 'stats';

export interface EditorTemplate {
  id: string;
  /** Shown in the editor's Templates panel (replaces the canvas). */
  inEditor: boolean;
  width: number;
  height: number;
  /** Content-sized canvas (stats): width/height are minimums. */
  autoSize?: boolean;
  tags: TemplateTag[];
  build: (ctx: TemplateContext) => Design;
}

const BRANDING: DesignElement = {
  id: 'branding',
  name: 'Branding',
  type: 'branding',
  x: 490,
  y: 570,
  fontSize: 20,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
};

const field = (path: string, label: string): TemplateField => ({ path, label });

const blank = (): Design => ({
  id: newElementId('design'),
  name: 'Untitled design',
  version: 1,
  canvas: {
    width: 1200,
    height: 630,
    autoSize: false,
    background: [{ kind: 'theme-bg', opacity: 1 }],
  },
  data: { source: 'live' },
  elements: [{ ...BRANDING, id: newElementId('branding') }],
});

/** Give every element a display name so the layers list reads well. */
const named = (design: Design): Design => ({
  ...design,
  elements: mapElements(design.elements, (el) =>
    el.name
      ? el
      : {
          ...el,
          name:
            el.id === 'title'
              ? 'Title'
              : el.id === 'subtitle'
              ? 'Subtitle'
              : el.id === 'layout'
              ? 'Layout'
              : DEFAULT_ELEMENT_NAMES[el.type],
        },
  ),
});

const results = (ctx: TemplateContext): Design =>
  named({
    ...buildResultsDesign({
      settings: {
        ...DEFAULT_IMAGE_CUSTOMIZATION,
        title: ctx.title,
        subtitle: ctx.subtitle,
        layout: 3,
        itemSize: 'lg',
        horizontalPadding: 72,
        verticalPadding: 16,
      },
      showPoints: true,
      statusMode: 'live',
      dataSource: 'live',
    }),
    id: newElementId('design'),
    name: 'Results',
    templateFields: [
      field('el.title.text', 'Title'),
      field('el.subtitle.text', 'Subtitle'),
      field('canvas.size', 'Size'),
      field('el.scoreboard.columns', 'Columns'),
      field('el.scoreboard.itemSize', 'Row size'),
    ],
  });

const runningOrder = (ctx: TemplateContext): Design => {
  const base = buildResultsDesign({
    settings: {
      ...DEFAULT_IMAGE_CUSTOMIZATION,
      title: ctx.title,
      subtitle: `${ctx.subtitle} · Running order`,
      layout: 2,
      itemSize: 'md',
      horizontalPadding: 150,
      verticalPadding: 16,
      showRankings: false,
    },
    showPoints: false,
    statusMode: 'uniform',
    dataSource: 'live',
  });

  return named({
    ...base,
    id: newElementId('design'),
    name: 'Running order',
    elements: mapElements(base.elements, (el) =>
      el.type === 'scoreboard' ? { ...el, rowOrder: 'runningOrder' } : el,
    ),
    templateFields: [
      field('el.title.text', 'Title'),
      field('el.subtitle.text', 'Subtitle'),
      field('canvas.size', 'Size'),
      field('el.scoreboard.columns', 'Columns'),
      field('el.scoreboard.itemSize', 'Row size'),
    ],
  });
};

const qualifiers = (ctx: TemplateContext): Design => {
  const canvas = {
    width: 1920,
    height: 1080,
    autoSize: false,
    background: [{ kind: 'theme-bg' as const, opacity: 1 }],
  };
  const dim = createElement('shape', canvas);
  const scoreboard = createElement('scoreboard', canvas);

  if (dim.type === 'shape') {
    Object.assign(dim, {
      id: 'dim',
      name: 'Dim',
      x: 0,
      y: 0,
      w: 1920,
      h: 1080,
      radius: 0,
      fill: { kind: 'color', value: 'rgba(8, 4, 20, 0.42)', opacity: 1 },
      locked: true,
    });
  }
  if (scoreboard.type === 'scoreboard') {
    Object.assign(scoreboard, {
      id: 'scoreboard',
      name: 'Qualifiers',
      x: 120,
      y: 260,
      w: 1680,
      columns: 3,
      itemSize: 'xl',
      showPoints: false,
      showRankings: false,
      limit: 0,
      statusMode: 'uniform',
    });
  }

  return {
    id: newElementId('design'),
    name: 'Qualifiers',
    version: 1,
    canvas,
    data: { source: 'live' },
    elements: [
      dim,
      textElement({
        id: 'title',
        name: 'Title',
        x: 120,
        y: 70,
        w: 1680,
        h: 90,
        text: 'The finalists',
        fontSize: 76,
        fontWeight: 700,
        uppercase: true,
      }),
      textElement({
        id: 'subtitle',
        name: 'Subtitle',
        x: 120,
        y: 170,
        w: 1680,
        h: 40,
        text: `${ctx.title} · ${ctx.subtitle}`,
        fontSize: 30,
        fontWeight: 600,
        shadow: null,
        color: 'rgba(255, 255, 255, 0.85)',
      }),
      scoreboard,
      {
        ...BRANDING,
        id: newElementId('branding'),
        x: 1660,
        y: 1000,
        fontSize: 24,
      },
    ],
    templateFields: [
      field('el.title.text', 'Title'),
      field('el.subtitle.text', 'Subtitle'),
      field('data', 'Data source'),
    ],
  };
};

const topTen = (ctx: TemplateContext): Design => {
  const canvas = {
    width: 1080,
    height: 1350,
    autoSize: false,
    background: [{ kind: 'theme-bg' as const, opacity: 1 }],
  };
  const scoreboard = createElement('scoreboard', canvas);

  if (scoreboard.type === 'scoreboard') {
    Object.assign(scoreboard, {
      id: 'scoreboard',
      x: 90,
      y: 300,
      w: 900,
      columns: 1,
      itemSize: '2xl',
      limit: 10,
    });
  }

  return {
    id: newElementId('design'),
    name: 'Top 10',
    version: 1,
    canvas,
    data: { source: 'live' },
    elements: [
      textElement({
        id: 'title',
        name: 'Title',
        x: 90,
        y: 120,
        w: 900,
        h: 80,
        text: ctx.title,
        fontSize: 64,
        fontWeight: 700,
      }),
      textElement({
        id: 'subtitle',
        name: 'Subtitle',
        x: 90,
        y: 205,
        w: 900,
        h: 50,
        text: 'Top 10',
        fontSize: 34,
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.8)',
      }),
      scoreboard,
      { ...BRANDING, id: newElementId('branding'), x: 430, y: 1270 },
    ],
    templateFields: [
      field('el.title.text', 'Title'),
      field('el.subtitle.text', 'Subtitle'),
      field('el.scoreboard.limit', 'Row limit'),
      field('data', 'Data source'),
    ],
  };
};

const poster = (): Design => {
  const canvas = {
    width: 1080,
    height: 1350,
    autoSize: false,
    background: [
      {
        kind: 'gradient' as const,
        value: 'linear-gradient(160deg, #1a0b3a, #4a1554)',
        opacity: 1,
      },
    ],
  };
  const logo = createElement('image', canvas);
  const rule = createElement('shape', canvas);
  const flag = createElement('flag', canvas);
  const row = createElement('stack', canvas);

  if (logo.type === 'image') {
    Object.assign(logo, {
      id: 'logo',
      name: 'Contest logo',
      x: 340,
      y: 150,
      w: 400,
      h: 400,
      src: CONTEST_LOGO_SRC,
      fit: 'contain',
      radius: 0,
      mask: 'none',
    });
  }
  if (rule.type === 'shape') {
    Object.assign(rule, {
      id: 'rule',
      name: 'Rule',
      x: 90,
      y: 1040,
      w: 900,
      h: 2,
      radius: 0,
      fill: { kind: 'color', value: 'rgba(255, 255, 255, 0.4)', opacity: 1 },
    });
  }
  if (flag.type === 'flag') {
    Object.assign(flag, {
      id: 'flag',
      name: 'Host flag',
      x: 490,
      y: 1090,
      w: 100,
      h: 90,
      shape: 'heart',
    });
  }
  if (row.type === 'stack') {
    Object.assign(row, {
      id: 'cityDates',
      name: 'City + dates',
      x: 90,
      y: 860,
      w: 900,
      h: 150,
      direction: 'row',
      gap: 40,
      align: 'center',
      justify: 'center',
      children: [
        textElement({
          id: 'city',
          name: 'Host city',
          w: 400,
          h: 60,
          align: 'right',
          text: 'Vienna',
          fontSize: 44,
          fontWeight: 700,
          shadow: null,
        }),
        textElement({
          id: 'dates',
          name: 'Dates',
          w: 440,
          h: 60,
          align: 'left',
          text: '12 · 14 · 16 May 2026',
          fontSize: 30,
          fontWeight: 600,
          shadow: null,
        }),
      ],
    });
  }

  return {
    id: newElementId('design'),
    name: 'Announcement poster',
    version: 1,
    canvas,
    data: { source: 'live' },
    elements: [
      logo,
      textElement({
        id: 'slogan',
        name: 'Slogan',
        x: 90,
        y: 600,
        w: 900,
        h: 180,
        text: 'United by music',
        fontSize: 92,
        fontWeight: 700,
        lineHeight: 1,
        shadow: null,
      }),
      row,
      rule,
      flag,
      {
        ...BRANDING,
        id: newElementId('branding'),
        x: 440,
        y: 1290,
        fontSize: 22,
      },
    ],
    templateFields: [
      field('el.slogan.text', 'Slogan'),
      field('el.city.text', 'Host city'),
      field('el.dates.text', 'Dates'),
      field('el.flag.countryCode', 'Host flag'),
    ],
  };
};

const stats = (ctx: TemplateContext): Design => {
  const base = buildStatsDesign({
    title: `${ctx.title} · ${ctx.subtitle}`,
    table: StatsTableType.BREAKDOWN,
    showBackgroundImage: true,
    backgroundOpacity: 0.35,
    measuredWidth: 1000,
  });

  return named({
    ...base,
    id: newElementId('design'),
    name: 'Stats',
    data: { source: 'live' },
    templateFields: [
      field('el.title.text', 'Title'),
      field('el.stats.table', 'Table'),
      field('canvas.bgOpacity', 'Background opacity'),
    ],
  });
};

export const EDITOR_TEMPLATES: EditorTemplate[] = [
  {
    id: 'blank',
    inEditor: true,
    width: 1200,
    height: 630,
    tags: [],
    build: blank,
  },
  {
    id: 'results',
    inEditor: true,
    width: 1200,
    height: 630,
    tags: ['scoreboard'],
    build: results,
  },
  {
    id: 'runningOrder',
    inEditor: true,
    width: 1200,
    height: 630,
    tags: ['scoreboard'],
    build: runningOrder,
  },
  {
    id: 'qualifiers',
    inEditor: true,
    width: 1920,
    height: 1080,
    tags: ['scoreboard'],
    build: qualifiers,
  },
  {
    id: 'top10',
    inEditor: true,
    width: 1080,
    height: 1350,
    tags: ['scoreboard'],
    build: topTen,
  },
  {
    id: 'poster',
    inEditor: true,
    width: 1080,
    height: 1350,
    tags: [],
    build: poster,
  },
  {
    id: 'stats',
    inEditor: true,
    width: 1000,
    height: 600,
    autoSize: true,
    tags: ['stats'],
    build: stats,
  },
];

export const getEditorTemplate = (id: string): EditorTemplate =>
  EDITOR_TEMPLATES.find((t) => t.id === id) ?? EDITOR_TEMPLATES[0];

/* ------------------------------------------------------------------ */
/* "Open in editor" from the share modals                              */
/* ------------------------------------------------------------------ */

const countriesToManualRows = (countries: Country[]): ManualRow[] =>
  countries.map((c) => ({
    code: c.code,
    name: c.name,
    points: c.points ?? 0,
    juryPoints: c.juryPoints,
    televotePoints: c.televotePoints,
    flag: c.flag,
  }));

/**
 * Turn a share-modal design (which may bind to rows handed in by the caller)
 * into a self-contained, editable document: `provided` rows become a manual
 * list (or the live stage named by `liveStageId`, for stats designs whose
 * tables the editor computes itself), every element gets a name, and the
 * document gets a fresh id.
 */
export function toEditableDesign(
  design: Design,
  options: {
    name: string;
    providedCountries?: Country[];
    liveStageId?: string | null;
  },
): Design {
  const data: Design['data'] =
    design.data.source === 'provided'
      ? options.liveStageId !== undefined
        ? { source: 'live', stageId: options.liveStageId ?? undefined }
        : {
            source: 'manual',
            rows: countriesToManualRows(options.providedCountries ?? []),
          }
      : design.data;

  return named({
    ...design,
    id: newElementId('design'),
    name: options.name,
    data,
    templateFields: undefined,
  });
}
