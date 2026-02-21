'use client';

import React from 'react';
import { toast } from 'react-toastify';

import ContestListItem from './ContestListItem';
import { usePublicContestActions } from './hooks/usePublicContestActions';

import { api } from '@/api/client';
import { useContestsStateQuery } from '@/api/contests';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import type { Contest } from '@/types/contest';

interface ContestShareModalProps {
  contest: Contest | null;
  onClose: () => void;
  onEdit?: (contest: Contest) => void;
}

const ContestShareModal: React.FC<ContestShareModalProps> = ({
  contest,
  onClose,
  onEdit,
}) => {
  const user = useAuthStore((state) => state.user);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const setContestToLoad = useGeneralStore((state) => state.setContestToLoad);
  const setSelectedShareContest = useGeneralStore(
    (state) => state.setSelectedShareContest,
  );

  const { data: contestsState } = useContestsStateQuery(
    contest ? [contest._id] : [],
    !!contest && !!user,
  );
  const { handleLike, handleSave } = usePublicContestActions();

  const handleLoad = async (c: Contest) => {
    try {
      const { data } = await api.get(`/contests/${c._id}/snapshot`);

      setSelectedShareContest(null);
      onClose();
      setContestToLoad({ contest: c, snapshot: data });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load contest');
    }
  };

  if (!contest) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      containerClassName="!w-[min(100%,750px)]"
      overlayClassName="!z-[1002]"
      contentClassName="!p-4"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <ContestListItem
        contest={contest}
        variant="public"
        onLoad={handleLoad}
        onLike={handleLike}
        onSave={handleSave}
        onEdit={onEdit}
        isActive={activeContest?._id === contest._id}
        likedByMe={!!contestsState?.likedIds?.includes(contest._id)}
        savedByMe={!!contestsState?.savedIds?.includes(contest._id)}
        quickSelectedByMe={
          !!contestsState?.quickSelectedIds?.includes(contest._id)
        }
      />
    </Modal>
  );
};

export default ContestShareModal;
