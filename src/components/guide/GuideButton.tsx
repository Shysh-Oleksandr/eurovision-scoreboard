'use client';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import Button from '../common/Button';

const GuideModal = dynamic(() => import('./GuideModal'), {
  ssr: false,
});

type GuideButtonProps = {
  /** `hub`: 46×46 filled surface button for the Event Setup header. */
  variant?: 'default' | 'hub';
};

const GuideButton = ({ variant = 'default' }: GuideButtonProps) => {
  const t = useTranslations('guide');
  const [showModal, setShowModal] = useState(false);
  const [isModalLoaded, setIsModalLoaded] = useState(false);

  return (
    <>
      {variant === 'hub' ? (
        <Button
          onClick={() => setShowModal(true)}
          aria-label={t('title')}
          title={t('title')}
          variant="surface"
          size="lg"
          Icon={<BookOpen />}
        />
      ) : (
        <Button
          onClick={() => setShowModal(true)}
          className="!p-3 group"
          aria-label={t('title')}
          title={t('title')}
          variant="tertiary"
        >
          <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform duration-500 ease-in-out" />
        </Button>
      )}
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
