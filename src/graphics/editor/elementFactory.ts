import { THEME_BG_SRC } from '../assets/localAssets';
import { Design, DesignElement, ElementType } from '../model/design';
import { DEFAULT_ELEMENT_NAMES } from '../model/elements';
import { newElementId } from '../model/serialize';

const base = (type: ElementType, id?: string) => ({
  id: id ?? newElementId(type),
  name: DEFAULT_ELEMENT_NAMES[type],
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
});

export const textElement = (
  over: Partial<Extract<DesignElement, { type: 'text' }>> = {},
): DesignElement => ({
  ...base('text'),
  type: 'text',
  x: 0,
  y: 0,
  w: 600,
  h: 60,
  text: 'New text',
  fontSize: 40,
  fontWeight: 700,
  color: '#ffffff',
  align: 'center',
  uppercase: false,
  shadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
  lineHeight: 1.2,
  fontSlot: 'ui',
  marginTop: 0,
  ...over,
});

/**
 * A new element of `type`, centred on the canvas (the scoreboard spans the
 * width with a 60 px margin and a 10-row limit, as the handoff specifies).
 */
export function createElement(
  type: ElementType,
  canvas: Design['canvas'],
): DesignElement {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  switch (type) {
    case 'text':
      return textElement({ x: cx - 300, y: cy - 30 });
    case 'image':
      return {
        ...base('image'),
        type: 'image',
        x: cx - 200,
        y: cy - 150,
        w: 400,
        h: 300,
        src: THEME_BG_SRC,
        fit: 'cover',
        radius: 16,
        mask: 'none',
      };
    case 'shape':
      return {
        ...base('shape'),
        type: 'shape',
        x: cx - 200,
        y: cy - 120,
        w: 400,
        h: 240,
        kind: 'rect',
        fill: { kind: 'color', value: 'rgba(255, 255, 255, 0.14)', opacity: 1 },
        radius: 18,
        strokeWidth: 0,
        shadow: false,
      };
    case 'flag':
      return {
        ...base('flag'),
        type: 'flag',
        x: cx - 60,
        y: cy - 54,
        w: 120,
        h: 108,
        countryCode: 'AT',
        shape: 'heart',
      };
    case 'scoreboard':
      return {
        ...base('scoreboard'),
        type: 'scoreboard',
        x: 60,
        y: cy - 150,
        w: canvas.width - 120,
        columns: 2,
        itemSize: 'md',
        showPoints: true,
        showRankings: true,
        shortNames: false,
        limit: 10,
        statusMode: 'live',
        rowOrder: 'ranked',
        paddingY: 0,
      };
    case 'stats':
      return {
        ...base('stats'),
        type: 'stats',
        x: 60,
        y: 60,
        table: 'Summary',
        voteType: 'Total',
      };
    case 'branding':
      return {
        ...base('branding'),
        type: 'branding',
        x: cx - 110,
        y: canvas.height - 60,
        fontSize: 20,
      };
    case 'stack':
    default:
      return {
        ...base('stack'),
        type: 'stack',
        x: cx - 300,
        y: cy - 100,
        w: 600,
        h: 200,
        direction: 'column',
        gap: 12,
        paddingX: 0,
        paddingY: 0,
        align: 'center',
        justify: 'center',
        fillCanvas: false,
        children: [],
      };
  }
}

/** Deep copy with fresh ids (duplicate, template use). */
export function cloneWithNewIds(el: DesignElement): DesignElement {
  const copy = JSON.parse(JSON.stringify(el)) as DesignElement;
  const reId = (node: DesignElement) => {
    node.id = newElementId(node.type);
    if (node.type === 'stack') node.children.forEach(reId);
  };

  reId(copy);

  return copy;
}
