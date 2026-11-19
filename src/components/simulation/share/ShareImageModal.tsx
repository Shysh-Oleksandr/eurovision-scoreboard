'use client';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  PencilLine,
  Share2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { ShareRowButton } from './controls';
import SharePicture, { ShareDataProps } from './SharePicture';
import { useShareExport } from './useShareExport';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { canCopyImages, copyImageFrom } from '@/graphics/export/imageActions';
import { DesignExportOptions } from '@/graphics/export/useDesignExport';
import { Design } from '@/graphics/model/design';
import { saveFile, shareFile } from '@/helpers/fileActions';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import { IS_NATIVE_APP } from '@/native/platform';
import { askForReviewSoon } from '@/native/review';

/** Options beside the picture from here; below it, folded, under it. */
const WIDE_QUERY = '(min-width: 1024px)';

const useMatchMedia = (query: string) => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
};

const useViewportHeight = () => {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  useEffect(() => {
    const update = () => setHeight(window.innerHeight);

    window.addEventListener('resize', update);

    return () => window.removeEventListener('resize', update);
  }, []);

  return height;
};

/** Web Share with files, decided once on the client. */
const useCanShareFiles = () => {
  const [canShare, setCanShare] = useState(IS_NATIVE_APP);

  useEffect(() => {
    if (IS_NATIVE_APP) return;
    try {
      setCanShare(
        !!navigator.canShare?.({
          files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })],
        }),
      );
    } catch {
      setCanShare(false);
    }
  }, []);

  return canShare;
};

export interface ShareImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** "Share results", "Share stats"… */
  title: string;
  /** What is shared (the stage's name). */
  caption?: string;
  overlayClassName?: string;
  design: Design;
  /** Changes when the rows behind the design change (not part of `design`). */
  contentKey: unknown;
  data: ShareDataProps;
  exportOptions: DesignExportOptions;
  onMeasured?: (size: { width: number; height: number }) => void;
  /** Always in view: first in the column, or right under the picture. */
  primaryOptions?: React.ReactNode;
  /** The rest of the column, or behind Customize under the picture. */
  moreOptions: React.ReactNode;
  /** Customize's second line: what it holds ("Text, countries, layout"). */
  customizeSummary: string;
  customizeOpen: boolean;
  onCustomizeOpenChange: (open: boolean) => void;
  onOpenEditor: () => void;
  /** File name for Save (website downloads, Android's Pictures folder). */
  saveFileName: () => string;
  share: { fileName: string; title: string; text?: string; url?: string };
}

/**
 * The share image modal (DESIGN.md "Share image modal"): the picture is the
 * screen. It opens on the finished image with Save as its one filled
 * button. On desktop the options sit in a column beside the picture; below
 * 1024px the picture comes first, then the primary options and a Customize
 * row that unfolds the rest while the picture stays pinned above it. There
 * is no Generate step: the image is made on opening, and again by Save,
 * Share or Copy when an edit has changed the picture since.
 */
