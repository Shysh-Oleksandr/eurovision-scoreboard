import * as htmlToImage from 'html-to-image';
import React, { useEffect, useRef, useState } from 'react';

import {
  ASPECT_RATIO_PRESETS,
  ShareImageAspectRatio,
  useGeneralStore,
} from '../../../state/generalStore';
import { getThemeBackground } from '../../../theme/themes';
import Button from '../../common/Button';

import ShareCountryItem from './ShareCountryItem';

import { GenerateImageIcon } from '@/assets/icons/GenerateImageIcon';
import { useCountryDisplay, useCountrySorter } from '@/components/board/hooks';
import { useReorderCountries } from '@/hooks/useReorderCountries';
import { useTouchDevice } from '@/hooks/useTouchDevice';

interface ImageGeneratorProps {
  onImageGenerated: (dataUrl: string) => void;
  generatedImageUrl: string | null;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  onImageGenerated,
  generatedImageUrl,
  modalRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const settings = useGeneralStore((state) => state.settings);
  const imageCustomization = useGeneralStore(
    (state) => state.imageCustomization,
  );
  const themeYear = useGeneralStore((state) => state.themeYear);

  const isTouchDevice = useTouchDevice();

  const [scale, setScale] = useState(1);

  const currentPreset =
    ASPECT_RATIO_PRESETS[
      imageCustomization.aspectRatio || ShareImageAspectRatio.LANDSCAPE
    ];
  const aspectRatio = currentPreset.width / currentPreset.height;

