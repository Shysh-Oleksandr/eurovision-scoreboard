'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LibraryModal, { LibraryPlace } from '../library/LibraryModal';

import PublicContests from './PublicContests';
import UserContests from './UserContests';

import { api } from '@/api/client';
import { toast } from '@/helpers/toast';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useGeneralStore } from '@/state/generalStore';
import { Contest } from '@/types/contest';

const CreateContestModal = dynamic(() => import('./CreateContestModal'), {
  ssr: false,
});

interface ContestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const ContestsModal: React.FC<ContestsModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const setContestToLoadGlobal = useGeneralStore(
    (state) => state.setContestToLoad,
  );
  const contestToEdit = useGeneralStore((state) => state.contestToEdit);
  const setContestToEdit = useGeneralStore((state) => state.setContestToEdit);

  const t = useTranslations();
  const [place, setPlace] = useState<LibraryPlace>('yours');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [initialContest, setInitialContest] = useState<Contest | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    if (contestToEdit) {
      setInitialContest(contestToEdit);
      setIsCustomizeModalOpen(true);
      setContestToEdit(null);
    }
  }, [isOpen, contestToEdit, setContestToEdit]);

  const handleCreateNew = () => {
    setInitialContest(undefined);
    setIsCustomizeModalOpen(true);
  };

  const handleEdit = (contest: Contest) => {
    setInitialContest(contest);
    setIsCustomizeModalOpen(true);
  };

  const handleCloseCustomize = () => {
    setIsCustomizeModalOpen(false);
    setInitialContest(undefined);
  };

  const handleLoadContest = async (contest: Contest) => {
    try {
      const { data } = await api.get(`/contests/${contest._id}/snapshot`);

      setContestToLoadGlobal({ contest, snapshot: data });
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || t('widgets.contests.failedToLoadContest'),
      );
    }
  };

  useEffectOnce(onLoaded);

  return (
    <>
      <LibraryModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('widgets.contests.title')}
        place={place}
        onPlaceChange={setPlace}
        widthClassName="!w-[min(100%,800px)]"
        renderPlace={(p) =>
          p === 'community' ? (
            <PublicContests onEdit={handleEdit} onLoad={handleLoadContest} />
          ) : (
            <UserContests
              place={p}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onLoad={handleLoadContest}
              onBrowseCommunity={() => setPlace('community')}
            />
          )
        }
      />

      {/* Save the open contest as a new one, or edit a contest's details */}
      {isCustomizeModalOpen && (
        <CreateContestModal
          isOpen={isCustomizeModalOpen}
          onClose={handleCloseCustomize}
          mode={initialContest ? 'details' : 'new'}
          contest={initialContest}
        />
      )}
    </>
  );
};

export default ContestsModal;
