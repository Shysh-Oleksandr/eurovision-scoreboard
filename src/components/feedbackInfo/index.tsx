import React, { useState } from 'react';

import Modal from '../Modal';

const FeedbackIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="md:scale-150 scale-125"
  >
    <g>
      <path fill="none" d="M0 0h24v24H0z" />
      <path
        fill="#fff"
        d="M6.455 19L2 22.5V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.455zM11 13v2h2v-2h-2zm0-6v5h2V7h-2z"
      />
    </g>
  </svg>
);

const UPCOMING_FEATURES = [
  'Semi-finals improvements',
  'Custom themes for each contest',
  'Custom animations for each contest',
  'Custom settings',
  'JESC support',
  'Countries from all continents',
  'Different voting rules support',
];

const FeedbackModal = ({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) => {
  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="lg:w-2/5 md:w-1/2 w-4/5"
      contentClassName=" md:pb-12 sm:pb-8 pb-6 lg:pt-12 md:pt-10 sm:pt-8 pt-6 lg:px-10 md:px-8 xs:px-6 px-4 text-white"
    >
      <h3 className="lg:text-3xl sm:text-2xl text-xl font-semibold mb-3 sm:mb-4 md:mb-6 text-center">
        Feedback
      </h3>
      <div className="lg:text-lg sm:text-base text-base font-medium">
        <p className="mb-4">
          Have a bug to report, a feature to suggest, or just want to leave
          feedback?
        </p>
        <p className="mb-2">
          Feel free to create an issue on{' '}
          <a
            href="https://github.com/Shysh-Oleksandr/eurovision-scoreboard/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-300 hover:text-primary-400 underline"
          >
            GitHub
          </a>{' '}
          or email me at{' '}
          <a
            href="mailto:sasha.shysh23@gmail.com"
            className="text-primary-300 hover:text-primary-400 underline"
          >
            sasha.shysh23@gmail.com
          </a>
        </p>
        <p>Thank you!</p>
      </div>
      <div className="sm:mt-4 mt-3 lg:text-lg text-base font-medium text-left sm:pt-4 pt-3 border-t border-solid border-primary-800">
        <p className="text-center md:text-xl sm:text-lg text-base font-semibold mb-2 md:mb-4">
          Upcoming features:
        </p>
        <ul>
          {UPCOMING_FEATURES.map((item, index) => (
            <li key={item}>
              <p>{`${index + 1}. ${item}`}</p>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

const FeedbackInfo = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* TODO: update styles to remove fixed position */}
      <button
        onClick={() => setShowModal(true)}
        className={`fixed bottom-5 right-5 text-white p-2 focus:outline-none z-50 hover:scale-110 transition-transform duration-300 ${className}`}
        aria-label="Open feedback modal"
        title="Open feedback modal"
      >
        <FeedbackIcon />
      </button>
      <FeedbackModal showModal={showModal} setShowModal={setShowModal} />
    </>
  );
};

export default FeedbackInfo;
