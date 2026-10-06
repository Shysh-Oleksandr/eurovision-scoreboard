'use client';
import {
  AlertTriangle,
  Copy,
  Download,
  List,
  Lock,
  LogIn,
  RotateCcw,
  Share2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';

import { formatBytes } from '../../assets/localAssets';
import { MAX_IMAGE_BYTES } from '../../model/presets';
import { IconButton } from '../ui/controls';
import { ExportResultState, ExportStatus } from '../useEditorExport';

import Button from '@/components/common/Button';
import { cn } from '@/helpers/utils';
import { useAuthStore } from '@/state/useAuthStore';

/** Scrim + card; Escape and scrim clicks close it (unless `locked`). */
export const Dialog: React.FC<{
  onClose?: () => void;
  wide?: boolean;
  busy?: boolean;
  ariaLabelledBy?: string;
  role?: 'dialog' | 'alertdialog' | 'status';
  children: React.ReactNode;
}> = ({ onClose, wide, busy, ariaLabelledBy, role = 'dialog', children }) => {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', onKey, true);

    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="gfx-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn('gfx-dlg', wide && 'is-wide', busy && 'is-busy')}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-busy={busy}
      >
        {children}
      </div>
    </div>
  );
};

interface ExportDialogProps {
  status: ExportStatus;
  onClose: () => void;
  onRetry: () => void;
  onOtherEngine: () => void;
  onDownload: (r: ExportResultState) => void;
  onShare: (r: ExportResultState) => void;
  onCopy: (r: ExportResultState) => void;
}

/** Busy → result (preview + Download / Share / Copy) → or the failure copy. */
export const ExportDialog: React.FC<ExportDialogProps> = ({
  status,
  onClose,
  onRetry,
  onOtherEngine,
  onDownload,
  onShare,
  onCopy,
}) => {
  const t = useTranslations('graphics.export');

  if (status.kind === 'idle') return null;

  if (status.kind === 'busy') {
    return (
      <Dialog busy role="status">
        <span className="gfx-spin" />
        <p>{t('generating')}</p>
      </Dialog>
    );
  }

  if (status.kind === 'failed') {
    return (
      <Dialog onClose={onClose} role="alertdialog" ariaLabelledBy="gfx-xt">
        <span className="gfx-dlg-ic is-warn">
          <AlertTriangle className="size-6" />
        </span>
        <h3 id="gfx-xt">{t('failed.title')}</h3>
        <p>{t('failed.body')}</p>
        <div className="gfx-dlg-row">
          <Button
            variant="cta"
            size="md"
            Icon={<RotateCcw className="size-[15px]" />}
            onClick={onRetry}
          >
            {t('failed.tryAgain')}
          </Button>
          <Button
            variant="surface"
            size="md"
            Icon={<Wand2 className="size-[15px]" />}
            onClick={onOtherEngine}
          >
            {t('failed.otherEngine')}
          </Button>
        </div>
        <button type="button" className="gfx-dlg-cancel" onClick={onClose}>
          {t('cancel')}
        </button>
      </Dialog>
    );
  }

  const { result } = status;

  return (
    <Dialog onClose={onClose} wide ariaLabelledBy="gfx-xt">
      <div className="gfx-dlg-h">
        <h3 id="gfx-xt">{t('generated')}</h3>
        <span className="gfx-chip">
          {result.width} × {result.height} · {result.format.toUpperCase()} ·{' '}
          {result.scale}×
        </span>
        <IconButton size="sm" label={t('close')} onClick={onClose}>
          <X className="size-[15px]" />
        </IconButton>
      </div>
      <div className="gfx-res-img">
        <img src={result.dataUrl} alt={t('generatedAlt')} />
      </div>
      <div className="gfx-res-a">
        <Button
          variant="cta"
          size="lg"
          className="flex-1 justify-center"
          Icon={<Download className="size-[18px]" />}
          onClick={() => onDownload(result)}
        >
          {t('downloadImage')}
        </Button>
        <Button
          variant="surface"
          size="lg"
          title={t('share')}
          Icon={<Share2 className="size-[18px]" />}
          onClick={() => onShare(result)}
        />
        <Button
          variant="surface"
          size="lg"
          title={t('copyImage')}
          Icon={<Copy className="size-[18px]" />}
          onClick={() => onCopy(result)}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {t('generated')}
      </span>
    </Dialog>
  );
};

