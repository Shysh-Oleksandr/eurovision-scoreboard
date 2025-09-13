import React, { useState, useEffect, Suspense } from 'react';

import { useGeneralStore } from '../../state/generalStore';

import FeedbackIcon from './FeedbackIcon';

const FeedbackModal = React.lazy(() => import('./FeedbackModal'));

const FeedbackInfoButton = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false);
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
      {showModal && (
        <Suspense fallback={null}>
          <FeedbackModal showModal={showModal} setShowModal={setShowModal} />
        </Suspense>
      )}
    </>
  );
};

export default FeedbackInfoButton;
