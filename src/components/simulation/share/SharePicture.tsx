'use client';
import { Maximize2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useLayoutEffect, useRef, useState } from 'react';

import { ShareImage } from './useShareExport';

import { Design } from '@/graphics/model/design';
import { DesignDataProvider } from '@/graphics/render/DesignDataContext';
import { DesignStage } from '@/graphics/render/DesignStage';

export type ShareDataProps = Omit<
  React.ComponentProps<typeof DesignDataProvider>,
  'children'
>;

interface SharePictureProps {
  design: Design;
  data: ShareDataProps;
  canvas: { width: number; height: number };
  stable: boolean;
  stageRef: (node: HTMLDivElement | null) => void;
  onMeasured?: (size: { width: number; height: number }) => void;
  /** The exported image when it is current. */
  image: ShareImage | null;
  /** An export is running. */
  busy: boolean;
  hasFailed: boolean;
  onRetry: () => void;
  onViewFullSize: () => void;
  alt: string;
  /**
   * `fill`: the picture fits the well's whole box (desktop, the well fills
   * its grid cell). Otherwise it fits the well's width and `maxHeight`.
   */
  fill: boolean;
  maxHeight?: number;
}

/** Padding between the well's edge and the picture (px). */
const FILL_INSET = 16;
const WIDTH_INSET = 12;

/**
 * One slot for the share image: the exported image while it is current, the
 * live stage under it once an edit has made it stale (every change shows at
 * once; the file is made again on Save). They look the same, so nothing
 * jumps, and the current image is a real `<img>`: right-click copy, drag out
 * and long-press "Save to Photos" work on it.
 */
const SharePicture: React.FC<SharePictureProps> = ({
  design,
  data,
  canvas,
  stable,
  stageRef,
  onMeasured,
  image,
  busy,
  hasFailed,
  onRetry,
  onViewFullSize,
  alt,
  fill,
  maxHeight = 480,
}) => {
  const t = useTranslations('share');
  const wellRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const el = fill ? boxRef.current : wellRef.current;

    if (!el) return undefined;
    const measure = () => {
      const width = fill ? el.clientWidth : el.clientWidth - WIDTH_INSET * 2;
      const height = fill ? el.clientHeight : Infinity;

      setBox((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    const observer = new ResizeObserver(measure);

    observer.observe(el);
    measure();

    return () => observer.disconnect();
  }, [fill]);

  const zoom =
    box && box.width > 0
      ? Math.min(
          box.width / canvas.width,
          (fill ? box.height : maxHeight) / canvas.height,
        )
      : 0;
  const visible = stable && zoom > 0;
  const updating = visible && busy;

  return (
    <div
      ref={wellRef}
      className={`dp-share-well relative rounded-[14px] ${
        fill ? 'grid h-full min-h-0 place-items-center' : 'flex justify-center'
      }`}
      style={fill ? undefined : { padding: WIDTH_INSET }}
    >
      {fill && (
        <div
          ref={boxRef}
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ inset: FILL_INSET }}
        />
      )}
      <div
        className="dp-share-pic relative overflow-hidden rounded-md"
        style={{
          width: Math.max(1, Math.round(canvas.width * zoom)),
          height: Math.max(1, Math.round(canvas.height * zoom)),
          visibility: visible ? 'visible' : 'hidden',
        }}
      >
        <DesignDataProvider {...data}>
          <DesignStage
            design={design}
            zoom={zoom || 0.01}
            nodeRef={stageRef}
            onMeasured={design.canvas.autoSize ? onMeasured : undefined}
          />
        </DesignDataProvider>
        {image && (
          // A data URL the browser already holds: next/image adds nothing.
          <img
            src={image.dataUrl}
            alt={alt}
            className="absolute inset-0 h-full w-full"
          />
        )}
        {updating && (
          <span
            aria-hidden="true"
            className="dp-share-busy absolute inset-x-0 top-0 h-[2px] overflow-hidden"
          >
            <i />
          </span>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {updating ? t('updating') : ''}
      </span>
      {hasFailed && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
          <button
            type="button"
            onClick={onRetry}
            className="dp-share-chip flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t('failedTryAgain')}
          </button>
        </div>
      )}
      {image && (
        <button
          type="button"
          onClick={onViewFullSize}
          aria-label={t('viewFullSize')}
          title={t('viewFullSize')}
          className="dp-share-corner absolute right-2 top-2 grid size-9 place-items-center rounded-[10px]"
        >
          <Maximize2 className="size-[17px]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SharePicture;
