'use client';
import { Check, RotateCcw, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { isNetworkError } from '@/api/client';
import {
  useEntryFlagsQuery,
  useUploadEntryFlagMutation,
} from '@/api/entryFlags';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { Input } from '@/components/Input';
import EntryActionBar from '@/components/setup/custom-entry/EntryActionBar';
import EntryRowPreview from '@/components/setup/custom-entry/EntryRowPreview';
import FlagPicker, {
  FlagTab,
} from '@/components/setup/custom-entry/FlagPicker';
import {
  collectYourFlags,
  isCountryFlag,
  isImageLink,
  isPresetFlag,
  toPickerFlag,
} from '@/components/setup/custom-entry/flags';
import {
  defaultEntryFlag,
  ENTRY_OVERRIDE_NAME_MAX,
  getCanonicalCountry,
  normalizeEntryOverride,
  sameEntryOverride,
  sanitizeEntryOverrides,
  withEntryOverrideDefault,
} from '@/data/countries/entryOverrides';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

interface EntryOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The standard country whose name and flag this contest changes. */
  code: string;
}

interface Draft {
  name: string;
  /** The picker's name for the flag (`toPickerFlag`). */
  flag: string;
}

const ACCEPTED_IMAGES = 'image/png, image/jpeg, image/webp, image/svg+xml';
const ERROR_TEXT =
  'text-sm leading-snug text-balance text-[color:var(--badge-red-ink)]';

const tabFor = (flag: string): FlagTab => {
  if (isPresetFlag(flag)) return 'presets';
  if (isCountryFlag(flag)) return 'countries';

  return 'yours';
};

