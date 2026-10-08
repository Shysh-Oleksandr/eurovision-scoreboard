import { z } from 'zod';

/**
 * Graphics studio — the `Design` document.
 *
 * A design is a fixed-size (or content-sized) canvas with a background and an
 * ordered list of elements. Elements are either absolutely positioned
 * (`x`/`y`/`w`/`h` in canvas px) or laid out in flow inside a `stack`
 * container, where `x`/`y` are ignored and a missing `w`/`h` means
 * "fill the cross axis" / "auto height". The stack is what lets the
 * share-image templates (title → subtitle → grid → branding, centred) stay
 * responsive to the number of rows while remaining ordinary design documents
 * the free-form editor can open.
 *
 * See docs/graphics-studio.md.
 */

export const DESIGN_VERSION = 1 as const;

/* ------------------------------------------------------------------ */
/* Fills                                                               */
/* ------------------------------------------------------------------ */

const opacity = z.number().min(0).max(1).default(1);

export const fillSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('color'), value: z.string().min(1), opacity }),
  z.object({ kind: z.literal('gradient'), value: z.string().min(1), opacity }),
  z.object({
    kind: z.literal('image'),
    url: z.string().min(1),
    fit: z.enum(['cover', 'contain']).default('cover'),
    opacity,
  }),
  /** The active theme's background image (or the user's custom one). */
  z.object({ kind: z.literal('theme-bg'), opacity }),
  /** The theme's primary surface gradient (as used by the stats image). */
  z.object({ kind: z.literal('theme-surface'), opacity }),
]);
export type Fill = z.infer<typeof fillSchema>;

/* ------------------------------------------------------------------ */
/* Elements                                                            */
/* ------------------------------------------------------------------ */

export const ITEM_SIZES = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
export const itemSizeSchema = z.enum(ITEM_SIZES);
export type ItemSize = z.infer<typeof itemSizeSchema>;

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

/** The font-library snapshot a theme carries (`ThemeFontSnapshot`). */
export const fontSnapshotSchema = z.object({
  _id: z.string().min(1),
  name: z.string().min(1),
  isVariable: z.boolean().default(false),
  faces: z.array(
    z.object({
      url: z.string().min(1),
      format: z.enum(['woff2', 'woff']),
      weight: z.number(),
      weightRange: z.tuple([z.number(), z.number()]),
    }),
  ),
});
export type FontSnapshot = z.infer<typeof fontSnapshotSchema>;

/**
 * A font chosen for one element: a bundled alias or an uploaded font from
 * the library. The snapshot travels with the document so a published
 * template renders in the same font for everyone (the files are public).
 */
export const designFontSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), alias: z.string().min(1) }),
  z.object({ kind: z.literal('custom'), font: fontSnapshotSchema }),
]);
export type DesignFont = z.infer<typeof designFontSchema>;

/**
 * `ui` / `scoreboard` follow the design theme's two font slots; `custom`
 * uses the element's own `font`.
 */
export const fontSlotSchema = z.enum(['ui', 'scoreboard', 'custom']);
export type FontSlot = z.infer<typeof fontSlotSchema>;

const elementBase = {
  id: z.string().min(1),
  name: z.string().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  /** Absent in flow = fill the stack's cross axis. */
  w: z.number().positive().optional(),
  /** Absent in flow = auto height. */
  h: z.number().positive().optional(),
  rotation: z.number().default(0),
  opacity,
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
};

export const textElementSchema = z.object({
  ...elementBase,
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900).default(700),
  color: z.string().default('#ffffff'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  uppercase: z.boolean().default(false),
  /** CSS text-shadow or `null` for none. */
  shadow: z.string().nullable().default('0 0 10px rgba(0, 0, 0, 0.2)'),
  lineHeight: z.number().positive().default(1.2),
  /** `scoreboard` = the theme's scoreboard font; `custom` = `font`. */
  fontSlot: fontSlotSchema.default('ui'),
  font: designFontSchema.optional(),
  marginTop: z.number().default(0),
});

export const imageElementSchema = z.object({
  ...elementBase,
  type: z.literal('image'),
  src: z.string().min(1),
  fit: z.enum(['cover', 'contain']).default('cover'),
  radius: z.number().min(0).default(0),
  mask: z.enum(['none', 'heart', 'circle']).default('none'),
});

