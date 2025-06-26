import React, { useState, useEffect } from 'react';

import { useGeneralStore } from '../../state/generalStore';

import FeedbackIcon from './FeedbackIcon';
import FeedbackModal from './FeedbackModal';

const FeedbackInfoButton = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false);
  const { shouldShowNewChangesIndicator, checkForNewUpdates } =
    useGeneralStore();

  useEffect(() => {
    checkForNewUpdates();
  }, [checkForNewUpdates]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`text-white p-2 relative focus:outline-none z-50 hover:scale-110 transition-transform duration-300 ${className}`}
        aria-label="Open feedback modal"
        title="Open feedback modal"
      >
        <FeedbackIcon />
        {shouldShowNewChangesIndicator && (
          <div className="absolute -top-[0.1rem] -right-[0.2rem] w-3.5 h-3.5 bg-primary-700 rounded-full animate-pulse" />
        )}
      </button>
      <FeedbackModal showModal={showModal} setShowModal={setShowModal} />
    </>
  );
};

export default FeedbackInfoButton;