/** The server's message for a refused upload, or the fallback for anything else. */
const errorText = (error: unknown, fallback: string) =>
  isNetworkError(error)
    ? (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? fallback
    : fallback;

/**
 * A standard country's own name and flag in this contest: the country drawn
 * as the theme's board row, its name, the custom entry editor's flag picker
 * with Upload image, and whether new contests start with it too. The
 * country keeps its code, so the stats don't change
 * (data/countries/entryOverrides.ts).
 */
const EntryOverrideModal: React.FC<EntryOverrideModalProps> = ({
  isOpen,
  onClose,
  code,
}) => {
  const t = useTranslations('setup.entryOverrideModal');
  const tEntry = useTranslations('setup.customCountryModal');
  const tCommon = useTranslations('common');

  const canonical = getCanonicalCountry(code);
  const defaultName = canonical?.name ?? code;
  const defaultFlag = defaultEntryFlag(code);
  const override = useCountriesStore((state) => state.entryOverrides[code]);
  const setEntryOverride = useCountriesStore((state) => state.setEntryOverride);
  const customEntries = useCountriesStore((state) => state.customCountries);
  const accountDefaults = useGeneralStore(
    (state) => state.settings.defaultEntryOverrides,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);
  const isAuthenticated = useAuthStore((state) => !!state.user);
  const { data: entryFlags } = useEntryFlagsQuery(isAuthenticated);
  const { mutateAsync: uploadFlag, isPending: isUploading } =
    useUploadEntryFlagMutation();
  const imageUpload = useImageUpload({ maxSizeInMB: 0.5 });
  const canDrop = useMediaQuery('(pointer: fine)');

  // Uploads and linked images only: old entries' inlined (data URL) flags
  // are too big to repeat in a contest.
  const yourFlags = useMemo(
    () =>
      collectYourFlags(customEntries, entryFlags).filter((yourFlag) =>
        isImageLink(yourFlag.url),
      ),
    [customEntries, entryFlags],
  );
  const accountDefault = useMemo(
    () => sanitizeEntryOverrides(accountDefaults)[code],
    [accountDefaults, code],
  );
  /** The contest shows the country the way new contests start with it. */
  const usesAccountDefault =
    !!accountDefault && sameEntryOverride(accountDefault, override);

  const draftFromStore = (): Draft => ({
    name: override?.name ?? defaultName,
    flag: override?.flag ? toPickerFlag(override.flag) : defaultFlag,
  });

  const [name, setName] = useState(() => draftFromStore().name);
  const [flag, setFlag] = useState(() => draftFromStore().flag);
  const [tab, setTab] = useState<FlagTab>(() => tabFor(draftFromStore().flag));
  const [file, setFile] = useState<File | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useByDefault, setUseByDefault] = useState(usesAccountDefault);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const clearFile = () => {
    setFile(null);
    imageUpload.clear();
  };

  // A modal kept mounted starts again from the contest each time it opens.
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;

    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    const draft = draftFromStore();

    setName(draft.name);
    setFlag(draft.flag);
    setTab(tabFor(draft.flag));
    setUseByDefault(usesAccountDefault);
    clearFile();
    setFlagError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, code]);

  const trimmedName = name.trim();
  // What Save would store: only what differs from the country as it ships.
  // A staged upload stands for an image flag until it has gone up.
  const next = normalizeEntryOverride(code, { name: trimmedName, flag });
  const hasChanges =
    !!file ||
    !sameEntryOverride(next, override) ||
    useByDefault !== usesAccountDefault;
  const isOriginal =
    !file &&
    (!trimmedName || trimmedName === defaultName) &&
    flag === defaultFlag;
  const previewFlag = file ? imageUpload.base64 ?? flag : flag;

  const pickFlag = (picked: string) => {
    setFlag(picked);
    clearFile();
    setFlagError(null);
  };

  const takeFile = async (picked: File | null) => {
    if (!picked) return;

    if (!isAuthenticated) {
      setFlagError(t('signInToUpload'));

      return;
    }

    const { isValid, error } = await imageUpload.validateAndSetFile(picked);

    if (!isValid) {
      setFlagError(error);

      return;
    }

    setFile(picked);
    setFlagError(null);
    setTab('yours');
  };

  const handleSave = async () => {
    if (isUploading || !hasChanges) return;

    let chosenFlag = flag;

    if (file) {
      try {
        chosenFlag = (await uploadFlag(file)).url;
      } catch (error) {
        setFlagError(errorText(error, t('uploadFailed')));

        return;
      }
    }

    const saved = normalizeEntryOverride(code, {
      name: trimmedName,
      flag: chosenFlag,
    });

    setEntryOverride(code, saved);

    if (useByDefault) {
      setSettings({
        defaultEntryOverrides: withEntryOverrideDefault(
          accountDefaults,
          code,
          saved,
        ),
      });
    } else if (usesAccountDefault) {
      setSettings({
        defaultEntryOverrides: withEntryOverrideDefault(
          accountDefaults,
          code,
          null,
        ),
      });
    }

    onClose();
  };

  const restoreOriginal = () => {
    setName(defaultName);
    setFlag(defaultFlag);
    setTab('countries');
    clearFile();
    setFlagError(null);
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
        {tEntry('uploadStaged', { fileName: file.name })}
      </span>
      <button
        type="button"
        onClick={clearFile}
        className="flex-none font-bold text-white underline-offset-[3px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
      >
        {tEntry('undo')}
      </button>
    </p>
  ) : (
    <p className="text-sm leading-snug text-balance text-white/60">
      {canDrop ? tEntry('uploadHintDrop') : tEntry('uploadHint')}
    </p>
  );

  const leadingAction = isOriginal ? null : (
    <Button
      variant="surface"
      size="lg"
      className="dp-act--quiet -ml-2.5"
      Icon={<RotateCcw className="size-[18px]" />}
      onClick={restoreOriginal}
      aria-label={t('useOriginal')}
    >
      <span className="dp-entry-bar-label">{t('useOriginal')}</span>
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white narrow-scrollbar dp-flat"
      fullScreenOnPhone
      ariaLabelledBy="entryOverride-title"
      bottomContent={
        <EntryActionBar
          leading={leadingAction}
          onCancel={onClose}
          onSave={() => void handleSave()}
          isSaving={isUploading}
          saveDisabled={!hasChanges}
        />
      }
    >
      <div className="flex flex-col" {...dropHandlers}>
        <h2 id="entryOverride-title" className="text-2xl font-bold mb-1.5">
          {t('title')}
        </h2>
        <p className="text-sm leading-snug text-balance text-white/70 mb-4">
          {t('intro', { name: defaultName })}
        </p>

        <EntryRowPreview
          code={code}
          name={trimmedName}
          flag={previewFlag}
          placeholder={defaultName}
        />

        <form
          className="mt-6 flex flex-col gap-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <label htmlFor="entryOverrideName" className="text-white font-medium">
            {tCommon('name')}
          </label>
          <Input
            id="entryOverrideName"
            type="text"
            value={name}
            maxLength={ENTRY_OVERRIDE_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultName}
            autoComplete="off"
            aria-describedby="entryOverrideName-hint"
            className="h-12"
          />
          <span
            id="entryOverrideName-hint"
            className="text-white/60 text-sm leading-snug text-balance"
          >
            {t('nameHint', { name: defaultName })}
          </span>
        </form>

        <section
          aria-labelledby="entryOverrideFlag-label"
          className="relative mt-7 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h3
                id="entryOverrideFlag-label"
                className="text-white font-medium"
              >
                {t('flag')}
              </h3>
              <Button
                variant="surface"
                size="md"
                className="ml-auto"
                Icon={<Upload className="size-4" />}
                onClick={() => {
                  if (!isAuthenticated) {
                    setFlagError(t('signInToUpload'));

                    return;
                  }
                  fileInputRef.current?.click();
                }}
              >
                {tEntry('uploadImage')}
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
            selected={file ? null : flag}
            onPick={pickFlag}
            yourFlags={yourFlags}
            staged={file ? imageUpload.base64 : null}
          />

          {isDragOver && (
            <div className="dp-flag-drop pointer-events-none absolute -inset-2.5 rounded-[14px] grid place-items-center text-[15px] font-bold">
              {tEntry('dropToUpload')}
            </div>
          )}
        </section>

        <button
          type="button"
          aria-pressed={useByDefault}
          onClick={() => setUseByDefault((on) => !on)}
          className="mt-7 -mx-2.5 flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span
            className={`dp-check ${
              useByDefault ? 'is-on' : ''
            } mt-[2px] w-[17px] h-[17px] rounded-[5px] grid place-items-center flex-none`}
            aria-hidden="true"
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-bold text-white">
              {t('useByDefault')}
            </span>
            <span className="text-sm leading-snug text-balance text-white/60">
              {t('useByDefaultHint')}
            </span>
          </span>
        </button>
      </div>
    </Modal>
  );
};

export default EntryOverrideModal;