  const generateImage = async () => {
    if (!containerRef.current) return;

    setIsGenerating(true);
    try {
      const qualityFactor =
        imageCustomization.highQuality && !isTouchDevice ? 2 : 1;

      const isSafariOrChrome =
        /safari|chrome/i.test(navigator.userAgent) &&
        !/android/i.test(navigator.userAgent);

      let dataUrl = '';
      let canvas;
      let i = 0;
      let maxAttempts;

      if (isSafariOrChrome) {
        maxAttempts = 5;
      } else {
        maxAttempts = 1;
      }
      const cycle = [];
      let repeat = true;

      while (repeat && i < maxAttempts) {
        canvas = await htmlToImage.toCanvas(containerRef.current, {
          fetchRequestInit: {
            cache: 'no-cache',
          },
          includeQueryParams: true,
          quality: 1,
          canvasWidth: currentPreset.width * qualityFactor,
          canvasHeight: currentPreset.height * qualityFactor,
          width: currentPreset.width,
          height: currentPreset.height,
          style: { transform: 'none' }, // ignore preview scaling
        });
        i += 1;
        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        cycle[i] = dataUrl.length;

        if (dataUrl.length > cycle[i - 1]) {
          repeat = false;
          // For Safari/Chrome, generate one more time to ensure background image is properly rendered
          if (isSafariOrChrome) {
            canvas = await htmlToImage.toCanvas(containerRef.current, {
              fetchRequestInit: {
                cache: 'no-cache',
              },
              includeQueryParams: true,
              quality: 1,
              canvasWidth: currentPreset.width * qualityFactor,
              canvasHeight: currentPreset.height * qualityFactor,
              width: currentPreset.width,
              height: currentPreset.height,
              style: { transform: 'none' }, // ignore preview scaling
            });
            dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          }
        }
      }

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
    } catch (error) {
      console.error('Failed to generate image. ' + error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTitle = () => {
    return imageCustomization.title;
  };

  const getSubtitle = () => {
    return imageCustomization.subtitle;
  };

  const getSizeClasses = () => {
    const { itemSize } = imageCustomization;

    switch (itemSize) {
      case 'sm':
        return {
          grid: 'gap-x-2',
        };
      case 'md':
        return {
          grid: 'gap-x-3',
        };

      case 'lg':
      case 'xl':
        return {
          grid: 'gap-x-5',
        };
      case '2xl':
        return {
          grid: 'gap-x-5',
        };
      default:
        return {
          grid: 'gap-x-4',
        };
    }
  };

  const getLayoutClass = () => {
    const { layout } = imageCustomization;

    // Convert number of columns to Tailwind grid classes
    switch (layout) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-4';
      case 5:
        return 'grid-cols-5';
      case 6:
        return 'grid-cols-6';
      case 7:
        return 'grid-cols-7';
      case 8:
        return 'grid-cols-8';
      default:
        return 'grid-cols-2'; // fallback to 2 columns
    }
  };

  const getBackgroundImage = () => {
    if (settings.shouldUseCustomBgImage && settings.customBgImage) {
      return settings.customBgImage;
    }

    return getThemeBackground(themeYear);
  };

  const allCountriesToDisplay = useCountryDisplay();
  const sortedCountries = useCountrySorter(allCountriesToDisplay);
  const limitedCountries =
    imageCustomization.maxCountries > 0
      ? sortedCountries.slice(0, imageCustomization.maxCountries)
      : sortedCountries;

  const reorderedCountries = useReorderCountries(
    limitedCountries,
    imageCustomization.layout,
  );

  useEffect(() => {
    if (!generatedImageUrl && !isGenerating) {
      generateImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedImageUrl, isGenerating]);

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        if (modalRef.current) {
          const modalWidth = modalRef.current.offsetWidth;

          const modalContentWidth = modalWidth - 14;

          // if (modalContentWidth > currentPreset.width) {
          //   setScale(1);

          //   return;
          // }

          setScale(modalContentWidth / currentPreset.width); // scale based on base width
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [currentPreset.width, modalRef, imageCustomization.aspectRatio]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 ml-2">Preview:</h3>
      <div
        className="relative w-full h-full max-w-full overflow-hidden rounded-sm"
        style={{
          aspectRatio: `${aspectRatio}`,
        }}
      >
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{
            width: `${currentPreset.width}px`,
            height: `${currentPreset.height}px`,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="text-black overflow-hidden relative w-full h-full flex flex-col justify-center items-center"
            style={{
              paddingLeft: `${imageCustomization.horizontalPadding}px`,
              paddingRight: `${imageCustomization.horizontalPadding}px`,
            }}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${getBackgroundImage()})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Title */}
            {imageCustomization.title && (
              <div className="text-center relative z-10">
                <h1
                  className="font-bold text-white"
                  style={{
                    fontSize: `${imageCustomization.titleFontSize}px`,
                    textShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {getTitle()}
                </h1>
              </div>
            )}

            {/* Subtitle */}
            {imageCustomization.subtitle && (
              <div className="text-center relative z-10">
                <h2
                  className="text-white"
                  style={{
                    fontSize: `${imageCustomization.subtitleFontSize}px`,
                    marginTop: `${
                      imageCustomization.title
                        ? imageCustomization.subtitleFontSize / 3
                        : 0
                    }px`,
                    textShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {getSubtitle()}
                </h2>
              </div>
            )}

            {/* Scoreboard Grid */}
            <div
              className={`grid my-4 ${getLayoutClass()} ${
                getSizeClasses().grid
              } relative z-10 w-full`}
              style={{
                paddingTop: `${imageCustomization.verticalPadding}px`,
                paddingBottom: `${imageCustomization.verticalPadding}px`,
              }}
            >
              {reorderedCountries.map((country) => (
                <ShareCountryItem
                  key={country.code}
                  country={country}
                  index={sortedCountries.findIndex(
                    (c) => c.code === country.code,
                  )}
                  showPoints={imageCustomization.showPoints}
                  showRankings={imageCustomization.showRankings}
                  size={imageCustomization.itemSize}
                  shortCountryNames={imageCustomization.shortCountryNames}
                />
              ))}
            </div>

            <div
              className="relative z-[99] flex justify-center items-center w-fit px-2"
              style={{
                fontSize: `${imageCustomization.brandingFontSize}px`,
              }}
            >
              <img
                src="/img/favicon-128x128.png"
                alt="DouzePoints.app"
                className="w-8 h-8 mr-2"
                width={32}
                height={32}
                loading="lazy"
                style={{
                  width: `${imageCustomization.brandingFontSize * 1.4}px`,
                  height: `${imageCustomization.brandingFontSize * 1.4}px`,
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

      <div className="text-center mt-4">
        <Button
          onClick={generateImage}
          disabled={isGenerating}
          className="w-full justify-center"
          Icon={<GenerateImageIcon className="w-[20px] h-[20px]" />}
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </Button>
      </div>
    </div>
  );
};

export default ImageGenerator;