const ShareImageModal: React.FC<ShareImageModalProps> = ({
  isOpen,
  onClose,
  title,
  caption,
  overlayClassName = '!z-[1001]',
  design,
  contentKey,
  data,
  exportOptions,
  onMeasured,
  primaryOptions,
  moreOptions,
  customizeSummary,
  customizeOpen,
  onCustomizeOpenChange,
  onOpenEditor,
  saveFileName,
  share,
}) => {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const isWide = useMatchMedia(WIDE_QUERY);
  const viewportHeight = useViewportHeight();
  const isTouchDevice = useTouchDevice();
  const canShare = useCanShareFiles();
  const [canCopy, setCanCopy] = useState(false);

  useEffect(() => {
    setCanCopy(!IS_NATIVE_APP && canCopyImages());
  }, []);

  const {
    stageRef,
    handleMeasured,
    canvas,
    stable,
    image,
    busy,
    hasFailed,
    retry,
    request,
    markEdited,
  } = useShareExport({
    design,
    contentKey,
    exportOptions,
    active: isOpen,
    onMeasured,
  });

  const [fullSize, setFullSize] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'preparing' | 'saved'>(
    'idle',
  );
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) setFullSize(false);
  }, [isOpen]);

  const handleSave = async () => {
    if (saveState === 'preparing') return;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (!image) setSaveState('preparing');
    const ready = await request();

    if (!ready) {
      setSaveState('idle');
      toast.error(t('saveFailed'));

      return;
    }
    try {
      const result = await saveFile(ready.dataUrl, saveFileName());

      if (result.kind === 'cancelled') {
        setSaveState('idle');

        return;
      }
      if (result.kind === 'saved') {
        toast.success(tc('savedTo', { folder: result.folder }));
      }
      askForReviewSoon('image-shared');
      // On iOS, Save opens the share sheet: what happened there is unknown.
      if (result.kind === 'shared') {
        setSaveState('idle');

        return;
      }
      setSaveState('saved');
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveState('idle');
      toast.error(t('saveFailed'));
    }
  };

  const handleShare = async () => {
    const wasReady = !!image;
    const ready = await request();

    if (!ready) {
      toast.error(t('shareFailed'));

      return;
    }
    try {
      const result = await shareFile({ data: ready.dataUrl, ...share });

      if (result === 'unsupported') toast.error(t('shareUnsupported'));
      if (result === 'shared') askForReviewSoon('image-shared');
    } catch (err) {
      // Browsers only open the share sheet straight from a tap; after
      // waiting for the export it may refuse. The image is ready now.
      if (!wasReady && (err as Error)?.name === 'NotAllowedError') {
        toast.info(t('shareTapAgain'));

        return;
      }
      console.error('Share failed:', err);
      toast.error(t('shareFailed'));
    }
  };

  const handleCopy = () =>
    copyImageFrom(async () => (await request())?.dataUrl ?? null, {
      copied: t('copied'),
      copyFailed: t('copyFailed'),
    });

  const editorRow = (
    <ShareRowButton
      icon={
        <PencilLine
          className="size-5 flex-none text-accent"
          aria-hidden="true"
        />
      }
      title={t('openInEditor')}
      sub={t('openInEditorSub')}
      trailing={
        <ChevronRight
          className="size-5 flex-none text-white/55"
          aria-hidden="true"
        />
      }
      onClick={onOpenEditor}
    />
  );

  const picture = (
    <SharePicture
      design={design}
      data={data}
      canvas={canvas}
      stable={stable}
      stageRef={stageRef}
      onMeasured={handleMeasured}
      image={image}
      busy={busy}
      hasFailed={hasFailed}
      onRetry={retry}
      onViewFullSize={() => setFullSize(true)}
      alt={share.title}
      fill={isWide}
      // Closed: everything fits the first screen. Open: the picture shrinks
      // and stays pinned while the options scroll under it.
      maxHeight={
        customizeOpen
          ? Math.max(150, Math.round(viewportHeight * 0.3))
          : Math.max(200, viewportHeight - 330)
      }
    />
  );

  const header = (
    <header className="flex items-center gap-3 py-3 pl-4 pr-3 2cols:py-3.5 2cols:pl-5 2cols:pr-4 text-white">
      <div className="min-w-0 flex-1 2cols:flex 2cols:items-baseline 2cols:gap-2.5">
        <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.024em] 2cols:text-[20px]">
          {title}
        </h2>
        {caption && (
          <p className="m-0 mt-0.5 truncate text-[12.5px] font-semibold text-white/70 2cols:mt-0 2cols:text-[15px]">
            {caption}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={tc('close')}
        className="dp-icon-btn grid size-10 flex-none place-items-center rounded-xl"
      >
        <X className="size-[18px]" aria-hidden="true" />
      </button>
    </header>
  );

  const scale = exportOptions.scale ?? 1;
  const fileInfo = stable
    ? `${exportOptions.format === 'png' ? 'PNG' : 'JPG'}, ${Math.round(
        canvas.width * scale,
      )} × ${Math.round(canvas.height * scale)}`
    : null;

  // The user's first edit ends the opening export (`useShareExport`); from
  // then on the image is made again only when Save, Share or Copy needs it.
  const edits = (options: React.ReactNode) => (
    <div
      className="contents"
      onClickCapture={markEdited}
      onInputCapture={markEdited}
    >
      {options}
    </div>
  );

  const saveLabel =
    saveState === 'saved'
      ? t('saved')
      : saveState === 'preparing'
      ? t('preparing')
      : t('saveImage');

  const footer = (
    <footer className="dp-surface-footer flex items-center gap-2 px-3 pt-2.5 pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5 2cols:py-3 text-white">
      {isWide && (
        <span className="mr-auto text-[13px] font-semibold text-white/55">
          {fileInfo}
        </span>
      )}
      {canCopy && !isTouchDevice && (
        <Button
          variant="surface"
          size="lg"
          className="justify-center"
          Icon={<Copy className="size-[18px]" aria-hidden="true" />}
          onClick={handleCopy}
        >
          {t('copyImage')}
        </Button>
      )}
      {canShare && (
        <Button
          variant="surface"
          size="lg"
          className="justify-center"
          Icon={<Share2 className="size-[18px]" aria-hidden="true" />}
          onClick={handleShare}
        >
          {tc('share')}
        </Button>
      )}
      <Button
        variant="cta"
        size="lg"
        className="flex-1 justify-center lg:min-w-[220px] lg:flex-none"
        disabled={saveState === 'preparing'}
        Icon={
          saveState === 'saved' ? (
            <Check className="size-[18px]" aria-hidden="true" />
          ) : (
            <Download className="size-[18px]" aria-hidden="true" />
          )
        }
        onClick={handleSave}
      >
        <span aria-live="polite">{saveLabel}</span>
      </Button>
    </footer>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        unstyledSurface
        fullScreenOnPhone
        withBlur
        overlayClassName={overlayClassName}
        containerClassName="dp-hub dp-share-surface !mx-0 !rounded-2xl 2cols:!w-[calc(100%-2.5rem)] 2cols:!max-w-[680px] lg:!max-w-[1240px]"
        contentClassName={`!p-0 narrow-scrollbar ${
          isWide
            ? 'lg:!h-[clamp(440px,calc(100dvh-210px),680px)] lg:!max-h-none lg:!overflow-hidden'
            : ''
        }`}
        topContent={header}
        bottomContent={footer}
      >
        {isWide ? (
          <div className="grid h-full grid-cols-[minmax(0,1fr)_336px] gap-5 px-5 pb-5 pt-1">
            {picture}
            <div className="narrow-scrollbar -mr-2 flex min-h-0 flex-col gap-[18px] overflow-y-auto pr-2">
              {edits(
                <>
                  {primaryOptions}
                  {moreOptions}
                </>,
              )}
              {editorRow}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-3 pb-4 2cols:px-5">
            <div className="sticky top-0 z-[3] -mx-3 bg-p-950 px-3 pb-1 pt-1 2cols:-mx-5 2cols:px-5">
              {picture}
            </div>
            {edits(primaryOptions)}
            <ShareRowButton
              title={t('customize')}
              sub={customizeSummary}
              ariaExpanded={customizeOpen}
              trailing={
                <ChevronDown
                  className={`size-5 flex-none text-white/70 transition-transform ${
                    customizeOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              }
              onClick={() => onCustomizeOpenChange(!customizeOpen)}
            />
            {customizeOpen && (
              <div className="flex flex-col gap-[18px] pt-1">
                {edits(moreOptions)}
                {editorRow}
              </div>
            )}
          </div>
        )}
      </Modal>
      {fullSize && image && (
        <FullSizeView
          src={image.dataUrl}
          width={canvas.width}
          alt={share.title}
          closeLabel={t('closeFullSize')}
          onClose={() => setFullSize(false)}
        />
      )}
    </>
  );
};

/** The image at its own size (1 design px per CSS px), scrollable. */
const FullSizeView = ({
  src,
  width,
  alt,
  closeLabel,
  onClose,
}: {
  src: string;
  width: number;
  alt: string;
  closeLabel: string;
  onClose: () => void;
}) => {
  useBackHandler(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', onKey, true);

    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="narrow-scrollbar fixed inset-0 z-[1200] overflow-auto overscroll-contain bg-black/85"
      onClick={onClose}
    >
      <div className="flex min-h-full w-max min-w-full items-center justify-center p-4 pt-[calc(var(--safe-top,0px)+64px)] pb-[calc(var(--safe-bottom,0px)+16px)]">
        <img
          src={src}
          alt={alt}
          style={{ width, maxWidth: 'none' }}
          className="block rounded-md"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="dp-icon-btn fixed right-3 top-[calc(var(--safe-top,0px)+12px)] grid size-10 place-items-center rounded-xl bg-p-950"
      >
        <X className="size-[18px]" aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
};

export default ShareImageModal;
