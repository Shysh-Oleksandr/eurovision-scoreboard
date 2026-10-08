'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import IconButtonTooltip from './IconButtonTooltip';

const FeedbackModal = dynamic(() => import('../feedbackInfo/FeedbackModal'), {
  ssr: false,
});

type Props = {
  className?: string;
  /**
   * Interactive variant: the pill opens the feedback form. Use it only where
   * a nested button is valid (not inside another button).
   */
  feedback?: boolean;
};

/**
 * "Beta" pill for features that are still changing (`dp-beta` in
 * styles.css). The plain variant explains itself through `title`; the
 * feedback variant opens the feedback modal so people can say what's missing.
 */
const BetaBadge: React.FC<Props> = ({ className = '', feedback = false }) => {
  const t = useTranslations('common.beta');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!feedback) {
    return (
      <span className={`dp-beta ${className}`} title={t('hint')}>
        {t('label')}
      </span>
    );
  }

  return (
    <>
      <IconButtonTooltip content={t('hintFeedback')}>
        <button
          type="button"
          className={`dp-beta ${className}`}
          aria-label={`${t('label')} · ${t('hintFeedback')}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {t('label')}
        </button>
      </IconButtonTooltip>
      {(open || loaded) && (
        <FeedbackModal
          showModal={open}
          setShowModal={setOpen}
          onLoaded={() => setLoaded(true)}
        />
      )}
    </>
  );
};

export default BetaBadge;
