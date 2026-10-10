'use client';

import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { blockDisplayName } from './useBlockActions';

import { useBlockedUserIds, useBlockUserMutation } from '@/api/blocks';
import { REPORT_REASONS, ReportReason, useReportMutation } from '@/api/reports';
import { Checkbox } from '@/components/common/Checkbox';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import SignInButtons from '@/components/common/SignInButtons';
import { TextareaField } from '@/components/common/TextareaField';
import { cn } from '@/helpers/utils';
import {
  type ReportTarget,
  useReportDialogStore,
} from '@/state/reportDialogStore';
import { useAuthStore } from '@/state/useAuthStore';

const DETAILS_MAX_LENGTH = 500;

/**
 * Report a theme, contest, design, font or user: a reason, an optional note
 * and, for someone else's content, "Also block". One report per user and
 * target; the server answers a repeat with `alreadyReported`.
 */
const ReportModal: React.FC = () => {
  const t = useTranslations('moderation');
  const target = useReportDialogStore((s) => s.target);
  const close = useReportDialogStore((s) => s.close);
  const user = useAuthStore((s) => s.user);
  const blockedIds = useBlockedUserIds();
  const { mutateAsync: report, isPending: isReporting } = useReportMutation();
  const { mutateAsync: block, isPending: isBlocking } = useBlockUserMutation();

  // The last target stays rendered while the modal animates out.
  const [shown, setShown] = useState<ReportTarget | null>(target);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setReason('spam');
    setDetails('');
    setAlsoBlock(false);
  }, [target]);

  const isBusy = isReporting || isBlocking;
  const blockCandidate =
    shown?.type === 'profile'
      ? { _id: shown.id, name: shown.name }
      : shown?.creator;
  const canOfferBlock =
    !!user &&
    !!blockCandidate &&
    blockCandidate._id !== user._id &&
    !blockedIds.has(blockCandidate._id);

  const submit = async () => {
    if (!shown) return;
    try {
      const res = await report({
        targetType: shown.type,
        targetId: shown.id,
        reason,
        details: details.trim() || undefined,
      });

      toast.success(res.alreadyReported ? t('already') : t('thanks'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('failed'));

      return;
    }

    if (alsoBlock && canOfferBlock && blockCandidate) {
      const name = blockDisplayName(blockCandidate);

      try {
        await block(blockCandidate._id);
        toast.success(t('blocked', { name }));
      } catch {
        toast.error(t('blockFailed'));
      }
    }
    close();
  };

  return (
    <Modal
      isOpen={!!target}
      onClose={isBusy ? undefined : close}
      onClosed={() => setShown(null)}
      // Above every modal a report can be opened from (profiles sit at 1100-1102).
      overlayClassName="!z-[1110]"
      containerClassName="!w-[min(100%,480px)]"
      withBlur
      bottomContent={
        user ? (
          <ModalBottomContent
            onClose={close}
            onSave={submit}
            isSaving={isBusy}
            saveButtonText={t('send')}
            saveButtonIcon={<Flag className="size-[18px]" />}
          />
        ) : (
          <ModalBottomCloseButton onClose={close} />
        )
      }
    >
      {shown && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex-none flex items-center justify-center size-11 rounded-full bg-red-500/15 text-red-300">
              <Flag className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-bold leading-tight break-words">
                {shown.type === 'profile'
                  ? t('reportUserTitle', { name: shown.name })
                  : t('reportTitle', { name: shown.name })}
              </h3>
              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                {t('reportBody')}
              </p>
            </div>
          </div>

          {user ? (
            <>
              <div
                role="radiogroup"
                aria-label={t('reason')}
                className="grid gap-2"
              >
                {REPORT_REASONS.map((value) => {
                  const selected = reason === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setReason(value)}
                      className={cn(
                        'flex items-center gap-3 w-full text-left rounded-xl border px-3.5 py-3 text-[14px] font-semibold transition-colors',
                        selected
                          ? 'border-white/60 bg-white/[0.1] text-white'
                          : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex-none flex items-center justify-center size-[18px] rounded-full border-2',
                          selected ? 'border-white' : 'border-white/40',
                        )}
                      >
                        {selected && (
                          <span className="size-2 rounded-full bg-white" />
                        )}
                      </span>
                      {t(`reasons.${value}`)}
                    </button>
                  );
                })}
              </div>

              <TextareaField
                id="report-details"
                label={t('details')}
                placeholder={t('detailsPlaceholder')}
                rows={3}
                textareaProps={{
                  value: details,
                  maxLength: DETAILS_MAX_LENGTH,
                  onChange: (e) => setDetails(e.target.value),
                }}
              />

              {canOfferBlock && blockCandidate && (
                <Checkbox
                  id="report-also-block"
                  label={t('alsoBlock', {
                    name: blockDisplayName(blockCandidate),
                  })}
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-white/80 text-center">{t('signInToReport')}</p>
              <SignInButtons size="md" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ReportModal;
