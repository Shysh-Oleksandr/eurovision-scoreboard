import { z } from 'zod';

/**
 * Graphics studio PoC — minimal `Design` document.
 *
 * Throwaway: proves that a zod-validated JSON document can round-trip through
 * render → export → serialize → reload (see docs/plans/graphics-studio-plan.md,
 * Phase 0). Shapes mirror the plan's model closely enough that Phase 1 can
 * start from it, but nothing here is meant to be reused as-is.
 */

const elementBase = {
  id: z.string().min(1),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
};

export const fillSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('color'), value: z.string() }),
  z.object({ kind: z.literal('gradient'), value: z.string() }),
  z.object({ kind: z.literal('image'), url: z.string() }),
  z.object({ kind: z.literal('theme-bg') }),
]);
export type Fill = z.infer<typeof fillSchema>;

export const textElementSchema = z.object({
  ...elementBase,
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900).default(700),
  color: z.string().default('#ffffff'),
  align: z.enum(['left', 'center', 'right']).default('center'),
  uppercase: z.boolean().default(false),
  shadow: z.boolean().default(true),
  /** `scoreboard` = the theme's scoreboard font (`dp-scoreboard-font`). */
  fontSlot: z.enum(['ui', 'scoreboard']).default('ui'),
});

export const imageElementSchema = z.object({
  ...elementBase,
  type: z.literal('image'),
  src: z.string(),
  fit: z.enum(['cover', 'contain']).default('cover'),
  radius: z.number().min(0).default(0),
  mask: z.enum(['none', 'heart']).default('none'),
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
  countryCode: z.string().length(2),
  shape: z.enum(['rect', 'round', 'heart']).default('heart'),
});

export const scoreboardElementSchema = z.object({
  ...elementBase,
  type: z.literal('scoreboard'),
  columns: z.number().int().min(1).max(8).default(2),
  itemSize: z.enum(['sm', 'md', 'lg', 'xl', '2xl']).default('md'),
  showPoints: z.boolean().default(true),
  showRankings: z.boolean().default(true),
  shortNames: z.boolean().default(false),
  /** [from, to) into the resolved ranking; `to` undefined = all. */
  from: z.number().int().min(0).default(0),
  to: z.number().int().min(1).optional(),
});

export const elementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  flagElementSchema,
  scoreboardElementSchema,
]);

export type DesignElement = z.infer<typeof elementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type FlagElement = z.infer<typeof flagElementSchema>;
export type ScoreboardElement = z.infer<typeof scoreboardElementSchema>;
export type ElementType = DesignElement['type'];

export const manualRowSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  points: z.number().int().min(0),
  flag: z.string().optional(),
});
export type ManualRow = z.infer<typeof manualRowSchema>;

export const dataBindingSchema = z.discriminatedUnion('source', [
  /** Deterministic generated ranking (PoC only). */
  z.object({ source: z.literal('fixture'), count: z.number().int().min(1) }),
  /** Current stage of the scoreboard store. */
  z.object({ source: z.literal('live') }),
  /** A saved contest's snapshot; last stage with results unless `stageId`. */
  z.object({
    source: z.literal('contest'),
    contestId: z.string().min(1),
    stageId: z.string().optional(),
  }),
  z.object({ source: z.literal('manual'), rows: z.array(manualRowSchema) }),
]);
export type DataBinding = z.infer<typeof dataBindingSchema>;

export const templateFieldSchema = z.object({
  /** Dot path into the design, e.g. `elements.0.text` or `data`. */
  path: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['text', 'number', 'select']),
  options: z.array(z.union([z.string(), z.number()])).optional(),
});
export type TemplateField = z.infer<typeof templateFieldSchema>;

export const designSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.literal(1),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    background: fillSchema,
  }),
  elements: z.array(elementSchema),
  data: dataBindingSchema,
  templateFields: z.array(templateFieldSchema).optional(),
});

export type Design = z.infer<typeof designSchema>;

export const parseDesign = (json: unknown): Design => designSchema.parse(json);

/** Sort keys recursively so equal designs serialize to identical text. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonical((value as Record<string, unknown>)[key]);

        return acc;
      }, {});
  }

  return value;
};

export const serializeDesign = (design: Design): string =>
  JSON.stringify(canonical(design), null, 2);

/** Set a value at a dot path (`elements.2.text`). Returns a new object. */
export function setAtPath<T extends object>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.');
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...obj };
  let cursor = clone;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const next = cursor[key];

    cursor[key] = Array.isArray(next) ? [...next] : { ...next };
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;

  return clone as T;
}

export function getAtPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<any>(
      (acc, key) => (acc === null || acc === undefined ? undefined : acc[key]),
      obj,
    );
}

let idCounter = 0;

export const newId = (prefix = 'el'): string => {
  idCounter += 1;

  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
};
