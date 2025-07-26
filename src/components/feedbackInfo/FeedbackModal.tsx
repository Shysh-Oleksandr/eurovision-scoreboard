import React, { useState, useEffect } from 'react';

import { useGeneralStore } from '../../state/generalStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import Tabs from '../common/Tabs';

import { getTabs, WHATS_NEW, UPCOMING_FEATURES } from './data';
import UpdateList from './UpdateList';

import GitHubIcon from '@/assets/icons/GitHubIcon';

const FeedbackModal = ({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState('feedback');
  const setLastSeenUpdate = useGeneralStore((state) => state.setLastSeenUpdate);
  const setShouldShowNewChangesIndicator = useGeneralStore(
    (state) => state.setShouldShowNewChangesIndicator,
  );
  const shouldShowNewChangesIndicator = useGeneralStore(
    (state) => state.shouldShowNewChangesIndicator,
  );

  // Handle "What's New" tab activation
  useEffect(() => {
    if (activeTab === 'whats-new' && WHATS_NEW.length > 0) {
      const latestUpdate = `${WHATS_NEW[0].date}-${WHATS_NEW[0].title}`;

      setLastSeenUpdate(latestUpdate);
      setShouldShowNewChangesIndicator(false);
    }
  }, [activeTab, setLastSeenUpdate, setShouldShowNewChangesIndicator]);

  const tabs = getTabs(shouldShowNewChangesIndicator);

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="!w-[min(100%,650px)]"
      contentClassName="pb-2 xs:!pt-6 !pt-4 sm:!px-12 xs:!px-8 !px-6 text-white sm:h-[50vh] h-[55vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          containerClassName="!rounded-none"
          buttonClassName="sm:h-14 h-10"
          overlayClassName="sm:h-14 h-10"
          alwaysHorizontal
        />
      }
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 sm:p-4 p-2 z-30">
          <Button
            className="md:text-base text-sm w-full"
            onClick={() => setShowModal(false)}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="lg:text-lg sm:text-base text-base font-medium">
        {activeTab === 'feedback' && (
          <div className="lg:pt-2">
            <p className="mb-2 font-semibold">
              Found a bug, have a feature idea, or just want to share feedback?
            </p>
            <p className="mb-4">
              Feel free to open an issue on{' '}
              <a
                href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-300 hover:text-primary-400 underline font-semibold"
              >
                <GitHubIcon className="w-5 h-5 inline-block mr-1 mb-1" />
                GitHub
              </a>{' '}
              or email me at{' '}
              <a
                href="mailto:sasha.shysh23@gmail.com"
                className="text-primary-300 hover:text-primary-400 underline font-semibold"
              >
                sasha.shysh23@gmail.com
              </a>
            </p>
            <div className="mb-4">
              If you're reporting a bug, please include your:
              <br />
              <ul className="list-disc list-inside">
                <li>device (mobile, tablet, or PC)</li>
                <li>OS (Android, iOS, Windows, macOS)</li>
                <li>browser (Chrome, Safari, etc.)</li>
                <li>and any helpful details like screenshots or videos</li>
              </ul>
            </div>
            <p>Thank you!</p>
          </div>
        )}

        {activeTab === 'whats-new' && <UpdateList items={WHATS_NEW} />}

        {activeTab === 'upcoming' && (
          <div>
            <UpdateList items={UPCOMING_FEATURES} />
            <p className="text-white/70 text-sm font-medium mt-4">
              * The dates are approximate and may change
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackModal;
