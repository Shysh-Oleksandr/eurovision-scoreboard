import {
  DataBinding,
  Design,
  DesignElement,
  ElementType,
  ITEM_SIZES,
  TemplateField,
} from '../model/design';
import { elementLabel, findElement, updateElementIn } from '../model/elements';
import { resizeCanvas } from '../model/resizeCanvas';

/**
 * Template fields (handoff §3, §8): a published design exposes a few of its
 * properties as a short form. A field is a `path` + `label`; the control is
 * derived here from what the path points at, so the model stays small and
 * the form can't drift from the document.
 *
 * Paths: `el.<elementId>.<prop>`, `data`, `canvas.size`, `canvas.bgOpacity`.
 */

export type FieldControl =
  | { kind: 'text' }
  | { kind: 'select'; options: (string | number)[]; labelKeys?: string }
  | { kind: 'number'; min: number; max: number; step?: number }
  | { kind: 'country' }
  | { kind: 'data' }
  | { kind: 'size' }
  | { kind: 'range'; min: number; max: number; step: number }
  /** An image element's source (upload, URL or the theme background). */
  | { kind: 'image' };

export interface FieldCandidate {
  path: string;
  control: FieldControl;
  /** Ticked by default in the publish dialog. */
  defaultOn: boolean;
  /** i18n key under `graphics.fields` for the default label… */
  labelKey?: string;
  /** …or the element's own name (text content, flags). */
  elementLabel?: string;
}

export interface FieldGroup {
  id: string;
  type: ElementType | 'canvas';
  name: string;
  items: FieldCandidate[];
}

export interface ResolvedField {
  path: string;
  label: string;
  control: FieldControl;
  value: unknown;
}

const COLUMNS = [1, 2, 3, 4];

const elementCandidates = (el: DesignElement): FieldCandidate[] => {
  const name = elementLabel(el);

  switch (el.type) {
    case 'text':
      return [
        {
          path: `el.${el.id}.text`,
          control: { kind: 'text' },
          defaultOn: true,
          elementLabel: name,
        },
      ];
    case 'scoreboard':
      return [
        // Auto-fit decides columns and row size itself.
        ...(el.fit === 'auto'
          ? []
          : ([
              {
                path: `el.${el.id}.columns`,
                control: { kind: 'select', options: COLUMNS },
                defaultOn: false,
                labelKey: 'columns',
              },
              {
                path: `el.${el.id}.itemSize`,
                control: {
                  kind: 'select',
                  options: [...ITEM_SIZES],
                  labelKeys: 'rowSizes',
                },
                defaultOn: false,
                labelKey: 'rowSize',
              },
            ] as FieldCandidate[])),
        {
          path: `el.${el.id}.limit`,
          control: { kind: 'number', min: 0, max: 60 },
          defaultOn: false,
          labelKey: 'rowLimit',
        },
      ];
    case 'stats':
      return [
        {
          path: `el.${el.id}.table`,
          control: {
            kind: 'select',
            options: ['Breakdown', 'Split', 'Summary'],
            labelKeys: 'tables',
          },
          defaultOn: true,
          labelKey: 'tableType',
        },
        {
          path: `el.${el.id}.voteType`,
          control: {
            kind: 'select',
            options: ['Total', 'Jury', 'Televote'],
            labelKeys: 'voteTypes',
          },
          defaultOn: false,
          labelKey: 'voteType',
        },
      ];
    case 'flag':
      return [
        {
          path: `el.${el.id}.countryCode`,
          control: { kind: 'country' },
          defaultOn: false,
          elementLabel: name,
        },
      ];
    case 'image':
      return [
        {
          path: `el.${el.id}.src`,
          control: { kind: 'image' },
          defaultOn: false,
          elementLabel: name,
        },
      ];
    default:
      return [];
  }
};

