'use client';
import { useCallback, useRef, useState } from 'react';

import { exportNode, ExportOptions, ExportResult } from './exportNode';

export type DesignExportOptions = Omit<ExportOptions, 'width' | 'height'>;

/**
 * Export the node behind `nodeRef` at the given canvas size. Serialises
 * concurrent calls (a second call while one runs returns null).
 */
export function useDesignExport(options: DesignExportOptions) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const busyRef = useRef(false);
  const lastRef = useRef<ExportResult | null>(null);

  const generate = useCallback(
    async (size: { width: number; height: number }): Promise<string | null> => {
      const node = nodeRef.current;

      if (!node || busyRef.current) return null;
      busyRef.current = true;
      setIsGenerating(true);
      try {
        const result = await exportNode(node, { ...options, ...size });

        lastRef.current = result;
        if (process.env.NODE_ENV === 'development' && result.warnings.length) {
          // eslint-disable-next-line no-console
          console.warn(
            `[graphics] export via ${result.engine}` +
              `${result.usedFallback ? ' (fallback)' : ''}, retries ${
                result.retries
              }, ${result.durationMs.toFixed(0)} ms:\n${result.warnings.join(
                '\n',
              )}`,
          );
        }

        return result.dataUrl;
      } catch (error) {
        console.error('Failed to generate image.', error);

        return null;
      } finally {
        busyRef.current = false;
        setIsGenerating(false);
      }
    },
    // Options are plain values; callers pass stable primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.scale, options.format, options.quality, options.engine],
  );

  return { nodeRef, isGenerating, generate, lastResult: lastRef };
}
