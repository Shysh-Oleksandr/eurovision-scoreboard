'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';

import { useApplyContestTheme } from './hooks/useApplyContestTheme';
import LoadContestModal from './LoadContestModal';
import PublicContests from './PublicContests';
import UserContests from './UserContests';

import { api } from '@/api/client';
import { useApplyContestMutation } from '@/api/contests';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import {
  applyContestSnapshotToStores,
  LoadContestOptions,
} from '@/helpers/contestSnapshot';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

const CreateContestModal = dynamic(() => import('./CreateContestModal'), {
  ssr: false,
});

enum ContestsTab {
  YOUR_CONTESTS = 'Your Contests',
  PUBLIC_CONTESTS = 'Public Contests',
}

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
  const { mutateAsync: applyContestToProfile } = useApplyContestMutation();
  const user = useAuthStore((state) => state.user);

  const t = useTranslations();
  const [activeTab, setActiveTab] = useState(ContestsTab.YOUR_CONTESTS);
  const [isPublicContestsLoaded, setIsPublicContestsLoaded] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [initialContest, setInitialContest] = useState<Contest | undefined>();
  const [isLoadContestModalOpen, setIsLoadContestModalOpen] = useState(false);
  const [contestToLoad, setContestToLoad] = useState<{
    contest: Contest;
    snapshot: any;
  } | null>(null);

  const tabs = useMemo(
    () => [
      {
        value: ContestsTab.YOUR_CONTESTS,
        label: t('widgets.contests.yourContests'),
      },
      {
        value: ContestsTab.PUBLIC_CONTESTS,
        label: t('widgets.contests.publicContests'),
      },
    ],
    [t],
  );

  const applyTheme = useApplyContestTheme();

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

      setContestToLoad({ contest, snapshot: data });
      setIsLoadContestModalOpen(true);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || t('widgets.contests.failedToLoadContest'),
      );
    }
  };

  const handleConfirmLoadContest = async (options: LoadContestOptions) => {
    if (!contestToLoad) return;

    try {
      const { contest, snapshot } = contestToLoad;

      if (options.theme) {
        await applyTheme(contest.themeId, contest.standardThemeId);
      }

      await applyContestSnapshotToStores(snapshot, contest, false, options);

      // Set as active contest (immediate)
      useGeneralStore.getState().setActiveContest(contest);

      // Save to profile (sync across devices)
      if (user) {
        await applyContestToProfile(contest._id);
      }

      onClose();
      toast.success(t('widgets.contests.contestLoaded'));
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || t('widgets.contests.failedToLoadContest'),
      );
    } finally {
      setContestToLoad(null);
    }
  };

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: (
          <UserContests
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onLoad={handleLoadContest}
          />
        ),
      },
      {
        ...tabs[1],
        content: (
          <>
            {(activeTab === ContestsTab.PUBLIC_CONTESTS ||
              isPublicContestsLoaded) && (
              <PublicContests
                onLoaded={() => setIsPublicContestsLoaded(true)}
                onEdit={handleEdit}
                onLoad={handleLoadContest}
              />
            )}
          </>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, isPublicContestsLoaded, tabs],
  );

  useEffectOnce(onLoaded);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        containerClassName="!w-[min(100%,800px)]"
        contentClassName="text-white sm:h-[75vh] h-[72vh] max-h-[72vh]"
        overlayClassName="!z-[1001]"
        bottomContent={<ModalBottomCloseButton onClose={onClose} />}
        topContent={
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab as ContestsTab)}
            containerClassName="!rounded-none"
          />
        }
      >
        <TabContent
          tabs={tabsWithContent}
          activeTab={activeTab}
          preserveContent
        />
      </Modal>

      {/* Customize Contest Modal */}
      {isCustomizeModalOpen && (
        <CreateContestModal
          isOpen={isCustomizeModalOpen}
          onClose={handleCloseCustomize}
          initialContest={initialContest}
        />
      )}

      {/* Load Contest Modal */}
      {isLoadContestModalOpen && contestToLoad && (
        <LoadContestModal
          isOpen={isLoadContestModalOpen}
          isSimulationStarted={contestToLoad.contest.isSimulationStarted}
          themeDescription={
            contestToLoad.contest.themeId
              ? t('common.custom')
              : contestToLoad.contest.standardThemeId?.replace('-', ' ')
          }
          onClose={() => {
            setIsLoadContestModalOpen(false);
            setContestToLoad(null);
          }}
          onLoad={handleConfirmLoadContest}
        />
      )}
    </>
  );
};

export default ContestsModal;
