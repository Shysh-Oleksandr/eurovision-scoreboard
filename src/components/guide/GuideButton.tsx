'use client';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import Button from '../common/Button';

const GuideModal = dynamic(() => import('./GuideModal'), {
  ssr: false,
});

const GuideButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [isModalLoaded, setIsModalLoaded] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="!p-3 group"
        aria-label="Open feature guide"
        title="Feature Guide"
        variant="tertiary"
      >
        <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform duration-500 ease-in-out" />
      </Button>
      {(showModal || isModalLoaded) && (
        <GuideModal
          showModal={showModal}
          setShowModal={setShowModal}
          onLoaded={() => setIsModalLoaded(true)}
        />
      )}
    </>
  );
};

export default GuideButton;
