import { Design, DesignElement, isStack } from './design';
import { mapElements } from './elements';

/**
 * Change the canvas size and keep the layout sensible: positions scale per
 * axis, free elements scale by the smaller factor (so flags and images keep
 * their aspect), full-width elements follow the width, text and branding
 * font sizes follow the smaller factor. Content-sized dimensions are left
 * alone.
 */
export function resizeCanvas(
  design: Design,
  width: number,
  height: number,
): Design {
  const { width: ow, height: oh } = design.canvas;

  if (ow === width && oh === height) return design;
  const kx = width / ow;
  const ky = height / oh;
  const kf = Math.min(kx, ky);
  const r = Math.round;

  const scale = (el: DesignElement, inFlow: boolean): DesignElement => {
    const next: DesignElement = inFlow
      ? { ...el }
      : { ...el, x: r(el.x * kx), y: r(el.y * ky) };

    switch (next.type) {
      case 'text':
        next.fontSize = Math.max(8, r(next.fontSize * kf));
        if (!inFlow) {
          if (next.w !== undefined) next.w = r(next.w * kx);
          if (next.h !== undefined) next.h = r(next.h * ky);
        }
        break;
      case 'branding':
        next.fontSize = Math.max(12, r(next.fontSize * kf));
        break;
      case 'flag':
      case 'image':
        if (next.w !== undefined) next.w = Math.max(8, r(next.w * kf));
        if (next.h !== undefined) next.h = Math.max(8, r(next.h * kf));
        break;
      case 'stats':
        break;
      case 'scoreboard':
        if (next.w !== undefined) next.w = r(next.w * kx);
        break;
      case 'shape':
      case 'stack':
        if (next.w !== undefined) next.w = r(next.w * kx);
        if (next.h !== undefined) next.h = r(next.h * ky);
        break;
      default:
        break;
    }

    return next;
  };

  // Top-level elements scale by position; stack children only by size.
  const elements = design.elements.map((el) => {
    const scaled = scale(el, false);

    if (isStack(scaled)) {
      return {
        ...scaled,
        children: mapElements(scaled.children, (child) => scale(child, true)),
      };
    }

    return scaled;
  });

  return { ...design, canvas: { ...design.canvas, width, height }, elements };
}
