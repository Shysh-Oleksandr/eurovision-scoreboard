'use client';
import {
  Check,
  CloudOff,
  Dices,
  Eye,
  EyeOff,
  Globe,
  Lock,
  LogIn,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { applyNextYear } from './applyNextYear';

import { api } from '@/api/client';
import {
  useContestGroupsQuery,
  useCreateContestGroupMutation,
  useCreateContestMutation,
  useUpdateContestMutation,
} from '@/api/contests';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { showContestSavedToast } from '@/components/setup/widgets-section/contests/contestSavedToast';
import {
  Field,
  FieldError,
  hostingOptionImageClassName,
  INPUT_CLASS,
  useHostingCountryOptions,
} from '@/components/setup/widgets-section/contests/dialogFields';
import {
  getContestThemePayload,
  parseContestYear,
  toastContestSaveError,
} from '@/components/setup/widgets-section/contests/saveContest';
import { Segmented } from '@/components/simulation/columnLayout/controls';
import { CONTEST_TYPE_NAMES } from '@/data/contestTypes';
import { DEFAULT_HOSTING_COUNTRY_CODE } from '@/data/data';
import { buildContestSnapshotFromStores } from '@/helpers/contestSnapshot';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { BaseCountry, CountryAssignmentGroup } from '@/models';
import { playHaptic } from '@/native/haptics';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useIsOffline } from '@/state/connectivityStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import {
  drawNewSongOdds,
  newOddsSeed,
  ODDS_HISTORY,
  pickFavourites,
} from '@/state/nextYear/newSongs';
import {
  followingYear,
  hostLeavesFinalByDefault,
  planNextYear,
} from '@/state/nextYear/planNextYear';
import {
  getChainDefaults,
  NextYearPrefs,
  useNextYearStore,
} from '@/state/nextYearStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

/** The group select's option that reveals the new group's name field. */
const NEW_GROUP = '__new__';

/** Line-up groups of countries that don't perform next year. */
const NOT_PERFORMING: ReadonlySet<string> = new Set([
  CountryAssignmentGroup.NOT_PARTICIPATING,
  CountryAssignmentGroup.NOT_QUALIFIED,
]);

const SECTION_LABEL =
  'px-1 text-[13px] font-bold leading-[1.3] text-white/70 text-pretty';

const SmallFlag = ({ country }: { country: BaseCountry }) => (
  <img
    src={getFlagPath(country)}
    onError={(e) => handleFlagError(e.currentTarget, country)}
    alt=""
    className="h-4 w-6 flex-none rounded-[3px] object-cover ring-1 ring-white/15"
  />
);

