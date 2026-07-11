import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { useGeneralStore } from '@/state/generalStore';
import { DiasporaCustomGroup } from '@/state/scoreboard/diaspora';

interface CustomGroupEditModalProps {
  group: DiasporaCustomGroup;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Rename-or-delete dialog for a custom bloc, opened from the pencil button in
 * the card header. Deleting removes the bloc (and unmounts its card).
 */
export const CustomGroupEditModal: React.FC<CustomGroupEditModalProps> = ({
  group,
  isOpen,
  onClose,
}) => {
  const t = useTranslations('settings.relations');
  const updateGroup = useGeneralStore((s) => s.updateDiasporaCustomGroup);
  const removeGroup = useGeneralStore((s) => s.removeDiasporaCustomGroup);

  const [name, setName] = useState(group.name);

  // Re-seed the input to the current name each time the dialog opens.
  useEffect(() => {
    if (isOpen) setName(group.name);
  }, [isOpen, group.name]);

  const save = () => {
    const next = name.trim();

    if (next) updateGroup(group.id, { name: next });
    onClose();
  };

  const remove = () => {
    removeGroup(group.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!max-w-md"
      contentClassName="!p-5"
      overlayClassName="!z-[1002]"
    >
      <div className="relations-tab">
        <div className="mb-4 text-[15px] font-extrabold text-white">
          {t('editBloc')}
        </div>

        <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
          {t('blocName')}
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder={t('blocNamePlaceholder')}
          className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] font-bold text-white outline-none placeholder:text-white/40"
        />

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="destructive"
            onClick={remove}
            Icon={<Trash2 size={17} />}
            label={t('deleteBloc')}
            className="!py-2 !px-3.5 !text-[12.5px]"
          />
          <Button
            variant="primary"
            onClick={save}
            disabled={name.trim().length === 0}
            label={t('save')}
            className="!py-2 !px-4 !text-[12.5px]"
          />
        </div>
      </div>
    </Modal>
  );
};
