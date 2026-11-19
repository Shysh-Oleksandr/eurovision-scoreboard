import { Check, Link2, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { BaseCountry } from '../../models';
import Button from '../common/Button';
import CustomSelect from '../common/customSelect/CustomSelect';
import Modal from '../common/Modal/Modal';
import { Input } from '../Input';

import EntryActionBar from './custom-entry/EntryActionBar';
import EntryRowPreview from './custom-entry/EntryRowPreview';
import FlagPicker, { FlagTab } from './custom-entry/FlagPicker';
import {
  collectYourFlags,
  DEFAULT_FLAG,
  isCountryFlag,
  isImageLink,
  isPresetFlag,
  toPickerFlag,
} from './custom-entry/flags';
import { getCustomEntryId } from './utils/getCustomEntryId';

import { isNetworkError } from '@/api/client';
import {
  useCreateCustomEntryMutation,
  useCustomEntryGroupsQuery,
  useDeleteCustomEntryMutation,
  useUpdateCustomEntryMutation,
  useUploadCustomEntryFlagMutation,
} from '@/api/customEntries';
import {
  normalizeShortCode,
  suggestShortCode,
} from '@/data/countries/shortCodes';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

interface CustomCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryToEdit?: BaseCountry;
  /** A new entry starts in this group (the + on a group's header). */
  initialGroupId?: string;
}

const ACCEPTED_IMAGES = 'image/png, image/jpeg, image/webp, image/svg+xml';
const ERROR_TEXT =
  'text-sm leading-snug text-balance text-[color:var(--badge-red-ink)]';

/** "Add another" stays on for the rest of the session once a host turns it on. */
let addAnotherPreference = false;

interface EntryDraft {
  name: string;
  shortCode: string;
  groupId: string;
  /** The picker's name for the flag (see `toPickerFlag`). */
  flag: string;
}

const draftFor = (country?: BaseCountry, groupId?: string): EntryDraft =>
  country
    ? {
        name: country.name,
        shortCode: country.shortCode ?? '',
        groupId: country.groupId ?? '',
        flag: toPickerFlag(country.flag),
      }
    : { name: '', shortCode: '', groupId: groupId ?? '', flag: DEFAULT_FLAG };

/** The picker opens where the entry's flag is. */
const tabFor = (country: BaseCountry | undefined, hasYourFlags: boolean) => {
  if (!country) return hasYourFlags ? 'yours' : 'presets';

  const flag = toPickerFlag(country.flag);

  if (isPresetFlag(flag)) return 'presets';
  if (isCountryFlag(flag)) return 'countries';

  return 'yours';
};

