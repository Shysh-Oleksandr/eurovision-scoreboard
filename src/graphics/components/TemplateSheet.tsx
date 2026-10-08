'use client';
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  Download,
  Image as ImageIcon,
  Link2,
  PencilLine,
  RotateCcw,
  Share2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ExportEngine, exportNode } from '../export/exportNode';
import {
  copyImage,
  downloadImage,
  ImageActionMessages,
  shareImage,
  slugify,
} from '../export/imageActions';
import { Design } from '../model/design';
import { newElementId } from '../model/serialize';
import { DesignDataProvider, useDesignData } from '../render/DesignDataContext';
import { DesignStage } from '../render/DesignStage';
import {
  TemplateSheetRequest,
  useGraphicsStudioStore,
} from '../state/graphicsStudioStore';
import { applyTemplateField, resolveTemplateFields } from '../templates/fields';

import TemplateFieldsForm from './TemplateFieldsForm';

import { useReportDesignDuplicateMutation } from '@/api/designs';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import UserInfo from '@/components/common/UserInfo';
import { IconButton } from '@/graphics/editor/ui/controls';
import { useThemeName } from '@/graphics/editor/useEditorContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuthStore } from '@/state/useAuthStore';

import '@/graphics/editor/editor.css';

type Result =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; dataUrl: string; width: number; height: number }
  | { kind: 'failed' };

const SCALE = 2;

/** Fits the stage to its box; the node it renders is what gets exported. */
const Preview: React.FC<{
  design: Design;
  nodeRef: React.MutableRefObject<HTMLDivElement | null>;
  onMeasured: (size: { width: number; height: number }) => void;
}> = ({ design, nodeRef, onMeasured }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const { autoSize } = design.canvas;
  const w = autoSize && measured ? measured.width : design.canvas.width;
  const h = autoSize && measured ? measured.height : design.canvas.height;

  useEffect(() => {
    const el = boxRef.current;

    if (!el) return undefined;
    const fit = () => {
      const bw = el.clientWidth - 36;
      const bh = el.clientHeight - 36;

      if (bw > 0 && bh > 0) setZoom(Math.min(bw / w, bh / h, 1));
    };
    const ro = new ResizeObserver(fit);

    ro.observe(el);
    fit();

    return () => ro.disconnect();
  }, [w, h]);

  const handleMeasured = useCallback(
    (size: { width: number; height: number }) => {
      setMeasured((prev) =>
        prev && prev.width === size.width && prev.height === size.height
          ? prev
          : size,
      );
      onMeasured(size);
    },
    [onMeasured],
  );

  return (
    <div className="gfx-pv-box" ref={boxRef}>
      <div className="gfx-pv-canvas">
        <DesignStage
          design={design}
          zoom={zoom}
          nodeRef={nodeRef}
          onMeasured={autoSize ? handleMeasured : undefined}
        />
      </div>
    </div>
  );
};

const InaccessibleNote: React.FC<{ onManual: () => void }> = ({ onManual }) => {
  const t = useTranslations('graphics.sheet');
  const { inaccessible } = useDesignData();

  if (!inaccessible) return null;

  return (
    <div className="gfx-note gfx-note--warn gfx-note--wide" role="status">
      <span className="gfx-note-ic">
        <AlertTriangle className="size-4" />
      </span>
      <span className="gfx-note-body">
        <b>{t('inaccessible', { name: inaccessible.contestName })}</b>{' '}
        {t('showingLive')}{' '}
        <button type="button" className="gfx-link" onClick={onManual}>
          {t('useManual')}
        </button>
      </span>
    </div>
  );
};

interface Props {
  request: TemplateSheetRequest;
  onClose: () => void;
}

/**
 * The design sheet (handoff §3): a design's fillable fields (if any) as a
 * short form, the live preview, Generate → result card, and "Open in
 * editor" — a remix for someone else's design, a local copy that keeps the
 * cloud id for your own. Rendered above the Graphics modal; also the
 * landing for `?design=` links.
 */
