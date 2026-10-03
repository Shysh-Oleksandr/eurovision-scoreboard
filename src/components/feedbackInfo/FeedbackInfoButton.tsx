'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { useGeneralStore } from '../../state/generalStore';
import IconButtonTooltip from '../common/IconButtonTooltip';

import FeedbackIcon from './FeedbackIcon';

const FeedbackModal = dynamic(() => import('./FeedbackModal'), {
  ssr: false,
});

type FeedbackInfoButtonProps = {
  className?: string;
  /** `hub`: 46×46 filled accent-2 button for the Event Setup header. */
  variant?: 'default' | 'hub';
};

const FeedbackInfoButton = ({
  className,
  variant = 'default',
}: FeedbackInfoButtonProps) => {
  const t = useTranslations('feedbackInfo');
  const [showModal, setShowModal] = useState(false);
  const [isFeedbackModalLoaded, setIsFeedbackModalLoaded] = useState(false);
  const shouldShowNewChangesIndicator = useGeneralStore(
    (state) => state.shouldShowNewChangesIndicator,
  );
  const checkForNewUpdates = useGeneralStore(
    (state) => state.checkForNewUpdates,
  );

  useEffect(() => {
    checkForNewUpdates();
  }, [checkForNewUpdates]);

  return (
    <>
      <IconButtonTooltip content={t('buttonTooltip')}>
        <button
          onClick={() => setShowModal(true)}
          className={
            variant === 'hub'
              ? `dp-act dp-act--feedback ${
                  shouldShowNewChangesIndicator ? 'dp-dot' : ''
                } w-[46px] h-[46px] rounded-xl grid place-items-center text-white focus:outline-none ${className}`
              : `text-white p-1 relative focus:outline-none z-50 hover:scale-110 transition-transform duration-300 ${className}`
          }
          aria-label={t('buttonTooltip')}
        >
          <FeedbackIcon className="size-[40px]" />
          {variant !== 'hub' && shouldShowNewChangesIndicator && (
            <div className="absolute -top-[0.1rem] -right-[0.2rem] w-3.5 h-3.5 bg-primary-700 rounded-full animate-pulse" />
          )}
        </button>
      </IconButtonTooltip>
      {(showModal || isFeedbackModalLoaded) && (
        <FeedbackModal
          showModal={showModal}
          setShowModal={setShowModal}
          onLoaded={() => setIsFeedbackModalLoaded(true)}
        />
      )}
    </>
  );
};

export default FeedbackInfoButton;
