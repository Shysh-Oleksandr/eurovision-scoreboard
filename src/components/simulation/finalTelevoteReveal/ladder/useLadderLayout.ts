import { RefObject, useLayoutEffect, useState } from 'react';

import {
  CAP_W,
  DESKTOP_PANEL_H,
  FLAG_W,
  MAX_PHONE_PANEL_H,
  MIN_PANEL_H,
  MIN_PILL_PX,
  NAME_FONT,
  NAME_PAD_X,
  PILL_GAP,
  PILL_H,
  PITCH_REF,
  TAG_FONT,
  TAG_PAD_X,
  TOP_HEADROOM,
  TRACK_BOTTOM_PAD,
  TRACK_TOP_PAD,
  TRACK_W,
  U_PER_HEIGHT_MAX,
  U_PER_HEIGHT_MIN,
} from './ladderConstants';

/** Where the panel lives, for its height. */
export interface LadderFit {
  /**
   * `desktop`: the column layout's zoomed board; `phone`: the column layout
   * with the sheet below. Absent: the classic layout.
   */
  layout?: 'desktop' | 'phone';
  /** Space the floating controls keep at the bottom (screen px). */
  bottomReserve?: number;
}

export interface LadderLayout {
  /** False until the first measure: the panel stays hidden. */
  ready: boolean;
  /** Panel height, in the panel's own px. */
  height: number;
  /** One reference unit, in px. */
  u: number;
  /** Distance between two places, in px. */
  pitch: number;
  /** pitch / reference pitch: scales the chips and numerals. */
  k: number;
  /** Top of the track and centre of place 1, from the panel's top. */
  trackTop: number;
  row1: number;
  /** Full names, or 3-letter codes when names don't fit. */
  names: 'name' | 'code';
  /** Widest a name may get before it ends in "…", in px. */
  nameMax: number;
  /** Big flags on both sides (wide panels only). */
  sides: boolean;
}

const INITIAL: LadderLayout = {
  ready: false,
  height: DESKTOP_PANEL_H,
  u: 0.5,
  pitch: PITCH_REF * 0.5,
  k: 1,
  trackTop: 0,
  row1: 0,
  names: 'name',
  nameMax: 400,
  sides: false,
};

/** A little air under the panel (the ladder style has no teaser above it). */
const TEASER_ALLOWANCE = 8;

/** Width (u) of each measured text, keyed by `data-measure`. */
type Widths = Record<string, number>;

