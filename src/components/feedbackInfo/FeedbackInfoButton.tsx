'use client';
import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { useGeneralStore } from '../../state/generalStore';

import FeedbackIcon from './FeedbackIcon';

const FeedbackModal = dynamic(() => import('./FeedbackModal'), {
  ssr: false,
});

const FeedbackInfoButton = ({ className }: { className?: string }) => {
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
      <button
        onClick={() => setShowModal(true)}
        className={`text-white p-2 mb-1 relative focus:outline-none z-50 hover:scale-110 transition-transform duration-300 ${className}`}
        aria-label="Open feedback modal"
        title="Open feedback modal"
      >
        <FeedbackIcon />
        {shouldShowNewChangesIndicator && (
          <div className="absolute -top-[0.1rem] -right-[0.2rem] w-3.5 h-3.5 bg-primary-700 rounded-full animate-pulse" />
        )}
      </button>
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
