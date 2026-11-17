/**
 * How the phone board's names fit their rows (`usePhoneColumnFit`).
 */

/** A name's widest line against its box, in px. */
export interface NameMeasure {
  text: number;
  box: number;
  fontSize: number;
}

/**
 * Measures a name at its current size. scrollWidth rounds to whole pixels,
 * so a 0.3px overflow (enough to draw an ellipsis) would pass; the text's own
 * range is measured instead. Wrapped names report their widest line.
 */
export const measureName = (name: HTMLElement): NameMeasure => {
  const range = document.createRange();

  range.selectNodeContents(name);

  const style = getComputedStyle(name);

  return {
    text: range.getBoundingClientRect().width,
    box:
      name.getBoundingClientRect().width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    fontSize: parseFloat(style.fontSize) || 16,
  };
};

const isCut = ({ text, box }: NameMeasure) => text > box + 0.01;

export const measureNames = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-entry-name]')).map(
    measureName,
  );

/** Every name fits whole (Auto takes two columns only then). */
export const allNamesFit = (names: NameMeasure[]) =>
  !names.some((name) => isCut(name));

/** The ellipsis takes about this much of the box, in em. */
const ELLIPSIS_EM = 1;
/** A cut name still shows at least this share of its widest line. */
const MIN_SHOWN = 0.7;
/** At most this share of the names may be cut (rounded up). */
const MAX_CUT_SHARE = 0.25;

/**
 * Two columns asked for keep the names, rather than switching to short
 * codes, while they still read: a few may end in an ellipsis ("NETHERL…"),
 * as long as each keeps most of itself. A name cut down to its first letters
 * ("MON…"), or a board where many names are cut, reads worse than codes.
 */
export const namesReadWell = (names: NameMeasure[]) => {
  const cut = names.filter(isCut);

  if (cut.length > Math.ceil(names.length * MAX_CUT_SHARE)) return false;

  return cut.every(
    ({ text, box, fontSize }) =>
      (box - fontSize * ELLIPSIS_EM) / text >= MIN_SHOWN,
  );
};