export const shapeElementSchema = z.object({
  ...elementBase,
  type: z.literal('shape'),
  kind: z.enum(['rect', 'ellipse']).default('rect'),
  fill: fillSchema,
  radius: z.number().min(0).default(0),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).default(0),
  shadow: z.boolean().default(false),
});

export const flagElementSchema = z.object({
  ...elementBase,
  type: z.literal('flag'),
  countryCode: z.string().min(2),
  shape: z.enum(['rect', 'round', 'heart']).default('heart'),
});

export const scoreboardElementSchema = z.object({
  ...elementBase,
  type: z.literal('scoreboard'),
  columns: z.number().int().min(1).max(8).default(2),
  itemSize: itemSizeSchema.default('md'),
  showPoints: z.boolean().default(true),
  showRankings: z.boolean().default(true),
  shortNames: z.boolean().default(false),
  /** Take the first N rows of the resolved ranking; 0/absent = all. */
  limit: z.number().int().min(0).default(0),
  /**
   * `live`: rows colour by their real state (jury / finished / NQ…);
   * `uniform`: every row uses the neutral "unfinished" surface (running
   * order, podium shares).
   */
  statusMode: z.enum(['live', 'uniform']).default('live'),
  /** `runningOrder` lists the rows in the stage's running order (no ranks). */
  rowOrder: z.enum(['ranked', 'runningOrder']).default('ranked'),
  paddingY: z.number().min(0).default(0),
  /**
   * `auto`: columns and row size follow the number of rows and the space the
   * element has (its `h` when free, the rest of a fixed-height stack in
   * flow); `columns` / `itemSize` are then ignored. See scoreboardFit.ts.
   */
  fit: z.enum(['fixed', 'auto']).default('fixed'),
});

export const statsElementSchema = z.object({
  ...elementBase,
  type: z.literal('stats'),
  /** `StatsTableType` value. */
  table: z.enum(['Breakdown', 'Split', 'Summary']),
  /** Which points the table shows when the design computes its own stats. */
  voteType: z.enum(['Total', 'Jury', 'Televote']).default('Total'),
});

export const brandingElementSchema = z.object({
  ...elementBase,
  type: z.literal('branding'),
  fontSize: z.number().positive().default(20),
  /** Optional styling; absent = the classic look (600, white 90 %, icon). */
  fontWeight: z.number().int().min(100).max(900).optional(),
  color: z.string().optional(),
  fontSlot: fontSlotSchema.optional(),
  font: designFontSchema.optional(),
  shadow: z.boolean().optional(),
  showIcon: z.boolean().optional(),
  uppercase: z.boolean().optional(),
});

const leafElementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  flagElementSchema,
  scoreboardElementSchema,
  statsElementSchema,
  brandingElementSchema,
]);

export type LeafElement = z.infer<typeof leafElementSchema>;

export interface StackElement extends z.infer<typeof stackElementBaseSchema> {
  children: DesignElement[];
}

const stackElementBaseSchema = z.object({
  ...elementBase,
  type: z.literal('stack'),
  direction: z.enum(['column', 'row']).default('column'),
  gap: z.number().min(0).default(0),
  paddingX: z.number().min(0).default(0),
  paddingY: z.number().min(0).default(0),
  /** Cross-axis alignment of children. */
  align: z.enum(['start', 'center', 'end', 'stretch']).default('center'),
  /** Main-axis distribution. */
  justify: z
    .enum(['start', 'center', 'end', 'space-between'])
    .default('center'),
  /** Ignore x/y/w/h and cover the whole canvas. */
  fillCanvas: z.boolean().default(false),
});

export const stackElementSchema: z.ZodType<StackElement> =
  stackElementBaseSchema.extend({
    children: z.lazy(() => z.array(elementSchema)),
  }) as unknown as z.ZodType<StackElement>;

export type DesignElement = LeafElement | StackElement;

export const elementSchema: z.ZodType<DesignElement> = z.lazy(() =>
  z.union([leafElementSchema, stackElementSchema]),
) as z.ZodType<DesignElement>;

export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type FlagElement = z.infer<typeof flagElementSchema>;
export type ScoreboardElement = z.infer<typeof scoreboardElementSchema>;
export type StatsElement = z.infer<typeof statsElementSchema>;
export type BrandingElement = z.infer<typeof brandingElementSchema>;
export type ElementType = DesignElement['type'];

/* ------------------------------------------------------------------ */
/* Data binding                                                        */
/* ------------------------------------------------------------------ */

