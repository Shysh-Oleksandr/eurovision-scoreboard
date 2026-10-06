'use client';
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import {
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
  useReportMutation,
} from '@/api/reports';
import Button from '@/components/common/Button';
import { Dialog } from '@/graphics/editor/chrome/EditorDialogs';
import { Field, SelectInput, TextArea } from '@/graphics/editor/ui/controls';

interface Props {
  target: { type: ReportTargetType; id: string; name: string } | null;
  onClose: () => void;
}

/** "Report this template": a reason and an optional note (one per user). */
const ReportDialog: React.FC<Props> = ({ target, onClose }) => {
  const t = useTranslations('graphics.dialogs.report');
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const { mutateAsync, isPending } = useReportMutation();

  useEffect(() => {
    if (target) {
      setReason('spam');
      setDetails('');
    }
  }, [target]);

  if (!target) return null;

  const submit = async () => {
    try {
      const res = await mutateAsync({
        targetType: target.type,
        targetId: target.id,
        reason,
        details: details.trim() || undefined,
      });

      toast.success(res.alreadyReported ? t('already') : t('thanks'));
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('failed'));
    }
  };

  return (
    <Dialog onClose={isPending ? undefined : onClose} ariaLabelledBy="gfx-rp">
      <span className="gfx-dlg-ic is-warn">
        <Flag className="size-6" />
      </span>
      <h3 id="gfx-rp">{t('title', { name: target.name })}</h3>
      <p>{t('body')}</p>
      <div className="gfx-prompt-form">
        <Field label={t('reason')}>
          <SelectInput<ReportReason>
            value={reason}
            options={REPORT_REASONS.map((r) => ({
              value: r,
              label: t(`reasons.${r}`),
            }))}
            onChange={setReason}
            ariaLabel={t('reason')}
          />
        </Field>
        <Field label={t('details')}>
          <TextArea
            rows={3}
            value={details}
            maxLength={500}
            placeholder={t('detailsPlaceholder')}
            onValue={setDetails}
          />
        </Field>
        <div className="gfx-dlg-row">
          <Button
            variant="cta"
            size="md"
            isLoading={isPending}
            onClick={submit}
          >
            {t('send')}
          </Button>
          <Button variant="surface" size="md" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ReportDialog;
