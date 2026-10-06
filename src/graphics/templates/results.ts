import { Design } from '../model/design';

import {
  ASPECT_RATIO_PRESETS,
  ImageCustomizationSettings,
  ShareImageAspectRatio,
} from '@/state/generalStore';

export interface ResultsTemplateInput {
  settings: ImageCustomizationSettings;
  /** Resolved by the caller (running-order shares use a separate toggle). */
  showPoints: boolean;
  /** `uniform` for running-order / podium shares, `live` for the scoreboard. */
  statusMode: 'live' | 'uniform';
  /** `provided` when the caller hands in the rows. */
  dataSource: 'live' | 'provided';
}

/**
 * The "Share results / running order" image as a design: a centred column
 * with title, subtitle, the country grid and the branding line on the theme
 * background. Mirrors the layout the old `ImageGenerator` rendered.
 */
export function buildResultsDesign({
  settings,
  showPoints,
  statusMode,
  dataSource,
}: ResultsTemplateInput): Design {
  const preset =
    ASPECT_RATIO_PRESETS[
      settings.aspectRatio ?? ShareImageAspectRatio.LANDSCAPE
    ];
  const hasTitle = !!settings.title;

  return {
    id: 'template-results',
    name: 'Results',
    version: 1,
    canvas: {
      width: preset.width,
      height: preset.height,
      autoSize: false,
      background: [{ kind: 'theme-bg', opacity: 1 }],
    },
    data: { source: dataSource },
    elements: [
      {
        id: 'layout',
        type: 'stack',
        fillCanvas: true,
        direction: 'column',
        align: 'center',
        justify: 'center',
        gap: 0,
        paddingX: settings.horizontalPadding,
        paddingY: 0,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        locked: true,
        hidden: false,
        children: [
          ...(hasTitle
            ? [
                {
                  id: 'title',
                  type: 'text' as const,
                  text: settings.title,
                  fontSize: settings.titleFontSize,
                  fontWeight: 700,
                  color: '#ffffff',
                  align: 'center' as const,
                  uppercase: false,
                  shadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  lineHeight: 1,
                  fontSlot: 'ui' as const,
                  marginTop: 0,
                  x: 0,
                  y: 0,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  hidden: false,
                },
              ]
            : []),
          ...(settings.subtitle
            ? [
                {
                  id: 'subtitle',
                  type: 'text' as const,
                  text: settings.subtitle,
                  fontSize: settings.subtitleFontSize,
                  fontWeight: 400,
                  color: '#ffffff',
                  align: 'center' as const,
                  uppercase: false,
                  shadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  lineHeight: 1,
                  fontSlot: 'ui' as const,
                  marginTop: hasTitle ? settings.subtitleFontSize / 3 : 0,
                  x: 0,
                  y: 0,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  hidden: false,
                },
              ]
            : []),
          {
            id: 'scoreboard',
            type: 'scoreboard',
            columns: Math.min(8, Math.max(1, settings.layout || 2)),
            itemSize: settings.itemSize,
            showPoints,
            showRankings: settings.showRankings,
            shortNames: settings.shortCountryNames,
            limit: settings.maxCountries > 0 ? settings.maxCountries : 0,
            statusMode,
            rowOrder: 'ranked',
            paddingY: settings.verticalPadding ?? 0,
            x: 0,
            y: 0,
            rotation: 0,
            opacity: 1,
            locked: false,
            hidden: false,
          },
          {
            id: 'branding',
            type: 'branding',
            fontSize: settings.brandingFontSize,
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
