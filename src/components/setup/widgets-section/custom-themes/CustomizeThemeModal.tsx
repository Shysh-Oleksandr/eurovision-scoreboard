import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import Hue from '@uiw/react-color-hue';
import ShadeSlider from '@uiw/react-color-shade-slider';

import ColorOverridesSection from './ColorOverridesSection';
import {
  emptySoundDelaySecTextState,
  emptySoundFileState,
  emptySoundUrlState,
  isValidHttpsSoundUrl,
  SOUND_ACCEPT_MIMES,
  SOUND_MAX_BYTES,
  soundDelayMsToSecondsInputValue,
  soundDelaySecondsInputToMs,
} from './sounds/customizeThemeSoundConstants';
import CustomizeThemeSoundEffectsSection from './sounds/CustomizeThemeSoundEffectsSection';
import ThemePreviewCountryItem from './ThemePreviewCountryItem';

import {
  useCreateThemeMutation,
  useReportThemeDuplicateMutation,
  useThemeGroupsQuery,
  useUpdateThemeMutation,
  useUploadThemeBackgroundMutation,
  useUploadThemeSoundMutation,
} from '@/api/themes';
import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { CheckIcon } from '@/assets/icons/CheckIcon';
import { UndoIcon } from '@/assets/icons/UndoIcon';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import Tabs from '@/components/common/tabs/Tabs';
import { TextareaField } from '@/components/common/TextareaField';
import { Tooltip } from '@/components/common/Tooltip';
import { Input } from '@/components/Input';
import { JESC_THEME_OPTIONS, THEME_OPTIONS } from '@/data/data';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useConfirmModalClose } from '@/hooks/useConfirmModalClose';
import { useDebounce } from '@/hooks/useDebounce';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import {
  getInterfaceFontSelectOptions,
  normalizeFontAlias,
} from '@/theme/fontAliases';
import { themeContentFingerprint } from '@/theme/themeFingerprint';
import {
  THEME_SOUND_EVENTS,
  type ThemeSoundEventId,
} from '@/theme/themeSoundEvents';
import {
  resolveThemeSpecificsForBaseThemeYear,
  resolveThemeSpecificsForCustomTheme,
} from '@/theme/themeSpecifics';
import { applyCustomTheme, getDefaultThemeColors } from '@/theme/themeUtils';
import { FlagShape, PointsContainerShape, ThemeSpecifics } from '@/theme/types';
import { useThemeColor } from '@/theme/useThemeColor';
import {
  BoardAnimationMode,
  CustomTheme,
  DouzePointsAnimationMode,
} from '@/types/customTheme';

const ALL_THEME_OPTIONS = [...THEME_OPTIONS, ...JESC_THEME_OPTIONS];

// The live-preview theme's timestamps are never rendered — only the visual
// content is applied. Use a fixed value so rebuilding the preview object on
// every tweak doesn't allocate a fresh Date each time.
const PREVIEW_TIMESTAMP = '1970-01-01T00:00:00.000Z';

interface CustomizeThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme?: CustomTheme;
  isEditMode?: boolean;
}