/** Every property a design could expose, grouped by element (then canvas). */
export function templateFieldCandidates(design: Design): FieldGroup[] {
  const groups: FieldGroup[] = [];
  const visit = (el: DesignElement) => {
    if (el.type === 'stack') {
      const items = el.children.flatMap(elementCandidates);

      if (items.length) {
        groups.push({
          id: el.id,
          type: el.type,
          name: elementLabel(el),
          items,
        });
      }

      return;
    }
    const items = elementCandidates(el);

    if (items.length) {
      groups.push({ id: el.id, type: el.type, name: elementLabel(el), items });
    }
  };

  design.elements.forEach(visit);
  groups.push({
    id: 'canvas',
    type: 'canvas',
    name: '',
    items: [
      {
        path: 'data',
        control: { kind: 'data' },
        defaultOn: true,
        labelKey: 'dataSource',
      },
      ...(design.canvas.autoSize
        ? []
        : [
            {
              path: 'canvas.size',
              control: { kind: 'size' } as FieldControl,
              defaultOn: false,
              labelKey: 'size',
            },
          ]),
      ...(design.canvas.background.length
        ? [
            {
              path: 'canvas.bgOpacity',
              control: {
                kind: 'range',
                min: 0,
                max: 1,
                step: 0.05,
              } as FieldControl,
              defaultOn: false,
              labelKey: 'backgroundOpacity',
            },
          ]
        : []),
    ],
  });

  return groups;
}

export const findCandidate = (
  design: Design,
  path: string,
): FieldCandidate | null =>
  templateFieldCandidates(design)
    .flatMap((g) => g.items)
    .find((c) => c.path === path) ?? null;

const parseElementPath = (
  path: string,
): { id: string; prop: string } | null => {
  const parts = path.split('.');

  if (parts[0] !== 'el' || parts.length < 3) return null;

  return { id: parts[1], prop: parts.slice(2).join('.') };
};

/** Current value behind a field path. */
export function getFieldValue(design: Design, path: string): unknown {
  if (path === 'data') return design.data;
  if (path === 'canvas.size') {
    return `${design.canvas.width}x${design.canvas.height}`;
  }
  if (path === 'canvas.bgOpacity') {
    const top = design.canvas.background[design.canvas.background.length - 1];

    return top?.opacity ?? 1;
  }
  const target = parseElementPath(path);

  if (!target) return undefined;
  const found = findElement(design.elements, target.id);

  return found
    ? (found.el as unknown as Record<string, unknown>)[target.prop]
    : undefined;
}

/** Set a field (immutably); unknown paths return the design unchanged. */
export function applyTemplateField(
  design: Design,
  path: string,
  value: unknown,
): Design {
  if (path === 'data') return { ...design, data: value as DataBinding };
  if (path === 'canvas.size') {
    const [w, h] = String(value)
      .split('x')
      .map((n) => parseInt(n, 10));

    if (!w || !h) return design;

    return resizeCanvas(design, w, h);
  }
  if (path === 'canvas.bgOpacity') {
    const background = design.canvas.background.map((fill, i, arr) =>
      i === arr.length - 1
        ? { ...fill, opacity: Math.max(0, Math.min(1, Number(value))) }
        : fill,
    );

    return { ...design, canvas: { ...design.canvas, background } };
  }
  const target = parseElementPath(path);

  if (!target) return design;
  const elements = updateElementIn(design.elements, target.id, {
    [target.prop]: value,
  } as Partial<DesignElement>);

  return elements === design.elements ? design : { ...design, elements };
}

/** Field + control + current value; `null` when the path no longer exists. */
export function resolveTemplateField(
  design: Design,
  field: TemplateField,
): ResolvedField | null {
  const candidate = findCandidate(design, field.path);

  if (!candidate) return null;

  return {
    path: field.path,
    label: field.label,
    control: candidate.control,
    value: getFieldValue(design, field.path),
  };
}

/** Fields of a design that still resolve, in declared order. */
export const resolveTemplateFields = (design: Design): ResolvedField[] =>
  (design.templateFields ?? [])
    .map((f) => resolveTemplateField(design, f))
    .filter((f): f is ResolvedField => !!f);

/** `true` when the field's value would show up in a form (not the data chip). */
export const fieldsCount = (design: Design): number =>
  resolveTemplateFields(design).length;
