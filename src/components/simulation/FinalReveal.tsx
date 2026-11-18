'use client';
import FinalTelevoteReveal from './FinalTelevoteReveal';
import type { LadderFit } from './finalTelevoteReveal/ladder/useLadderLayout';
import { FinalTelevoteRevealProps } from './finalTelevoteReveal/types';
import FinalTelevoteRevealLadder from './FinalTelevoteRevealLadder';

import type { FinalRevealStyle } from '@/state/generalStore';

/**
 * The final reveal in the style the viewer picked (GLOSSARY: Reveal style).
 * The style comes from `revealData`, fixed when the reveal started, so
 * changing the setting mid-reveal doesn't restart it and the header agrees
 * with the panel.
 */
const FinalReveal = ({
  fit,
  style,
  ...props
}: FinalTelevoteRevealProps & {
  fit?: LadderFit;
  style: FinalRevealStyle;
}) => {
  if (style === 'bar') return <FinalTelevoteReveal {...props} />;

  return <FinalTelevoteRevealLadder {...props} fit={fit} />;
};

export default FinalReveal;
