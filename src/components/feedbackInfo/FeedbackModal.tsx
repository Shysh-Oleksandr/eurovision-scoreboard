import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useGeneralStore } from '../../state/generalStore';
import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import Tabs from '../common/tabs/Tabs';

import { UPCOMING_FEATURES, WHATS_NEW } from './data';
import UpdateList from './UpdateList';

import GitHubIcon from '@/assets/icons/GitHubIcon';

const FeedbackModal = ({
  showModal,
  setShowModal,
  onLoaded,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onLoaded: () => void;
}) => {
  const locale = useLocale();
  const t = useTranslations('feedbackInfo');
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

    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, setLastSeenUpdate, setShouldShowNewChangesIndicator]);

  const getTabs = (shouldShowNewChangesIndicator: boolean) => {
    return [
      { label: t('feedback'), value: 'feedback' },
      {
        label: t('whatsNew'),
        value: 'whats-new',
        showIndicator: shouldShowNewChangesIndicator,
      },
      { label: t('upcomingFeatures'), value: 'upcoming' },
    ];
  };

  const tabs = getTabs(shouldShowNewChangesIndicator);

  const translationIssueTemplate = `
    Language: ${locale}

    Wrong translation:
    - 

    Correct translation:
    - 

    Reason:
    - 
  `;

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
        />
      }
      bottomContent={
        <ModalBottomCloseButton onClose={() => setShowModal(false)} />
      }
    >
      <div className="lg:text-lg sm:text-base text-base font-medium">
        {activeTab === 'feedback' && (
          <div className="lg:pt-2">
            <p className="mb-2 font-semibold">{t('foundBug')}</p>

            <p className="mb-3">
              {t('openIssueOnGitHub')}{' '}
              <a
                href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-300 hover:text-primary-400 underline font-semibold"
              >
                <GitHubIcon className="w-5 h-5 inline-block mr-1 mb-1" />
                GitHub
              </a>{' '}
              {t('orEmailMe')}{' '}
              <a
                href="mailto:sasha.shysh23@gmail.com"
                className="text-primary-300 hover:text-primary-400 underline font-semibold"
              >
                sasha.shysh23@gmail.com
              </a>
            </p>
            <div className="mb-3 sm:gap-3 gap-2 flex items-center">
              {/* <div className="text-primary-300 font-semibold tracking-wide bg-primary-800 px-2 py-1 rounded-md text-sm">
                NEW
              </div> */}
              <p>
                {t.rich('gitHubDiscussions', {
                  a: (chunks) => (
                    <a
                      href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-300 hover:text-primary-400 underline font-semibold"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
            <div className="mb-4">
              {t('bugReportDetails')}
              <br />
              <ul className="list-disc list-inside">
                <li>{t('bugReportDetailsItem1')}</li>
                <li>{t('bugReportDetailsItem2')}</li>
                <li>{t('bugReportDetailsItem3')}</li>
                <li>{t('bugReportDetailsItem4')}</li>
              </ul>
            </div>
            <p className="mb-2 font-semibold">
              {t('translationIssueDescription')}{' '}
              <a
                href={`mailto:sasha.shysh23@gmail.com?subject=Translation Issue&body=${translationIssueTemplate}`}
                className="text-primary-300 hover:text-primary-400 underline font-semibold"
              >
                sasha.shysh23@gmail.com
              </a>
            </p>
            <p>{t('thankYou')}</p>
          </div>
        )}

        {activeTab === 'whats-new' && <UpdateList items={WHATS_NEW} compact />}

        {activeTab === 'upcoming' && (
          <div>
            <UpdateList items={UPCOMING_FEATURES} />
            <p className="text-white/70 text-sm font-medium mt-4">
              * {t('datesAreApproximate')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackModal;
