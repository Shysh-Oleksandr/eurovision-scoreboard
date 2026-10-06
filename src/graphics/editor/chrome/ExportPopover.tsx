'use client';
import { Copy, Download, Share2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef } from 'react';

import { ExportFormat, ExportScale, useEditorStore } from '../editorStore';
import { Field, Hint, IconButton, Seg } from '../ui/controls';

import Button from '@/components/common/Button';

interface Props {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onExport: (then: 'download' | 'share' | 'copy') => void;
}

/** Format / scale / size estimate, anchored under the Export button (§4). */
const ExportPopover: React.FC<Props> = ({ anchorRef, onExport }) => {
  const t = useTranslations('graphics.export');
  const open = useEditorStore((s) => s.exportOpen);
  const format = useEditorStore((s) => s.exportFormat);
  const scale = useEditorStore((s) => s.exportScale);
  const canvas = useEditorStore((s) => s.design.canvas);
  const setExport = useEditorStore((s) => s.setExport);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;

      if (ref.current?.contains(target) || anchorRef.current?.contains(target))
        return;
      setExport({ open: false });
    };

    document.addEventListener('pointerdown', onDown, true);

    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, anchorRef, setExport]);

  if (!open) return null;
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const mb =
    Math.round(((w * h) / 1e6) * (format === 'png' ? 1.4 : 0.35) * 10) / 10;

  return (
    <div ref={ref} className="gfx-pop" role="dialog" aria-label={t('title')}>
      <div className="gfx-pop-h">
        <h3>{t('title')}</h3>
        <IconButton
          size="xs"
          label={t('close')}
          onClick={() => setExport({ open: false })}
        >
          <X className="size-[13px]" />
        </IconButton>
      </div>
      <Field label={t('format')}>
        <Seg<ExportFormat>
          value={format}
          onChange={(f) => setExport({ format: f })}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'jpeg', label: 'JPEG' },
          ]}
        />
      </Field>
      <Field label={t('scale')}>
        <Seg<ExportScale>
          value={scale}
          onChange={(s) => setExport({ scale: s })}
          options={[
            { value: 1, label: '1×' },
            { value: 2, label: '2×' },
            { value: 3, label: '3×' },
          ]}
        />
      </Field>
      <Hint>{t('estimate', { w, h, mb })}</Hint>
      <div className="gfx-pop-a">
        <Button
          variant="cta"
          size="md"
          className="w-full justify-center"
          Icon={<Download className="size-4" />}
          onClick={() => onExport('download')}
        >
          {t('download')}
        </Button>
        <div className="gfx-f2">
          <Button
            variant="surface"
            size="sm"
            className="justify-center"
            Icon={<Share2 className="size-[15px]" />}
            onClick={() => onExport('share')}
          >
            {t('share')}
          </Button>
          <Button
            variant="surface"
            size="sm"
            className="justify-center"
            Icon={<Copy className="size-[15px]" />}
            onClick={() => onExport('copy')}
          >
            {t('copy')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportPopover;