const CustomizeThemeModal: React.FC<CustomizeThemeModalProps> = ({
  isOpen,
  onClose,
  initialTheme,
  isEditMode = false,
}) => {
  const t = useTranslations();

  const { onClickOutside } = useConfirmModalClose({
    onClose,
    confirmKey: 'close-customize-theme',
    title: t('widgets.themes.confirmCloseCustomizeThemeTitle'),
    description: t('widgets.themes.confirmCloseCustomizeThemeDescription'),
  });

  const themeYear = useGeneralStore((state) => state.themeYear);
  const applyCustomThemeToStore = useGeneralStore((s) => s.applyCustomTheme);
  const currentCustomTheme = useGeneralStore((s) => s.customTheme);
  const primaryColor = useThemeColor('primary.800' as any);
  const hueRegex = /^hsl\(\s*([\d.]+)\s*,/i;
  const match = primaryColor.match(hueRegex);
  const themeHue = match ? parseFloat(match[1]) : 270;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseThemeYear, setBaseThemeYear] = useState(themeYear);
  const [hue, setHue] = useState(themeHue);
  const [hsva, setHsva] = useState({ h: themeHue, s: 80, v: 60, a: 1 });

  const [isPublic, setIsPublic] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [fontAlias, setFontAlias] = useState('montserrat');

  const interfaceFontOptions = useMemo(
    () => getInterfaceFontSelectOptions(),
    [],
  );

  // Theme-specific UI options
  const [uppercaseEntryName, setUppercaseEntryName] = useState(true);
  const [pointsContainerShape, setPointsContainerShape] =
    useState<PointsContainerShape>('triangle');
  const [flagShape, setFlagShape] = useState<FlagShape>('big-rectangle');
  const [juryActivePointsUnderline, setJuryActivePointsUnderline] =
    useState(true);
  const [isJuryPointsPanelRounded, setIsJuryPointsPanelRounded] =
    useState(false);
  const [usePointsCountUpAnimation, setUsePointsCountUpAnimation] =
    useState(true);
  const [boardAnimationMode, setBoardAnimationMode] =
    useState<BoardAnimationMode>('flip');
  const [douzePointsAnimationMode, setDouzePointsAnimationMode] =
    useState<DouzePointsAnimationMode>('heartsGrid');
  const [roundedCountryContainer, setRoundedCountryContainer] = useState(false);
  const [soundUrls, setSoundUrls] =
    useState<Record<ThemeSoundEventId, string>>(emptySoundUrlState);
  const [soundFiles, setSoundFiles] =
    useState<Record<ThemeSoundEventId, File | null>>(emptySoundFileState);
  const [soundDelaySecText, setSoundDelaySecText] = useState<
    Record<ThemeSoundEventId, string>
  >(emptySoundDelaySecTextState);
  const [soundDragOver, setSoundDragOver] = useState<ThemeSoundEventId | null>(
    null,
  );
  const [soundPreviewState, setSoundPreviewState] = useState<{
    event: ThemeSoundEventId;
    paused: boolean;
  } | null>(null);
  const [themeGroupId, setThemeGroupId] = useState('');
  const soundPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundPreviewObjectUrlRef = useRef<string | null>(null);
  const stopSoundPreview = useCallback(() => {
    const a = soundPreviewAudioRef.current;

    if (a) {
      a.pause();
      a.src = '';
    }
    if (soundPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(soundPreviewObjectUrlRef.current);
      soundPreviewObjectUrlRef.current = null;
    }
    soundPreviewAudioRef.current = null;
    setSoundPreviewState(null);
  }, []);

  const { mutateAsync: createTheme, isPending: isCreating } =
    useCreateThemeMutation();
  const { mutateAsync: updateTheme, isPending: isUpdating } =
    useUpdateThemeMutation();
  const { mutateAsync: uploadBackground, isPending: isUploadingBg } =
    useUploadThemeBackgroundMutation();
  const { mutateAsync: uploadThemeSound, isPending: isUploadingSounds } =
    useUploadThemeSoundMutation();
  const { mutateAsync: reportDuplicate } = useReportThemeDuplicateMutation();
  const user = useAuthStore((s) => s.user);

  const { data: themeGroups = [] } = useThemeGroupsQuery(!!user && isOpen);

  const themeGroupOptions = useMemo(
    () => [
      { value: '', label: t('widgets.themes.groups.noGroup') },
      ...themeGroups.map((g) => ({ value: g._id, label: g.name })),
    ],
    [themeGroups, t],
  );

  const imageUpload = useImageUpload({ maxSizeInMB: 1.5 });

  // Debounce hue and shade to avoid heavy recomputation on every tick
  const debouncedHue = useDebounce(hue, 40);
  const debouncedShade = useDebounce(hsva.v, 40);
  // Overrides update on every pointer-move while dragging a swatch in the color
  // picker; debounce them for the live preview so we re-inject the theme <style>
  // (and trigger a style recalc) at most ~25x/s instead of per event. The swatch
  // grid itself still renders the live `overrides` for instant feedback.
  const debouncedOverrides = useDebounce(overrides, 40);
  const debouncedHsva = useMemo(
    () => ({ ...hsva, h: debouncedHue, v: debouncedShade }),
    [hsva, debouncedHue, debouncedShade],
  );

  // Get default colors for the current base theme and selected HSVA (shade-aware)
  const defaultColors = useMemo(
    () => getDefaultThemeColors(baseThemeYear, debouncedHsva),
    [baseThemeYear, debouncedHsva],
  );

  const applyThemeSpecificsFormState = useCallback(
    (specifics: ThemeSpecifics) => {
      setPointsContainerShape(specifics.pointsContainerShape);
      setUppercaseEntryName(specifics.uppercaseEntryName);
      setJuryActivePointsUnderline(specifics.juryActivePointsUnderline);
      setIsJuryPointsPanelRounded(specifics.isJuryPointsPanelRounded);
      setFlagShape(specifics.flagShape);
      setUsePointsCountUpAnimation(specifics.usePointsCountUpAnimation);
      setRoundedCountryContainer(specifics.roundedCountryContainer);
      setBoardAnimationMode(specifics.boardAnimationMode);
      setDouzePointsAnimationMode(specifics.douzePointsAnimationMode);
      setFontAlias(normalizeFontAlias(specifics.fontAlias));
    },
    [],
  );

  const handleBaseThemeYearChange = useCallback(
    (year: string) => {
      setBaseThemeYear(year);
      applyThemeSpecificsFormState(resolveThemeSpecificsForBaseThemeYear(year));
    },
    [applyThemeSpecificsFormState],
  );

  // Initialize form with theme to edit
  useEffect(() => {
    if (initialTheme) {
      const resolvedInitialThemeSpecifics =
        resolveThemeSpecificsForCustomTheme(initialTheme);

      setName(initialTheme.name);
      setDescription(initialTheme.description || '');
      setBaseThemeYear(initialTheme.baseThemeYear);
      setHue(initialTheme.hue);
      setHsva({
        h: initialTheme.hue,
        s: 80,
        v: initialTheme.shadeValue || 60,
        a: 1,
      });
      // Remixing someone's theme starts as a private draft — discourages using
      // "Remix" as a public re-save. Editing keeps the theme's own visibility.
      setIsPublic(isEditMode ? initialTheme.isPublic : false);
      setThemeGroupId(initialTheme.groupId || '');
      setBackgroundImageUrl(initialTheme.backgroundImageUrl || '');
      setOverrides(initialTheme.overrides || {});
      setUploadedFile(null);
      applyThemeSpecificsFormState(resolvedInitialThemeSpecifics);
      setSoundUrls(() => {
        const next = emptySoundUrlState();

        if (initialTheme.themeSounds) {
          for (const e of THEME_SOUND_EVENTS) {
            const u = initialTheme.themeSounds?.[e]?.url;

            if (u) next[e] = u;
          }
        }

        return next;
      });
      setSoundFiles(emptySoundFileState());
      setSoundDelaySecText(() => {
        const next = emptySoundDelaySecTextState();

        if (initialTheme.themeSounds) {
          for (const e of THEME_SOUND_EVENTS) {
            const d = initialTheme.themeSounds?.[e]?.delayMs;

            if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
              next[e] = soundDelayMsToSecondsInputValue(d);
            }
          }
        }

        return next;
      });
    } else {
      setName('');
      setDescription('');
      setBaseThemeYear(themeYear);
      setHue(themeHue);
      setHsva({ h: themeHue, s: 80, v: 60, a: 1 });
      setIsPublic(true);
      setBackgroundImageUrl('');
      setOverrides({});
      setUploadedFile(null);
      applyThemeSpecificsFormState(
        resolveThemeSpecificsForBaseThemeYear(themeYear),
      );
      setSoundUrls(emptySoundUrlState());
      setSoundFiles(emptySoundFileState());
      setSoundDelaySecText(emptySoundDelaySecTextState());
      setThemeGroupId('');
    }
  }, [
    initialTheme,
    isEditMode,
    isOpen,
    themeYear,
    themeHue,
    applyThemeSpecificsFormState,
  ]);

  // Live preview effect
  useEffect(() => {
    if (!isOpen) return;

    const previewThemeSounds: Partial<
      Record<ThemeSoundEventId, { url: string; delayMs?: number }>
    > = {};

    for (const e of THEME_SOUND_EVENTS) {
      const u = soundUrls[e].trim();

      if (u) {
        const d = soundDelaySecondsInputToMs(soundDelaySecText[e]);

        previewThemeSounds[e] = d > 0 ? { url: u, delayMs: d } : { url: u };
      }
    }

    const previewTheme: CustomTheme = {
      _id: 'preview',
      name: 'Preview',
      userId: 'preview',
      isPublic: false,
      likes: 0,
      saves: 0,
      baseThemeYear,
      hue: debouncedHue,
      shadeValue: debouncedShade,
      overrides: debouncedOverrides,
      backgroundImageUrl,
      createdAt: PREVIEW_TIMESTAMP,
      updatedAt: PREVIEW_TIMESTAMP,
      pointsContainerShape,
      uppercaseEntryName,
      juryActivePointsUnderline,
      isJuryPointsPanelRounded,
      flagShape,
      usePointsCountUpAnimation,
      roundedCountryContainer,
      boardAnimationMode,
      douzePointsAnimationMode,
      themeSounds:
        Object.keys(previewThemeSounds).length > 0
          ? previewThemeSounds
          : undefined,
      fontAlias: normalizeFontAlias(fontAlias),
    };

    applyCustomTheme(previewTheme, true);
  }, [
    debouncedHue,
    debouncedShade,
    baseThemeYear,
    backgroundImageUrl,
    debouncedOverrides,
    pointsContainerShape,
    uppercaseEntryName,
    juryActivePointsUnderline,
    isJuryPointsPanelRounded,
    flagShape,
    usePointsCountUpAnimation,
    roundedCountryContainer,
    boardAnimationMode,
    douzePointsAnimationMode,
    soundUrls,
    soundDelaySecText,
    isOpen,
    fontAlias,
  ]);

  // Stop preview when closing. Parent often unmounts us via `{open && <Modal />}` so `isOpen`
  // may never transition to false in a render — rely on cleanup on unmount as well.
  useEffect(() => {
    if (!isOpen) {
      stopSoundPreview();
    }

    return () => {
      stopSoundPreview();
    };
  }, [isOpen, stopSoundPreview]);

  const handleSoundDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSoundRowDragEnter =
    (event: ThemeSoundEventId) => (e: React.DragEvent) => {
      handleSoundDrag(e);
      if (e.dataTransfer?.types?.includes('Files')) {
        setSoundDragOver(event);
      }
    };

  const handleSoundRowDragLeave =
    (event: ThemeSoundEventId) => (e: React.DragEvent) => {
      handleSoundDrag(e);
      const related = e.relatedTarget as Node | null;

      if (!related || !e.currentTarget.contains(related)) {
        setSoundDragOver((cur) => (cur === event ? null : cur));
      }
    };

  const handleSoundRowDrop =
    (event: ThemeSoundEventId) => (e: React.DragEvent) => {
      handleSoundDrag(e);
      setSoundDragOver(null);
      const f = e.dataTransfer.files?.[0];

      if (f) handleSoundFilePick(event, f);
      e.dataTransfer.clearData();
    };

  const handleSoundFilePick = (event: ThemeSoundEventId, file: File | null) => {
    if (!file) return;
    if (file.size > SOUND_MAX_BYTES) {
      toast.error(t('widgets.themes.soundFileTooLarge'));

      return;
    }
    if (!SOUND_ACCEPT_MIMES.has(file.type)) {
      toast.error(t('widgets.themes.invalidSoundFile'));

      return;
    }
    if (soundPreviewState?.event === event) stopSoundPreview();
    setSoundFiles((p) => ({ ...p, [event]: file }));
    setSoundUrls((p) => ({ ...p, [event]: '' }));
  };

  const toggleSoundPreview = (event: ThemeSoundEventId) => {
    const file = soundFiles[event];
    const url = soundUrls[event].trim();

    if (!file && !isValidHttpsSoundUrl(url)) return;

    if (soundPreviewState?.event === event) {
      if (soundPreviewAudioRef.current) {
        const a = soundPreviewAudioRef.current;

        if (!soundPreviewState.paused) {
          a.pause();
          setSoundPreviewState({ event, paused: true });

          return;
        }
        void a
          .play()
          .then(() => setSoundPreviewState({ event, paused: false }))
          .catch(() => {
            toast.error(t('widgets.themes.previewSoundFailed'));
            stopSoundPreview();
          });

        return;
      }
    }

    stopSoundPreview();

    let src: string;

    if (file) {
      const ou = URL.createObjectURL(file);

      soundPreviewObjectUrlRef.current = ou;
      src = ou;
    } else {
      src = url;
    }

    const audio = new Audio(src);

    soundPreviewAudioRef.current = audio;
    audio.addEventListener('ended', () => {
      stopSoundPreview();
    });
    setSoundPreviewState({ event, paused: false });
    void audio
      .play()
      .then(() => setSoundPreviewState({ event, paused: false }))
      .catch(() => {
        toast.error(t('widgets.themes.previewSoundFailed'));
        stopSoundPreview();
      });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('widgets.themes.themeNameIsRequired'));

      return;
    }

    for (const event of THEME_SOUND_EVENTS) {
      const u = soundUrls[event].trim();

      if (!soundFiles[event] && u && !u.startsWith('https://')) {
        toast.error(t('widgets.themes.soundUrlHttpsOnly'));

        return;
      }
    }

    // A "remix" is a brand-new theme created from someone else's theme.
    const isRemix =
      !!initialTheme &&
      !isEditMode &&
      !!user &&
      initialTheme.userId !== user._id;

    // Block publishing a remix that wasn't actually changed — it just clutters
    // the public gallery with duplicates. Saving privately is still allowed.
    if (isRemix && isPublic) {
      const formSounds: Record<string, { url: string; delayMs?: number }> = {};

      for (const event of THEME_SOUND_EVENTS) {
        if (soundFiles[event]) {
          // A freshly picked file is always a change.
          formSounds[event] = { url: '__file__' };
          continue;
        }
        const u = soundUrls[event].trim();

        if (u) {
          const d = soundDelaySecondsInputToMs(soundDelaySecText[event]);

          formSounds[event] = d > 0 ? { url: u, delayMs: d } : { url: u };
        }
      }

      const srcSpecifics = resolveThemeSpecificsForCustomTheme(initialTheme);
      const formFingerprint = themeContentFingerprint({
        baseThemeYear,
        hue,
        shadeValue: hsva.v,
        overrides,
        background: uploadedFile ? '__file__' : backgroundImageUrl,
        pointsContainerShape,
        uppercaseEntryName,
        juryActivePointsUnderline,
        isJuryPointsPanelRounded,
        flagShape,
        usePointsCountUpAnimation,
        roundedCountryContainer,
        boardAnimationMode,
        douzePointsAnimationMode,
        themeSounds: formSounds,
        fontAlias: normalizeFontAlias(fontAlias),
      });
      const sourceFingerprint = themeContentFingerprint({
        baseThemeYear: initialTheme.baseThemeYear,
        hue: initialTheme.hue,
        shadeValue: initialTheme.shadeValue ?? 60,
        overrides: initialTheme.overrides,
        background: initialTheme.backgroundImageUrl || '',
        pointsContainerShape: srcSpecifics.pointsContainerShape,
        uppercaseEntryName: srcSpecifics.uppercaseEntryName,
        juryActivePointsUnderline: srcSpecifics.juryActivePointsUnderline,
        isJuryPointsPanelRounded: srcSpecifics.isJuryPointsPanelRounded,
        flagShape: srcSpecifics.flagShape,
        usePointsCountUpAnimation: srcSpecifics.usePointsCountUpAnimation,
        roundedCountryContainer: srcSpecifics.roundedCountryContainer,
        boardAnimationMode: srcSpecifics.boardAnimationMode,
        douzePointsAnimationMode: srcSpecifics.douzePointsAnimationMode,
        themeSounds: initialTheme.themeSounds,
        fontAlias: normalizeFontAlias(srcSpecifics.fontAlias),
      });

      if (formFingerprint === sourceFingerprint) {
        toast.error(t('widgets.themes.remixNeedsChange'));

        return;
      }
    }

    // Build payload with only non-default values for theme-specific options
    const buildThemePayload = (isUpdate = false) => {
      const defaultThemeSpecifics =
        resolveThemeSpecificsForBaseThemeYear(baseThemeYear);
      const payload: any = {
        name,
        description,
        baseThemeYear,
        hue,
        shadeValue: hsva.v,
        isPublic,
        backgroundImageUrl,
        overrides,
        fontAlias: normalizeFontAlias(fontAlias),
      };

      if (isUpdate && initialTheme) {
        if (themeGroupId) {
          payload.groupId = themeGroupId;
        } else if (initialTheme.groupId) {
          payload.groupId = null;
        }
      } else if (themeGroupId) {
        payload.groupId = themeGroupId;
      }

      // For updates, we need to explicitly handle reverting to defaults
      if (isUpdate && initialTheme) {
        const hasCustomPointsContainerShape =
          (initialTheme.pointsContainerShape !== undefined &&
            initialTheme.pointsContainerShape !== null) ||
          (initialTheme.themeSpecifics?.pointsContainerShape !== undefined &&
            initialTheme.themeSpecifics?.pointsContainerShape !== null);
        const hasCustomUppercaseEntryName =
          (initialTheme.uppercaseEntryName !== undefined &&
            initialTheme.uppercaseEntryName !== null) ||
          (initialTheme.themeSpecifics?.uppercaseEntryName !== undefined &&
            initialTheme.themeSpecifics?.uppercaseEntryName !== null);
        const hasCustomJuryActivePointsUnderline =
          (initialTheme.juryActivePointsUnderline !== undefined &&
            initialTheme.juryActivePointsUnderline !== null) ||
          (initialTheme.themeSpecifics?.juryActivePointsUnderline !==
            undefined &&
            initialTheme.themeSpecifics?.juryActivePointsUnderline !== null);
        const hasCustomIsJuryPointsPanelRounded =
          (initialTheme.isJuryPointsPanelRounded !== undefined &&
            initialTheme.isJuryPointsPanelRounded !== null) ||
          (initialTheme.themeSpecifics?.isJuryPointsPanelRounded !==
            undefined &&
            initialTheme.themeSpecifics?.isJuryPointsPanelRounded !== null);
        const hasCustomFlagShape =
          (initialTheme.flagShape !== undefined &&
            initialTheme.flagShape !== null) ||
          (initialTheme.themeSpecifics?.flagShape !== undefined &&
            initialTheme.themeSpecifics?.flagShape !== null);
        const hasCustomUsePointsCountUpAnimation =
          (initialTheme.usePointsCountUpAnimation !== undefined &&
            initialTheme.usePointsCountUpAnimation !== null) ||
          (initialTheme.themeSpecifics?.usePointsCountUpAnimation !==
            undefined &&
            initialTheme.themeSpecifics?.usePointsCountUpAnimation !== null);
        const hasCustomRoundedCountryContainer =
          (initialTheme.roundedCountryContainer !== undefined &&
            initialTheme.roundedCountryContainer !== null) ||
          (initialTheme.themeSpecifics?.roundedCountryContainer !== undefined &&
            initialTheme.themeSpecifics?.roundedCountryContainer !== null);
        const hasCustomBoardAnimationMode =
          (initialTheme.boardAnimationMode !== undefined &&
            initialTheme.boardAnimationMode !== null) ||
          (initialTheme.themeSpecifics?.boardAnimationMode !== undefined &&
            initialTheme.themeSpecifics?.boardAnimationMode !== null);
        const hasCustomDouzePointsAnimationMode =
          (initialTheme.douzePointsAnimationMode !== undefined &&
            initialTheme.douzePointsAnimationMode !== null) ||
          (initialTheme.themeSpecifics?.douzePointsAnimationMode !==
            undefined &&
            initialTheme.themeSpecifics?.douzePointsAnimationMode !== null);

        // If previously had a non-default value but now is default, set to null to delete
        if (
          hasCustomPointsContainerShape &&
          pointsContainerShape === defaultThemeSpecifics.pointsContainerShape
        ) {
          payload.pointsContainerShape = null;
        } else if (
          pointsContainerShape !== defaultThemeSpecifics.pointsContainerShape
        ) {
          payload.pointsContainerShape = pointsContainerShape;
        }

        if (
          hasCustomUppercaseEntryName &&
          uppercaseEntryName === defaultThemeSpecifics.uppercaseEntryName
        ) {
          payload.uppercaseEntryName = null;
        } else if (
          uppercaseEntryName !== defaultThemeSpecifics.uppercaseEntryName
        ) {
          payload.uppercaseEntryName = uppercaseEntryName;
        }
        if (
          hasCustomJuryActivePointsUnderline &&
          juryActivePointsUnderline ===
            defaultThemeSpecifics.juryActivePointsUnderline
        ) {
          payload.juryActivePointsUnderline = null;
        } else if (
          juryActivePointsUnderline !==
          defaultThemeSpecifics.juryActivePointsUnderline
        ) {
          payload.juryActivePointsUnderline = juryActivePointsUnderline;
        }

        if (
          hasCustomIsJuryPointsPanelRounded &&
          isJuryPointsPanelRounded ===
            defaultThemeSpecifics.isJuryPointsPanelRounded
        ) {
          payload.isJuryPointsPanelRounded = null;
        } else if (
          isJuryPointsPanelRounded !==
          defaultThemeSpecifics.isJuryPointsPanelRounded
        ) {
          payload.isJuryPointsPanelRounded = isJuryPointsPanelRounded;
        }

        if (
          hasCustomFlagShape &&
          flagShape === defaultThemeSpecifics.flagShape
        ) {
          payload.flagShape = null;
        } else if (flagShape !== defaultThemeSpecifics.flagShape) {
          payload.flagShape = flagShape;
        }

        if (
          hasCustomUsePointsCountUpAnimation &&
          usePointsCountUpAnimation ===
            defaultThemeSpecifics.usePointsCountUpAnimation
        ) {
          payload.usePointsCountUpAnimation = null;
        } else if (
          usePointsCountUpAnimation !==
          defaultThemeSpecifics.usePointsCountUpAnimation
        ) {
          payload.usePointsCountUpAnimation = usePointsCountUpAnimation;
        }

        if (
          hasCustomRoundedCountryContainer &&
          roundedCountryContainer ===
            defaultThemeSpecifics.roundedCountryContainer
        ) {
          payload.roundedCountryContainer = null;
        } else if (
          roundedCountryContainer !==
          defaultThemeSpecifics.roundedCountryContainer
        ) {
          payload.roundedCountryContainer = roundedCountryContainer;
        }

        if (
          hasCustomBoardAnimationMode &&
          boardAnimationMode === defaultThemeSpecifics.boardAnimationMode
        ) {
          payload.boardAnimationMode = null;
        } else if (
          boardAnimationMode !== defaultThemeSpecifics.boardAnimationMode
        ) {
          payload.boardAnimationMode = boardAnimationMode;
        }

        if (
          hasCustomDouzePointsAnimationMode &&
          douzePointsAnimationMode ===
            defaultThemeSpecifics.douzePointsAnimationMode
        ) {
          payload.douzePointsAnimationMode = null;
        } else if (
          douzePointsAnimationMode !==
          defaultThemeSpecifics.douzePointsAnimationMode
        ) {
          payload.douzePointsAnimationMode = douzePointsAnimationMode;
        }
      } else {
        // For creates, only include if different from defaults
        if (
          pointsContainerShape !== defaultThemeSpecifics.pointsContainerShape
        ) {
          payload.pointsContainerShape = pointsContainerShape;
        }
        if (uppercaseEntryName !== defaultThemeSpecifics.uppercaseEntryName) {
          payload.uppercaseEntryName = uppercaseEntryName;
        }
        if (
          juryActivePointsUnderline !==
          defaultThemeSpecifics.juryActivePointsUnderline
        ) {
          payload.juryActivePointsUnderline = juryActivePointsUnderline;
        }
        if (
          isJuryPointsPanelRounded !==
          defaultThemeSpecifics.isJuryPointsPanelRounded
        ) {
          payload.isJuryPointsPanelRounded = isJuryPointsPanelRounded;
        }
        if (flagShape !== defaultThemeSpecifics.flagShape) {
          payload.flagShape = flagShape;
        }
        if (
          usePointsCountUpAnimation !==
          defaultThemeSpecifics.usePointsCountUpAnimation
        ) {
          payload.usePointsCountUpAnimation = usePointsCountUpAnimation;
        }
        if (
          roundedCountryContainer !==
          defaultThemeSpecifics.roundedCountryContainer
        ) {
          payload.roundedCountryContainer = roundedCountryContainer;
        }
        if (boardAnimationMode !== defaultThemeSpecifics.boardAnimationMode) {
          payload.boardAnimationMode = boardAnimationMode;
        }
        if (
          douzePointsAnimationMode !==
          defaultThemeSpecifics.douzePointsAnimationMode
        ) {
          payload.douzePointsAnimationMode = douzePointsAnimationMode;
        }
      }

      const themeSoundsPatch: Record<
        string,
        { url: string; delayMs?: number } | null
      > = {};

      for (const event of THEME_SOUND_EVENTS) {
        if (soundFiles[event]) continue;
        const trimmed = soundUrls[event].trim();
        const hadInitial = !!initialTheme?.themeSounds?.[event]?.url;

        if (!trimmed) {
          if (isUpdate && initialTheme && hadInitial) {
            themeSoundsPatch[event] = null;
          }
          continue;
        }
        const d = soundDelaySecondsInputToMs(soundDelaySecText[event]);

        themeSoundsPatch[event] =
          d > 0 ? { url: trimmed, delayMs: d } : { url: trimmed };
      }
      if (Object.keys(themeSoundsPatch).length > 0) {
        payload.themeSounds = themeSoundsPatch;
      }

      return payload;
    };

    try {
      if (isEditMode && initialTheme) {
        // Update existing theme
        let updated = await updateTheme({
          id: initialTheme._id,
          ...buildThemePayload(true),
        });

        // Upload background if provided
        if (uploadedFile) {
          updated = await uploadBackground({
            id: updated._id,
            file: uploadedFile,
          });
        }

        for (const event of THEME_SOUND_EVENTS) {
          const f = soundFiles[event];

          if (f) {
            updated = await uploadThemeSound({
              id: updated._id,
              eventId: event,
              file: f,
            });
          }
        }

        const uploadedSoundDelayPatch: Record<
          string,
          { url: string; delayMs?: number }
        > = {};

        for (const event of THEME_SOUND_EVENTS) {
          if (!soundFiles[event]) continue;
          const u = updated.themeSounds?.[event]?.url?.trim();

          if (!u) continue;
          const d = soundDelaySecondsInputToMs(soundDelaySecText[event]);

          if (d > 0) uploadedSoundDelayPatch[event] = { url: u, delayMs: d };
        }
        if (Object.keys(uploadedSoundDelayPatch).length > 0) {
          updated = await updateTheme({
            id: updated._id,
            themeSounds: uploadedSoundDelayPatch,
          });
        }

        // If we edited the currently applied theme, reapply immediately
        if (currentCustomTheme?._id === updated._id) {
          applyCustomThemeToStore(updated);
        }

        toast.success(t('widgets.themes.themeUpdatedSuccessfully'));
      } else {
        // Create new theme — record remix provenance when copying another's theme.
        let created = await createTheme({
          ...buildThemePayload(),
          ...(isRemix ? { remixedFrom: initialTheme!._id } : {}),
        });

        // Upload background if provided
        if (uploadedFile) {
          created = await uploadBackground({
            id: created._id,
            file: uploadedFile,
          });
        }

        for (const event of THEME_SOUND_EVENTS) {
          const f = soundFiles[event];

          if (f) {
            created = await uploadThemeSound({
              id: created._id,
              eventId: event,
              file: f,
            });
          }
        }

        const createdSoundDelayPatch: Record<
          string,
          { url: string; delayMs?: number }
        > = {};

        for (const event of THEME_SOUND_EVENTS) {
          if (!soundFiles[event]) continue;
          const u = created.themeSounds?.[event]?.url?.trim();

          if (!u) continue;
          const d = soundDelaySecondsInputToMs(soundDelaySecText[event]);

          if (d > 0) createdSoundDelayPatch[event] = { url: u, delayMs: d };
        }
        if (Object.keys(createdSoundDelayPatch).length > 0) {
          await updateTheme({
            id: created._id,
            themeSounds: createdSoundDelayPatch,
          });
        }

        // If created from someone else's theme, record duplicate
        if (isRemix) {
          try {
            await reportDuplicate(initialTheme!._id);
          } catch (e) {
            // non-blocking
            console.error(e);
          }
        }

        toast.success(t('widgets.themes.themeCreatedSuccessfully'));
      }

      onClose();
    } catch (error: any) {
      toastAxiosError(error, 'Failed to save theme');
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const { isValid, error } = await imageUpload.validateAndSetFile(file);

    if (isValid) {
      setUploadedFile(file);
      setBackgroundImageUrl('');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    handleDrag(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isSaving =
    isCreating || isUpdating || isUploadingBg || isUploadingSounds;

  const displayBg = uploadedFile ? imageUpload.base64 : backgroundImageUrl;

  const TAB_ORDER = ['identity', 'look', 'visuals', 'colors', 'sound'] as const;

  type ThemeTab = (typeof TAB_ORDER)[number];

  const [activeTab, setActiveTab] = useState<ThemeTab>('identity');
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(true);
  const activeTabIndex = TAB_ORDER.indexOf(activeTab);

  // Reset the tab to the start whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) setActiveTab('identity');
  }, [isOpen]);

  const changeTab = (value: string) => {
    if (value === activeTab) return;
    // Stop any in-flight sound preview when leaving the Sound tab (its controls
    // unmount, so the audio would otherwise keep playing with no way to pause).
    if (activeTab === 'sound') stopSoundPreview();
    setActiveTab(value as ThemeTab);
  };

  const tabItems = TAB_ORDER.map((value, index) => ({
    value,
    label: (
      <span className="flex items-center gap-1">
        {index < activeTabIndex && (
          <span className="text-[8px] opacity-70 hidden sm:block">
            <CheckIcon className="w-4 h-4" />
          </span>
        )}
        {t(`widgets.themes.tabs.${value}`)}
      </span>
    ),
  }));

  const previewItem = (
    <ThemePreviewCountryItem
      backgroundImage={displayBg}
      // Debounced like the injected preview vars so the preview subtree (with
      // its countup/gsap children) re-renders ~25x/s while dragging a swatch,
      // not on every pointer-move. The swatch grid still uses live `overrides`.
      overrides={debouncedOverrides}
      baseThemeYear={baseThemeYear}
      uppercaseEntryName={uppercaseEntryName}
      juryActivePointsUnderline={juryActivePointsUnderline}
      pointsContainerShape={pointsContainerShape}
      flagShape={flagShape}
      isJuryPointsPanelRounded={isJuryPointsPanelRounded}
      usePointsCountUpAnimation={usePointsCountUpAnimation}
      roundedCountryContainer={roundedCountryContainer}
      douzePointsAnimationMode={douzePointsAnimationMode}
    />
  );

  return (
    <Modal
      dataTheme="custom-preview"
      isOpen={isOpen}
      onClose={onClickOutside}
      containerClassName="!w-[min(100%,950px)]"
      contentClassName="text-white sm:h-[75vh] h-[72vh] max-h-[72vh] sm:!pb-0 !pb-3"
      overlayClassName="!z-[1002]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          isSaving={isSaving}
        />
      }
    >
      <div className="flex flex-col h-full">
        {/* Header: title + step counter + tab strip */}
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-xl font-bold text-white">
              {isEditMode
                ? t('widgets.themes.editTheme')
                : t('widgets.themes.createTheme')}
            </h2>
            <span className="text-sm font-medium text-white/40 shrink-0">
              {t('widgets.themes.stepOf', {
                current: activeTabIndex + 1,
                total: TAB_ORDER.length,
              })}
            </span>
          </div>
          <Tabs
            tabs={tabItems}
            activeTab={activeTab}
            setActiveTab={changeTab}
            buttonClassName="!px-2 !py-2 !text-[13px]"
          />
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 flex-1 min-h-0">
          {/* Mobile preview strip (collapsible) */}
          <div className="sm:hidden flex-shrink-0">
            <div className="bg-primary-800/80 border border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen((o) => !o)}
                className="w-full px-3 py-2 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  {t('common.preview')}
                </span>
                <span
                  className={`text-white/70 transition-transform duration-[400ms] text-xs ${
                    isMobilePreviewOpen ? 'rotate-90' : ''
                  }`}
                >
                  <ArrowIcon className="w-5 h-5" />
                </span>
              </button>
              <div
                className={`grid transition-all duration-[400ms] ${
                  isMobilePreviewOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-3 pb-3">{previewItem}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Left Column - active tab content */}
          <div className="space-y-2.5 overflow-y-auto narrow-scrollbar md:pr-2 sm:pb-4 flex-1 min-w-0 min-h-0">
            {activeTab === 'identity' && (
              <div className="space-y-3">
                <InputField
                  label={t('common.name')}
                  id="themeName"
                  inputProps={{
                    value: name,
                    onChange: (e) => setName(e.target.value),
                  }}
                  placeholder="Eurovision 2026"
                />

                {!!user && (
                  <div className="flex flex-col gap-1">
                    <CustomSelect
                      options={themeGroupOptions}
                      value={themeGroupId}
                      onChange={setThemeGroupId}
                      label={t('widgets.themes.groups.groupLabel')}
                      id="theme-group-select"
                      withIndicator={false}
                      selectClassName="!shadow-none"
                      labelClassName="!text-base mb-1"
                      dataTheme="custom-preview"
                    />
                  </div>
                )}

                <TextareaField
                  id="themeDesc"
                  label={t('common.description')}
                  placeholder={t('common.optionalDescription')}
                  textareaProps={{
                    value: description,
                    onChange: (e) => setDescription(e.target.value),
                  }}
                />

                <Checkbox
                  id="isPublic"
                  label={t('widgets.themes.makeThemePublic')}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              </div>
            )}
            {activeTab === 'look' && (
              <div className="space-y-4">
                <div className="flex gap-3 items-end flex-wrap">
                  <CustomSelect
                    options={ALL_THEME_OPTIONS}
                    groups={[
                      { label: 'ESC', options: THEME_OPTIONS },
                      { label: 'JESC', options: JESC_THEME_OPTIONS },
                    ]}
                    value={baseThemeYear}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={handleBaseThemeYearChange}
                    id="baseTheme-select-box"
                    label={t('widgets.themes.baseTheme')}
                    className="sm:w-[130px] w-[110px]"
                    dataTheme="custom-preview"
                  />

                  <CustomSelect
                    options={interfaceFontOptions}
                    value={fontAlias}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={(value) => setFontAlias(value)}
                    id="interface-font-select"
                    label={t('widgets.themes.interfaceFont')}
                    className="sm:w-[200px] w-full"
                    dataTheme="custom-preview"
                    withIndicator={false}
                  />
                  <p className="text-white/50 text-xs basis-full mt-0.5">
                    {t('widgets.themes.baseThemeCascadeHint')}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white mb-2">
                    {t('widgets.themes.interfaceColor')}
                  </h4>
                  <Hue
                    hue={hue}
                    className="[&>:first-child]:!rounded-[10px] !rounded-[10px]"
                    onChange={(newHue) => {
                      setHue(toFixedIfDecimalFloat(newHue.h));
                      setHsva({ ...hsva, h: newHue.h });
                    }}
                  />
                  <ShadeSlider
                    className="mt-1 [&>:first-child]:!rounded-[10px] !rounded-[10px]"
                    hsva={hsva}
                    onChange={(newShade) => {
                      setHsva({
                        ...hsva,
                        v: Math.max(15, Math.min(100, newShade.v)),
                      });
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-medium text-white">
                      {t('widgets.themes.backgroundImage')}
                    </h4>
                    {!!uploadedFile && (
                      <Button
                        variant="secondary"
                        className="w-fit pointer-events-auto text-sm !py-1.5 !px-4"
                        Icon={<UndoIcon className="w-4 h-4" />}
                        onClick={() => {
                          setBackgroundImageUrl('');
                          setUploadedFile(null);
                          imageUpload.clear();
                        }}
                      ></Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div
                      onDragEnter={handleDragIn}
                      onDragLeave={handleDragOut}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[10px] p-3 cursor-pointer transition-colors ${
                        isDragOver
                          ? 'border-white bg-primary-700/50'
                          : 'border-white/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) =>
                          handleFileChange(e.target.files?.[0] ?? null)
                        }
                        className="hidden"
                      />
                      <UploadIcon className="w-8 h-8 text-white pointer-events-none" />
                      <p className="text-white text-xs pointer-events-none">
                        {t('common.dragAndDropOrClickToUpload')}
                      </p>
                      <Button
                        variant="tertiary"
                        className="w-fit pointer-events-auto text-sm !py-1.5"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t('common.browse')}
                      </Button>
                    </div>

                    <Input
                      type="text"
                      value={uploadedFile ? '' : backgroundImageUrl}
                      onChange={(e) => {
                        setBackgroundImageUrl(e.target.value);
                        setUploadedFile(null);
                        imageUpload.clear();
                      }}
                      placeholder={t('common.pasteImageUrl')}
                      disabled={!!uploadedFile}
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'visuals' && (
              <div className="space-y-3">
                <Checkbox
                  id="uppercase-entry-name"
                  label={t('widgets.themes.visualDetails.uppercaseEntryName')}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={uppercaseEntryName}
                  onChange={(e) => setUppercaseEntryName(e.target.checked)}
                />
                <Checkbox
                  id="jury-active-points-underline"
                  label={t(
                    'widgets.themes.visualDetails.juryActivePointsUnderline',
                  )}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={juryActivePointsUnderline}
                  onChange={(e) =>
                    setJuryActivePointsUnderline(e.target.checked)
                  }
                />
                <Checkbox
                  id="jury-points-panel-rounded"
                  label={t(
                    'widgets.themes.visualDetails.juryPointsPanelRounded',
                  )}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={isJuryPointsPanelRounded}
                  onChange={(e) =>
                    setIsJuryPointsPanelRounded(e.target.checked)
                  }
                />
                <Checkbox
                  id="use-points-count-up-animation"
                  label={t(
                    'widgets.themes.visualDetails.usePointsCountUpAnimation',
                  )}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={usePointsCountUpAnimation}
                  onChange={(e) =>
                    setUsePointsCountUpAnimation(e.target.checked)
                  }
                />
                <Checkbox
                  id="rounded-country-container"
                  label={t(
                    'widgets.themes.visualDetails.roundedCountryContainer',
                  )}
                  labelClassName="w-full !px-0 !pt-1 !items-start"
                  checked={roundedCountryContainer}
                  onChange={(e) => setRoundedCountryContainer(e.target.checked)}
                />

                <div className="grid xs:grid-cols-2 grid-cols-1 items-center xs:gap-3 gap-2">
                  <CustomSelect
                    options={[
                      {
                        label: t(
                          'widgets.themes.visualDetails.boardAnimations.flip',
                        ),
                        value: 'flip',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.boardAnimations.teleport',
                        ),
                        value: 'teleport',
                      },
                    ]}
                    value={boardAnimationMode}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={(value) =>
                      setBoardAnimationMode(value as BoardAnimationMode)
                    }
                    id="board-animation-mode-select"
                    label={t('widgets.themes.visualDetails.boardAnimation')}
                    dataTheme="custom-preview"
                    withIndicator={false}
                  />
                  <CustomSelect
                    options={[
                      {
                        label: t(
                          'widgets.themes.visualDetails.douzePointsAnimations.parallelograms',
                        ),
                        value: 'parallelograms',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.douzePointsAnimations.heartsGrid',
                        ),
                        value: 'heartsGrid',
                      },
                    ]}
                    value={douzePointsAnimationMode}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={(value) =>
                      setDouzePointsAnimationMode(
                        value as DouzePointsAnimationMode,
                      )
                    }
                    id="douze-points-animation-mode-select"
                    label={t(
                      'widgets.themes.visualDetails.douzePointsAnimation',
                    )}
                    dataTheme="custom-preview"
                    withIndicator={false}
                  />
                  <CustomSelect
                    options={[
                      {
                        label: t(
                          'widgets.themes.visualDetails.pointsContainerShapes.curvedEdge',
                        ),
                        value: 'triangle',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.pointsContainerShapes.square',
                        ),
                        value: 'square',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.pointsContainerShapes.transparent',
                        ),
                        value: 'transparent',
                      },
                    ]}
                    value={pointsContainerShape}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={(value) =>
                      setPointsContainerShape(
                        value as 'triangle' | 'square' | 'transparent',
                      )
                    }
                    id="points-container-shape-select"
                    label={t(
                      'widgets.themes.visualDetails.pointsContainerShapes.title',
                    )}
                    dataTheme="custom-preview"
                    withIndicator={false}
                  />
                  <CustomSelect
                    options={[
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.largeRectangle',
                        ),
                        value: 'big-rectangle',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.smallRectangle',
                        ),
                        value: 'small-rectangle',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.square',
                        ),
                        value: 'square',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.circle',
                        ),
                        value: 'round',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.circleWithBorder',
                        ),
                        value: 'round-border',
                      },
                      {
                        label: t(
                          'widgets.themes.visualDetails.flagShapes.none',
                        ),
                        value: 'none',
                      },
                    ]}
                    value={flagShape}
                    labelClassName="!text-base !font-medium mb-1"
                    onChange={(value) => setFlagShape(value as FlagShape)}
                    id="flag-shape-select"
                    label={t('widgets.themes.visualDetails.flagShapes.title')}
                    dataTheme="custom-preview"
                    withIndicator={false}
                  />
                </div>
              </div>
            )}
            {activeTab === 'colors' && (
              <ColorOverridesSection
                defaultColors={defaultColors}
                overrides={overrides}
                onChange={setOverrides}
                douzePointsAnimationMode={douzePointsAnimationMode}
              />
            )}
            {activeTab === 'sound' && (
              <CustomizeThemeSoundEffectsSection
                soundUrls={soundUrls}
                setSoundUrls={setSoundUrls}
                soundFiles={soundFiles}
                setSoundFiles={setSoundFiles}
                soundDelaySecText={soundDelaySecText}
                setSoundDelaySecText={setSoundDelaySecText}
                soundDragOver={soundDragOver}
                handleSoundDrag={handleSoundDrag}
                handleSoundRowDragEnter={handleSoundRowDragEnter}
                handleSoundRowDragLeave={handleSoundRowDragLeave}
                handleSoundRowDrop={handleSoundRowDrop}
                soundPreviewState={soundPreviewState}
                stopSoundPreview={stopSoundPreview}
                toggleSoundPreview={toggleSoundPreview}
                handleSoundFilePick={handleSoundFilePick}
              />
            )}
          </div>

          {/* Right Column - Preview (desktop only) */}
          <div className="hidden sm:flex sm:space-y-4 space-y-2 sm:h-full flex-col lg:basis-[38%] md:basis-[45%] sm:basis-[46%] sm:shrink-0 sm:grow-0 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {t('common.preview')}
              </h3>

              <Tooltip
                dataTheme="custom-preview"
                content={
                  <div className="font-medium">
                    <p>{t('widgets.themes.previewStatesTooltipIntro')}</p>
                    {t.rich('widgets.themes.previewStatesTooltipStates', {
                      list: (chunks) => (
                        <ul className="list-disc list-inside">{chunks}</ul>
                      ),
                      item: (chunks) => <li>{chunks}</li>,
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </div>
                }
                position="right"
              />
            </div>
            <div className="flex-1 sm:min-h-[400px]">{previewItem}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomizeThemeModal;
