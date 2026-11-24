'use client';
import { Check, List, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import StatsSegmented from '../StatsSegmented';

import { useStatusText } from './useStatusText';
import {
  buildVotesStageData,
  directionFor,
  sumLinks,
  VotesDirection,
} from './votesData';
import VotesPicker, { VotesPickerOrder } from './VotesPicker';
import VotesRing from './VotesRing';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useBackHandler } from '@/hooks/useBackHandler';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { Country, EventStage, VotingCountry } from '@/models';
import { playHaptic } from '@/native/haptics';
import { IS_NATIVE_APP } from '@/native/platform';
import { useGeneralStore } from '@/state/generalStore';
import type { StageVotes } from '@/state/scoreboard/types';

/** The band: name and switch side by side, else the switch under them. */
const BAND_STEPS = [{ band: 'row' }, { band: 'stack' }] as const;
/**
 * The toolbar: every label, then Countries as its icon, then the pills
 * toggle as its check and swatches too.
 */
const TOOL_STEPS = [
  { tools: 'full' },
  { tools: 'compact' },
  { tools: 'tight' },
] as const;

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

const fullscreenElement = () =>
  document.fullscreenElement ??
  (document as FullscreenDocument).webkitFullscreenElement ??
  null;

const requestElementFullscreen = (el: FullscreenElement) => {
  if (IS_NATIVE_APP) return;
  try {
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen;

    void request?.call(el)?.catch?.(() => undefined);
  } catch {
    // The overlay alone is the full screen (iPhone, the apps).
  }
};

const exitElementFullscreen = (el: Element | null) => {
  if (!el || fullscreenElement() !== el) return;
  const doc = document as FullscreenDocument;
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;

  void exit?.call(doc)?.catch?.(() => undefined);
};

interface VotesViewProps {
  stage: EventStage;
  stages: readonly EventStage[];
  /** The stage's entries by total (the Summary's order). */
  ranked: readonly Country[];
  voters: readonly VotingCountry[];
  votes: Partial<StageVotes> | null | undefined;
  getPoints: (country: Country) => number;
}

/**
 * The Votes tab: one country in the middle of a ring of flags, everyone
 * who gave it points or everyone it gave points to. Clicking a flag puts
 * it in the middle; Countries lists every entry and voter to start from.
 * The frame (band, ring, toolbar) can take the whole screen.
 */
