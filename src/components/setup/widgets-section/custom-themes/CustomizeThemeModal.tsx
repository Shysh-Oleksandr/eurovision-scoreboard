import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import Hue from '@uiw/react-color-hue';
import ShadeSlider from '@uiw/react-color-shade-slider';

import ColorOverridesSection from './ColorOverridesSection';
import ThemePreviewCountryItem from './ThemePreviewCountryItem';

import {
  useCreateThemeMutation,
  useUpdateThemeMutation,
  useUploadThemeBackgroundMutation,
  useReportThemeDuplicateMutation,
} from '@/api/themes';
import { UndoIcon } from '@/assets/icons/UndoIcon';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { TextareaField } from '@/components/common/TextareaField';
import { Tooltip } from '@/components/common/Tooltip';
import { Input } from '@/components/Input';
import { JESC_THEME_OPTIONS, THEME_OPTIONS } from '@/data/data';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useDebounce } from '@/hooks/useDebounce';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { applyCustomTheme, getDefaultThemeColors } from '@/theme/themeUtils';
import { FlagShape, PointsContainerShape } from '@/theme/types';
import { useThemeColor } from '@/theme/useThemeColor';
import { CustomTheme } from '@/types/customTheme';

const ALL_THEME_OPTIONS = [...THEME_OPTIONS, ...JESC_THEME_OPTIONS];

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

  // Theme-specific UI options
  const [uppercaseEntryName, setUppercaseEntryName] = useState(true);
  const [pointsContainerShape, setPointsContainerShape] =
    useState<PointsContainerShape>('triangle');
  const [flagShape, setFlagShape] = useState<FlagShape>('big-rectangle');
  const [juryActivePointsUnderline, setJuryActivePointsUnderline] =
    useState(true);
  const [isJuryPointsPanelRounded, setIsJuryPointsPanelRounded] =
    useState(false);
  const { mutateAsync: createTheme, isPending: isCreating } =
    useCreateThemeMutation();
  const { mutateAsync: updateTheme, isPending: isUpdating } =
    useUpdateThemeMutation();
  const { mutateAsync: uploadBackground, isPending: isUploadingBg } =
    useUploadThemeBackgroundMutation();
  const { mutateAsync: reportDuplicate } = useReportThemeDuplicateMutation();
  const user = useAuthStore((s) => s.user);

  const imageUpload = useImageUpload({ maxSizeInMB: 1.5 });

  // Debounce hue and shade to avoid heavy recomputation on every tick
  const debouncedHue = useDebounce(hue, 40);
  const debouncedShade = useDebounce(hsva.v, 40);
  const debouncedHsva = useMemo(
    () => ({ ...hsva, h: debouncedHue, v: debouncedShade }),
    [hsva, debouncedHue, debouncedShade],
  );

  // Get default colors for the current base theme and selected HSVA (shade-aware)
  const defaultColors = useMemo(
    () => getDefaultThemeColors(baseThemeYear, debouncedHsva),
    [baseThemeYear, debouncedHsva],
  );

  // Initialize form with theme to edit
  useEffect(() => {
    if (initialTheme) {
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
      setIsPublic(initialTheme.isPublic);
      setBackgroundImageUrl(initialTheme.backgroundImageUrl || '');
      setOverrides(initialTheme.overrides || {});
      setUploadedFile(null);
      setPointsContainerShape(initialTheme.pointsContainerShape || 'triangle');
      setUppercaseEntryName(initialTheme.uppercaseEntryName ?? true);
      setJuryActivePointsUnderline(
        initialTheme.juryActivePointsUnderline ?? true,
      );
      setIsJuryPointsPanelRounded(
        initialTheme.isJuryPointsPanelRounded ?? false,
      );
      setFlagShape(initialTheme.flagShape || 'big-rectangle');
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
      setPointsContainerShape('triangle');
      setUppercaseEntryName(true);
      setJuryActivePointsUnderline(true);
      setIsJuryPointsPanelRounded(false);
      setFlagShape('big-rectangle');
    }
  }, [initialTheme, isOpen, themeYear, themeHue]);

  // Live preview effect
  useEffect(() => {
    if (!isOpen) return;

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
      overrides,
      backgroundImageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    applyCustomTheme(previewTheme, true);
  }, [
    debouncedHue,
    debouncedShade,
    baseThemeYear,
    backgroundImageUrl,
    overrides,
    isOpen,
  ]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('widgets.themes.themeNameIsRequired'));

      return;
    }

    // Build payload with only non-default values for theme-specific options
    const buildThemePayload = (isUpdate = false) => {
      const payload: any = {
        name,
        description,
        baseThemeYear,
        hue,
        shadeValue: hsva.v,
        isPublic,
        backgroundImageUrl,
        overrides,
      };

      // For updates, we need to explicitly handle reverting to defaults
      if (isUpdate && initialTheme) {
        // If previously had a non-default value but now is default, set to null to delete
        if (
          initialTheme.pointsContainerShape &&
          pointsContainerShape === 'triangle'
        ) {
          payload.pointsContainerShape = null;
        } else if (pointsContainerShape !== 'triangle') {
          payload.pointsContainerShape = pointsContainerShape;
        }

        if (
          initialTheme.uppercaseEntryName === false &&
          uppercaseEntryName === true
        ) {
          payload.uppercaseEntryName = null;
        } else if (uppercaseEntryName !== true) {
          payload.uppercaseEntryName = uppercaseEntryName;
        }
        if (
          initialTheme.juryActivePointsUnderline === false &&
          juryActivePointsUnderline === true
        ) {
          payload.juryActivePointsUnderline = null;
        } else if (juryActivePointsUnderline !== true) {
          payload.juryActivePointsUnderline = juryActivePointsUnderline;
        }

        if (
          initialTheme.isJuryPointsPanelRounded === true &&
          isJuryPointsPanelRounded === false
        ) {
          payload.isJuryPointsPanelRounded = null;
        } else if (isJuryPointsPanelRounded !== false) {
          payload.isJuryPointsPanelRounded = isJuryPointsPanelRounded;
        }

        if (initialTheme.flagShape && flagShape === 'big-rectangle') {
          payload.flagShape = null;
        } else if (flagShape !== 'big-rectangle') {
          payload.flagShape = flagShape;
        }
      } else {
        // For creates, only include if different from defaults
        if (pointsContainerShape !== 'triangle') {
          payload.pointsContainerShape = pointsContainerShape;
        }
        if (uppercaseEntryName !== true) {
          payload.uppercaseEntryName = uppercaseEntryName;
        }
        if (juryActivePointsUnderline !== true) {
          payload.juryActivePointsUnderline = juryActivePointsUnderline;
        }
        if (isJuryPointsPanelRounded !== false) {
          payload.isJuryPointsPanelRounded = isJuryPointsPanelRounded;
        }
        if (flagShape !== 'big-rectangle') {
          payload.flagShape = flagShape;
        }
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

        // If we edited the currently applied theme, reapply immediately
        if (currentCustomTheme?._id === updated._id) {
          applyCustomThemeToStore(updated);
        }

        toast.success(t('widgets.themes.themeUpdatedSuccessfully'));
      } else {
        // Create new theme
        const created = await createTheme(buildThemePayload());

        // Upload background if provided
        if (uploadedFile) {
          await uploadBackground({
            id: created._id,
            file: uploadedFile,
          });
        }

        // If created from someone else's theme, record duplicate
        if (initialTheme && user && initialTheme.userId !== user._id) {
          try {
            await reportDuplicate(initialTheme._id);
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
  const isSaving = isCreating || isUpdating || isUploadingBg;

  const displayBg = uploadedFile ? imageUpload.base64 : backgroundImageUrl;

  return (
    <Modal
      dataTheme="custom-preview"
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,950px)]"
      contentClassName="text-white sm:h-[75vh] h-[72vh] max-h-[72vh]"
      overlayClassName="!z-[1002]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          isSaving={isSaving}
        />
      }
    >
      <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 h-full">
        {/* Left Column - Controls */}
        <div className="space-y-2.5 overflow-y-auto narrow-scrollbar md:pr-2 w-full">
          <h2 className="text-xl font-bold text-white">
            {isEditMode
              ? t('widgets.themes.editTheme')
              : t('widgets.themes.createTheme')}
          </h2>
          {/* Basic Info */}
          <CollapsibleSection
            title={t('widgets.themes.basicInfo')}
            defaultExpanded
          >
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
          </CollapsibleSection>
          {/* Main */}
          <CollapsibleSection title={t('widgets.themes.main')} defaultExpanded>
            <div className="space-y-4">
              <CustomSelect
                options={ALL_THEME_OPTIONS}
                groups={[
                  { label: 'ESC', options: THEME_OPTIONS },
                  { label: 'JESC', options: JESC_THEME_OPTIONS },
                ]}
                value={baseThemeYear}
                labelClassName="!text-base !font-medium mb-1"
                onChange={(value) => setBaseThemeYear(value)}
                id="baseTheme-select-box"
                label={t('widgets.themes.baseTheme')}
                className="sm:w-[130px] w-[110px]"
                dataTheme="custom-preview"
              />

              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  {t('widgets.themes.interfaceColor')}
                </h4>
                <Hue
                  hue={hue}
                  onChange={(newHue) => {
                    setHue(toFixedIfDecimalFloat(newHue.h));
                    setHsva({ ...hsva, h: newHue.h });
                  }}
                />
                <ShadeSlider
                  className="mt-1"
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
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors ${
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
                      className="w-fit pointer-events-auto text-sm !py-1"
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
          </CollapsibleSection>
          {/* Theme Specifics */}
          <CollapsibleSection
            title={t('widgets.themes.visualDetails.title')}
            defaultExpanded
          >
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
                onChange={(e) => setJuryActivePointsUnderline(e.target.checked)}
              />
              <Checkbox
                id="jury-points-panel-rounded"
                label={t('widgets.themes.visualDetails.juryPointsPanelRounded')}
                labelClassName="w-full !px-0 !pt-1 !items-start"
                checked={isJuryPointsPanelRounded}
                onChange={(e) => setIsJuryPointsPanelRounded(e.target.checked)}
              />

              <div className="grid xs:grid-cols-2 grid-cols-1 items-center xs:gap-3 gap-2">
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
                      label: t('widgets.themes.visualDetails.flagShapes.none'),
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
          </CollapsibleSection>
          {/* Country Item Colors */}
          <CollapsibleSection
            title={t('widgets.themes.countryItemColors')}
            defaultExpanded
          >
            <ColorOverridesSection
              defaultColors={defaultColors}
              overrides={overrides}
              onChange={setOverrides}
            />
          </CollapsibleSection>
        </div>

        {/* Right Column - Preview */}
        <div className="sm:space-y-4 space-y-2 sm:h-full flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              {t('common.preview')}
            </h3>

            <Tooltip
              dataTheme="custom-preview"
              content={
                <div className="font-medium">
                  <p>
                    Select a state from the badges below to preview how an entry
                    looks in that state.
                  </p>
                  <ul className="list-disc list-inside">
                    <li>
                      <strong>Jury</strong> – during the jury voting
                    </li>
                    <li>
                      <strong>Televote</strong> – before receiving televote
                      points
                    </li>
                    <li>
                      <strong>Active</strong> – when the entry is next to
                      receive televote points
                    </li>
                    <li>
                      <strong>Finished</strong> – after the voting is completed
                    </li>
                    <li>
                      <strong>Unqualified</strong> – when the entry did not
                      qualify
                    </li>
                  </ul>
                </div>
              }
              position="right"
            />
          </div>
          <div className="flex-1 sm:min-h-[400px]">
            <ThemePreviewCountryItem
              backgroundImage={displayBg}
              overrides={overrides}
              baseThemeYear={baseThemeYear}
              uppercaseEntryName={uppercaseEntryName}
              juryActivePointsUnderline={juryActivePointsUnderline}
              pointsContainerShape={pointsContainerShape}
              flagShape={flagShape}
              isJuryPointsPanelRounded={isJuryPointsPanelRounded}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomizeThemeModal;