export const TooLargeDialog: React.FC<{
  info: { fileName: string; size: number } | null;
  onChooseAnother: () => void;
  onClose: () => void;
}> = ({ info, onChooseAnother, onClose }) => {
  const t = useTranslations('graphics.dialogs.tooLarge');

  if (!info) return null;

  return (
    <Dialog onClose={onClose} role="alertdialog" ariaLabelledBy="gfx-tl">
      <span className="gfx-dlg-ic is-warn">
        <AlertTriangle className="size-6" />
      </span>
      <h3 id="gfx-tl">{t('title')}</h3>
      <p>
        {t('body', {
          name: info.fileName,
          size: formatBytes(info.size),
          max: formatBytes(MAX_IMAGE_BYTES),
        })}
      </p>
      <div className="gfx-dlg-row">
        <Button
          variant="cta"
          size="md"
          Icon={<Upload className="size-[15px]" />}
          onClick={onChooseAnother}
        >
          {t('chooseAnother')}
        </Button>
        <Button variant="surface" size="md" onClick={onClose}>
          {t('cancel')}
        </Button>
      </div>
    </Dialog>
  );
};

export const UnsavedDialog: React.FC<{
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}> = ({ open, onSave, onDiscard, onCancel }) => {
  const t = useTranslations('graphics.dialogs.unsaved');

  if (!open) return null;

  return (
    <Dialog onClose={onCancel} role="alertdialog" ariaLabelledBy="gfx-us">
      <span className="gfx-dlg-ic is-warn">
        <AlertTriangle className="size-6" />
      </span>
      <h3 id="gfx-us">{t('title')}</h3>
      <p>{t('body')}</p>
      <div className="gfx-dlg-row">
        <Button variant="cta" size="md" onClick={onSave}>
          {t('save')}
        </Button>
        <Button variant="surface" size="md" onClick={onDiscard}>
          {t('discard')}
        </Button>
      </div>
      <button type="button" className="gfx-dlg-cancel" onClick={onCancel}>
        {t('cancel')}
      </button>
    </Dialog>
  );
};

/** "Sign in to publish templates" (handoff §9); `Sign in` starts Google OAuth. */
export const SignInDialog: React.FC<{
  reason: 'publish' | 'cloud' | null;
  onClose: () => void;
}> = ({ reason, onClose }) => {
  const t = useTranslations('graphics.dialogs.signIn');
  const login = useAuthStore((s) => s.login);

  if (!reason) return null;

  return (
    <Dialog onClose={onClose} role="alertdialog" ariaLabelledBy="gfx-si">
      <span className="gfx-dlg-ic">
        <LogIn className="size-6" />
      </span>
      <h3 id="gfx-si">
        {t(reason === 'publish' ? 'titlePublish' : 'titleCloud')}
      </h3>
      <p>{t(reason === 'publish' ? 'bodyPublish' : 'bodyCloud')}</p>
      <div className="gfx-dlg-row">
        <Button
          variant="cta"
          size="md"
          Icon={<LogIn className="size-[15px]" />}
          onClick={login}
        >
          {t('signIn')}
        </Button>
        <Button variant="surface" size="md" onClick={onClose}>
          {t('keepLocal')}
        </Button>
      </div>
    </Dialog>
  );
};

/**
 * "This design uses a contest you can't open" (handoff §9): the rows already
 * fell back to live; the user picks live for good or a manual list.
 */
export const ContestAccessDialog: React.FC<{
  contestName: string | null;
  onUseLive: () => void;
  onUseManual: () => void;
}> = ({ contestName, onUseLive, onUseManual }) => {
  const t = useTranslations('graphics.dialogs.noAccess');

  if (contestName === null) return null;

  return (
    <Dialog onClose={onUseLive} role="alertdialog" ariaLabelledBy="gfx-na">
      <span className="gfx-dlg-ic is-warn">
        <Lock className="size-6" />
      </span>
      <h3 id="gfx-na">{t('title')}</h3>
      <p>{t('body', { name: contestName || t('thisContest') })}</p>
      <div className="gfx-dlg-row">
        <Button variant="cta" size="md" onClick={onUseLive}>
          {t('useLive')}
        </Button>
        <Button
          variant="surface"
          size="md"
          Icon={<List className="size-[15px]" />}
          onClick={onUseManual}
        >
          {t('useManual')}
        </Button>
      </div>
    </Dialog>
  );
};
