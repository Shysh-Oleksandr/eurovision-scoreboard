/**
 * Drop-in replacement for `@75lb/deep-merge`, used by the zustand `persist`
 * `merge` callbacks.
 *
 * The package itself is ~20 lines, but it reaches it through
 * `lodash/assignWith`, which pulls in ~50 lodash modules *and* (via
 * `lodash/isBuffer` → `_nodeUtil`) Next's 34 KB `Buffer` polyfill — all of it
 * in the render-critical first chunk, since the stores are on the boot path.
 *
 * The semantics below are a faithful port, including the quirks:
 * - the target object is mutated in place and returned;
 * - only own enumerable string-keyed properties of the source are visited;
 * - a customiser returning `undefined` means "assign the source value", which
 *   is why an empty source array still overwrites an *absent* target value
 *   (`previousValue` is `undefined`, so returning it falls back to assigning);
 * - `isDefined` follows `typical`'s definition — `null` counts as defined.
 */

const isPlainObject = (input: unknown): input is Record<string, unknown> =>
  input !== null &&
  typeof input === 'object' &&
  (input as object).constructor === Object;

const isDefined = (input: unknown) => typeof input !== 'undefined';

const customise = (previousValue: unknown, newValue: unknown): unknown => {
  /* deep merge plain objects */
  if (isPlainObject(previousValue) && isPlainObject(newValue)) {
    return assign(previousValue, newValue);
  }

  /* overwrite arrays if the new array has items */
  if (
    Array.isArray(previousValue) &&
    Array.isArray(newValue) &&
    newValue.length
  ) {
    return newValue;
  }

  /* ignore incoming arrays if empty */
  if (Array.isArray(newValue) && !newValue.length) {
    return previousValue;
  }

  if (!isDefined(previousValue) && Array.isArray(newValue)) {
    return newValue;
  }

  return undefined;
};

const assign = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) => {
  for (const key of Object.keys(source)) {
    const merged = customise(target[key], source[key]);

    target[key] = merged === undefined ? source[key] : merged;
  }

  return target;
};

const deepMerge = <T>(target: T, ...sources: unknown[]): T => {
  let result = target;

  for (const source of sources) {
    if (source === null || source === undefined) continue;

    result = assign(
      result as Record<string, unknown>,
      source as Record<string, unknown>,
    ) as T;
  }

  return result;
};

export default deepMerge;
