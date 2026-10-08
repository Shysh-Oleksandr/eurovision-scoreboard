'use client';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  DesignExportOptions,
  useDesignExport,
} from '../export/useDesignExport';
import { Design } from '../model/design';
import { DesignStage } from '../render/DesignStage';

import { GenerateImageIcon } from '@/assets/icons/GenerateImageIcon';
import Button from '@/components/common/Button';

export interface DesignPreviewProps {
  design: Design;
  exportOptions: DesignExportOptions;
  /** Auto-generate on mount/activation and whenever this key changes. */
  autoGenerate?: boolean;
  autoGenerateKey?: string | null;
  /** Only auto-generate while the host (modal) is open. */
  active?: boolean;
  onImageGenerated: (dataUrl: string) => void;
  /** Auto-sized designs report their content size (stats). */
  onMeasured?: (size: { width: number; height: number }) => void;
  /** Scrolled to the bottom after a generation (the modal). */
  scrollTargetRef?: React.RefObject<HTMLDivElement | null>;
  /** Rendered next to "Generate image" (e.g. "Open in editor"). */
  extraActions?: React.ReactNode;
}

/**
 * Preview + "Generate image" for one design. Scales the stage to its own
 * width and exports at design size × `exportOptions.scale`. Must be rendered
 * inside a `DesignDataProvider`.
 */
const DesignPreview: React.FC<DesignPreviewProps> = ({
  design,
  exportOptions,
  autoGenerate = false,
  autoGenerateKey = null,
  active = true,
  onImageGenerated,
  onMeasured,
  scrollTargetRef,
  extraActions,
}) => {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodeRef, isGenerating, generate } = useDesignExport(exportOptions);
  const [zoom, setZoom] = useState(1);
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { autoSize } = design.canvas;
  const canvasWidth =
    autoSize && measured ? measured.width : design.canvas.width;
  const canvasHeight =
    autoSize && measured ? measured.height : design.canvas.height;

  // Content-sized designs are measured in one or two passes (the owner may
  // rebuild the design from the first measurement). Keep the stage hidden
  // and unfitted until the measurement has been stable for a moment, so the
  // user never sees it fitted to the pre-measurement minimum size.
  const [stable, setStable] = useState(!autoSize);
  const stableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStable(!autoSize);
  }, [autoSize]);

  // Fit the stage to the container width. Layout effect: the zoom must be
  // right before the first visible paint after the stage becomes stable.
  useLayoutEffect(() => {
    const el = containerRef.current;

    if (!el || !stable) return undefined;
    const fit = () => {
      const w = el.clientWidth;

      if (w > 0) setZoom(w / canvasWidth);
    };
    const observer = new ResizeObserver(fit);

    observer.observe(el);
    fit();

    return () => observer.disconnect();
  }, [canvasWidth, stable]);

  const lastMeasuredRef = useRef<{ width: number; height: number } | null>(
    null,
  );
  const handleMeasured = useCallback(
    (size: { width: number; height: number }) => {
      const prev = lastMeasuredRef.current;

      if (prev && prev.width === size.width && prev.height === size.height) {
        return;
      }
      lastMeasuredRef.current = size;
      setMeasured(size);
      setStable(false);
      if (stableTimer.current) clearTimeout(stableTimer.current);
      stableTimer.current = setTimeout(() => setStable(true), 150);
      onMeasured?.(size);
    },
    [onMeasured],
  );

  useEffect(
    () => () => {
      if (stableTimer.current) clearTimeout(stableTimer.current);
    },
    [],
  );

  const run = useCallback(async () => {
    const dataUrl = await generate({
      width: canvasWidth,
      height: canvasHeight,
    });

    if (!dataUrl) return;
    onImageGenerated(dataUrl);
    // Scroll the host to the generated image.
    setTimeout(() => {
      const content = scrollTargetRef?.current?.childNodes[0] as
        | HTMLDivElement
        | undefined;

      content?.scrollTo?.({ top: content.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [generate, canvasWidth, canvasHeight, onImageGenerated, scrollTargetRef]);

  // Auto-generate: on activation and when the key changes. Auto-sized designs
  // wait for the measurement to settle.
  const runRef = useRef(run);

  runRef.current = run;
  const settled = stable && (!autoSize || !!measured);

  useEffect(() => {
    if (!autoGenerate || !active || !settled) return undefined;
    const timer = setTimeout(() => runRef.current(), autoSize ? 300 : 0);

    return () => clearTimeout(timer);
    // Re-run only when the key / activation / settle state changes, not on
    // every settings edit (the user re-generates explicitly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, active, autoGenerateKey, settled, autoSize]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 ml-2">
        {t('common.preview')}:
      </h3>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-sm"
        style={{ visibility: stable ? 'visible' : 'hidden' }}
      >
        <DesignStage
          design={design}
          zoom={zoom}
          nodeRef={nodeRef}
          onMeasured={autoSize ? handleMeasured : undefined}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={run}
          disabled={isGenerating}
          className="flex-1 justify-center"
          Icon={<GenerateImageIcon className="w-[20px] h-[20px]" />}
        >
          {isGenerating ? t('share.generating') : t('share.generateImage')}
        </Button>
        {extraActions}
      </div>
    </div>
  );
};

export default DesignPreview;
