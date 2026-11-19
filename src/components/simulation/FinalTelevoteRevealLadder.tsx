'use client';
import { useTranslations } from 'next-intl';
import React, {
  createRef,
  CSSProperties,
  useId,
  useRef,
  useState,
} from 'react';

import {
  ENABLE_MOTION_BLUR,
  PLACES_BELOW_LAST,
  ROUND_SQUARE_THEMES,
  TRACK_BOTTOM_PAD,
  TRACK_TOP_PAD,
  TRACK_W,
} from './finalTelevoteReveal/ladder/ladderConstants';
import {
  ACCENT_TAG_CLASSES,
  LadderMeasurer,
  LadderPill,
  LadderPlaces,
  LadderRing,
  LadderSideFlag,
  LadderSideRefs,
  TO_WIN_TAG_CLASSES,
  U,
} from './finalTelevoteReveal/ladder/LadderParts';
import {
  LadderFit,
  useLadderLayout,
} from './finalTelevoteReveal/ladder/useLadderLayout';
import { useLadderRevealAnimation } from './finalTelevoteReveal/ladder/useLadderRevealAnimation';
import { useLadderStyles } from './finalTelevoteReveal/ladder/useLadderStyles';
import { FinalTelevoteRevealProps } from './finalTelevoteReveal/types';

import {
  getChosenShortCodes,
  getShortCodes,
} from '@/data/countries/shortCodes';
import { Country } from '@/models';
import { IS_NATIVE_APP } from '@/native/platform';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import {
  FinalRevealPlaces,
  getFinalRevealPlaces,
} from '@/state/scoreboard/finalRevealPlaces';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

interface LadderSnapshot {
  places: FinalRevealPlaces;
  leader: Country;
  last: Country;
  shortCodes: Record<string, string>;
}

/**
 * The standings as the reveal starts. Everyone but the last country is
 * final, so this never changes while the panel is up. Mounted after the last
 * country's televote already landed (a remount mid-reveal), it counts from
 * before that televote.
 */
const takeSnapshot = (lastCode: string): LadderSnapshot | null => {
  const stage = useScoreboardStore.getState().getCurrentStage();
  const lastNow = stage?.countries.find((c) => c.code === lastCode);

  if (!stage || !lastNow) return null;

  const last = lastNow.isVotingFinished
    ? {
        ...lastNow,
        points: lastNow.points - lastNow.televotePoints,
        televotePoints: 0,
      }
    : lastNow;
  const countries = stage.countries.map((c) =>
    c.code === lastCode ? last : c,
  );
  const places = getFinalRevealPlaces(countries, lastCode, stage.runningOrder);
  const leader = countries.find((c) => c.code === places?.leaderCode);

  if (!places || !leader) return null;

  return {
    places,
    leader,
    last,
    shortCodes: getShortCodes(
      stage.countries,
      getChosenShortCodes(useCountriesStore.getState().customCountries),
    ),
  };
};

const createSideRefs = (): LadderSideRefs => ({
  group: createRef(),
  tag: createRef(),
  winnerTag: createRef(),
  connector: createRef(),
  bodyClip: createRef(),
  nameSeg: createRef(),
  flag: createRef(),
  cap: createRef(),
  points: createRef(),
  ringWrap: createRef(),
  ringPop: createRef(),
  ringPulse: createRef(),
  flash: createRef(),
  glow: createRef(),
  blur: createRef(),
  side: createRef(),
});

