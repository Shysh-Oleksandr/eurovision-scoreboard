import { ChevronRight, CloudOff, Globe, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import Image from 'next/image';

import { showContestSavedToast } from './contestSavedToast';
import {
  countSnapshotLineup,
  getContestThemePayload,
  parseContestYear,
} from './saveContest';

import {
  useApplyContestMutation,
  useClearContestLogoMutation,
  useContestGroupsQuery,
  useCreateContestMutation,
  useUpdateContestMutation,
  useUploadContestLogoMutation,
} from '@/api/contests';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import CustomSelect, {
  Option,
} from '@/components/common/customSelect/CustomSelect';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { Segmented } from '@/components/simulation/columnLayout/controls';
import { DEFAULT_HOSTING_COUNTRY_CODE } from '@/data/data';
import {
  markContestSetupClean,
  rebaseLoadedContestGeneralInfo,
} from '@/helpers/contestFingerprint';
import { buildContestSnapshotFromStores } from '@/helpers/contestSnapshot';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useIsOffline } from '@/state/connectivityStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import { Contest } from '@/types/contest';

/**
 * `new`: save the contest that is open as a new contest of the user's (on a
 * contest that isn't saved yet, a copy of someone else's, or a second
 * contest next to one of their own). `details`: change `contest`'s name and
 * details only; its stages, results and theme are never touched here (Save
 * on the contest card stores those).
 */
export type SaveContestDialogMode = 'new' | 'details';

type Kind = 'save' | 'saveAsNew' | 'copy' | 'details';

interface CreateContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SaveContestDialogMode;
  /** `details`: the contest to edit. */
  contest?: Contest;
  onLoaded?: () => void;
  /**
   * Where focus goes after closing when the element that opened the dialog
   * is gone (a menu item).
   */
  returnFocusTo?: () => HTMLElement | null | undefined;
}

const contestLabel = (contest: Pick<Contest, 'name' | 'year'>) =>
  [contest.name, contest.year].filter(Boolean).join(' ');

