import React, { useState } from 'react';

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

const FeedbackModal = ({
  setShowModal,
}: {
  setShowModal: (show: boolean) => void;
}) => {
  return (
    <div
      className="w-full h-full absolute top-0 bottom-0 left-0 right-0 z-50 bg-black bg-opacity-60 flex justify-center items-center"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-900 lg:w-2/5 md:w-1/2 w-4/5 lg:pb-16 md:pb-12 sm:pb-8 pb-6 lg:pt-12 md:pt-10 sm:pt-8 pt-6 lg:px-10 md:px-8 xs:px-6 px-4 text-white rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="lg:text-3xl sm:text-2xl text-xl font-semibold mb-6 text-center">
          Feedback
        </h3>
        <div className="lg:text-lg sm:text-base text-sm font-medium text-left">
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
      </div>
    </div>
  );
};

const FeedbackInfo = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`fixed bottom-5 right-5 text-white p-2 rounded-full shadow-lg focus:outline-none z-50 hover:scale-110 transition-transform duration-300 ${className}`}
        aria-label="Open feedback modal"
        title="Open feedback modal"
      >
        <FeedbackIcon />
      </button>
      {showModal && <FeedbackModal setShowModal={setShowModal} />}
    </>
  );
};

export default FeedbackInfo;
