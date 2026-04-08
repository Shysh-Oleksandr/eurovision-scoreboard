'use client';

import { Download, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { toast } from 'react-toastify';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { useConfirmation } from '@/hooks/useConfirmation';
import type {
  DetailedVotingPreset,
  TotalsVotingPreset,
} from '@/state/votingPresetsStore';
import { useVotingPresetsStore } from '@/state/votingPresetsStore';

type PresetKind = 'detailed' | 'totals';

type VotingPresetRow = DetailedVotingPreset | TotalsVotingPreset;

type LoadVotingPresetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  presetKind: PresetKind;
  onLoad: (preset: VotingPresetRow) => void;
  onEdit: (preset: VotingPresetRow) => void;
};

export const LoadVotingPresetModal: React.FC<LoadVotingPresetModalProps> = ({
  isOpen,
  onClose,
  presetKind,
  onLoad,
  onEdit,
}) => {
  const t = useTranslations('setup.votingPredefinition.presets');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { confirm } = useConfirmation();

  const detailedList = useVotingPresetsStore((s) => s.detailedPresets);
  const totalsList = useVotingPresetsStore((s) => s.totalsPresets);
  const deleteDetailed = useVotingPresetsStore((s) => s.deleteDetailedPreset);
  const deleteTotals = useVotingPresetsStore((s) => s.deleteTotalsPreset);

  const presets = useMemo(() => {
    const raw = presetKind === 'detailed' ? detailedList : totalsList;

    return [...raw].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [presetKind, detailedList, totalsList]);

  const title =
    presetKind === 'detailed'
      ? t('loadDetailedPresetsTitle')
      : t('loadTotalsPresetsTitle');

  const handleDelete = (preset: VotingPresetRow) => {
    const deletedName = preset.name;

    confirm({
      key: 'delete-voting-preset',
      title: t('deletePresetConfirmTitle'),
      description: t('deletePresetConfirmDescription', { name: deletedName }),
      type: 'danger',
      onConfirm: () => {
        if (preset.kind === 'detailed') deleteDetailed(preset.id);
        else deleteTotals(preset.id);

        toast.success(t('toastPresetDeleted', { name: deletedName }));
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      contentClassName="!px-3 text-white flex flex-col gap-3 py-3 max-h-[min(70vh,520px)]"
      containerClassName="!w-[min(94%,480px)]"
    >
      <h2 className="text-xl font-semibold px-1">{title}</h2>
      <div className="narrow-scrollbar overflow-y-auto flex-1 min-h-0 flex flex-col gap-2 pr-1">
        {presets.length === 0 ? (
          <p className="text-white/70 text-sm px-1 py-6 text-center">
            {t('noPresetsYet')}
          </p>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              className="rounded-lg border border-white/10 bg-primary-900/40 p-3 flex flex-col gap-2"
            >
              <div className="font-medium leading-snug">{preset.name}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  label={`${t('metaCreated')}: ${new Date(
                    preset.createdAt,
                  ).toLocaleString(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}`}
                  onClick={() => {}}
                  isActive={false}
                  className="!text-xs !py-1 !px-2 !normal-case pointer-events-none bg-primary-800/60 text-white/85 hover:bg-primary-800/60"
                />
                <Badge
                  label={`${t('metaParticipants')}: ${preset.participantCount}`}
                  onClick={() => {}}
                  isActive={false}
                  className="!text-xs !py-1 !px-2 !normal-case pointer-events-none bg-primary-800/60 text-white/85 hover:bg-primary-800/60"
                />
                <Badge
                  label={`${t('metaVoters')}: ${preset.votingCount}`}
                  onClick={() => {}}
                  isActive={false}
                  className="!text-xs !py-1 !px-2 !normal-case pointer-events-none bg-primary-800/60 text-white/85 hover:bg-primary-800/60"
                />
                <Badge
                  label={`${t('metaSource')}: ${preset.sourceStageName} - ${
                    preset.sourceContestName
                  } ${preset.sourceContestYear}`}
                  onClick={() => {}}
                  isActive={false}
                  className="!text-xs !py-1 !px-2 !normal-case pointer-events-none bg-primary-800/60 text-white/85 hover:bg-primary-800/60 max-w-full truncate"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="tertiary"
                  className="!text-xs !py-2 !px-3"
                  onClick={() => {
                    onLoad(preset);
                    onClose();
                  }}
                  Icon={<Download className="w-3.5 h-3.5" />}
                >
                  {t('load')}
                </Button>
                <Button
                  className="!text-xs !py-2 !px-3"
                  Icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => {
                    onEdit(preset);
                    onClose();
                  }}
                >
                  {t('edit')}
                </Button>
                <Button
                  variant="destructive"
                  className="!text-xs !py-2 !px-3"
                  Icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDelete(preset)}
                >
                  {tCommon('delete')}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-end pt-1 border-t border-white/10">
        <Button variant="secondary" onClick={onClose}>
          {tCommon('close')}
        </Button>
      </div>
    </Modal>
  );
};

export default LoadVotingPresetModal;