/** A form field: a recessed well with its name as a caption inside. */
const Field = ({
  label,
  htmlFor,
  invalid,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  invalid?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    data-invalid={invalid || undefined}
    className={`dp-field flex flex-col justify-center gap-[3px] min-h-[48px] rounded-xl px-3 py-1.5 cursor-text ${className}`}
  >
    <span className="text-[12px] font-semibold leading-none text-white/75">
      {label}
    </span>
    {children}
  </label>
);

const INPUT_CLASS =
  'w-full min-w-0 bg-transparent p-0 border-0 outline-none text-[16px] md:text-[14.5px] font-bold leading-[1.3] text-white';

const FieldError = ({ id, children }: { id: string; children: string }) => (
  <p
    id={id}
    role="alert"
    className="-mt-1 px-1 text-[12.5px] font-bold text-[var(--badge-red-ink)]"
  >
    {children}
  </p>
);

const CreateContestModal: React.FC<CreateContestModalProps> = ({
  isOpen,
  onClose,
  mode,
  contest,
  onLoaded,
  returnFocusTo,
}) => {
  const t = useTranslations();
  const tDialog = useTranslations('widgets.contests.saveDialog');
  const ids = useId();

  const user = useAuthStore((s) => s.user);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const offline = useIsOffline();

  // What this dialog does is fixed when it opens (the parents mount it per
  // open): a save switches the open contest while the dialog closes.
  const [setup] = useState(() => {
    const { activeContest, settings } = useGeneralStore.getState();
    const isDetails = mode === 'details' && !!contest;
    const editsOpenContest = isDetails && activeContest?._id === contest._id;
    const kind: Kind = isDetails
      ? 'details'
      : !activeContest
      ? 'save'
      : activeContest.userId.toString() === user?._id
      ? 'saveAsNew'
      : 'copy';
    // The open contest's own fields come from the settings, which hold any
    // name/year/host edits made since it was loaded.
    const fromSettings = !isDetails || editsOpenContest;
    const source = isDetails ? contest : kind === 'save' ? null : activeContest;

    return {
      kind,
      editsOpenContest,
      openContest: activeContest,
      lineup:
        kind === 'details'
          ? null
          : countSnapshotLineup(buildContestSnapshotFromStores()),
      form: {
        name: fromSettings ? settings.contestName : contest!.name,
        year: fromSettings
          ? settings.contestYear
          : contest!.year?.toString() ?? '',
        hostingCountryCode:
          (fromSettings
            ? settings.hostingCountryCode
            : contest!.hostingCountryCode) || DEFAULT_HOSTING_COUNTRY_CODE,
        description: fromSettings
          ? settings.contestDescription
          : contest!.description ?? '',
        venue: source?.venue ?? '',
        hosts: source?.hosts ?? '',
        isPublic:
          kind === 'details' || kind === 'saveAsNew'
            ? !!source?.isPublic
            : true,
        groupId:
          kind === 'details' || kind === 'saveAsNew'
            ? source?.groupId ?? ''
            : '',
        logoUrl: isDetails ? contest!.logoUrl ?? '' : '',
      },
    };
  });
  const { kind, editsOpenContest, openContest, lineup } = setup;

  const [name, setName] = useState(setup.form.name);
  const [year, setYear] = useState(setup.form.year);
  const [hostingCountryCode, setHostingCountryCode] = useState(
    setup.form.hostingCountryCode,
  );
  const [description, setDescription] = useState(setup.form.description);
  const [venue, setVenue] = useState(setup.form.venue);
  const [hosts, setHosts] = useState(setup.form.hosts);
  const [isPublic, setIsPublic] = useState(setup.form.isPublic);
  const [groupId, setGroupId] = useState(setup.form.groupId);
  const [logoUrl, setLogoUrl] = useState(setup.form.logoUrl);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMore, setShowMore] = useState(
    () =>
      !!(
        setup.form.venue ||
        setup.form.hosts ||
        setup.form.logoUrl ||
        (kind === 'details' && setup.form.description)
      ),
  );
  const [nameError, setNameError] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A new contest that was created before a later step (the logo upload)
  // failed: Save again updates it instead of creating a second one.
  const createdRef = useRef<Contest | null>(null);

  const imageUpload = useImageUpload({ maxSizeInMB: 1.5 });
  const { mutateAsync: createContest } = useCreateContestMutation();
  const { mutateAsync: updateContest } = useUpdateContestMutation();
  const { mutateAsync: uploadContestLogo } = useUploadContestLogoMutation();
  const { mutateAsync: clearContestLogo } = useClearContestLogoMutation();
  const { mutateAsync: applyContestToProfile } = useApplyContestMutation();
  const { data: contestGroups = [] } = useContestGroupsQuery(!!user && isOpen);

  useEffectOnce(onLoaded);

  // Focus moves into the dialog when it opens and back where it was after.
  useEffect(() => {
    if (!isOpen) return undefined;
    const returnTo = document.activeElement as HTMLElement | null;
    const timeout = window.setTimeout(
      () => dialogRef.current?.focus({ preventScroll: true }),
      60,
    );

    return () => {
      window.clearTimeout(timeout);
      const target = returnTo?.isConnected ? returnTo : returnFocusTo?.();

      target?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const hostingCountryOptions = useMemo(
    () =>
      getAllCountries(false).map((country) => {
        const { logo, isExisting } = getHostingCountryLogo(
          country,
          true,
          shouldUse2026WhiteHeartFlags,
        );

        return {
          label: country.name,
          value: country.code,
          imageUrl: logo,
          isExisting,
        };
      }),
    [getAllCountries, shouldUse2026WhiteHeartFlags],
  );

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('widgets.contests.groups.noGroup') },
      ...contestGroups.map((g) => ({ value: g._id, label: g.name })),
    ],
    [contestGroups, t],
  );
  const showGroup = !!user && (contestGroups.length > 0 || !!groupId);

  const displayLogo = uploadedFile
    ? imageUpload.base64
    : logoCleared
    ? null
    : logoUrl || null;

  const title = {
    save: tDialog('titleSave'),
    saveAsNew: tDialog('titleSaveAsNew'),
    copy: tDialog('titleCopy'),
    details: tDialog('titleDetails'),
  }[kind];

  const saveLabel = {
    save: tDialog('buttonSave'),
    saveAsNew: tDialog('buttonSaveAsNew'),
    copy: tDialog('buttonCopy'),
    details: tDialog('buttonDetails'),
  }[kind];

  const creator =
    openContest?.creator?.name ||
    (openContest?.creator?.username ? `@${openContest.creator.username}` : '');
  const summary =
    kind === 'save'
      ? lineup?.stages
        ? tDialog('descSave', {
            stages: lineup.stages,
            countries: lineup.countries,
          })
        : tDialog('descSaveNoLineup')
      : kind === 'saveAsNew'
      ? tDialog('descSaveAsNew', { name: contestLabel(openContest!) })
      : kind === 'copy'
      ? creator
        ? tDialog('descCopy', { name: contestLabel(openContest!), creator })
        : tDialog('descCopyNoCreator', { name: contestLabel(openContest!) })
      : editsOpenContest
      ? tDialog('descDetailsOpen')
      : tDialog('descDetailsOther');

  const groupPatch = (previous?: string): { groupId?: string | null } =>
    groupId ? { groupId } : previous ? { groupId: null } : {};

  const handleSave = async () => {
    if (submitting) return;

    const trimmedName = name.trim();
    const parsedYear = parseContestYear(year);

    setNameError(!trimmedName);
    setYearError(parsedYear === null);
    if (!trimmedName) {
      nameRef.current?.focus();

      return;
    }
    if (parsedYear === null) {
      yearRef.current?.focus();

      return;
    }
    if (!user) {
      toast.error(t('widgets.contests.pleaseSignInToSaveContests'));

      return;
    }

    setSubmitting(true);

    try {
      // Cleared fields are sent empty, so the server clears them too.
      const details = {
        name: trimmedName,
        year: parsedYear,
        description: description.trim(),
        venue: venue.trim(),
        hosts: hosts.trim(),
        isPublic,
        hostingCountryCode,
      };
      let saved: Contest;

      if (kind === 'details') {
        saved = await updateContest({
          id: contest!._id,
          ...details,
          ...groupPatch(contest!.groupId),
        });
      } else if (createdRef.current) {
        saved = await updateContest({
          id: createdRef.current._id,
          ...details,
          ...groupPatch(createdRef.current.groupId),
        });
        createdRef.current = saved;
      } else {
        saved = await createContest({
          ...details,
          ...getContestThemePayload(),
          snapshot: buildContestSnapshotFromStores(),
          ...(groupId ? { groupId } : {}),
        });
        createdRef.current = saved;
      }

      if (uploadedFile) {
        saved = await uploadContestLogo({ id: saved._id, file: uploadedFile });
        setUploadedFile(null);
        imageUpload.clear();
        setLogoUrl(saved.logoUrl ?? '');
      } else if (logoCleared && logoUrl === '' && setup.form.logoUrl) {
        saved = await clearContestLogo(saved._id);
        setLogoCleared(false);
      }

      const generalInfo = {
        contestName: saved.name,
        contestDescription: saved.description ?? '',
        contestYear: saved.year?.toString() ?? '',
        hostingCountryCode: saved.hostingCountryCode,
      };

      if (kind === 'details') {
        if (
          editsOpenContest &&
          useGeneralStore.getState().activeContest?._id === saved._id
        ) {
          useGeneralStore.setState((state) => ({
            activeContest: saved,
            settings: { ...state.settings, ...generalInfo },
          }));
          rebaseLoadedContestGeneralInfo(generalInfo);
        }
      } else {
        // The new contest becomes the open one. The stores already hold what
        // was saved, so only the details typed here go into the settings: a
        // full snapshot load would reset the board (the simulation's ⋯ menu
        // saves mid-vote).
        useGeneralStore.setState((state) => ({
          activeContest: saved,
          settings: { ...state.settings, ...generalInfo },
        }));
        markContestSetupClean();
        // Syncs the open contest to the account's other devices.
        applyContestToProfile(saved._id).catch(() => undefined);
      }

      const madePublic =
        saved.isPublic && (kind !== 'details' || !contest!.isPublic);

      showContestSavedToast(
        kind === 'details'
          ? tDialog('detailsSavedToast', { name: contestLabel(saved) })
          : tDialog('savedToast', { name: contestLabel(saved) }),
        { _id: saved._id, isPublic: madePublic },
        {
          copyLink: t('widgets.copyLink'),
          linkCopied: t('graphics.gallery.toast.linkCopied'),
        },
      );
      onClose();
    } catch (error) {
      toastAxiosError(error, t('widgets.contests.failedToSaveContest'));
    } finally {
      setSubmitting(false);
    }
  };

  // Enter in a one-line field saves (not in the description, and not in a
  // select's search box, which uses Enter itself).
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      e.key === 'Enter' &&
      !e.nativeEvent.isComposing &&
      target instanceof HTMLInputElement &&
      target.type !== 'file' &&
      !target.closest('[role="button"]')
    ) {
      e.preventDefault();
      void handleSave();
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const { isValid, error } = await imageUpload.validateAndSetFile(file);

    if (isValid) {
      setUploadedFile(file);
      setLogoCleared(false);
    } else if (error) {
      toast.error(error);
    }
  };

  const stopDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClearLogo = () => {
    setUploadedFile(null);
    imageUpload.clear();
    setLogoUrl('');
    setLogoCleared(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const titleId = `${ids}-title`;
  const summaryId = `${ids}-summary`;
  const nameId = `${ids}-name`;
  const yearId = `${ids}-year`;
  const moreId = `${ids}-more`;

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
          onSave={() => void handleSave()}
          isSaving={submitting}
          saveButtonDisabled={offline}
          saveButtonText={saveLabel}
          className="border-t border-[var(--hair)]"
        />
      }
    >
      <div className="text-white" onKeyDown={onFormKeyDown}>
        <h2
          id={titleId}
          className="m-0 text-[19px] font-extrabold tracking-[-.02em] leading-[1.25] text-balance"
        >
          {title}
        </h2>
        <p
          id={summaryId}
          className="mt-1.5 text-[13px] font-semibold leading-[1.45] text-white/75 text-pretty"
        >
          {summary}
        </p>
        {offline && (
          <p className="mt-2 flex items-center gap-2 text-[12.5px] font-bold text-white/85">
            <CloudOff className="size-4 flex-none" aria-hidden="true" />
            {t('offline.needsConnection')}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          <Field label={tDialog('name')} htmlFor={nameId} invalid={nameError}>
            <input
              ref={nameRef}
              id={nameId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(false);
              }}
              maxLength={120}
              autoComplete="off"
              placeholder={t('widgets.contests.enterContestName')}
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              className={INPUT_CLASS}
            />
          </Field>
          {nameError && (
            <FieldError id={`${nameId}-error`}>
              {t('widgets.contests.contestNameIsRequired')}
            </FieldError>
          )}

          <div className="flex gap-2.5">
            <div className="dp-field flex flex-col justify-center flex-1 min-w-0 rounded-xl overflow-hidden">
              <CustomSelect
                variant="combo"
                caption={t('widgets.contests.hostingCountry')}
                ariaLabel={t('widgets.contests.hostingCountry')}
                chevronOnPhone
                options={hostingCountryOptions}
                value={hostingCountryCode}
                onChange={setHostingCountryCode}
                id={`${ids}-host`}
                getImageClassName={(option: Option, type) =>
                  type === 'display'
                    ? option.isExisting
                      ? '!object-contain'
                      : '!h-4 rounded-[2px]'
                    : option.isExisting
                    ? 'w-8 h-8 !object-contain'
                    : 'w-8 h-6'
                }
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

          <div className="mt-1">
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
            <p className="mt-1.5 px-1 text-[12.5px] font-semibold leading-[1.4] text-white/75 text-pretty">
              {isPublic ? tDialog('publicHint') : tDialog('privateHint')}
            </p>
          </div>

          {showGroup && (
            <div className="dp-field flex flex-col justify-center rounded-xl overflow-hidden">
              <CustomSelect
                variant="combo"
                caption={t('widgets.contests.groups.groupLabel')}
                ariaLabel={t('widgets.contests.groups.groupLabel')}
                chevronOnPhone
                withIndicator={false}
                options={groupOptions}
                value={groupId}
                onChange={setGroupId}
                id={`${ids}-group`}
              />
            </div>
          )}

          <div>
            <button
              type="button"
              aria-expanded={showMore}
              aria-controls={moreId}
              onClick={() => setShowMore((open) => !open)}
              className="flex items-center gap-2 min-h-[44px] -mx-1 px-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronRight
                aria-hidden="true"
                className={`size-[18px] flex-none text-white/75 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  showMore ? 'rotate-90' : ''
                }`}
              />
              <span className="text-[13.5px] font-extrabold">
                {tDialog('moreDetails')}
              </span>
              <span
                aria-hidden={showMore || undefined}
                className={`min-w-0 truncate text-[12.5px] font-semibold text-white/75 transition-opacity duration-300 motion-reduce:transition-none ${
                  showMore ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {tDialog('moreDetailsHint')}
              </span>
            </button>

            {/* Slides open like the old collapsible: the row's height goes
                from 0fr to 1fr while it fades in. Kept mounted, and inert
                while closed so its fields are out of the tab order. */}
            <div
              id={moreId}
              inert={!showMore}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                showMore
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              {/* Side padding keeps the fields' focus rings unclipped. */}
              <div className="min-h-0 overflow-hidden -mx-1 px-1">
                <div className="flex flex-col gap-2.5 pt-1.5 pb-1">
                  <Field
                    label={t('common.description')}
                    htmlFor={`${ids}-desc`}
                  >
                    <textarea
                      id={`${ids}-desc`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={800}
                      rows={2}
                      placeholder={tDialog('descriptionPlaceholder')}
                      className={`${INPUT_CLASS} resize-none !leading-5 py-0.5`}
                    />
                  </Field>
                  <Field
                    label={t('widgets.contests.venue')}
                    htmlFor={`${ids}-venue`}
                  >
                    <input
                      id={`${ids}-venue`}
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      maxLength={100}
                      autoComplete="off"
                      placeholder={tDialog('venuePlaceholder')}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field
                    label={t('widgets.contests.hosts')}
                    htmlFor={`${ids}-hosts`}
                  >
                    <input
                      id={`${ids}-hosts`}
                      value={hosts}
                      onChange={(e) => setHosts(e.target.value)}
                      maxLength={100}
                      autoComplete="off"
                      placeholder={tDialog('hostsPlaceholder')}
                      className={INPUT_CLASS}
                    />
                  </Field>

                  <div className="pt-1">
                    <p className="px-1 text-[13px] font-extrabold">
                      {t('widgets.contests.logoBanner')}
                    </p>
                    <p className="px-1 mt-0.5 text-[12.5px] font-semibold text-white/75">
                      {t('widgets.contests.logoBannerHint')}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={(e) =>
                        handleFileChange(e.target.files?.[0] ?? null)
                      }
                      className="hidden"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    {displayLogo ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <Image
                          src={displayLogo}
                          alt={t('widgets.contests.logoBanner')}
                          className="h-20 w-full max-w-[240px] rounded-[10px] object-cover"
                          width={240}
                          height={80}
                          unoptimized
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="surface"
                            label={tDialog('logoReplace')}
                            onClick={() => fileInputRef.current?.click()}
                          />
                          <Button
                            size="sm"
                            variant="surface"
                            label={tDialog('logoRemove')}
                            onClick={handleClearLogo}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={(e) => {
                          stopDrag(e);
                          if (e.dataTransfer.items?.length) setIsDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          stopDrag(e);
                          setIsDragOver(false);
                        }}
                        onDragOver={stopDrag}
                        onDrop={(e) => {
                          stopDrag(e);
                          setIsDragOver(false);
                          if (e.dataTransfer.files?.length) {
                            void handleFileChange(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`mt-2 w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-[13px] font-semibold text-white/85 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                          isDragOver
                            ? 'border-accent bg-white/[0.06]'
                            : 'border-[var(--hair-2)] hover:border-white/30 hover:bg-white/[0.04]'
                        }`}
                      >
                        <UploadIcon
                          className="size-6 text-white/85 pointer-events-none"
                          aria-hidden="true"
                        />
                        <span className="pointer-events-none text-center">
                          {t('common.dragAndDropOrClickToUpload')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateContestModal;
