'use client';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import Button from '../common/Button';

const GuideModal = dynamic(() => import('./GuideModal'), {
  ssr: false,
});

const GuideButton = () => {
  const t = useTranslations('guide');
  const [showModal, setShowModal] = useState(false);
  const [isModalLoaded, setIsModalLoaded] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="!p-3 group"
        aria-label={t('title')}
        title={t('title')}
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
