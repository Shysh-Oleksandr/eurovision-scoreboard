import { DesignElement, ElementType, isStack, StackElement } from './design';

/**
 * Pure helpers over the element tree (stacks nest children). The editor
 * store uses these so every edit is immutable and reaches elements inside
 * stacks as well as top-level ones.
 */

export interface FoundElement {
  el: DesignElement;
  /** `null` for top-level elements. */
  parent: StackElement | null;
}

export function findElement(
  elements: DesignElement[],
  id: string,
  parent: StackElement | null = null,
): FoundElement | null {
  for (const el of elements) {
    if (el.id === id) return { el, parent };
    if (isStack(el)) {
      const inner = findElement(el.children, id, el);

      if (inner) return inner;
    }
  }

  return null;
}

/** Map every element (depth-first); stacks are rebuilt when a child changes. */
export function mapElements(
  elements: DesignElement[],
  fn: (el: DesignElement) => DesignElement,
): DesignElement[] {
  let changed = false;
  const next = elements.map((el) => {
    let current = el;

    if (isStack(current)) {
      const children = mapElements(current.children, fn);

      if (children !== current.children) {
        current = { ...current, children };
      }
    }
    const mapped = fn(current);

    if (mapped !== el) changed = true;

    return mapped;
  });

  return changed ? next : elements;
}

/** Apply a patch, returning the same object when nothing would change. */
export function patchElement(
  el: DesignElement,
  patch: Partial<DesignElement>,
): DesignElement {
  const changed = (Object.keys(patch) as (keyof DesignElement)[]).some(
    (key) => patch[key] !== el[key],
  );

  return changed ? ({ ...el, ...patch } as DesignElement) : el;
}

export function updateElementIn(
  elements: DesignElement[],
  id: string,
  patch: Partial<DesignElement>,
): DesignElement[] {
  return mapElements(elements, (el) =>
    el.id === id ? patchElement(el, patch) : el,
  );
}

export function removeElementsIn(
  elements: DesignElement[],
  ids: ReadonlySet<string>,
): DesignElement[] {
  let changed = false;
  const next: DesignElement[] = [];

  elements.forEach((el) => {
    if (ids.has(el.id)) {
      changed = true;

      return;
    }
    if (isStack(el)) {
      const children = removeElementsIn(el.children, ids);

      if (children !== el.children) {
        changed = true;
        next.push({ ...el, children });

        return;
      }
    }
    next.push(el);
  });

  return changed ? next : elements;
}

/** Every element id in the tree, depth-first. */
export function collectIds(elements: DesignElement[]): string[] {
  const ids: string[] = [];
  const walk = (list: DesignElement[]) =>
    list.forEach((el) => {
      ids.push(el.id);
      if (isStack(el)) walk(el.children);
    });

  walk(elements);

  return ids;
}

/** Elements whose size is decided by their content, not by `w`/`h`. */
export const BOUND_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  'scoreboard',
  'stats',
  'branding',
]);

export const isBound = (el: DesignElement): boolean => BOUND_TYPES.has(el.type);

/** Elements that resize freely on every side (not content-sized). */
export const isFreeSized = (el: DesignElement): boolean =>
  !BOUND_TYPES.has(el.type) && el.type !== 'stack';

/** Which resize handles an element offers. */
export type ResizeMode = 'all' | 'horizontal' | 'none';

export const resizeModeOf = (el: DesignElement): ResizeMode => {
  if (el.type === 'scoreboard' || el.type === 'stack') return 'horizontal';
  if (el.type === 'stats' || el.type === 'branding') return 'none';

  return 'all';
};

export const canRotate = (el: DesignElement): boolean =>
  el.type !== 'stats' && el.type !== 'branding';

export const canDelete = (el: DesignElement): boolean => el.type !== 'branding';

export const canHide = (el: DesignElement): boolean => el.type !== 'branding';

/** Element kinds the user can add from the panel (stacks come from templates). */
export const ADDABLE_TYPES: ElementType[] = [
  'text',
  'image',
  'shape',
  'flag',
  'scoreboard',
];

export const DEFAULT_ELEMENT_NAMES: Record<ElementType, string> = {
  text: 'Text',
  image: 'Image',
  shape: 'Shape',
  flag: 'Flag',
  scoreboard: 'Scoreboard',
  stats: 'Stats',
  branding: 'Branding',
  stack: 'Stack',
};

export const elementLabel = (el: DesignElement): string =>
  el.name ||
  (el.type === 'text' && el.text.trim()
    ? el.text.trim().slice(0, 24)
    : DEFAULT_ELEMENT_NAMES[el.type]);
