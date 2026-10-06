'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { ExportEngine, exportNode } from '../export/exportNode';

import { ExportFormat, ExportScale, useEditorStore } from './editorStore';

export interface ExportResultState {
  dataUrl: string;
  width: number;
  height: number;
  format: ExportFormat;
  scale: ExportScale;
}

export type ExportStatus =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; result: ExportResultState }
  | { kind: 'failed'; engine: ExportEngine };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design';

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> =>
  (await fetch(dataUrl)).blob();

/**
 * Export the stage node at design size × scale. One deterministic pass; on
 * failure the user can retry or switch to the other engine (`exportNode`
 * already falls back to html-to-image when snapdom throws). Download, Web
 * Share and clipboard copy of the last result.
 */
export function useEditorExport(
  designNodeRef: React.RefObject<HTMLDivElement | null>,
) {
  const t = useTranslations('graphics.export');
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle' });
  const engineRef = useRef<ExportEngine>('snapdom');
  const busyRef = useRef(false);

  const run = useCallback(
    async (engine?: ExportEngine) => {
      const node = designNodeRef.current;
      const { design, exportFormat, exportScale } = useEditorStore.getState();

      if (!node || busyRef.current) return;
      if (engine) engineRef.current = engine;
      busyRef.current = true;
      setStatus({ kind: 'busy' });
      try {
        const result = await exportNode(node, {
          width: design.canvas.width,
          height: design.canvas.height,
          scale: exportScale,
          format: exportFormat,
          quality: 0.92,
          engine: engineRef.current,
        });

        if (process.env.NODE_ENV === 'development' && result.warnings.length) {
          // eslint-disable-next-line no-console
          console.warn(
            `[graphics] export via ${
              result.engine
            }, ${result.durationMs.toFixed(0)} ms:\n${result.warnings.join(
              '\n',
            )}`,
          );
        }
        setStatus({
          kind: 'done',
          result: {
            dataUrl: result.dataUrl,
            width: design.canvas.width * exportScale,
            height: design.canvas.height * exportScale,
            format: exportFormat,
            scale: exportScale,
          },
        });
      } catch (error) {
        console.error('Failed to export design.', error);
        setStatus({ kind: 'failed', engine: engineRef.current });
      } finally {
        busyRef.current = false;
      }
    },
    [designNodeRef],
  );

  const retryOtherEngine = useCallback(
    () => run(engineRef.current === 'snapdom' ? 'html-to-image' : 'snapdom'),
    [run],
  );

  const close = useCallback(() => setStatus({ kind: 'idle' }), []);

  const fileName = useCallback(
    (result: ExportResultState) =>
      `${slug(useEditorStore.getState().design.name)}.${
        result.format === 'jpeg' ? 'jpg' : 'png'
      }`,
    [],
  );

  const download = useCallback(
    (result: ExportResultState) => {
      const link = document.createElement('a');
      const name = fileName(result);

      link.download = name;
      link.href = result.dataUrl;
      link.click();
      toast.success(t('toast.downloaded', { name }));
    },
    [fileName, t],
  );

  const share = useCallback(
    async (result: ExportResultState) => {
      try {
        const blob = await dataUrlToBlob(result.dataUrl);
        const file = new File([blob], fileName(result), {
          type: blob.type || 'image/png',
        });
        const shareData = {
          title: useEditorStore.getState().design.name,
          files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          toast.error(t('toast.shareUnsupported'));
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Share failed:', err);
          toast.error(t('toast.shareFailed'));
        }
      }
    },
    [fileName, t],
  );

  const copy = useCallback(
    async (result: ExportResultState) => {
      try {
        if (
          typeof ClipboardItem === 'undefined' ||
          !navigator.clipboard?.write
        ) {
          throw new Error('clipboard-unsupported');
        }
        let blob = await dataUrlToBlob(result.dataUrl);

        // Clipboards accept PNG only: re-encode JPEG exports.
        if (blob.type !== 'image/png') {
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');

          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
          blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('encode'))),
              'image/png',
            ),
          );
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success(t('toast.copied'));
      } catch (err) {
        console.error('Copy failed:', err);
        toast.error(t('toast.copyFailed'));
      }
    },
    [t],
  );

  return { status, run, retryOtherEngine, close, download, share, copy };
}