export const manualRowSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  points: z.number().int().default(0),
  juryPoints: z.number().int().optional(),
  televotePoints: z.number().int().optional(),
  flag: z.string().optional(),
});
export type ManualRow = z.infer<typeof manualRowSchema>;

export const dataBindingSchema = z.discriminatedUnion('source', [
  /**
   * The scoreboard store: the viewed stage, sorted like the board, or
   * `stageId` when set and that stage exists in the running event.
   */
  z.object({ source: z.literal('live'), stageId: z.string().optional() }),
  /** Rows handed in by the caller (running order, podium…); not serialisable. */
  z.object({ source: z.literal('provided') }),
  z.object({ source: z.literal('manual'), rows: z.array(manualRowSchema) }),
  /**
   * A saved contest (cloud). `contestName` is denormalised so chips and
   * notes can name it before (or without) the snapshot loading; `stageId`
   * picks a stage of the snapshot, else the last stage with results.
   */
  z.object({
    source: z.literal('contest'),
    contestId: z.string().min(1),
    contestName: z.string().optional(),
    stageId: z.string().optional(),
  }),
]);
export type DataBinding = z.infer<typeof dataBindingSchema>;

/* ------------------------------------------------------------------ */
/* Canvas + design                                                     */
/* ------------------------------------------------------------------ */

export const canvasSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /**
   * Size the canvas to its content (the stats image). `width`/`height` are
   * then minimums; the stage measures the rendered content and grows.
   */
  autoSize: z.boolean().default(false),
  /** Bottom → top. */
  background: z.array(fillSchema).default([]),
});
export type DesignCanvas = z.infer<typeof canvasSchema>;

/**
 * A field a template exposes as a short form (handoff §3, §8). `path` is
 * one of `el.<elementId>.<prop>` (text, columns, itemSize, limit, table,
 * voteType, countryCode), `data` (the data source), `canvas.size` or
 * `canvas.bgOpacity`; the control is derived from the target (see
 * templates/fields.ts), so the field only stores where it points and how
 * it is labelled.
 */
export const templateFieldSchema = z.object({
  path: z.string().min(1),
  label: z.string().min(1),
});
export type TemplateField = z.infer<typeof templateFieldSchema>;

/**
 * The theme a design renders in. Saved with the document so the design
 * looks the same later, whatever theme the app is on: a built-in year
 * (`2026`, `JESC-2024`) or a snapshot of a custom theme (its palette,
 * specifics, background image URL and font snapshots). Absent = follow the
 * app's active theme (share-modal images; older drafts until re-saved).
 */
export const customThemeSnapshotSchema = z
  .object({
    _id: z.string().min(1),
    name: z.string().min(1),
    baseThemeYear: z.string().min(1),
    hue: z.number(),
    shadeValue: z.number().optional(),
    overrides: z.record(z.string(), z.string()).default({}),
    backgroundImageUrl: z.string().optional(),
  })
  .passthrough();
export type CustomThemeSnapshot = z.infer<typeof customThemeSnapshotSchema>;

export const designThemeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('year'), year: z.string().min(1) }),
  z.object({ kind: z.literal('custom'), theme: customThemeSnapshotSchema }),
]);
export type DesignTheme = z.infer<typeof designThemeSchema>;

/** Provenance kept in the document when a design starts from a template. */
export const remixSourceSchema = z.object({
  designId: z.string().min(1),
  name: z.string().min(1),
  username: z.string().optional(),
});
export type RemixSource = z.infer<typeof remixSourceSchema>;

export const designSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.literal(DESIGN_VERSION),
  canvas: canvasSchema,
  elements: z.array(elementSchema),
  data: dataBindingSchema,
  theme: designThemeSchema.optional(),
  templateFields: z.array(templateFieldSchema).optional(),
  remixedFrom: remixSourceSchema.optional(),
});

export type Design = z.infer<typeof designSchema>;

/** Validate and normalise (defaults filled in) an unknown value. */
export const parseDesign = (json: unknown): Design => designSchema.parse(json);

export const isStack = (el: DesignElement): el is StackElement =>
  el.type === 'stack';

/** Depth-first walk over every element, stacks included. */
export function walkElements(
  elements: DesignElement[],
  visit: (el: DesignElement, parent: StackElement | null) => void,
  parent: StackElement | null = null,
): void {
  elements.forEach((el) => {
    visit(el, parent);
    if (isStack(el)) walkElements(el.children, visit, el);
  });
}
