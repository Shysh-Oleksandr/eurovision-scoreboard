'use client';
import {
  ArrowDownAZ,
  ArrowDownZA,
  Check,
  ChevronDown,
  ListFilter,
  Plus,
  Shuffle,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  usePostSetupFormContext,
  useWatchVoterChannels,
  useWatchVotingCountries,
} from '../hooks/usePostSetupStageForm';
import { noDrag } from '../noDrag';

import VoterPool from './VoterPool';
import VoterPoolSheet from './VoterPoolSheet';
import {
  Channel,
  getVoterStatus,
  isChannelOn,
  toggleChannel,
  VoterStatus,
} from './voterStatus';

import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import {
  SortableItem,
  SortableList,
} from '@/components/common/sort/SortableList';
import { useGetCategoryLabel } from '@/components/setup/hooks/useGetCategoryLabel';
import { getFlagPath } from '@/helpers/getFlagPath';
import {
  BaseCountry,
  EventStage,
  StageVotingMode,
  VoterChannels,
  VotingCountry,
} from '@/models';
import { playHaptic } from '@/native/haptics';
import { shuffle } from '@/state/allocationDraw/rng';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import {
  countVotersByChannel,
  getVoterChannelMode,
  normalizeVoterChannels,
  ROTW_CODE,
} from '@/state/scoreboard/voterChannels';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { getHostingCountryLogo } from '@/theme/hosting';

/** From this width the pool is a column beside the voters. */
const POOL_COLUMN_MIN_WIDTH = 720;

const toVoter = (country: BaseCountry): VotingCountry => ({
  code: country.code,
  name: country.name,
  ...(country.flag ? { flag: country.flag } : {}),
});

/** What a change replaced, so Undo can put it back. */
interface LastAction {
  message: string;
  voters: VotingCountry[];
  channels: VoterChannels | undefined;
}

interface VotersTabProps {
  stage: EventStage;
  /** The mode chosen on the General tab (may differ from `stage.votingMode`). */
  votingMode: StageVotingMode;
  /** Called before any change, so the modal can tell it was edited. */
  onTouch: () => void;
}

/**
 * The stage's voters, numbered in the order spokespersons are called, with
 * where new ones come from beside them (desktop) or behind Add (phones).
 * Replacing the list, sorting and clearing live in one Set voters menu that
 * names each outcome and leaves a line with Undo. In Jury and Televote mode,
 * Channels turns the list into a table with a Jury and a Televote column.
 */