/** Motion blur only on the desktop website, never under reduced motion. */
const canUseBlur = (fit: LadderFit) => {
  if (!ENABLE_MOTION_BLUR || IS_NATIVE_APP || typeof window === 'undefined') {
    return false;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  if (fit.layout) return fit.layout === 'desktop';

  return window.matchMedia(
    '(hover: hover) and (pointer: fine) and (min-width: 1024px)',
  ).matches;
};

type Props = FinalTelevoteRevealProps & { fit?: LadderFit };

const LadderPanel = ({
  snapshot,
  onRevealComplete,
  fit,
}: {
  snapshot: LadderSnapshot;
  onRevealComplete: () => void;
  fit: LadderFit;
}) => {
  const { places, leader, last, shortCodes } = snapshot;
  const t = useTranslations('simulation.finalReveal');
  const { uppercaseEntryName, roundedCountryContainer } = useThemeSpecifics();
  const styles = useLadderStyles();
  const alwaysShowFullNames = useGeneralStore(
    (s) => s.settings.alwaysShowFullCountryNames,
  );
  const showHeart = useGeneralStore((s) => s.settings.shouldShowHeartFlagIcon);
  const whiteHearts = useGeneralStore(
    (s) => s.settings.shouldUse2026WhiteHeartFlags,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const toWinNumRef = useRef<HTMLSpanElement>(null);
  const [leaderRefs] = useState(createSideRefs);
  const [lastRefs] = useState(createSideRefs);
  const [useBlur] = useState(() => canUseBlur(fit));
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const leaderBlurId = `ladder-blur-leader-${uid}`;
  const lastBlurId = `ladder-blur-last-${uid}`;

  const toWinStart = Math.max(1, places.winAt - places.startPoints);
  // The last country only climbs, so the places far below it never matter:
  // show a couple under its start and leave the rest out.
  const totalPlaces = Math.min(
    places.totalPlaces,
    places.startPlace + PLACES_BELOW_LAST,
  );
  const currentLeaderLabel = t('currentLeader');
  const winnerLabel = t('ladder.winner');
  const toWinTag = t.rich('ladder.pointsToWin', {
    points: toWinStart,
    num: (chunks) => (
      <span
        ref={toWinNumRef}
        className="inline-block text-right tabular-nums"
        // A fixed slot: "+  9" keeps the width "+ 78" had.
        style={{ minWidth: `${String(toWinStart).length}ch` }}
      >
        {chunks}
      </span>
    ),
  });
  const codeOf = (country: Country) =>
    shortCodes[country.code] ?? country.code.toUpperCase();

  const layout = useLadderLayout(
    rootRef,
    measureRef,
    totalPlaces,
    fit,
    alwaysShowFullNames,
    [
      leader.name,
      last.name,
      currentLeaderLabel,
      winnerLabel,
      uppercaseEntryName,
    ].join('|'),
  );

  const introStarted = useLadderRevealAnimation({
    rootRef,
    trackRef,
    toWinNumRef,
    leader: leaderRefs,
    last: lastRefs,
    places,
    layout,
    useBlur,
    leaderBlurId,
    lastBlurId,
    onRevealComplete,
  });

  const labelOf = (country: Country) =>
    layout.names === 'code' ? codeOf(country) : country.name;

  return (
    <div
      ref={rootRef}
      className="dp-scoreboard-font relative w-full select-none"
      style={
        {
          height: layout.height,
          visibility: introStarted ? 'visible' : 'hidden',
          '--u': `${layout.u}px`,
          '--pitch': `${layout.pitch}px`,
          '--k': layout.k,
          '--row1': `${layout.row1}px`,
          '--round': roundedCountryContainer ? 1 : ROUND_SQUARE_THEMES,
        } as CSSProperties
      }
    >
      <LadderMeasurer
        measureRef={measureRef}
        uppercase={uppercaseEntryName}
        texts={{
          'leader-name': leader.name,
          'last-name': last.name,
          'leader-code': codeOf(leader),
          'last-code': codeOf(last),
          'tag-leader': currentLeaderLabel,
          'tag-winner': winnerLabel,
          'tag-towin': t.rich('ladder.pointsToWin', {
            points: 888,
            num: (chunks) => <span>{chunks}</span>,
          }),
        }}
      />

      {layout.sides && (
        <>
          <LadderSideFlag
            sideRef={leaderRefs.side}
            side="leader"
            country={leader}
            showHeart={showHeart}
            whiteHearts={whiteHearts}
          />
          <LadderSideFlag
            sideRef={lastRefs.side}
            side="last"
            country={last}
            showHeart={showHeart}
            whiteHearts={whiteHearts}
          />
        </>
      )}

      <div
        ref={trackRef}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: layout.trackTop,
          width: U(TRACK_W),
          height: `calc(var(--u) * ${
            TRACK_TOP_PAD + TRACK_BOTTOM_PAD
          } + var(--pitch) * ${totalPlaces - 1})`,
          borderRadius: `calc(var(--u) * ${TRACK_W / 2} * var(--round))`,
          background: styles.trackBackground,
        }}
      >
        <LadderRing refs={leaderRefs} place={1} />
        <LadderRing refs={lastRefs} place={places.startPlace} />
        <LadderPlaces total={totalPlaces} />
      </div>

      <LadderPill
        side="leader"
        refs={leaderRefs}
        country={leader}
        label={labelOf(leader)}
        points={places.leaderPoints}
        place={1}
        uppercase={uppercaseEntryName}
        nameMax={layout.nameMax}
        nameStyle={styles.leaderName}
        tag={currentLeaderLabel}
        tagClassName={ACCENT_TAG_CLASSES}
        tagStyle={styles.accentTag}
        winnerLabel={winnerLabel}
        winnerStyle={styles.accentTag}
        blurId={leaderBlurId}
      />
      <LadderPill
        side="last"
        refs={lastRefs}
        country={last}
        label={labelOf(last)}
        points={places.startPoints}
        place={places.startPlace}
        uppercase={uppercaseEntryName}
        nameMax={layout.nameMax}
        nameStyle={styles.lastName}
        tag={toWinTag}
        tagClassName={TO_WIN_TAG_CLASSES}
        winnerLabel={winnerLabel}
        winnerStyle={styles.accentTag}
        blurId={lastBlurId}
      />
    </div>
  );
};

/**
 * The final reveal, ladder style (GLOSSARY: Reveal style): after ESC Asia
 * 2026. The last country's pill climbs a column of places towards the
 * leader's and takes first place if it overtakes. See
 * docs/final-televote-reveal.md, "Ladder style".
 */
const FinalTelevoteRevealLadder = ({
  lastCountryCode,
  onRevealComplete,
  fit = {},
}: Props) => {
  const [snapshot] = useState(() => takeSnapshot(lastCountryCode));

  if (!snapshot) return null;

  return (
    <LadderPanel
      snapshot={snapshot}
      onRevealComplete={onRevealComplete}
      fit={fit}
    />
  );
};

export default FinalTelevoteRevealLadder;