/** The translated network message, or the fallback for anything else. */
const errorText = (error: unknown, fallback: string) =>
  isNetworkError(error)
    ? (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? fallback
    : fallback;

/**
 * Create or edit a custom entry: the entry drawn as the theme's board row on
 * top, then name and short code, one flag picker, and the group.
 */
const CustomCountryModal: React.FC<CustomCountryModalProps> = ({
  isOpen,
  onClose,
  countryToEdit,
  initialGroupId,
}) => {
  const t = useTranslations('setup.customCountryModal');
  const tCommon = useTranslations('common');
  const tConfirm = useTranslations('settings.confirmations');
  const { confirm } = useConfirmation();

  const isEditMode = !!countryToEdit;
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const customEntries = useCountriesStore((state) => state.customCountries);
  const yourFlags = useMemo(
    () => collectYourFlags(customEntries),
    [customEntries],
  );

  const { data: customEntryGroups = [] } =
    useCustomEntryGroupsQuery(isAuthenticated);
  const { mutateAsync: createEntry, isPending: isCreating } =
    useCreateCustomEntryMutation();
  const { mutateAsync: updateEntry, isPending: isUpdating } =
    useUpdateCustomEntryMutation();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteCustomEntryMutation();
  const { mutateAsync: uploadFlag, isPending: isUploadingFlag } =
    useUploadCustomEntryFlagMutation();
  const isSaving = isCreating || isUpdating || isDeleting || isUploadingFlag;

  const imageUpload = useImageUpload({ maxSizeInMB: 0.5 });
  const canDrop = useMediaQuery('(pointer: fine)');

  const [initial, setInitial] = useState(() =>
    draftFor(countryToEdit, initialGroupId),
  );
  const [name, setName] = useState(initial.name);
  const [shortCode, setShortCode] = useState(initial.shortCode);
  const [groupId, setGroupId] = useState(initial.groupId);
  const [flag, setFlag] = useState(initial.flag);
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<FlagTab>(() =>
    tabFor(countryToEdit, yourFlags.length > 0),
  );
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkTouched, setLinkTouched] = useState(false);
  const [brokenLink, setBrokenLink] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [addAnother, setAddAnother] = useState(addAnotherPreference);

  /** Set once a new entry exists, so a retry updates it instead of making a second one. */
  const createdIdRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusLinkRef = useRef(false);
  const dragDepthRef = useRef(0);

  const clearFile = () => {
    setFile(null);
    imageUpload.clear();
  };

  const closeLink = () => {
    setLinkOpen(false);
    setLinkValue('');
    setLinkTouched(false);
  };

  const resetTo = (draft: EntryDraft) => {
    setName(draft.name);
    setShortCode(draft.shortCode);
    setGroupId(draft.groupId);
    setFlag(draft.flag);
    clearFile();
    closeLink();
    setBrokenLink(null);
    setNameError(null);
    setFlagError(null);
    createdIdRef.current = null;
  };

  // A modal kept mounted starts again from the entry each time it opens.
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;

    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    const draft = draftFor(countryToEdit, initialGroupId);

    setInitial(draft);
    resetTo(draft);
    setTab(tabFor(countryToEdit, yourFlags.length > 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, countryToEdit, initialGroupId]);

  useEffect(() => {
    if (!linkOpen || !focusLinkRef.current) return;

    focusLinkRef.current = false;
    linkInputRef.current?.focus();
  }, [linkOpen]);

  // What the entry would be saved with.
  const trimmedName = name.trim();
  const linkUrl = linkOpen ? linkValue.trim() : '';
  const usesLink = !!linkUrl && !file;
  const linkIsValid = isImageLink(linkUrl);
  const chosenFlag = usesLink ? linkUrl : flag;
  const previewFlag = file
    ? imageUpload.base64 ?? ''
    : usesLink && linkIsValid
    ? linkUrl
    : flag;
  const flagChanged = !!file || chosenFlag !== initial.flag;
  const hasChanges = isEditMode
    ? trimmedName !== initial.name ||
      shortCode !== initial.shortCode ||
      groupId !== initial.groupId ||
      flagChanged
    : trimmedName !== '';

  const linkError =
    !usesLink || !linkTouched
      ? null
      : !linkIsValid
      ? t('linkInvalid')
      : brokenLink === linkUrl
      ? t('linkBroken')
      : null;

  const groupOptions = useMemo(
    () => [
      { label: t('noGroup'), value: '' },
      ...customEntryGroups.map((group) => ({
        label: group.name,
        value: group._id,
      })),
    ],
    [customEntryGroups, t],
  );

  const pickFlag = (next: string) => {
    setFlag(next);
    clearFile();
    closeLink();
    setFlagError(null);
  };

  const takeFile = async (next: File | null) => {
    if (!next) return;

    const { isValid, error } = await imageUpload.validateAndSetFile(next);

    if (!isValid) {
      setFlagError(error);

      return;
    }

    setFile(next);
    closeLink();
    setFlagError(null);
    setTab('yours');
  };

  const openLink = () => {
    focusLinkRef.current = true;
    setLinkOpen(true);
  };

  /** After a save with "Add another" on: a fresh entry in the same group. */
  const startNext = () => {
    resetTo({ ...draftFor(undefined, groupId) });
    contentRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
    nameInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!trimmedName) {
      setNameError(t('nameRequired'));
      nameInputRef.current?.focus();

      return;
    }

    if (usesLink && (!linkIsValid || brokenLink === linkUrl)) {
      setLinkTouched(true);
      linkInputRef.current?.focus();

      return;
    }

    if (!isAuthenticated) {
      toast.error(t('pleaseSignInToCreateCustomEntries'));

      return;
    }

    let entryId = countryToEdit
      ? getCustomEntryId(countryToEdit.code)
      : createdIdRef.current;

    if (countryToEdit && !entryId) {
      toast.error(t('saveFailed'));

      return;
    }

    try {
      if (entryId) {
        // A staged upload replaces the flag only once it has arrived, so
        // a failed upload never leaves the entry without its old one.
        await updateEntry({
          id: entryId,
          name: trimmedName,
          groupId: groupId || null,
          shortCode: shortCode || null,
          ...(flagChanged && !file ? { flagUrl: chosenFlag } : {}),
        });
      } else {
        const created = await createEntry({
          name: trimmedName,
          flagUrl: file ? undefined : chosenFlag || DEFAULT_FLAG,
          groupId: groupId || undefined,
          shortCode: shortCode || undefined,
        });

        entryId = created._id;
        createdIdRef.current = created._id;
      }
    } catch (error) {
      toast.error(errorText(error, t('saveFailed')));

      return;
    }

    if (file && entryId) {
      try {
        await uploadFlag({ id: entryId, file });
      } catch {
        setFlagError(t('savedWithoutFlag', { name: trimmedName }));

        return;
      }
    }

    toast.success(t('entrySaved', { name: trimmedName }));

    if (!isEditMode && addAnother) {
      startNext();

      return;
    }

    onClose();
  };

  const handleDelete = () => {
    if (!countryToEdit) return;

    if (!isAuthenticated) {
      toast.error(t('pleaseSignInToDeleteCustomEntries'));

      return;
    }

    confirm({
      key: 'delete-custom-country',
      type: 'danger',
      title: tConfirm('deleteItem', { name: countryToEdit.name }),
      description: tConfirm('actionCannotBeUndone'),
      onConfirm: async () => {
        const entryId = getCustomEntryId(countryToEdit.code);

        try {
          if (!entryId) throw new Error('Invalid entry ID');
          await deleteEntry(entryId);
          toast.success(t('entryDeleted', { name: countryToEdit.name }));
          onClose();
        } catch (error) {
          toast.error(errorText(error, t('deleteFailed')));
        }
      },
    });
  };

  // Enter in Name or Short code saves, like any form.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    if (!(e.target instanceof HTMLInputElement)) return;

    e.preventDefault();
    void handleSave();
  };

  // Desktop: an image dropped anywhere on the modal becomes the flag.
  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes('Files');
  const dropHandlers = canDrop
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsDragOver(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragOver(false);
        },
        onDragOver: (e: React.DragEvent) => {
          if (hasFiles(e)) e.preventDefault();
        },
        onDrop: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepthRef.current = 0;
          setIsDragOver(false);
          void takeFile(e.dataTransfer.files?.[0] ?? null);
        },
      }
    : {};

  const flagStatus = flagError ? (
    <p className={ERROR_TEXT}>{flagError}</p>
  ) : file ? (
    <p className="flex items-baseline gap-2 text-sm leading-snug text-white/70 min-w-0">
      <span className="min-w-0 break-words">
        {t('uploadStaged', { fileName: file.name })}
      </span>
      <button
        type="button"
        onClick={clearFile}
        className="flex-none font-bold text-white underline-offset-[3px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
      >
        {t('undo')}
      </button>
    </p>
  ) : (
    <p className="text-sm leading-snug text-balance text-white/60">
      {canDrop ? t('uploadHintDrop') : t('uploadHint')}
    </p>
  );

  const leadingAction = isEditMode ? (
    <Button
      variant="surface"
      size="lg"
      className="dp-act--quiet dp-act--danger -ml-2.5"
      Icon={<Trash2 className="size-[18px]" />}
      onClick={handleDelete}
      aria-label={t('deleteEntry')}
    >
      <span className="dp-entry-bar-label">{t('deleteEntry')}</span>
    </Button>
  ) : (
    <button
      type="button"
      aria-pressed={addAnother}
      onClick={() => {
        addAnotherPreference = !addAnother;
        setAddAnother(!addAnother);
      }}
      className="flex items-center gap-2 h-[46px] -ml-2.5 px-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap text-white/80 hover:text-white hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        className={`dp-check ${
          addAnother ? 'is-on' : ''
        } w-[17px] h-[17px] rounded-[5px] grid place-items-center flex-none`}
        aria-hidden="true"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      {t('addAnother')}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white narrow-scrollbar dp-flat"
      fullScreenOnPhone
      ariaLabelledBy="entryModal-title"
      bottomContent={
        <EntryActionBar
          leading={leadingAction}
          onCancel={onClose}
          onSave={handleSave}
          isSaving={isSaving}
          saveDisabled={!hasChanges}
        />
      }
    >
      <div ref={contentRef} className="flex flex-col" {...dropHandlers}>
        <h2 id="entryModal-title" className="text-2xl font-bold mb-4">
          {isEditMode ? t('editEntry') : t('newEntry')}
        </h2>

        <EntryRowPreview
          name={trimmedName}
          flag={previewFlag}
          placeholder={t('previewName')}
        />

        <form
          className="mt-6 flex flex-col gap-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          onKeyDown={onFormKeyDown}
        >
          {/* Fields line up even when a long label ("Código curto") wraps. */}
          <div className="flex items-end gap-2.5">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label htmlFor="entryName" className="text-white font-medium">
                {tCommon('name')}
              </label>
              <Input
                id="entryName"
                ref={nameInputRef}
                type="text"
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(null);
                }}
                placeholder={tCommon('enterName')}
                autoComplete="off"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'entryName-error' : undefined}
                className="h-12"
              />
            </div>
            <div className="flex flex-col gap-2 flex-none w-[6.5rem]">
              <label
                htmlFor="entryShortCode"
                className="text-white font-medium"
              >
                {t('shortCode')}
              </label>
              <Input
                id="entryShortCode"
                type="text"
                value={shortCode}
                onChange={(e) =>
                  setShortCode(normalizeShortCode(e.target.value))
                }
                placeholder={suggestShortCode(name)}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="entryShortCode-hint"
                className="h-12 font-semibold tracking-wider placeholder:font-normal"
              />
            </div>
          </div>
          {nameError && (
            <span id="entryName-error" className={ERROR_TEXT}>
              {nameError}
            </span>
          )}
          <span
            id="entryShortCode-hint"
            className="text-white/60 text-sm leading-snug text-balance"
          >
            {t('shortCodeHint')}
          </span>
        </form>

        <section
          aria-labelledby="entryFlag-label"
          className="relative mt-7 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h3 id="entryFlag-label" className="text-white font-medium">
                {t('flag')}
              </h3>
              <Button
                variant="surface"
                size="md"
                className="ml-auto"
                Icon={<Upload className="size-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {t('uploadImage')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGES}
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;

                  // Let the same file be picked again after an Undo.
                  e.currentTarget.value = '';
                  void takeFile(picked);
                }}
              />
            </div>
            <div aria-live="polite">{flagStatus}</div>
          </div>

          <FlagPicker
            tab={tab}
            onTabChange={setTab}
            selected={file || usesLink ? null : flag}
            onPick={pickFlag}
            yourFlags={yourFlags}
            staged={file ? imageUpload.base64 : null}
          />

          {linkOpen ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="entryFlagLink" className="text-white font-medium">
                {t('imageLink')}
              </label>
              <div className="relative">
                <Input
                  id="entryFlagLink"
                  ref={linkInputRef}
                  type="url"
                  inputMode="url"
                  value={linkValue}
                  onChange={(e) => {
                    setLinkValue(e.target.value);
                    setLinkTouched(false);
                    setFlagError(null);
                    // The last flag chosen wins: a typed link replaces a
                    // staged upload, as a picked tile does.
                    if (e.target.value.trim() && file) clearFile();
                  }}
                  onBlur={() => setLinkTouched(true)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    void handleSave();
                  }}
                  placeholder="https://"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={linkError ? true : undefined}
                  aria-describedby={
                    linkError ? 'entryFlagLink-error' : 'entryFlagLink-hint'
                  }
                  className="h-12 !pr-12"
                />
                <button
                  type="button"
                  onClick={closeLink}
                  aria-label={t('removeLink')}
                  title={t('removeLink')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
              {linkError ? (
                <span id="entryFlagLink-error" className={ERROR_TEXT}>
                  {linkError}
                </span>
              ) : (
                <span
                  id="entryFlagLink-hint"
                  className="text-white/60 text-sm leading-snug text-balance"
                >
                  {t('linkHint')}
                </span>
              )}
              {usesLink && linkIsValid && (
                // Finds out whether the link is an image the board can draw.
                <img
                  key={linkUrl}
                  src={linkUrl}
                  alt=""
                  hidden
                  onLoad={() =>
                    setBrokenLink((broken) =>
                      broken === linkUrl ? null : broken,
                    )
                  }
                  onError={() => setBrokenLink(linkUrl)}
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openLink}
              className="self-start flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Link2 className="size-4" aria-hidden="true" />
              {t('useImageLink')}
            </button>
          )}

          {isDragOver && (
            <div className="dp-flag-drop pointer-events-none absolute -inset-2.5 rounded-[14px] grid place-items-center text-[15px] font-bold">
              {t('dropToUpload')}
            </div>
          )}
        </section>

        <div className="mt-7 flex flex-col">
          <CustomSelect
            options={groupOptions}
            value={groupId}
            onChange={setGroupId}
            label={t('group')}
            id="entry-group-select"
            withIndicator={false}
            selectClassName="!shadow-none"
            labelClassName="!text-base font-medium mb-2 inline-block"
          />
        </div>
      </div>
    </Modal>
  );
};

export default CustomCountryModal;