/** The measurer renders its texts at 100px; this turns them into u. */
const readWidths = (measurer: HTMLElement | null): Widths => {
  const widths: Widths = {};

  measurer?.querySelectorAll<HTMLElement>('[data-measure]').forEach((el) => {
    const key = el.dataset.measure!;
    const font = key.startsWith('tag') ? TAG_FONT : NAME_FONT;

    widths[key] = (el.offsetWidth / 100) * font;
  });

  return widths;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** How far the panel's top is from the top of the scrolled page. */
const pageTop = (rect: DOMRect) =>
  rect.top + (document.scrollingElement?.scrollTop ?? window.scrollY);

/**
 * Fits the ladder to its panel by measuring (DESIGN.md: layouts decide by
 * measuring the content). The height comes from the screen, `u` from the
 * height and the widest side, and names give way to the board's 3-letter
 * codes when a pill would be too small to read.
 */
export const useLadderLayout = (
  rootRef: RefObject<HTMLDivElement | null>,
  measureRef: RefObject<HTMLDivElement | null>,
  totalPlaces: number,
  fit: LadderFit,
  alwaysShowFullNames: boolean,
  /** Changes when the measured texts change. */
  textKey: string,
): LadderLayout => {
  const [layout, setLayout] = useState<LadderLayout>(INITIAL);
  const { layout: fitLayout, bottomReserve = 0 } = fit;

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const compute = () => {
      const widths = readWidths(measureRef.current);
      const rect = root.getBoundingClientRect();
      // Screen px per panel px: the desktop board is CSS-zoomed.
      const scale =
        root.offsetWidth > 0 ? rect.width / root.offsetWidth || 1 : 1;
      const width = root.clientWidth;

      if (width <= 0) return;

      let height: number;

      if (fitLayout === 'desktop') {
        // The board's zoom scales the panel up to fill the screen; only
        // shrink it when even the unzoomed panel wouldn't fit. Measured from
        // the board's host, which the zoom doesn't move: the zoom follows
        // this height, so a height that followed the zoom would make the two
        // chase each other (the panel jumped between two sizes).
        const host = root.closest('.dp-sim-board') ?? root;
        const hostTop = host.getBoundingClientRect().top;

        height = clamp(
          (window.innerHeight - hostTop - bottomReserve) * 0.96 -
            TEASER_ALLOWANCE,
          MIN_PANEL_H,
          DESKTOP_PANEL_H,
        );
      } else if (fitLayout === 'phone') {
        height = clamp(
          window.innerHeight - pageTop(rect) - bottomReserve - 8,
          MIN_PANEL_H,
          MAX_PHONE_PANEL_H,
        );
      } else {
        height = clamp(window.innerHeight - pageTop(rect) - 24, 400, 640);
      }

      const places = Math.max(1, totalPlaces);
      const ladderU =
        TOP_HEADROOM +
        TRACK_TOP_PAD +
        TRACK_BOTTOM_PAD +
        (places - 1) * PITCH_REF;
      const uFromHeight = clamp(
        height / ladderU,
        height * U_PER_HEIGHT_MIN,
        height * U_PER_HEIGHT_MAX,
      );

      // The widest side decides: the ladder sits in the middle.
      const sideU = (mode: 'name' | 'code') => {
        // The name renders letter by letter (inline blocks, no kerning
        // across them), so it runs a little wider than the measured text.
        const pill = (key: string) =>
          CAP_W + FLAG_W + 2 * NAME_PAD_X + (widths[key] ?? 0) * 1.04 + 2;
        const tag = (key: string) => (widths[key] ?? 0) + 2 * TAG_PAD_X;

        return Math.max(
          pill(`leader-${mode}`),
          pill(`last-${mode}`),
          tag('tag-leader'),
          tag('tag-towin'),
          tag('tag-winner'),
        );
      };
      const fitU = (mode: 'name' | 'code') =>
        Math.min(uFromHeight, width / (TRACK_W + 2 * (PILL_GAP + sideU(mode))));

      let names: LadderLayout['names'] = 'name';
      let u = fitU('name');

      if (u * PILL_H * scale < MIN_PILL_PX) {
        const codeU = fitU('code');

        if (alwaysShowFullNames) {
          // Keep the names, cut with "…", at the size codes would get.
          u = Math.max(u, codeU);
        } else {
          names = 'code';
          u = codeU;
        }
      }

      const pitch =
        places > 1
          ? Math.min(
              PITCH_REF * u,
              (height - (TOP_HEADROOM + TRACK_TOP_PAD + TRACK_BOTTOM_PAD) * u) /
                (places - 1),
            )
          : 0;
      const ladderHeight =
        (TOP_HEADROOM + TRACK_TOP_PAD + TRACK_BOTTOM_PAD) * u +
        (places - 1) * pitch;
      const offset = Math.max(0, (height - ladderHeight) / 2);
      const sideRoom = (width / u - TRACK_W) / 2 - PILL_GAP;
      const nameMax = Math.max(
        0,
        (sideRoom - CAP_W - FLAG_W - 2 * NAME_PAD_X) * u,
      );

      const next: LadderLayout = {
        ready: true,
        height: Math.round(height),
        u,
        pitch: Math.max(pitch, 1),
        k: places > 1 ? Math.min(1, pitch / (PITCH_REF * u)) : 1,
        trackTop: offset + TOP_HEADROOM * u,
        row1: offset + (TOP_HEADROOM + TRACK_TOP_PAD) * u,
        names,
        nameMax,
        sides: fitLayout !== 'phone' && width >= 640,
      };

      setLayout((previous) =>
        previous.ready &&
        Math.abs(previous.height - next.height) < 2 &&
        Math.abs(previous.u - next.u) < 0.002 &&
        Math.abs(previous.pitch - next.pitch) < 0.25 &&
        Math.abs(previous.nameMax - next.nameMax) < 1 &&
        previous.names === next.names &&
        previous.sides === next.sides
          ? previous
          : next,
      );
    };

    compute();

    // The desktop board re-zooms right after the panel mounts (its effect
    // runs after this one), so look again for a couple of frames.
    let frames = 0;
    let raf = requestAnimationFrame(function again() {
      compute();
      frames += 1;
      if (frames < 3) raf = requestAnimationFrame(again);
    });

    const observer = new ResizeObserver(compute);

    observer.observe(root);
    window.addEventListener('resize', compute);

    let cancelled = false;

    document.fonts?.ready.then(() => {
      if (!cancelled) compute();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [
    rootRef,
    measureRef,
    totalPlaces,
    fitLayout,
    bottomReserve,
    alwaysShowFullNames,
    textKey,
  ]);

  return layout;
};