const TemplateSheet: React.FC<Props> = ({ request, onClose }) => {
  const t = useTranslations('graphics.sheet');
  const tx = useTranslations('graphics.export');
  const tg = useTranslations('graphics.gallery');
  const phone = !useMediaQuery('(min-width: 576px)');
  const user = useAuthStore((s) => s.user);
  const openEditor = useGraphicsStudioStore((s) => s.openEditor);
  const setGalleryOpen = useGraphicsStudioStore((s) => s.setGraphicsModalOpen);
  const { mutate: reportDuplicate } = useReportDesignDuplicateMutation();
  // The form edits a map of field values; the design shown is always the
  // template with those values applied in order, so re-fitting the canvas
  // size never compounds (every change re-derives from the original).
  const [values, setValues] = useState<Map<string, unknown>>(new Map());
  const design = useMemo(() => {
    let out = request.design;

    values.forEach((value, path) => {
      out = applyTemplateField(out, path, value);
    });

    return out;
  }, [request.design, values]);
  const setField = useCallback((path: string, value: unknown) => {
    setValues((prev) => new Map(prev).set(path, value));
  }, []);
  const baseManualRows =
    request.design.data.source === 'manual' ? request.design.data : null;
  const themeName = useThemeName(design);
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const measuredRef = useRef<{ width: number; height: number } | null>(null);
  const engineRef = useRef<ExportEngine>('snapdom');
  const busyRef = useRef(false);

  useEffect(() => {
    setValues(new Map());
    setResult({ kind: 'idle' });
  }, [request]);

  const fields = useMemo(() => resolveTemplateFields(design), [design]);
  const { source } = request;
  const cloud = source.kind === 'cloud' ? source.record : null;
  const title =
    source.kind === 'builtin'
      ? tg(`templates.${source.templateId}.name`)
      : cloud?.name ?? design.name;

  const generate = useCallback(
    async (engine?: ExportEngine) => {
      const node = nodeRef.current;

      if (!node || busyRef.current) return;
      if (engine) engineRef.current = engine;
      busyRef.current = true;
      setResult({ kind: 'busy' });
      const width = design.canvas.autoSize
        ? measuredRef.current?.width ?? node.offsetWidth
        : design.canvas.width;
      const height = design.canvas.autoSize
        ? measuredRef.current?.height ?? node.offsetHeight
        : design.canvas.height;

      try {
        const out = await exportNode(node, {
          width,
          height,
          scale: SCALE,
          format: 'png',
          engine: engineRef.current,
        });

        setResult({
          kind: 'done',
          dataUrl: out.dataUrl,
          width: width * SCALE,
          height: height * SCALE,
        });
      } catch (err) {
        console.error('Template export failed', err);
        setResult({ kind: 'failed' });
      } finally {
        busyRef.current = false;
      }
    },
    [design.canvas],
  );

  // Bring the fresh result (image + download actions) into view — once the
  // image has decoded, so the scroll height already includes it.
  useEffect(() => {
    if (result.kind !== 'done') return undefined;
    const section = resultRef.current;
    const body = section?.closest<HTMLElement>('.gfx-tsheet-body');
    const img = section?.querySelector('img');

    if (!body) return undefined;
    const scroll = () =>
      body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });

    if (img && !img.complete) {
      img.addEventListener('load', scroll, { once: true });

      return () => img.removeEventListener('load', scroll);
    }
    scroll();

    return undefined;
  }, [result]);

  const messages: ImageActionMessages = useMemo(
    () => ({
      downloaded: (name) => tx('toast.downloaded', { name }),
      copied: tx('toast.copied'),
      copyFailed: tx('toast.copyFailed'),
      shareUnsupported: tx('toast.shareUnsupported'),
      shareFailed: tx('toast.shareFailed'),
    }),
    [tx],
  );
  const fileName = `${slugify(design.name || title)}.png`;

  const ownCloud = !!cloud && !!user && cloud.userId === user._id;

  const openInEditor = () => {
    // Your own published design: a local copy that still points at the
    // cloud record, so Publish updates it. Anyone else's: a remix.
    const editable: Design = ownCloud
      ? { ...design, id: newElementId('design'), name: cloud!.name }
      : {
          ...design,
          id: newElementId('design'),
          name: cloud ? cloud.name : design.name,
          templateFields: undefined,
          remixedFrom: cloud
            ? {
                designId: cloud._id,
                name: cloud.name,
                username: cloud.creator?.username,
              }
            : design.remixedFrom,
        };

    if (cloud && !ownCloud && user) reportDuplicate(cloud._id);
    onClose();
    openEditor({
      design: editable,
      draftId: null,
      cloudId: ownCloud ? cloud!._id : null,
    });
  };

  const backToExplore = () => {
    onClose();
    setGalleryOpen(true, 'explore');
  };

  const editorButton = (
    <Button
      variant="surface"
      size="md"
      Icon={<PencilLine className="size-4" />}
      onClick={openInEditor}
    >
      {t('openInEditor')}
    </Button>
  );

  const header = (
    <div className="gfx-tsheet-h">
      <div className="gfx-tsheet-ht">
        <button type="button" className="gfx-back" onClick={backToExplore}>
          <ChevronLeft className="size-4" />
          {t('explore')}
        </button>
        <div className="gfx-tsheet-tl">
          <h2>{title}</h2>
          {!cloud && (
            <span className="gfx-chip gfx-chip--built">
              <Sparkles className="size-[13px]" />
              {tg('builtIn')}
            </span>
          )}
        </div>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <X className="size-[18px]" />
      </IconButton>
    </div>
  );

  // The creator scrolls with the body so the pinned header stays short.
  const byline = cloud ? (
    <div className="gfx-tsheet-by">
      <UserInfo user={cloud.creator} size="sm" />
      {cloud.remixedFromName && (
        <span className="gfx-remix">
          <Link2 className="size-3" />
          {t('remixedFrom', { name: cloud.remixedFromName })}
        </span>
      )}
    </div>
  ) : null;

  const resultCard =
    result.kind === 'failed' ? (
      <section className="gfx-res gfx-res--err" role="alert">
        <span className="gfx-dlg-ic is-warn">
          <AlertTriangle className="size-5" />
        </span>
        <div className="gfx-res-err-t">
          <b>{tx('failed.title')}</b>
          <span>{tx('failed.body')}</span>
        </div>
        <div className="gfx-dlg-row">
          <Button
            variant="surface"
            size="md"
            Icon={<RotateCcw className="size-4" />}
            onClick={() => generate()}
          >
            {tx('failed.tryAgain')}
          </Button>
          <Button
            variant="surface"
            size="md"
            Icon={<Wand2 className="size-4" />}
            onClick={() =>
              generate(
                engineRef.current === 'snapdom' ? 'html-to-image' : 'snapdom',
              )
            }
          >
            {tx('failed.otherEngine')}
          </Button>
        </div>
      </section>
    ) : result.kind === 'busy' ? (
      <section className="gfx-res gfx-res--busy" aria-busy="true">
        <span className="gfx-spin" />
        <span>{tx('generating')}</span>
      </section>
    ) : result.kind === 'done' ? (
      <section className="gfx-res" ref={resultRef} aria-labelledby="gfx-res-h">
        <div className="gfx-res-h">
          <h3 id="gfx-res-h">{t('result')}</h3>
          <span className="gfx-chip">
            {result.width} × {result.height} · PNG · {SCALE}×
          </span>
        </div>
        <div className="gfx-res-img">
          <img src={result.dataUrl} alt={tx('generatedAlt')} />
        </div>
        <div className="gfx-res-a">
          <Button
            variant="cta"
            size="lg"
            className="flex-1 justify-center"
            Icon={<Download className="size-[18px]" />}
            onClick={() => downloadImage(result.dataUrl, fileName, messages)}
          >
            {tx('downloadImage')}
          </Button>
          <Button
            variant="surface"
            size="lg"
            title={tx('share')}
            Icon={<Share2 className="size-[18px]" />}
            onClick={() =>
              shareImage(result.dataUrl, fileName, title, messages)
            }
          />
          <Button
            variant="surface"
            size="lg"
            title={tx('copyImage')}
            Icon={<Copy className="size-[18px]" />}
            onClick={() => copyImage(result.dataUrl, messages)}
          />
        </div>
      </section>
    ) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      // Fills the viewport height (minus a gutter); the body scrolls between
      // the header and footer and the preview grows into any spare room.
      containerClassName="!w-[min(100%,1040px)] 2cols:flex 2cols:flex-col 2cols:h-[calc(100dvh-48px)]"
      fullScreenOnPhone
      contentClassName="text-white gfx-tsheet-body 2cols:flex-1 2cols:min-h-0 2cols:!h-auto 2cols:!max-h-none md:!max-h-none"
      overlayClassName="!z-[1003]"
      topContent={header}
      bottomContent={
        <div className="gfx-tsheet-foot">
          <button type="button" className="gfx-dlg-cancel" onClick={onClose}>
            {t('close')}
          </button>
          {!phone && editorButton}
          <Button
            variant="cta"
            size="lg"
            className="flex-1 justify-center"
            disabled={result.kind === 'busy'}
            Icon={
              result.kind === 'done' ? (
                <RotateCcw className="size-[18px]" />
              ) : (
                <ImageIcon className="size-[18px]" />
              )
            }
            onClick={() => generate()}
          >
            {result.kind === 'done' ? t('generateAgain') : t('generate')}
          </Button>
        </div>
      }
    >
      <DesignDataProvider binding={design.data}>
        <div className="gfx-tsheet gfx-gallery">
          {byline}
          <InaccessibleNote
            onManual={() =>
              setField('data', baseManualRows ?? { source: 'manual', rows: [] })
            }
          />
          {fields.length > 0 && (
            <section className="gfx-tsheet-sec">
              <div className="gfx-sec-title">
                <h3>{t('fields')}</h3>
                <span>{t('nFields', { count: fields.length })}</span>
              </div>
              <TemplateFieldsForm
                design={design}
                onField={setField}
                manualRows={baseManualRows}
              />
            </section>
          )}
          <section className="gfx-tsheet-sec gfx-tsheet-sec--pv">
            <div className="gfx-sec-title">
              <h3>{t('preview')}</h3>
              <span>
                {design.canvas.autoSize
                  ? t('sizedToTable')
                  : `${design.canvas.width} × ${design.canvas.height}`}
                {' · '}
                {t('theme', { name: themeName })}
              </span>
              {phone && editorButton}
            </div>
            <Preview
              design={design}
              nodeRef={nodeRef}
              onMeasured={(size) => {
                measuredRef.current = size;
              }}
            />
          </section>
          {resultCard}
          <span className="sr-only" aria-live="polite">
            {result.kind === 'done' ? tx('generated') : ''}
          </span>
        </div>
      </DesignDataProvider>
    </Modal>
  );
};

export default TemplateSheet;