const VotersTab: React.FC<VotersTabProps> = ({
  stage,
  votingMode,
  onTouch,
}) => {
  const t = useTranslations('setup.stageSetup');
  const tStage = useTranslations('setup.eventStageModal');
  const tCommon = useTranslations('common');
  const form = usePostSetupFormContext();
  const voters = useWatchVotingCountries(form);
  const voterChannels = useWatchVoterChannels(form);

  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );
  const getContestParticipants = useCountriesStore(
    (state) => state.getContestParticipants,
  );
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const year = useGeneralStore((state) => state.year);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
  const getCategoryLabel = useGetCategoryLabel();

  const isJuryAndTelevote = votingMode === StageVotingMode.JURY_AND_TELEVOTE;
  // Transient: channel editing is off again the next time the modal opens,
  // so most people never meet it.
  const [channelsOn, setChannelsOn] = useState(false);
  const showChannels = isJuryAndTelevote && channelsOn;

  const [last, setLast] = useState<LastAction | null>(null);
  const [addedCode, setAddedCode] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The pool sits beside the list when the tab is wide enough.
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useLayoutEffect(() => {
    const el = rootRef.current;

    if (!el) return undefined;
    const update = () => {
      if (el.clientWidth > 0) {
        setWide(el.clientWidth >= POOL_COLUMN_MIN_WIDTH);
      }
    };

    update();
    const observer = new ResizeObserver(update);

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const stageCodes = useMemo(
    () => new Set(stage.countries.map((c) => c.code)),
    [stage.countries],
  );
  const voterCodes = useMemo(
    () => new Set(voters.map((v) => v.code)),
    [voters],
  );
  const aqGroupOf = useMemo(
    () => new Map(allCountriesForYear.map((c) => [c.code, c.aqSemiFinalGroup])),
    [allCountriesForYear],
  );
  const stageNames = useMemo(
    () =>
      new Map(
        [...eventStages, ...configuredEventStages].map((s) => [
          s.id.toLowerCase(),
          s.name,
        ]),
      ),
    [eventStages, configuredEventStages],
  );
  const contestParticipants = useMemo(
    () => getContestParticipants().map(toVoter),
    [getContestParticipants],
  );
  const initialVotingCountries = getInitialVotingCountries(stage.id);

  const channelCounts = useMemo(
    () => countVotersByChannel(voters, voterChannels),
    [voters, voterChannels],
  );
  const hasCustomChannels =
    normalizeVoterChannels(voters, voterChannels) !== undefined;

  // ----- changes -----

  const run = (message: string | null, apply: () => void) => {
    onTouch();
    const snapshot = { voters, channels: form.getVoterChannels() };

    apply();
    setAddedCode(null);
    setLast(message ? { message, ...snapshot } : null);
  };

  const setVoters = (next: VotingCountry[]) => form.setVotingCountries(next);

  const undo = () => {
    if (!last) return;
    setVoters(last.voters);
    form.setVoterChannels(last.channels);
    setLast(null);
    playHaptic({ id: 'undo' });
  };

  const fill = (message: string, list: VotingCountry[]) =>
    run(message, () => setVoters(list));

  const sortBy = (sort: 'az' | 'za' | 'shuffle') => {
    playHaptic({ id: sort === 'shuffle' ? 'shuffle' : 'sortSweep' });
    const sorted =
      sort === 'shuffle'
        ? shuffle(voters)
        : [...voters].sort((a, b) =>
            sort === 'az'
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name),
          );

    run(
      t(sort === 'az' ? 'doneAZ' : sort === 'za' ? 'doneZA' : 'doneShuffle'),
      () => setVoters(sorted),
    );
  };

  const addVoter = (country: BaseCountry) => {
    if (voterCodes.has(country.code)) return;
    run(null, () => setVoters([...voters, toVoter(country)]));
    setAddedCode(country.code);
    playHaptic({ id: 'selection' });
  };

  const addAll = (countries: BaseCountry[]) => {
    const fresh = countries.filter((c) => !voterCodes.has(c.code));

    if (fresh.length === 0) return;
    run(t('doneAddAll', { count: fresh.length }), () =>
      setVoters([...voters, ...fresh.map(toVoter)]),
    );
  };

  const removeVoter = (code: string) => {
    run(null, () => setVoters(voters.filter((v) => v.code !== code)));
  };

  const moveVoter = (from: number, to: number) => {
    if (from === to) return;
    const next = [...voters];
    const [moved] = next.splice(from, 1);

    next.splice(to, 0, moved);
    run(null, () => setVoters(next));
  };

  const setChannel = (code: string, channel: Channel) => {
    const mode = getVoterChannelMode(code, voterChannels);

    run(null, () =>
      form.setVoterChannels({
        ...(form.getVoterChannels() ?? {}),
        [code]: toggleChannel(mode, channel),
      }),
    );
  };

  // ----- the Set voters menu -----

  const otherStageVoters = contestParticipants.filter(
    (c) => !stageCodes.has(c.code),
  );
  const menuItems: AnchoredMenuEntry[] = [
    { variant: 'header', label: t('replaceWith') },
    {
      label: t('fillYear'),
      description:
        initialVotingCountries.length > 1
          ? t('fillYearHint', { year })
          : t('fillYearNone'),
      disabled: initialVotingCountries.length <= 1,
      onClick: () => fill(t('doneYear'), initialVotingCountries),
    },
    {
      label: t('fillInStage'),
      description: t('fillInStageHint', { count: stage.countries.length }),
      onClick: () => fill(t('doneInStage'), stage.countries.map(toVoter)),
    },
    {
      label: t('fillOther'),
      description: t('fillOtherHint', { count: otherStageVoters.length }),
      onClick: () => fill(t('doneOther'), otherStageVoters),
    },
    {
      label: t('fillAll'),
      description: t('fillAllHint', { count: contestParticipants.length }),
      onClick: () => fill(t('doneAll'), contestParticipants),
    },
    'hr',
    { variant: 'header', label: t('order') },
    {
      label: t('sortAZ'),
      icon: <ArrowDownAZ className="size-[17px]" />,
      disabled: voters.length < 2,
      onClick: () => sortBy('az'),
    },
    {
      label: t('sortZA'),
      icon: <ArrowDownZA className="size-[17px]" />,
      disabled: voters.length < 2,
      onClick: () => sortBy('za'),
    },
    {
      label: t('shuffle'),
      icon: <Shuffle className="size-[17px]" />,
      disabled: voters.length < 2,
      onClick: () => sortBy('shuffle'),
    },
    'hr',
    ...(isJuryAndTelevote && hasCustomChannels
      ? [
          {
            label: tStage('giveAllVotersBoth'),
            icon: <Split className="size-[17px]" />,
            onClick: () =>
              run(t('doneBoth'), () => form.setVoterChannels(undefined)),
          },
        ]
      : []),
    {
      label: tCommon('clearAll'),
      icon: <Trash2 className="size-[17px]" />,
      variant: 'danger',
      disabled: voters.length === 0,
      onClick: () => run(t('doneClear'), () => setVoters([])),
    },
  ];

  // ----- rows -----

  const statusCaption = (voter: VotingCountry): string | undefined => {
    if (voter.code === ROTW_CODE) return undefined;
    const status: VoterStatus = getVoterStatus(
      { ...voter, aqSemiFinalGroup: aqGroupOf.get(voter.code) },
      stage.id,
      stageCodes,
      eventAssignments,
    );

    if (status === 'inStage') return undefined;
    if (status === 'autoQ') return getCategoryLabel('Auto-Q');
    if (status === 'otherStage') {
      return (
        stageNames.get(eventAssignments[voter.code]?.toLowerCase()) ??
        getCategoryLabel('Other stage')
      );
    }

    return getCategoryLabel('Not participating');
  };

  const captionFor = (voter: VotingCountry) => {
    const parts = [statusCaption(voter)];

    if (isJuryAndTelevote && !showChannels) {
      const mode = getVoterChannelMode(voter.code, voterChannels);

      if (mode !== 'both') {
        parts.push(
          tStage(mode === 'jury' ? 'channelJuryOnly' : 'channelTelevoteOnly'),
        );
      }
    }

    return parts.filter(Boolean).join(', ') || undefined;
  };

  const flagFor = (voter: VotingCountry) =>
    getHostingCountryLogo(
      voter,
      shouldShowHeartFlagIcon,
      shouldUse2026WhiteHeartFlags,
    );

  const renderFlag = (voter: VotingCountry) => {
    const { logo, isExisting } = flagFor(voter);

    return (
      <img
        loading="lazy"
        src={logo}
        alt=""
        onError={(e) => {
          e.currentTarget.src = getFlagPath('ww');
        }}
        className={`pointer-events-none flex-none rounded-[3px] ${
          isExisting ? 'size-7' : 'h-[18px] w-[27px] object-cover'
        }`}
      />
    );
  };

  const renderRemove = (voter: VotingCountry) => (
    <button
      ref={noDrag}
      type="button"
      onClick={() => removeVoter(voter.code)}
      aria-label={t('remove', { name: voter.name })}
      title={t('remove', { name: voter.name })}
      className="dp-ss-x grid size-8 flex-none place-items-center rounded-lg"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  const renderChannelBox = (voter: VotingCountry, channel: Channel) => {
    const mode = getVoterChannelMode(voter.code, voterChannels);
    const on = isChannelOn(mode, channel);
    const locked = on && mode !== 'both';
    const label = `${voter.name}: ${tStage(
      channel === 'jury' ? 'votesInJury' : 'votesInTelevote',
    )}`;

    return (
      <button
        ref={noDrag}
        type="button"
        aria-pressed={on}
        aria-disabled={locked || undefined}
        aria-label={label}
        title={locked ? tStage('lastChannelLocked') : label}
        onClick={() => {
          if (locked) return;
          playHaptic({ id: 'selection' });
          setChannel(voter.code, channel);
        }}
        className={`dp-ss-chbox grid h-11 w-full place-items-center ${
          locked ? 'is-locked' : ''
        }`}
      >
        <span
          className={`dp-check grid size-6 place-items-center rounded-[7px] ${
            on ? 'is-on' : ''
          }`}
        >
          <Check className="size-[15px]" strokeWidth={3} aria-hidden="true" />
        </span>
      </button>
    );
  };

  // ----- layout -----

  const line = last ? (
    <>
      {last.message}{' '}
      <button type="button" onClick={undo} className="dp-ss-undo">
        {t('undo')}
      </button>
    </>
  ) : (
    <span className="text-white/55">
      {showChannels ? t('channelsHint') : t('votersHint')}
    </span>
  );

  const showCounts =
    isJuryAndTelevote && channelCounts.jury !== channelCounts.televote;
  const countsText = t('channelCounts', channelCounts);

  const list =
    voters.length === 0 ? (
      <p className="py-6 text-[13.5px] font-semibold leading-[1.5] text-white/60">
        {wide ? t('votersEmpty') : t('votersEmptyPhone')}
      </p>
    ) : showChannels ? (
      <div className="dp-ss-chtable" role="table" aria-label={t('voters')}>
        <div className="dp-ss-chrow dp-ss-chhead" role="row">
          <span role="columnheader" aria-hidden="true" />
          <span role="columnheader">{t('country')}</span>
          <span role="columnheader" className="justify-center">
            <i aria-hidden="true" className="dp-odds-swatch is-jury" />
            {tStage('jury')}
            <b className="tabular-nums text-white">{channelCounts.jury}</b>
          </span>
          <span role="columnheader" className="justify-center">
            <i aria-hidden="true" className="dp-odds-swatch is-televote" />
            {tStage('televote')}
            <b className="tabular-nums text-white">{channelCounts.televote}</b>
          </span>
          <span role="columnheader" aria-hidden="true" />
        </div>
        <SortableList
          onSortEnd={moveVoter}
          lockAxis="y"
          className="flex flex-col"
          draggedItemClassName="dp-ss-dragged"
        >
          {voters.map((voter, index) => (
            <SortableItem key={voter.code}>
              <div className="dp-ss-chrow dp-ss-chbody" role="row">
                <span role="cell" className="dp-ss-num">
                  {index + 1}
                </span>
                <span
                  role="cell"
                  className="flex min-w-0 items-center gap-2.5 text-[14px] font-bold"
                >
                  {renderFlag(voter)}
                  <span className="min-w-0 truncate">{voter.name}</span>
                </span>
                <span role="cell">{renderChannelBox(voter, 'jury')}</span>
                <span role="cell">{renderChannelBox(voter, 'televote')}</span>
                <span role="cell" className="grid place-items-center">
                  {renderRemove(voter)}
                </span>
              </div>
            </SortableItem>
          ))}
        </SortableList>
      </div>
    ) : (
      <SortableList
        onSortEnd={moveVoter}
        className="dp-ss-vgrid"
        draggedItemClassName="dp-ss-dragged"
      >
        {voters.map((voter, index) => {
          const caption = captionFor(voter);

          return (
            <SortableItem key={voter.code}>
              <div
                className={`dp-ss-voter ${
                  addedCode === voter.code ? 'is-new' : ''
                }`}
              >
                <span className="dp-ss-num">{index + 1}</span>
                {renderFlag(voter)}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="dp-ss-voter-name">{voter.name}</span>
                  {caption && (
                    <span className="truncate text-[12px] font-semibold leading-[1.2] text-white/55">
                      {caption}
                    </span>
                  )}
                </span>
                {renderRemove(voter)}
              </div>
            </SortableItem>
          );
        })}
      </SortableList>
    );

  const pool = (
    <VoterPool
      stageId={stage.id}
      voterCodes={voterCodes}
      onAdd={addVoter}
      onAddAll={addAll}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`dp-ss-voters flex min-h-0 flex-1 ${wide ? 'is-wide' : ''}`}
    >
      <div className="dp-ss-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-6 pt-3 narrow-scrollbar 2cols:px-[22px] 2cols:pt-4">
        <div className="flex min-h-10 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-[-0.01em]">
            {t('votersCount', { count: voters.length })}
            {wide && showCounts && (
              <span className="ml-2.5 text-[13px] font-bold tracking-normal text-white/70">
                {countsText}
              </span>
            )}
          </h3>
          {isJuryAndTelevote && (
            <button
              type="button"
              aria-pressed={showChannels}
              aria-label={wide ? undefined : t('channels')}
              title={wide ? undefined : t('channels')}
              onClick={() => setChannelsOn((on) => !on)}
              className={`dp-act ${
                showChannels ? 'is-on' : ''
              } flex h-10 flex-none items-center gap-2 rounded-xl text-[13.5px] font-extrabold normal-case ${
                wide ? 'pl-3 pr-3.5' : 'w-11 justify-center'
              }`}
            >
              <Split
                className={`size-[17px] flex-none ${
                  showChannels ? 'dp-accent-ink' : 'text-white/70'
                }`}
                aria-hidden="true"
              />
              {wide && t('channels')}
            </button>
          )}
          <button
            ref={setAnchor}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={wide ? undefined : t('setVoters')}
            title={wide ? undefined : t('setVoters')}
            onClick={() => setMenuOpen((open) => !open)}
            className={`dp-act ${
              menuOpen ? 'is-on' : ''
            } flex h-10 flex-none items-center gap-2 rounded-xl text-[13.5px] font-extrabold normal-case ${
              wide ? 'pl-3 pr-2.5' : 'w-11 justify-center'
            }`}
          >
            <ListFilter
              className="size-[17px] flex-none text-white/70"
              aria-hidden="true"
            />
            {wide && (
              <>
                {t('setVoters')}
                <ChevronDown
                  className="size-4 flex-none text-white/70"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
          {!wide && (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
              className="dp-act flex h-10 flex-none items-center gap-1.5 rounded-xl pl-2.5 pr-3.5 text-[13.5px] font-extrabold normal-case"
            >
              <Plus className="size-[18px] flex-none" aria-hidden="true" />
              {t('add')}
            </button>
          )}
        </div>

        {!wide && showCounts && (
          <p className="mt-1 text-[13px] font-bold text-white/70">
            {countsText}
          </p>
        )}

        {!isJuryAndTelevote && hasCustomChannels && (
          <p className="dp-ss-note mt-2">
            {tStage.rich('voterChannelsPaused', {
              mode: tStage(
                votingMode === StageVotingMode.JURY_ONLY
                  ? 'juryOnly'
                  : votingMode === StageVotingMode.COMBINED
                  ? 'combined'
                  : 'televoteOnly',
              ),
              juryAndTelevote: tStage('juryAndTelevote'),
              b: (chunks) => <b className="font-bold text-white">{chunks}</b>,
            })}
          </p>
        )}

        <p className="dp-ss-line">{line}</p>
        <p aria-live="polite" className="sr-only">
          {last?.message ?? ''}
        </p>

        {list}
      </div>

      {wide && (
        <aside
          aria-label={t('addVoters')}
          className="dp-ss-pool flex w-[336px] flex-none flex-col gap-2.5 overflow-y-auto overscroll-contain px-[18px] pb-6 pt-4 narrow-scrollbar"
        >
          <h3 className="flex min-h-10 items-center text-[15px] font-extrabold tracking-[-0.01em]">
            {t('addVoters')}
          </h3>
          {pool}
        </aside>
      )}

      {!wide && (
        <VoterPoolSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          {pool}
        </VoterPoolSheet>
      )}

      <AnchoredMenu
        open={menuOpen}
        anchor={anchor}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        placement="bottom-end"
        className="min-w-[300px] max-w-[min(360px,calc(100vw-16px))]"
        ariaLabel={t('setVoters')}
        plainHeaders
      />
    </div>
  );
};

export default VotersTab;
