import { Design } from '../model/design';

import { StatsTableType } from '@/models';

export const STATS_MIN_WIDTH = 400;
export const STATS_MIN_HEIGHT = 400;

export interface StatsTemplateInput {
  title: string;
  table: StatsTableType;
  showBackgroundImage: boolean;
  backgroundOpacity: number;
  /** Measured canvas width from the previous render pass (content-sized). */
  measuredWidth: number;
}

const clamp = (min: number, max: number, v: number) =>
  Math.round(Math.max(min, Math.min(max, v)));

/**
 * The "Share stats" image as a design. The canvas is content-sized: the
 * table decides the width and height, and the title/branding font sizes
 * follow the measured width exactly as the old `StatsImagePreview` did.
 */
export function buildStatsDesign({
  title,
  table,
  showBackgroundImage,
  backgroundOpacity,
  measuredWidth,
}: StatsTemplateInput): Design {
  const width = Math.max(STATS_MIN_WIDTH, measuredWidth);
  const titleFontSize = clamp(22, 42, width * 0.04);
  const brandingFontSize = clamp(16, 22, width * 0.025);

  return {
    id: 'template-stats',
    name: 'Stats',
    version: 1,
    canvas: {
      width: STATS_MIN_WIDTH,
      height: STATS_MIN_HEIGHT,
      autoSize: true,
      background: [
        { kind: 'theme-surface', opacity: 1 },
        ...(showBackgroundImage
          ? [{ kind: 'theme-bg' as const, opacity: backgroundOpacity }]
          : []),
      ],
    },
    data: { source: 'provided' },
    elements: [
      {
        id: 'layout',
        type: 'stack',
        fillCanvas: true,
        direction: 'column',
        align: 'center',
        justify: 'center',
        gap: width > STATS_MIN_WIDTH * 2 ? 16 : 24,
        paddingX: 20,
        paddingY: 40,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        locked: true,
        hidden: false,
        children: [
          {
            id: 'title',
            type: 'text',
            text: title,
            fontSize: titleFontSize,
            fontWeight: 700,
            color: '#ffffff',
            align: 'center',
            uppercase: false,
            shadow: '0 0 10px rgba(0, 0, 0, 0.2)',
            lineHeight: 1,
            fontSlot: 'ui',
            marginTop: 0,
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
            locked: false,
            hidden: false,
          },
          {
            id: 'stats',
            type: 'stats',
            table,
            voteType: 'Total',
            x: 0,
            y: 0,
            // Content-sized: the table decides.
            w: undefined,
            rotation: 0,
            opacity: 1,
            locked: false,
            hidden: false,
          },
          {
            id: 'branding',
            type: 'branding',
            fontSize: brandingFontSize,
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
            locked: false,
            hidden: false,
          },
        ],
      },
    ],
  };
}
