import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useGeneralStore } from '../../state/generalStore';
import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import Tabs from '../common/tabs/Tabs';

import { UPCOMING_FEATURES, WHATS_NEW } from './data';
import UpdateList from './UpdateList';

import { FilledHeartIcon } from '@/assets/icons/FilledHeartIcon';
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
  // const locale = useLocale();
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

  // const translationIssueTemplate = `
  //   Language: ${locale}

  //   Wrong translation:
  //   -

  //   Correct translation:
  //   -

  //   Reason:
  //   -
  // `;

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="!w-[min(100%,650px)]"
      contentClassName="pb-2 !pt-4 xs:!px-8 !px-6 text-white sm:h-[55vh] h-[55vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      withBlur
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
      <div className="lg:text-lg sm:text-base text-base">
        {activeTab === 'feedback' && (
          <div className="lg:pt-2">
            <p className="mb-2 font-medium">{t('foundBug')}</p>

            <p className="mb-3">
              {t('openIssueOnGitHub')}{' '}
              <a
                href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-300 hover:text-primary-400 underline font-medium"
              >
                <GitHubIcon className="w-5 h-5 inline-block mr-1 mb-1" />
                GitHub
              </a>{' '}
              {t('orEmailMe')}{' '}
              <a
                href="mailto:sasha.shysh23@gmail.com"
                className="text-primary-300 hover:text-primary-400 underline font-medium"
              >
                sasha.shysh23@gmail.com
              </a>
            </p>
            {/* <div className="mb-3 sm:gap-3 gap-2 flex items-center">
              <p>
                {t.rich('gitHubDiscussions', {
                  a: (chunks) => (
                    <a
                      href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-300 hover:text-primary-400 underline font-medium"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div> */}
            {/* Divider */}
            <div className="h-px bg-white/10 my-5" />

            <div className="border border-white/10 border-solid rounded-xl bg-primary-800/60 pt-[18px] px-5 pb-5">
              <div className="flex items-center gap-2 mb-[11px]">
                <FilledHeartIcon className="w-6 h-6 flex-shrink-0 text-[#FF5E5B]" />
                <span className="font-bold">{t('donationCardTitle')}</span>
              </div>
              <p className="text-white/70 text-base leading-[1.70] mb-[7px]">
                {t('donationCardIntro')}
              </p>
              <p className="text-white/70 text-base leading-[1.70] mb-[17px]">
                {t('donationCardSupport')}
              </p>
              <a
                href="https://www.patreon.com/c/douzepoints"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-[9px] rounded-[9px] px-5 py-[10px] text-white text-[13px] font-bold tracking-[0.09em] uppercase whitespace-nowrap hover:opacity-[0.88] transition-opacity"
                style={{ backgroundColor: '#FF5E5B' }}
              >
                <Heart className="w-5 h-5" />
                {t('supportOnPatreon')}
              </a>
            </div>
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
