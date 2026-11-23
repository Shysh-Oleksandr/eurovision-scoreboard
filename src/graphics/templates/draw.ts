import { Design, DrawElement, DrawSemi } from '../model/design';

import {
  ASPECT_RATIO_PRESETS,
  ShareImageAspectRatio,
} from '@/state/generalStore';

export interface DrawTemplateInput {
  aspectRatio: ShareImageAspectRatio;
  title: string;
  subtitle: string;
  order: DrawElement['order'];
  semis: DrawSemi[];
  flagStyle: DrawElement['flagStyle'];
  use2026WhiteHeart: boolean;
  showVoters: boolean;
  labels: DrawElement['labels'];
}

interface FormatLayout {
  titleFontSize: number;
  subtitleFontSize: number;
  brandingFontSize: number;
  paddingX: number;
  paddingY: number;
  /** Space between the text and the semi-finals, above and below them. */
  drawPaddingY: number;
}

const LAYOUTS: Record<ShareImageAspectRatio, FormatLayout> = {
  [ShareImageAspectRatio.LANDSCAPE]: {
    titleFontSize: 38,
    subtitleFontSize: 22,
    brandingFontSize: 18,
    paddingX: 44,
    paddingY: 22,
    drawPaddingY: 16,
  },
  [ShareImageAspectRatio.SQUARE]: {
    titleFontSize: 38,
    subtitleFontSize: 22,
    brandingFontSize: 18,
    paddingX: 36,
    paddingY: 30,
    drawPaddingY: 20,
  },
  [ShareImageAspectRatio.PORTRAIT]: {
    titleFontSize: 42,
    subtitleFontSize: 24,
    brandingFontSize: 20,
    paddingX: 32,
    paddingY: 44,
    drawPaddingY: 26,
  },
};

const base = {
  x: 0,
  y: 0,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
};

/**
 * The "Share the draw" image (docs/allocation-draw.md): title and subtitle,
 * the semi-finals as one draw element that fits the space left, and the
 * branding line, centred on the theme background.
 */
export function buildDrawDesign(input: DrawTemplateInput): Design {
  const preset = ASPECT_RATIO_PRESETS[input.aspectRatio];
  const layout = LAYOUTS[input.aspectRatio];
  const hasTitle = !!input.title;

  return {
    id: 'template-draw',
    name: 'Draw',
    version: 1,
    canvas: {
      width: preset.width,
      height: preset.height,
      autoSize: false,
      background: [{ kind: 'theme-bg', opacity: 1 }],
    },
    data: { source: 'live' },
    elements: [
      {
        ...base,
        id: 'layout',
        type: 'stack',
        fillCanvas: true,
        direction: 'column',
        align: 'center',
        justify: 'center',
        gap: 0,
        paddingX: layout.paddingX,
        paddingY: layout.paddingY,
        locked: true,
        children: [
          ...(hasTitle
            ? [
                {
                  ...base,
                  id: 'title',
                  type: 'text' as const,
                  text: input.title,
                  fontSize: layout.titleFontSize,
                  fontWeight: 700,
                  color: '#ffffff',
                  align: 'center' as const,
                  uppercase: false,
                  shadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  lineHeight: 1.1,
                  fontSlot: 'ui' as const,
                  marginTop: 0,
                },
              ]
            : []),
          ...(input.subtitle
            ? [
                {
                  ...base,
                  id: 'subtitle',
                  type: 'text' as const,
                  text: input.subtitle,
                  fontSize: layout.subtitleFontSize,
                  fontWeight: 400,
                  color: '#ffffff',
                  align: 'center' as const,
                  uppercase: false,
                  shadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  lineHeight: 1.1,
                  fontSlot: 'ui' as const,
                  marginTop: hasTitle ? layout.subtitleFontSize / 3 : 0,
                },
              ]
            : []),
          {
            ...base,
            id: 'draw',
            type: 'draw',
            semis: input.semis,
            order: input.order,
            flagStyle: input.flagStyle,
            use2026WhiteHeart: input.use2026WhiteHeart,
            showVoters: input.showVoters,
            labels: input.labels,
            paddingY: layout.drawPaddingY,
          },
          {
            ...base,
            id: 'branding',
            type: 'branding',
            fontSize: layout.brandingFontSize,
          },
        ],
      },
    ],
  };
}
