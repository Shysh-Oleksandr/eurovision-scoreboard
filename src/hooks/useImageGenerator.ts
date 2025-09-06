import * as htmlToImage from 'html-to-image';
import { useCallback, useRef, useState } from 'react';

import { useGeneralStore } from '../state/generalStore';
import { getThemeBackground } from '../theme/themes';

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
  backgroundImage?: string | null;
  backgroundOpacity?: number;
}

export const useImageGenerator = (options: ImageGenerationOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const settings = useGeneralStore((state) => state.settings);
  const themeYear = useGeneralStore((state) => state.themeYear);

  const generateImage = useCallback(async (): Promise<string | null> => {
    if (!containerRef.current) return null;

    setIsGenerating(true);
    try {
      const isSafariOrChrome =
        /safari|chrome/i.test(navigator.userAgent) &&
        !/android/i.test(navigator.userAgent);

      let dataUrl = '';
      let canvas;
      let i = 0;
      let maxAttempts = isSafariOrChrome ? 5 : 1;
      const cycle: number[] = [];
      let repeat = true;

      while (repeat && i < maxAttempts) {
        canvas = await htmlToImage.toCanvas(containerRef.current, {
          fetchRequestInit: {
            cache: 'no-cache',
          },
          includeQueryParams: true,
          quality: options.quality || 1,
          width: options.width,
          height: options.height,
          style: { transform: 'none' }, // ignore preview scaling
        });
        i += 1;
        dataUrl = canvas.toDataURL(
          options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
          0.9,
        );
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
              quality: options.quality || 1,
              width: options.width,
              height: options.height,
              style: { transform: 'none' }, // ignore preview scaling
            });
            dataUrl = canvas.toDataURL(
              options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
              0.9,
            );
          }
        }
      }

      return dataUrl;
    } catch (error) {
      console.error('Failed to generate image. ' + error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [
    options.quality,
    options.format,
    options.width,
    options.height,
    // Remove settings and themeYear from dependencies as they're not used in the function
  ]);

  const getBackgroundImage = useCallback(() => {
    if (options.backgroundImage) {
      return options.backgroundImage;
    }
    if (settings.shouldUseCustomBgImage && settings.customBgImage) {
      return settings.customBgImage;
    }
    return getThemeBackground(themeYear);
  }, [
    options.backgroundImage,
    settings.shouldUseCustomBgImage,
    settings.customBgImage,
    themeYear,
  ]);

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, []);

  return {
    containerRef,
    isGenerating,
    generateImage,
    getBackgroundImage,
    downloadImage,
  };
};