const VotesView: React.FC<VotesViewProps> = ({
  stage,
  stages,
  ranked,
  voters,
  votes,
  getPoints,
}) => {
  const t = useTranslations('simulation.finalStats.votes');
  const statusText = useStatusText();
  const minimalisticFlags = useGeneralStore(
    (state) => state.settings.enableMinimalisticFlags,
  );

  const data = useMemo(
    () =>
      buildVotesStageData({ stage, stages, ranked, voters, votes, getPoints }),
    [stage, stages, ranked, voters, votes, getPoints],
  );

  const firstCode = data.entries[0]?.code ?? data.votersOnly[0]?.code ?? '';
  const [centerCode, setCenterCode] = useState(firstCode);
  const [wanted, setWanted] = useState<VotesDirection>('received');
  // The pills show unless the ring is too crowded for them, until the
  // toggle says otherwise.
  const [pillsChoice, setPillsChoice] = useState<boolean | null>(null);
  const [crowded, setCrowded] = useState(false);
  const showPills = pillsChoice ?? !crowded;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerOrder, setPickerOrder] = useState<VotesPickerOrder>('result');
  const [replayToken, setReplayToken] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Another stage: keep the country when it's there too, else its winner.
  const activeCode = data.countries.has(centerCode) ? centerCode : firstCode;
  const center = data.countries.get(activeCode);

  useEffect(() => {
    if (activeCode !== centerCode) setCenterCode(activeCode);
  }, [activeCode, centerCode]);

  const direction = directionFor(center, wanted);
  const links = useMemo(
    () =>
      center
        ? direction === 'received'
          ? data.received(center.code)
          : data.given(center.code)
        : [],
    [center, direction, data],
  );
  const totals = useMemo(() => sumLinks(links), [links]);

  // A flag clicked on the ring keeps the way the points flow: from a
  // country's givers to what that giver gave, it stays "given".
  const open = useCallback(
    (code: string) => {
      playHaptic({ id: 'selection' });
      setWanted(direction);
      setCenterCode(code);
    },
    [direction],
  );

  const toggleDirection = () => {
    playHaptic({ id: 'selection' });
    setWanted(direction === 'received' ? 'given' : 'received');
  };

  const pick = (code: string) => {
    playHaptic({ id: 'selection' });
    setCenterCode(code);
    setPickerOpen(false);
    setReplayToken((value) => value + 1);
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);

  useBackHandler(fullscreen, exitFullscreen);
  useBackHandler(pickerOpen, closePicker);

  // ---- Full screen: the frame moves into an overlay on <body> (the
  // modal's transform would trap a fixed box), which the browser's own
  // full screen takes over where it can.
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const overlay = overlayRef.current;

    if (overlay) requestElementFullscreen(overlay);

    // The browser's full screen ended (Esc, its own UI): so does ours.
    let entered = false;
    const onChange = () => {
      if (fullscreenElement() === overlay) entered = true;
      else if (entered) setFullscreen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };

    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
      exitElementFullscreen(overlay);
    };
  }, [fullscreen]);

  if (!center) return null;

  const status = statusText(center.status);
  const sub =
    direction === 'received'
      ? links.length
        ? t('subReceived', {
            status,
            points: toFixedIfDecimalFloat(totals.total),
            count: links.length,
          })
        : t('subNone', { status })
      : t('subGiven', { status, count: links.length });

  const frame = (
    <VotesFrame
      fullscreen={fullscreen}
      pickerOpen={pickerOpen}
      onEscapePicker={closePicker}
      band={
        <>
          <div className="dp-votes-heading">
            <h3 className="dp-votes-title">{center.name}</h3>
            <p className="dp-votes-sub" aria-live="polite">
              {sub}
            </p>
            {/* The key goes while the list is open (so is the toggle). */}
            {data.split && links.length > 0 && !pickerOpen && (
              <p className="dp-votes-legend">
                <span className="dp-votes-key">
                  <span className="dp-votes-pill is-jury is-static">
                    {toFixedIfDecimalFloat(totals.jury)}
                  </span>
                  {t('jury')}
                </span>
                <span className="dp-votes-key">
                  <span className="dp-votes-pill is-tele is-static">
                    {toFixedIfDecimalFloat(totals.televote)}
                  </span>
                  {t('televote')}
                </span>
              </p>
            )}
          </div>
          <StatsSegmented
            value={direction}
            options={[
              {
                value: 'received',
                label: t('received'),
                disabled: !center.isEntry,
              },
              {
                value: 'given',
                label: t('given'),
                disabled: !center.isVoter,
              },
            ]}
            onChange={setWanted}
            ariaLabel={t('direction')}
            className="dp-votes-dir"
          />
        </>
      }
      stageArea={
        <>
          <VotesRing
            // A new stage is a new set of flags.
            key={stage.id}
            data={data}
            centerCode={center.code}
            direction={direction}
            links={links}
            showPills={showPills}
            replayToken={replayToken}
            hidden={pickerOpen}
            minimalisticFlags={minimalisticFlags}
            onOpen={open}
            onCrowdedChange={setCrowded}
            onToggleDirection={
              center.isEntry && center.isVoter ? toggleDirection : undefined
            }
          />
          {pickerOpen && (
            <VotesPicker
              entries={data.entries}
              votersOnly={data.votersOnly}
              current={center.code}
              order={pickerOrder}
              onOrderChange={setPickerOrder}
              onPick={pick}
            />
          )}
        </>
      }
      tools={
        <>
          <button
            type="button"
            className={`dp-votes-tool ${pickerOpen ? 'is-on' : ''}`}
            aria-pressed={pickerOpen}
            aria-label={t('countries')}
            title={t('countries')}
            onClick={() => setPickerOpen((value) => !value)}
          >
            <List className="size-[18px] flex-none" aria-hidden="true" />
            <span className="dp-votes-tool-label">{t('countries')}</span>
          </button>

          {data.split && (
            <button
              type="button"
              className={`dp-votes-toggle ${showPills ? 'is-on' : ''}`}
              aria-pressed={showPills}
              aria-label={t('showSplit')}
              disabled={pickerOpen}
              title={t('showSplit')}
              onClick={() => setPillsChoice(!showPills)}
            >
              <span className="dp-votes-toggle-check" aria-hidden="true">
                {showPills && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="dp-votes-swatches" aria-hidden="true">
                <i className="is-jury" />
                <i className="is-tele" />
              </span>
              <span className="dp-votes-tool-label">{t('pillsToggle')}</span>
            </button>
          )}

          <span className="dp-votes-tools-gap" />

          <button
            type="button"
            className="dp-icon-btn dp-votes-icon"
            aria-label={t('replay')}
            title={t('replay')}
            disabled={pickerOpen}
            onClick={() => setReplayToken((value) => value + 1)}
          >
            <RotateCcw className="size-[17px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="dp-icon-btn dp-votes-icon"
            aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
            title={fullscreen ? t('exitFullscreen') : t('fullscreen')}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? (
              <Minimize2 className="size-[17px]" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-[17px]" aria-hidden="true" />
            )}
          </button>
        </>
      }
    />
  );

  if (!fullscreen) return frame;

  return createPortal(
    <div
      ref={overlayRef}
      className="dp-hub dp-votes-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('fullscreenLabel', { country: center.name })}
    >
      {frame}
    </div>,
    document.body,
  );
};

interface VotesFrameProps {
  fullscreen: boolean;
  pickerOpen: boolean;
  onEscapePicker: () => void;
  band: React.ReactNode;
  stageArea: React.ReactNode;
  tools: React.ReactNode;
}

/**
 * The band, the ring (or the list) and the toolbar. Its own component so
 * its fitted rows measure again after moving into the full-screen overlay.
 */
const VotesFrame: React.FC<VotesFrameProps> = ({
  fullscreen,
  pickerOpen,
  onEscapePicker,
  band,
  stageArea,
  tools,
}) => {
  const bandRef = useRef<HTMLDivElement>(null);
  const bandStep = useFitStep(bandRef, BAND_STEPS);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolStep = useFitStep(toolsRef, TOOL_STEPS);

  return (
    <div
      className={`dp-votes ${fullscreen ? 'is-full' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && pickerOpen) {
          event.stopPropagation();
          onEscapePicker();
        }
      }}
    >
      <div
        ref={bandRef}
        className="dp-votes-band"
        {...fitStepAttributes(BAND_STEPS[bandStep])}
      >
        {band}
      </div>
      <div className="dp-votes-stage">{stageArea}</div>
      <div
        ref={toolsRef}
        className="dp-votes-tools"
        {...fitStepAttributes(TOOL_STEPS[toolStep])}
      >
        {tools}
      </div>
    </div>
  );
};

export default VotesView;