/** An on/off choice drawn as a row with a check, and what it means under it. */
const CheckRow = ({
  pressed,
  onChange,
  label,
  hint,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={() => {
      playHaptic({ id: 'toggle', on: !pressed });
      onChange(!pressed);
    }}
    className={`flex w-full min-h-[44px] ${
      hint ? 'items-start' : 'items-center'
    } gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
  >
    <span
      aria-hidden="true"
      className={`dp-check ${pressed ? 'is-on' : ''} ${
        hint ? 'mt-px' : ''
      } grid h-[17px] w-[17px] flex-none place-items-center rounded-[5px]`}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
    <span className="min-w-0">
      <span className="flex items-center gap-2 text-[13.5px] font-extrabold leading-[1.3]">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[12.5px] font-semibold leading-[1.4] text-white/75 text-pretty">
          {hint}
        </span>
      )}
    </span>
  </button>
);

const ChangeLine = ({
  country,
  icon,
  children,
}: {
  country?: BaseCountry;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <li className="flex min-h-[28px] items-center gap-2.5 px-2.5 text-[13.5px] font-bold leading-[1.3]">
    {country ? (
      <SmallFlag country={country} />
    ) : (
      <span
        aria-hidden="true"
        className="grid w-6 flex-none place-items-center text-accent"
      >
        {icon}
      </span>
    )}
    <span className="min-w-0 text-pretty">{children}</span>
  </li>
);

interface NextYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded?: () => void;
}

/**
 * Next year: starts the following contest from a finished one. The winner
 * hosts and pre-qualifies, the year counts up, this year's host leaves the
 * final (unless kept) and the semi-finalists go back into the allocation
 * draw (`planNextYear`). Before that it can save the finished contest, with
 * its visibility and group. Mounted per open (`NextYearHost`), so what it
 * shows is fixed when it opens.
 */
const NextYearModal: React.FC<NextYearModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations();
  const tNext = useTranslations('nextYear');
  const tDialog = useTranslations('widgets.contests.saveDialog');
  const ids = useId();

  const user = useAuthStore((state) => state.user);
  const offline = useIsOffline();

  const [setup] = useState(() => {
    const { settings, activeContest, isGfOnly } = useGeneralStore.getState();
    const countries = useCountriesStore.getState();
    const { prefs } = useNextYearStore.getState();
    const byCode = new Map(
      countries.getAllCountries().map((country) => [country.code, country]),
    );

    return {
      winner: useScoreboardStore.getState().winnerCountry,
      contestNameSetting: settings.contestName,
      contestName:
        settings.contestName.trim() || CONTEST_TYPE_NAMES[settings.contestType],
      contestYear: settings.contestYear.trim(),
      contestType: settings.contestType,
      description: settings.contestDescription.trim(),
      previousHostCode: settings.hostingCountryCode || null,
      activeContest,
      byCode,
      stages: countries.configuredEventStages,
      assignments: countries.eventAssignments,
      isGfOnly,
      drawRules: useAllocationDrawStore.getState().rules,
      prefs,
      // This contest was started by Next year: it saves where the year
      // before went.
      chain: getChainDefaults(settings),
    };
  });
  const { winner, activeContest, byCode, prefs, chain } = setup;

  // The open contest when it's the user's own: saving updates it in place.
  const ownContest =
    activeContest && user && activeContest.userId.toString() === user._id
      ? activeContest
      : null;

  const [year, setYear] = useState(() => followingYear(setup.contestYear));
  const [hostCode, setHostCode] = useState(
    winner?.code ?? setup.previousHostCode ?? DEFAULT_HOSTING_COUNTRY_CODE,
  );
  const [previousHostLeaves, setPreviousHostLeaves] = useState(
    () =>
      !setup.previousHostCode ||
      hostLeavesFinalByDefault(setup.contestType, setup.previousHostCode),
  );
  const [winnerPreQualifies, setWinnerPreQualifies] = useState(true);
  const [save, setSave] = useState(prefs.save);
  // Visibility and group follow the contest's own until picked here (null).
  const [visibilityChoice, setIsPublic] = useState<boolean | null>(null);
  const [groupChoice, setGroupChoice] = useState<string | null>(null);
  // The saved contest as the server has it now: its group may have changed
  // in the contest list since it was loaded.
  const [freshContest, setFreshContest] = useState<Contest | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [then, setThen] = useState<NextYearPrefs['then']>(prefs.then);
  // "New songs": on by default, every time (not remembered).
  const [newSongs, setNewSongs] = useState(true);
  const [oddsSeed, setOddsSeed] = useState(newOddsSeed);
  // The favourites would spoil next year's likely top three: hidden until
  // asked for, every time.
  const [showFavourites, setShowFavourites] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [groupNameError, setGroupNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const groupNameRef = useRef<HTMLInputElement>(null);
  // A group made before the save failed: Start again reuses it.
  const createdGroupRef = useRef<{ name: string; id: string } | null>(null);

  const { mutateAsync: createContest } = useCreateContestMutation();
  const { mutateAsync: updateContest } = useUpdateContestMutation();
  const { mutateAsync: createGroup } = useCreateContestGroupMutation();
  const { data: contestGroups, isSuccess: groupsLoaded } =
    useContestGroupsQuery(!!user && isOpen);
  const hostingCountryOptions = useHostingCountryOptions();

  useEffectOnce(onLoaded);

  const ownContestId = ownContest?._id;

  useEffect(() => {
    if (!isOpen || !ownContestId || offline) return undefined;
    let cancelled = false;

    api
      .get(`/contests/${ownContestId}`)
      .then(({ data }) => {
        if (!cancelled) setFreshContest(data as Contest);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isOpen, ownContestId, offline]);

  // Focus moves into the dialog when it opens.
  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(
      () => dialogRef.current?.focus({ preventScroll: true }),
      60,
    );

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  // Esc closes on the website (Android back goes through the Modal).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const plan = useMemo(
    () =>
      winner
        ? planNextYear({
            stages: setup.stages,
            assignments: setup.assignments,
            isGfOnly: setup.isGfOnly,
            drawRules: setup.drawRules,
            winnerCode: winner.code,
            winnerPreQualifies,
            newHostCode: hostCode,
            previousHostCode: setup.previousHostCode,
            previousHostLeavesFinal: previousHostLeaves,
            useDraw: then === 'draw',
          })
        : null,
    [setup, winner, winnerPreQualifies, hostCode, previousHostLeaves, then],
  );

  // The contest's own group and visibility when it's saved, else what Next
  // year picked for it the year before (the chain).
  const savedContest =
    freshContest && freshContest._id === ownContestId
      ? freshContest
      : ownContest;
  const isPublic =
    visibilityChoice ??
    savedContest?.isPublic ??
    chain?.isPublic ??
    prefs.isPublic;
  const groupPick =
    groupChoice ??
    (savedContest
      ? savedContest.groupId ?? savedContest.group?._id ?? ''
      : chain?.groupId ?? '');
  // A group that was deleted since falls back to none.
  const groupValue =
    groupPick &&
    groupPick !== NEW_GROUP &&
    groupsLoaded &&
    !contestGroups?.some((group) => group._id === groupPick)
      ? ''
      : groupPick;
  const groupOptions = useMemo(
    () => [
      { value: '', label: t('widgets.contests.groups.noGroup') },
      ...(contestGroups ?? []).map((g) => ({ value: g._id, label: g.name })),
      { value: NEW_GROUP, label: tNext('newGroup') },
    ],
    [contestGroups, t, tNext],
  );

  // Next year's performers and, with New songs, their new odds: the preview
  // below is exactly what Start applies.
  const performers = useMemo(
    () =>
      plan
        ? Object.keys(plan.assignments).filter(
            (code) => !NOT_PERFORMING.has(plan.assignments[code]),
          )
        : [],
    [plan],
  );
  const newOdds = useMemo(
    () =>
      newSongs
        ? drawNewSongOdds(
            performers,
            ODDS_HISTORY[setup.contestType] ?? ODDS_HISTORY.esc,
            oddsSeed,
          )
        : null,
    [newSongs, performers, setup.contestType, oddsSeed],
  );
  const favourites = useMemo(
    () => (newOdds ? pickFavourites(newOdds, performers) : []),
    [newOdds, performers],
  );

  if (!winner || !plan) return null;

  const canSave = !!user && !offline;
  const saving = canSave && save;
  const nextYear = parseContestYear(year);
  const thisLabel = [setup.contestName, setup.contestYear]
    .filter(Boolean)
    .join(' ');
  const nextLabel = [setup.contestName, nextYear ?? '']
    .filter(Boolean)
    .join(' ');
  const country = (code: string) => byCode.get(code);
  const previousHost = setup.previousHostCode
    ? country(setup.previousHostCode)
    : undefined;
  const hostLines = plan.preQualified.filter(({ as }) => as === 'host');
  const lineupUnchanged =
    hostLines.length === 0 &&
    !plan.canChooseWinner &&
    !plan.canMovePreviousHost &&
    plan.waitingCount === 0;

  const saveFinishedContest = async (groupId: string): Promise<Contest> => {
    const contestYear = parseContestYear(setup.contestYear);
    const fields = {
      name: setup.contestName,
      description: setup.description,
      ...(contestYear ? { year: contestYear } : {}),
      hostingCountryCode:
        setup.previousHostCode || DEFAULT_HOSTING_COUNTRY_CODE,
      isPublic,
      ...getContestThemePayload(),
      snapshot: buildContestSnapshotFromStores(),
    };

    if (ownContest) {
      return updateContest({
        id: ownContest._id,
        ...fields,
        ...(groupId
          ? { groupId }
          : savedContest?.groupId
          ? { groupId: null }
          : {}),
      });
    }

    return createContest({
      ...fields,
      // A copy keeps the original's extra details, as Save a copy does.
      ...(activeContest
        ? { venue: activeContest.venue ?? '', hosts: activeContest.hosts ?? '' }
        : {}),
      ...(groupId ? { groupId } : {}),
    });
  };

  const resolveGroupId = async (): Promise<string> => {
    if (groupValue !== NEW_GROUP) return groupValue;
    const name = newGroupName.trim();

    if (createdGroupRef.current?.name === name) {
      return createdGroupRef.current.id;
    }
    const group = await createGroup({ name });

    createdGroupRef.current = { name, id: group._id };

    return group._id;
  };

  const handleStart = async () => {
    if (submitting) return;

    if (nextYear === null) {
      setYearError(true);
      yearRef.current?.focus();

      return;
    }
    if (saving && groupValue === NEW_GROUP && !newGroupName.trim()) {
      setGroupNameError(true);
      groupNameRef.current?.focus();

      return;
    }

    setSubmitting(true);

    try {
      let groupId = groupValue === NEW_GROUP ? '' : groupValue;

      if (saving) {
        groupId = await resolveGroupId();
        const saved = await saveFinishedContest(groupId);

        showContestSavedToast(
          tDialog('savedToast', {
            name: [saved.name, saved.year].filter(Boolean).join(' '),
          }),
          {
            _id: saved._id,
            isPublic: saved.isPublic && !savedContest?.isPublic,
          },
          {
            copyLink: t('widgets.copyLink'),
            copied: t('widgets.copied'),
          },
        );
      }

      const { setPrefs, setChain } = useNextYearStore.getState();

      // Remembered for next time. The group stays with the chain: next
      // year's contest saves into it, an unrelated contest doesn't.
      setPrefs({
        save: canSave ? save : prefs.save,
        isPublic: saving ? isPublic : prefs.isPublic,
        then,
      });
      setChain({
        name: setup.contestNameSetting,
        year: String(nextYear),
        groupId: saving ? groupId : groupValue === NEW_GROUP ? '' : groupValue,
        isPublic,
      });

      applyNextYear({
        plan,
        year: String(nextYear),
        hostingCountryCode: hostCode,
        openDraw: plan.usesDraw,
        odds: newOdds ?? undefined,
      });
      onClose();
    } catch (error) {
      toastContestSaveError(error, t);
    } finally {
      setSubmitting(false);
    }
  };

  // Enter in a one-line field starts (not in a select's search box).
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      e.key === 'Enter' &&
      !e.nativeEvent.isComposing &&
      target instanceof HTMLInputElement &&
      !target.closest('[role="button"]')
    ) {
      e.preventDefault();
      void handleStart();
    }
  };

  const titleId = `${ids}-title`;
  const summaryId = `${ids}-summary`;
  const yearId = `${ids}-year`;
  const groupNameId = `${ids}-group-name`;

  const ctaLabel =
    nextYear === null
      ? tNext('startFallback')
      : saving
      ? tNext('saveAndStart', { year: nextYear })
      : tNext('start', { year: nextYear });

  const notSavedHint = tNext('notSavedHint', { next: nextLabel });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ref={dialogRef}
      ariaLabelledBy={titleId}
      ariaDescribedBy={summaryId}
      containerClassName="dp-dialog !w-[min(calc(100%-1.5rem),480px)] !mx-0 !rounded-2xl"
      contentClassName="!px-4 !pt-[18px] !pb-4 2cols:!px-[22px] 2cols:!pt-[22px] 2cols:!pb-5"
      overlayClassName="!z-[1002]"
      unstyledSurface
      withBlur
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={() => void handleStart()}
          isSaving={submitting}
          saveButtonText={ctaLabel}
          className="border-t border-[var(--hair)]"
        />
      }
    >
      <div className="text-white" onKeyDown={onFormKeyDown}>
        <h2
          id={titleId}
          className="m-0 text-[19px] font-extrabold leading-[1.25] tracking-[-.02em] text-balance"
        >
          {tNext('title')}
        </h2>
        <p
          id={summaryId}
          className="mt-1.5 text-[13px] font-semibold leading-[1.45] text-white/75 text-pretty"
        >
          {tNext('summary', {
            winner: winner.name,
            contest: thisLabel,
            next: nextLabel,
          })}
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <div className="dp-field flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-xl">
              <CustomSelect
                variant="combo"
                caption={t('widgets.contests.hostingCountry')}
                ariaLabel={t('widgets.contests.hostingCountry')}
                chevronOnPhone
                options={hostingCountryOptions}
                value={hostCode}
                onChange={setHostCode}
                id={`${ids}-host`}
                getImageClassName={hostingOptionImageClassName}
              />
            </div>
            <Field
              label={t('common.year')}
              htmlFor={yearId}
              invalid={yearError}
              className="w-[92px] flex-none"
            >
              <input
                ref={yearRef}
                id={yearId}
                value={year}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4);

                  setYear(next);
                  if (yearError && parseContestYear(next) !== null)
                    setYearError(false);
                }}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={yearError || undefined}
                aria-describedby={yearError ? `${yearId}-error` : undefined}
                className={`${INPUT_CLASS} tabular-nums`}
              />
            </Field>
          </div>
          {yearError && (
            <FieldError id={`${yearId}-error`}>
              {tDialog('yearInvalid')}
            </FieldError>
          )}

          <section
            aria-labelledby={`${ids}-changes`}
            className="flex flex-col gap-1.5 pt-1.5"
          >
            <h3 id={`${ids}-changes`} className={SECTION_LABEL}>
              {tNext('changesTitle')}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {plan.canChooseWinner && (
                <li>
                  <CheckRow
                    pressed={winnerPreQualifies}
                    onChange={setWinnerPreQualifies}
                    label={
                      <>
                        <SmallFlag country={winner} />
                        {tNext('winnerPreQualifies', { country: winner.name })}
                      </>
                    }
                  />
                </li>
              )}
              {hostLines.map(({ code }) => {
                const entry = country(code);

                return entry ? (
                  <ChangeLine key={code} country={entry}>
                    {tNext('hostPreQualifies', { country: entry.name })}
                  </ChangeLine>
                ) : null;
              })}
              {plan.canMovePreviousHost && previousHost && (
                <li>
                  <CheckRow
                    pressed={previousHostLeaves}
                    onChange={setPreviousHostLeaves}
                    label={
                      <>
                        <SmallFlag country={previousHost} />
                        {tNext('previousHostToSemis', {
                          country: previousHost.name,
                        })}
                      </>
                    }
                    hint={tNext('previousHostHint')}
                  />
                </li>
              )}
              {plan.waitingCount > 0 && (
                <ChangeLine icon={<Dices className="size-4" />}>
                  {tNext('toDraw', { count: plan.waitingCount })}
                </ChangeLine>
              )}
              <li>
                <CheckRow
                  pressed={newSongs}
                  onChange={setNewSongs}
                  label={tNext('newSongs')}
                  hint={
                    newSongs ? tNext('newSongsHint') : tNext('keepOddsHint')
                  }
                />
                {newSongs && favourites.length > 0 && !showFavourites && (
                  <div className="pl-[37px]">
                    <button
                      type="button"
                      aria-expanded={false}
                      aria-controls={`${ids}-favourites`}
                      onClick={() => setShowFavourites(true)}
                      className="-ml-1.5 flex min-h-[36px] items-center gap-1.5 rounded-lg px-1.5 text-[12.5px] font-bold text-white/75 transition-colors hover:bg-white/[.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <Eye className="size-4 flex-none" aria-hidden="true" />
                      {tNext('showFavourites')}
                    </button>
                  </div>
                )}
                {newSongs && favourites.length > 0 && showFavourites && (
                  <div
                    id={`${ids}-favourites`}
                    className="flex items-center gap-2 pl-[37px] pr-1"
                  >
                    <p
                      aria-live="polite"
                      className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.6] text-white/75 text-pretty"
                    >
                      {tNext('favourites')}{' '}
                      {favourites.map((code, index) => {
                        const entry = country(code);

                        return entry ? (
                          <React.Fragment key={code}>
                            {index > 0 && ', '}
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap align-middle font-bold text-white">
                              <SmallFlag country={entry} />
                              {entry.name}
                            </span>
                          </React.Fragment>
                        ) : null;
                      })}
                    </p>
                    <Button
                      variant="surface"
                      size="sm"
                      className="!h-[34px] !w-[34px] flex-none justify-center"
                      title={tNext('rerollOdds')}
                      aria-label={tNext('rerollOdds')}
                      Icon={<RefreshCw className="size-4" />}
                      onClick={() => {
                        playHaptic({ id: 'selection' });
                        setOddsSeed(newOddsSeed());
                      }}
                    />
                    <Button
                      variant="surface"
                      size="sm"
                      className="!h-[34px] !w-[34px] flex-none justify-center"
                      title={tNext('hideFavourites')}
                      aria-label={tNext('hideFavourites')}
                      Icon={<EyeOff className="size-4" />}
                      onClick={() => setShowFavourites(false)}
                    />
                  </div>
                )}
              </li>
              {lineupUnchanged && (
                <ChangeLine icon={<Check className="size-4" />}>
                  {tNext('lineupUnchanged')}
                </ChangeLine>
              )}
            </ul>
          </section>

          {plan.drawAvailable && (
            <div className="flex flex-col gap-1.5 pt-1">
              <p id={`${ids}-then`} className={SECTION_LABEL}>
                {tNext('then')}
              </p>
              <Segmented
                ariaLabel={tNext('then')}
                value={then}
                onChange={setThen}
                options={[
                  {
                    value: 'draw',
                    label: tNext('thenDraw'),
                    icon: <Dices className="size-[15px]" />,
                  },
                  {
                    value: 'setup',
                    label: tNext('thenSetup'),
                    icon: <SlidersHorizontal className="size-[15px]" />,
                  },
                ]}
              />
              {then === 'setup' && (
                <p className="px-1 text-[12.5px] font-semibold leading-[1.4] text-white/75 text-pretty">
                  {tNext('thenSetupHint')}
                </p>
              )}
            </div>
          )}

          <section
            aria-labelledby={`${ids}-save`}
            className="mt-1 flex flex-col gap-2.5 border-t border-[var(--hair)] pt-3.5"
          >
            <h3 id={`${ids}-save`} className={SECTION_LABEL}>
              {thisLabel}
            </h3>
            {canSave ? (
              <>
                <CheckRow
                  pressed={save}
                  onChange={setSave}
                  label={
                    ownContest
                      ? tNext('saveCheckOwn', { contest: thisLabel })
                      : tNext('saveCheck', { contest: thisLabel })
                  }
                  hint={
                    save
                      ? ownContest
                        ? tNext('saveHintOwn')
                        : tNext('saveHint')
                      : notSavedHint
                  }
                />
                {save && (
                  <>
                    <Segmented
                      ariaLabel={tDialog('visibility')}
                      value={isPublic ? 'public' : 'private'}
                      onChange={(value) => setIsPublic(value === 'public')}
                      options={[
                        {
                          value: 'private',
                          label: t('widgets.private'),
                          icon: <Lock className="size-[15px]" />,
                        },
                        {
                          value: 'public',
                          label: t('widgets.public'),
                          icon: <Globe className="size-[15px]" />,
                        },
                      ]}
                    />
                    <div className="dp-field flex flex-col justify-center overflow-hidden rounded-xl">
                      <CustomSelect
                        variant="combo"
                        caption={t('widgets.contests.groups.groupLabel')}
                        ariaLabel={t('widgets.contests.groups.groupLabel')}
                        chevronOnPhone
                        withIndicator={false}
                        options={groupOptions}
                        value={groupValue}
                        onChange={(value) => {
                          setGroupChoice(value);
                          if (value === NEW_GROUP) {
                            window.setTimeout(
                              () => groupNameRef.current?.focus(),
                              60,
                            );
                          }
                        }}
                        id={`${ids}-group`}
                      />
                    </div>
                    {groupValue === NEW_GROUP && (
                      <>
                        <Field
                          label={tNext('newGroupName')}
                          htmlFor={groupNameId}
                          invalid={groupNameError}
                        >
                          <input
                            ref={groupNameRef}
                            id={groupNameId}
                            value={newGroupName}
                            onChange={(e) => {
                              setNewGroupName(e.target.value);
                              if (groupNameError && e.target.value.trim())
                                setGroupNameError(false);
                            }}
                            maxLength={100}
                            autoComplete="off"
                            placeholder={tNext('newGroupPlaceholder', {
                              name: setup.contestName,
                            })}
                            aria-invalid={groupNameError || undefined}
                            aria-describedby={
                              groupNameError
                                ? `${groupNameId}-error`
                                : undefined
                            }
                            className={INPUT_CLASS}
                          />
                        </Field>
                        {groupNameError && (
                          <FieldError id={`${groupNameId}-error`}>
                            {t('widgets.contests.groups.nameRequired')}
                          </FieldError>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="flex items-start gap-2.5 px-1 text-[12.5px] font-semibold leading-[1.45] text-white/80 text-pretty">
                {user ? (
                  <CloudOff
                    className="mt-px size-4 flex-none"
                    aria-hidden="true"
                  />
                ) : (
                  <LogIn
                    className="mt-px size-4 flex-none"
                    aria-hidden="true"
                  />
                )}
                {user
                  ? tNext('offlineHint', {
                      contest: thisLabel,
                      next: nextLabel,
                    })
                  : tNext('signInHint', {
                      contest: thisLabel,
                      next: nextLabel,
                    })}
              </p>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default NextYearModal;
