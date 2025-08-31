import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Country, StageVotingType } from '../../../models';
import { useStatsCustomizationStore } from '../../../state/statsCustomizationStore';
import Button from '../../common/Button';
import SplitStats from '../finalStats/SplitStats';
import StatsTable from '../finalStats/StatsTable';
import SummaryStats from '../finalStats/SummaryStats';

import { useShareBgImage } from './useShareBgImage';

import { GenerateImageIcon } from '@/assets/icons/GenerateImageIcon';
import { useImageGenerator } from '@/hooks/useImageGenerator';
import { StatsTableType } from '@/models';

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;

interface StatsImagePreviewProps {
  activeTab: StatsTableType;
  rankedCountries: (Country & { rank: number })[];
  selectedStageId: string | null;
  selectedVoteType: StageVotingType | 'Total';
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  selectedStage: any; // EventStage type
  modalRef: React.RefObject<HTMLDivElement | null>;
  onImageGenerated?: (dataUrl: string) => void;
  generatedImageUrl?: string | null;
}

const StatsImagePreview: React.FC<StatsImagePreviewProps> = ({
  activeTab,
  rankedCountries,
  selectedStageId,
  selectedVoteType,
  getCellPoints,
  getCellClassName,
  getPoints,
  selectedStage,
  modalRef,
  onImageGenerated,
  generatedImageUrl,
}) => {
  const [scale, setScale] = useState(1);
  const settings = useStatsCustomizationStore((state) => state.settings);

  // Let the preview render at natural width, we'll scale it to fit modal
  const [previewWidth, setPreviewWidth] = useState(MIN_WIDTH);
  const [previewHeight, setPreviewHeight] = useState(MIN_HEIGHT);

  // Use refs to track previous values and prevent unnecessary updates
  const prevDimensionsRef = useRef({ width: MIN_WIDTH, height: MIN_HEIGHT });

  // Store current dimensions for image generation
  const currentDimensionsRef = useRef({ width: MIN_WIDTH, height: MIN_HEIGHT });

  const { containerRef, isGenerating, generateImage } = useImageGenerator({
    width: currentDimensionsRef.current.width,
    height: currentDimensionsRef.current.height,
    backgroundImage: null, // We'll handle this in the component
    backgroundOpacity: settings.backgroundOpacity,
  });

  // Calculate responsive font sizes based on preview width
  const getTitleFontSize = (width?: number) => {
    const minSize = 22;
    const maxSize = 42;
    const baseWidth = width || previewWidth;
    const baseSize = Math.max(minSize, Math.min(maxSize, baseWidth * 0.04));

    return Math.round(baseSize);
  };

  const getBrandingFontSize = (width?: number) => {
    const minSize = 16;
    const maxSize = 22;
    const baseWidth = width || previewWidth;
    const baseSize = Math.max(minSize, Math.min(maxSize, baseWidth * 0.025));

    return Math.round(baseSize);
  };

  const backgroundImage = useShareBgImage();

  const renderContent = () => {
    switch (activeTab) {
      case StatsTableType.BREAKDOWN:
        return (
          <StatsTable
            rankedCountries={rankedCountries}
            getCellPoints={getCellPoints}
            getCellClassName={getCellClassName}
            getPoints={getPoints}
            selectedStageId={selectedStageId}
            selectedVoteType={selectedVoteType}
          />
        );
      case StatsTableType.SPLIT:
        return (
          <SplitStats
            rankedCountries={rankedCountries}
            selectedStage={selectedStage}
            getPoints={getPoints}
          />
        );
      case StatsTableType.SUMMARY:
        return (
          <SummaryStats
            rankedCountries={rankedCountries}
            selectedStage={selectedStage}
            getPoints={getPoints}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const resize = () => {
      if (modalRef.current) {
        const modalWidth = modalRef.current.offsetWidth;
        const modalContentWidth = modalWidth - 25; // Account for padding

        // Scale to fit the modal width, maintaining aspect ratio
        const scaleX = modalContentWidth / previewWidth;

        setScale(scaleX);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [modalRef, previewWidth]);

  // Update preview dimensions based on content
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const updateDimensions = () => {
      if (containerRef.current) {
        const contentElement = containerRef.current.querySelector(
          '.stats-image-wrapper',
        );

        if (contentElement) {
          const contentHeight = contentElement.scrollHeight;
          const contentWidth = contentElement.scrollWidth;
          const minHeight = MIN_HEIGHT;
          const minWidth = MIN_WIDTH;

          // Calculate title height if title exists
          let titleHeight = 0;

          if (settings.title) {
            // Calculate title height based on text content and font size
            const titleFontSize = getTitleFontSize();
            const lineHeight = 1.2; // Approximate line height

            // Use content width for stable calculations to avoid circular dependency
            const availableWidth = Math.max(MIN_WIDTH, contentWidth + 40) - 40;
            const avgCharWidth = titleFontSize * 0.6; // Approximate character width
            const estimatedCharsPerLine = Math.floor(
              availableWidth / avgCharWidth,
            );
            const estimatedLines = Math.ceil(
              settings.title.length / estimatedCharsPerLine,
            );

            titleHeight = Math.max(
              titleFontSize * lineHeight,
              titleFontSize * estimatedLines * lineHeight,
            );
          }

          const newHeight = Math.max(
            minHeight,
            contentHeight + titleHeight + 140,
          ); // Add padding for title and branding
          const newWidth = Math.max(minWidth, contentWidth + 40); // Add padding for left/right margins

          // Only update if dimensions actually changed significantly (more than 10px)
          if (
            Math.abs(newHeight - prevDimensionsRef.current.height) > 10 ||
            Math.abs(newWidth - prevDimensionsRef.current.width) > 10
          ) {
            // console.log(
            //   'Content dimensions:',
            //   contentWidth,
            //   'x',
            //   contentHeight,
            //   'New dimensions:',
            //   newWidth,
            //   'x',
            //   newHeight,
            // );
            setPreviewHeight(newHeight);
            setPreviewWidth(newWidth);
            prevDimensionsRef.current = { width: newWidth, height: newHeight };
            currentDimensionsRef.current = {
              width: newWidth,
              height: newHeight,
            };
          }
        }
      }
    };

    const debouncedUpdateDimensions = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(updateDimensions, 50);
    };

    // Initial dimensions calculation
    const timer = setTimeout(updateDimensions, 100);

    // Set up ResizeObserver for dynamic content changes
    let resizeObserver: ResizeObserver | null = null;

    if (containerRef.current) {
      // Only observe the actual table content, not the wrapper with title/branding
      const tableElement = containerRef.current.querySelector('table');

      if (tableElement) {
        resizeObserver = new ResizeObserver(debouncedUpdateDimensions);
        resizeObserver.observe(tableElement);
      }
    }

    return () => {
      clearTimeout(timer);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedCountries, activeTab, containerRef]);

  const handleGenerateImage = useCallback(async () => {
    const dataUrl = await generateImage();

    if (dataUrl && onImageGenerated) {
      onImageGenerated(dataUrl);

      // Scroll down within the modal to show the generated image
      setTimeout(() => {
        if (modalRef.current) {
          const modalContent = modalRef.current.childNodes[0] as HTMLDivElement;

          modalContent.scrollTo({
            top: modalContent.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [generateImage, onImageGenerated, modalRef]);

  // useEffect(() => {
  //   if (!isGenerating && !generatedImageUrl && settings.generateOnOpen) {
  //     setTimeout(() => {
  //       handleGenerateImage();
  //     }, 300);
  //   }
  // }, [
  //   isGenerating,
  //   generatedImageUrl,
  //   handleGenerateImage,
  //   settings.generateOnOpen,
  // ]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 ml-2">Preview:</h3>
      <div
        className="relative w-full h-full max-w-full overflow-hidden rounded-sm"
        style={{
          aspectRatio: `${previewWidth} / ${previewHeight}`,
        }}
      >
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <div className="bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 relative flex flex-col items-center justify-center h-full px-5 pt-10 pb-10">
            {/* Background Image */}
            {settings.showBackgroundImage && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: settings.backgroundOpacity,
                }}
              />
            )}

            {/* Title */}
            <div className="text-center relative z-10 flex-shrink-0">
              <h1
                className="font-bold text-white leading-tight truncate"
                style={{
                  fontSize: `${getTitleFontSize()}px`,
                  textShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  maxWidth: `${previewWidth - 40}px`,
                }}
              >
                {settings.title}
              </h1>
            </div>

            {/* Table Content */}
            <div
              className={`relative z-10 stats-image-wrapper ${
                previewWidth > MIN_WIDTH * 2 ? 'my-4' : 'my-6'
              }`}
            >
              {renderContent()}
            </div>

            {/* Branding */}
            <div
              className="relative z-[99] flex justify-center items-center flex-shrink-0"
              style={{
                fontSize: `${getBrandingFontSize()}px`,
              }}
            >
              <img
                src="/img/favicon-128x128.png"
                alt="DouzePoints.app"
                className="mr-2"
                width={24}
                height={24}
                loading="lazy"
                style={{
                  width: `${getBrandingFontSize() * 1.4}px`,
                  height: `${getBrandingFontSize() * 1.4}px`,
                }}
              />
              <span
                style={{
                  textShadow: '0 0 10px rgba(0, 0, 0, 0.4)',
                }}
                className="font-semibold text-white/90"
              >
                DouzePoints.app
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="text-center mt-4">
        <Button
          onClick={handleGenerateImage}
          className="w-full justify-center"
          Icon={<GenerateImageIcon className="w-[20px] h-[20px]" />}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </Button>
      </div>
    </div>
  );
};

export default StatsImagePreview;
