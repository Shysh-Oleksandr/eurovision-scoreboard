import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import {
  ASPECT_RATIO_PRESETS,
  getInitialAspectRatio,
  ShareImageAspectRatio,
  useGeneralStore,
} from '../../../state/generalStore';
import { useScoreboardStore } from '../../../state/scoreboardStore';
import Button from '../../common/Button';
import { Checkbox } from '../../common/Checkbox';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import Modal from '../../common/Modal/Modal';
import Select from '../../common/Select';
import { Input } from '../../Input';

import ImageGenerator from './ImageGenerator';

import { DownloadIcon } from '@/assets/icons/DownloadIcon';
import { useCountryDisplay, useCountrySorter } from '@/components/board/hooks';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import { StageId, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface ShareResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const ShareResultsModal: React.FC<ShareResultsModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations();
  const modalRef = useRef<HTMLDivElement>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  );

  const [lastGeneratedStageId, setLastGeneratedStageId] = useState<
    string | null
  >(null);

  const imageCustomization = useGeneralStore(
    (state) => state.imageCustomization,
  );
  const setImageCustomization = useGeneralStore(
    (state) => state.setImageCustomization,
  );
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const currentStageId = useScoreboardStore(
    (state) => state.viewedStageId || state.currentStageId,
  );
  const votingCountryIndex = useScoreboardStore(
    (state) => state.votingCountryIndex,
  );
  const televotingProgress = useScoreboardStore(
    (state) => state.televotingProgress,
  );

  const getVotingCountriesLength = useCountriesStore(
    (state) => state.getVotingCountriesLength,
  );
  const currentStage = eventStages.find((stage) => stage.id === currentStageId);

  const isTouchDevice = useTouchDevice();

  const { id, name, isOver, isJuryVoting, votingMode, countries } =
    currentStage || {};

  const { title: defaultTitle, subtitle: defaultSubtitle } = useMemo(() => {
    const isGf = id.toUpperCase() === StageId.GF.toUpperCase();

    let title = `${contestName} ${contestYear}`;
    let subtitle = isGf ? `Final Results - ${name}` : name;

    if (!isOver) {
      title = `${contestName} ${contestYear} - ${name}`;

      if (isJuryVoting) {
        if (votingCountryIndex === 0) {
          subtitle = name;
        }

        subtitle = `${votingCountryIndex} of ${getVotingCountriesLength()} countries voted`;
      } else if (
        (votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
          votingMode === StageVotingMode.COMBINED) &&
        televotingProgress === 0
      ) {
        subtitle = 'Jury results';
      } else {
        subtitle = `${televotingProgress} of ${countries?.length} televotes revealed`;
      }
    }

    return { title, subtitle };
  }, [
    id,
    contestName,
    contestYear,
    name,
    isOver,
    isJuryVoting,
    votingMode,
    televotingProgress,
    votingCountryIndex,
    getVotingCountriesLength,
    countries?.length,
  ]);

  const allCountriesToDisplay = useCountryDisplay();
  const sortedCountries = useCountrySorter(allCountriesToDisplay);
  const limitedCountries =
    (imageCustomization.maxCountries || 0) > 0
      ? sortedCountries.slice(0, imageCustomization.maxCountries as number)
      : sortedCountries;

  const handleImageGenerated = (dataUrl: string) => {
    setGeneratedImageUrl(dataUrl);
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');

    link.download = `${defaultTitle} - ${defaultSubtitle} - DouzePoints.app - ${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const updateImageSetting = (key: string, value: any) => {
    setImageCustomization({
      [key]: value,
    });
  };

  const getCurrentAspectRatioLabel = () => {
    const preset = ASPECT_RATIO_PRESETS[imageCustomization.aspectRatio];

    return preset ? preset.label : 'Landscape (16:9)';
  };

  const layoutOptions = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => ({
      value: index + 1,
      label: t('share.nColumns', { count: index + 1 }),
    }));
  }, [t]);

  const getAutoSettingsByCount = (
    count: number,
    newAspectRatio?: ShareImageAspectRatio,
  ) => {
    const currentAspectRatio = newAspectRatio || imageCustomization.aspectRatio;
    const isLandscape = currentAspectRatio === '1200x630';
    const isSquare = currentAspectRatio === '800x800';
    const isPortrait = currentAspectRatio === '750x1000';

    if (count <= 6) {
      return {
        layout: 1,
        itemSize: '2xl' as const,
        shortCountryNames: false,
        titleFontSize: 42,
        subtitleFontSize: 26,
        brandingFontSize: 22,
        verticalPadding: isPortrait ? 40 : 20,
        horizontalPadding: isLandscape ? 130 : 100,
      };
    }

    if (count <= 12) {
      return {
        layout: isPortrait ? 1 : 2,
        itemSize: 'xl' as const,
        shortCountryNames: false,
        titleFontSize: 48,
        subtitleFontSize: 28,
        brandingFontSize: 22,
        verticalPadding: isPortrait ? 64 : 40,
        horizontalPadding: isLandscape ? 88 : 50,
      };
    }

    if (count <= 16) {
      return {
        layout: 2,
        itemSize: 'xl' as const,
        shortCountryNames: false,
        titleFontSize: 42,
        subtitleFontSize: 26,
        brandingFontSize: 20,
        verticalPadding: isPortrait ? 46 : 16,
        horizontalPadding: isLandscape ? 90 : 50,
      };
    }

    if (count <= 27) {
      return {
        layout: isLandscape ? 3 : 2,
        itemSize: 'lg' as const,
        shortCountryNames: false,
        titleFontSize: 36,
        subtitleFontSize: 24,
        brandingFontSize: 20,
        verticalPadding: isPortrait ? 46 : 16,
        horizontalPadding: isLandscape ? 72 : 50,
      };
    }

    if (count <= 48) {
      return {
        layout: isLandscape ? 4 : isSquare ? 3 : 2,
        itemSize: count <= 32 ? ('lg' as const) : ('md' as const),
        shortCountryNames: count <= 32 && isSquare,
        titleFontSize: 34,
        subtitleFontSize: 22,
        brandingFontSize: 18,
        verticalPadding: 15,
        horizontalPadding: 64,
      };
    }

    if (count <= 65) {
      return {
        layout: isLandscape ? 5 : isSquare ? 4 : 3,
        itemSize: 'md' as const,
        shortCountryNames: isSquare,
        titleFontSize: 32,
        subtitleFontSize: 20,
        brandingFontSize: 18,
        verticalPadding: 8,
        horizontalPadding: isPortrait ? 36 : 56,
      };
    }

    if (count <= 80) {
      return {
        layout: isLandscape ? 5 : isSquare ? 4 : 3,
        itemSize: 'sm' as const,
        shortCountryNames: isSquare,
        titleFontSize: 32,
        subtitleFontSize: 20,
        brandingFontSize: 18,
        verticalPadding: isPortrait ? 10 : 2,
        horizontalPadding: isPortrait ? 36 : 40,
      };
    }

    if (count <= 100) {
      return {
        layout: isLandscape ? 6 : isSquare ? 5 : 4,
        itemSize: 'sm' as const,
        shortCountryNames: isSquare,
        titleFontSize: 32,
        subtitleFontSize: 20,
        brandingFontSize: 18,
        verticalPadding: isPortrait ? 10 : 0,
        horizontalPadding: isPortrait ? 24 : 40,
      };
    }

    return {
      layout: isLandscape ? (count <= 112 ? 7 : 8) : isSquare ? 5 : 5,
      itemSize: 'sm' as const,
      shortCountryNames: true,
      titleFontSize: 32,
      subtitleFontSize: 20,
      brandingFontSize: 18,
      verticalPadding: isPortrait ? 10 : 0,
      horizontalPadding: isPortrait ? 20 : 40,
    };
  };

  const applyAutoSettings = (newAspectRatio?: ShareImageAspectRatio) => {
    const count = limitedCountries.length;
    const auto = getAutoSettingsByCount(count, newAspectRatio);

    setImageCustomization({
      ...auto,
      ...(newAspectRatio ? { aspectRatio: newAspectRatio as any } : {}),
    });
  };

  useEffect(() => {
    if (isOpen) {
      setImageCustomization({
        title: defaultTitle,
        subtitle: defaultSubtitle,
      });

      applyAutoSettings();
      onLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      ref={modalRef}
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,_95vw)]"
      contentClassName="!py-4 !px-2 text-white h-[85vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="sm:space-y-6 space-y-4 sm:py-2 py-1">
        <div className="sm:mx-3 mx-2">
          <CollapsibleSection
            title={t('share.customization')}
            isExpanded={imageCustomization.isCustomizationExpanded}
            onToggle={() => {
              setImageCustomization({
                isCustomizationExpanded:
                  !imageCustomization.isCustomizationExpanded,
              });
            }}
            contentClassName="lg:px-6 sm:px-4 px-3"
            extraContent={
              <Button
                className="h-10 !py-2 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  applyAutoSettings();
                }}
              >
                {t('share.autoFit')}
              </Button>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.title')}
                  </label>
                  <Input
                    type="text"
                    className="pr-2"
                    value={imageCustomization.title}
                    onChange={(e) =>
                      updateImageSetting('title', e.target.value)
                    }
                    placeholder={t('common.enterTitle')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.subtitle')}
                  </label>
                  <Input
                    type="text"
                    className="pr-2"
                    value={imageCustomization.subtitle}
                    onChange={(e) =>
                      updateImageSetting('subtitle', e.target.value)
                    }
                    placeholder={t('common.enterSubtitle')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('share.aspectRatio')}
                  </label>
                  <Select
                    value={imageCustomization.aspectRatio}
                    onChange={(e) => {
                      const newAspectRatio = e.target
                        .value as ShareImageAspectRatio;

                      applyAutoSettings(newAspectRatio);
                    }}
                    options={Object.entries(ASPECT_RATIO_PRESETS).map(
                      ([key, preset]) => ({
                        value: key as ShareImageAspectRatio,
                        label: preset.label,
                      }),
                    )}
                    className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
                    arrowClassName="!w-6 !h-6"
                  >
                    <span className="flex-1">
                      {getCurrentAspectRatioLabel()}
                    </span>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('share.layout')}
                  </label>
                  <Select
                    value={imageCustomization.layout}
                    onChange={(e) => {
                      updateImageSetting('layout', parseInt(e.target.value));
                    }}
                    options={layoutOptions}
                    className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
                    arrowClassName="!w-6 !h-6"
                  >
                    <span className="flex-1">
                      {t('share.nColumns', {
                        count: imageCustomization.layout,
                      })}
                    </span>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('share.itemSize')}
                  </label>
                  <Select
                    value={imageCustomization.itemSize}
                    onChange={(e) =>
                      updateImageSetting('itemSize', e.target.value)
                    }
                    options={[
                      { value: 'sm', label: 'Small' },
                      { value: 'md', label: 'Medium' },
                      { value: 'lg', label: 'Large' },
                      { value: 'xl', label: 'Extra Large' },
                      { value: '2xl', label: '2X Large' },
                    ]}
                    className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
                    arrowClassName="!w-6 !h-6"
                  >
                    <span className="flex-1">
                      {imageCustomization.itemSize === 'sm' && 'Small'}
                      {imageCustomization.itemSize === 'md' && 'Medium'}
                      {imageCustomization.itemSize === 'lg' && 'Large'}
                      {imageCustomization.itemSize === 'xl' && 'Extra Large'}
                      {imageCustomization.itemSize === '2xl' && '2X Large'}
                    </span>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('share.maxCountries')}
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.maxCountries || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('maxCountries', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('maxCountries', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (value === '' || isNaN(parseInt(value))) {
                        updateImageSetting('maxCountries', 0);
                      }
                    }}
                    placeholder={t('share.allByDefault')}
                  />
                </div>
              </div>

              <div className="h-px bg-primary-800 w-full" />

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium mb-2">
                    {t('share.titleSize')} (px)
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.titleFontSize || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('titleFontSize', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('titleFontSize', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (value === '' || isNaN(parseInt(value))) {
                        updateImageSetting('titleFontSize', 36);
                      }
                    }}
                    placeholder="36"
                    min="24"
                    max="100"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium mb-2">
                    {t('share.subtitleSize')} (px)
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.subtitleFontSize || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('subtitleFontSize', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('subtitleFontSize', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (value === '' || isNaN(parseInt(value))) {
                        updateImageSetting('subtitleFontSize', 24);
                      }
                    }}
                    placeholder="24"
                    min="16"
                    max="60"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium mb-2">
                    {t('share.brandingSize')} (px)
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.brandingFontSize || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('brandingFontSize', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('brandingFontSize', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (
                        value === '' ||
                        isNaN(parseInt(value)) ||
                        parseInt(value) < 14
                      ) {
                        updateImageSetting('brandingFontSize', 20);
                      }
                    }}
                    placeholder="20"
                    min="14"
                    max="32"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium mb-2">
                    {t('share.verticalPadding')} (px)
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.verticalPadding || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('verticalPadding', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('verticalPadding', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (value === '' || isNaN(parseInt(value))) {
                        updateImageSetting('verticalPadding', 20);
                      }
                    }}
                    placeholder="20"
                    min="0"
                    max="150"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium mb-2">
                    {t('share.horizontalPadding')} (px)
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={imageCustomization.horizontalPadding || ''}
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        updateImageSetting('horizontalPadding', null);
                      } else {
                        const numValue = parseInt(value);

                        if (!isNaN(numValue)) {
                          updateImageSetting('horizontalPadding', numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const { value } = e.target;

                      if (value === '' || isNaN(parseInt(value))) {
                        updateImageSetting('horizontalPadding', 80);
                      }
                    }}
                    placeholder="80"
                    min="20"
                    max="400"
                  />
                </div>
              </div>

              <div className="h-px bg-primary-800 w-full" />

              <div className="flex flex-wrap">
                <Checkbox
                  id="showRankings"
                  label={t('share.showRankings')}
                  checked={imageCustomization.showRankings}
                  onChange={(e) =>
                    updateImageSetting('showRankings', e.target.checked)
                  }
                />

                <Checkbox
                  id="shortCountryNames"
                  label={t('share.shortCountryNames')}
                  checked={imageCustomization.shortCountryNames}
                  onChange={(e) =>
                    updateImageSetting('shortCountryNames', e.target.checked)
                  }
                />

                <Checkbox
                  id="showPoints"
                  label={t('share.showPoints')}
                  checked={imageCustomization.showPoints}
                  onChange={(e) =>
                    updateImageSetting('showPoints', e.target.checked)
                  }
                />

                {!isTouchDevice && (
                  <Checkbox
                    id="highQuality"
                    label={t('share.highQuality')}
                    checked={imageCustomization.highQuality}
                    onChange={(e) =>
                      updateImageSetting('highQuality', e.target.checked)
                    }
                  />
                )}
              </div>

              <Button
                variant="tertiary"
                className="w-full"
                onClick={() => {
                  const count = sortedCountries.length;
                  const auto = getAutoSettingsByCount(
                    count,
                    ShareImageAspectRatio.LANDSCAPE,
                  );

                  setImageCustomization({
                    ...auto,
                    title: defaultTitle,
                    subtitle: defaultSubtitle,
                    aspectRatio: getInitialAspectRatio(),
                    maxCountries: 0,
                    showRankings: true,
                    showPoints: true,
                  });
                }}
              >
                {t('common.reset')}
              </Button>
            </div>
          </CollapsibleSection>
        </div>
        {/* Image Generation */}
        <ImageGenerator
          onImageGenerated={handleImageGenerated}
          generatedImageUrl={generatedImageUrl}
          lastGeneratedStageId={lastGeneratedStageId}
          setLastGeneratedStageId={setLastGeneratedStageId}
          modalRef={modalRef}
        />

        {generatedImageUrl && (
          <div>
            <h3 className="text-lg font-semibold mb-2 ml-2">
              {t('share.result')}:
            </h3>

            <Image
              src={generatedImageUrl}
              alt="Generated scoreboard"
              className="max-w-full h-auto border rounded-sm"
              width={1024}
              height={768}
            />
            <Button
              onClick={handleDownload}
              className="mt-4 w-full justify-center"
              variant="tertiary"
              Icon={<DownloadIcon className="w-[20px] h-[20px]" />}
            >
              {t('share.downloadImage')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareResultsModal;
