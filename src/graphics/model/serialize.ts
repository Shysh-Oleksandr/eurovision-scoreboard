import { Design, parseDesign } from './design';

/** Sort keys recursively so equal designs serialise to identical text. */
export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const v = (value as Record<string, unknown>)[key];

        if (v !== undefined) acc[key] = canonicalize(v);

        return acc;
      }, {});
  }

  return value;
};

export const serializeDesign = (design: Design, pretty = false): string =>
  JSON.stringify(canonicalize(design), null, pretty ? 2 : undefined);

export const deserializeDesign = (text: string): Design =>
  parseDesign(JSON.parse(text));

/** Read a dot path (`elements.0.children.1.text`). */
export function getAtPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<any>(
      (acc, key) => (acc === null || acc === undefined ? undefined : acc[key]),
      obj,
    );
}

/** Set a dot path immutably: every container on the path is copied. */
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

let idCounter = 0;

/** Unique-enough element id for client-side documents. */
export const newElementId = (prefix = 'el'): string => {
  idCounter += 1;

  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
};
