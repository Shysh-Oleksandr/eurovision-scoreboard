'use client';

import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { getFlagPath } from '@/helpers/getFlagPath';
import { cn } from '@/helpers/utils';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const CLOSE_ANIMATION_DELAY_MS = 150;

const SplitScreenQualifierModal = () => {
  const t = useTranslations('simulation');
  const enableSplitScreenQualifierRevealMode = useGeneralStore(
    (state) => state.settings.enableSplitScreenQualifierRevealMode,
  );
  const isPresenting = useGeneralStore(
    (state) => state.presentationSettings.isPresenting,
  );
  const isOpen = useScoreboardStore(
    (state) => state.splitScreenQualifierModalOpen,
  );
  const candidates = useScoreboardStore(
    (state) => state.splitScreenQualifierCandidates,
  );
  const closeSplitScreenQualifierModal = useScoreboardStore(
    (state) => state.closeSplitScreenQualifierModal,
  );
  const pickQualifier = useScoreboardStore((state) => state.pickQualifier);
  const pickQualifierFromSplitScreenCandidatesRandomly = useScoreboardStore(
    (state) => state.pickQualifierFromSplitScreenCandidatesRandomly,
  );
  const candidatesGridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!isOpen || !enableSplitScreenQualifierRevealMode) return;
      if (candidates.length === 0) return;

      let timeline: gsap.core.Timeline | null = null;

      const runAnimation = () => {
        const gridElement = candidatesGridRef.current;

        if (!gridElement) return;

        const candidateItems = Array.from(
          gridElement.querySelectorAll<HTMLElement>(
            '[data-split-candidate="true"]',
          ),
        );

        if (candidateItems.length === 0) return;

        const rowTolerancePx = 12;
        const orderedItems = [...candidateItems].sort((a, b) => {
          const aRect = a.getBoundingClientRect();
          const bRect = b.getBoundingClientRect();
          const isSameRow = Math.abs(aRect.top - bRect.top) <= rowTolerancePx;

          // Animate cards right-to-left within a row.
          if (isSameRow) {
            return bRect.left - aRect.left;
          }

          // Keep top rows before lower rows.
          return aRect.top - bRect.top;
        });

        gsap.set(orderedItems, {
          x: -400,
          opacity: 0,
          scale: 0.9,
          transformOrigin: 'center center',
        });

        timeline = gsap.timeline();

        // Slide in first, then scale to full size.
        timeline.to(orderedItems, {
          x: 0,
          delay: 0.1,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.12,
        });

        timeline.to(orderedItems, {
          scale: 1,
          duration: 0.4,
          ease: 'power2.out',
        });
      };

      // Modal mounts its children asynchronously, so delay slightly.
      const delayedAnimation = gsap.delayedCall(0.08, runAnimation);

      return () => {
        delayedAnimation.kill();
        timeline?.kill();
      };
    },
    {
      scope: candidatesGridRef,
      dependencies: [
        isOpen,
        enableSplitScreenQualifierRevealMode,
        candidates.map((candidate) => candidate.code).join('|'),
      ],
    },
  );

  return (
    <Modal
      isOpen={isOpen && enableSplitScreenQualifierRevealMode}
      onClose={closeSplitScreenQualifierModal}
      containerClassName="!w-[min(100%,1000px)] !bg-none !bg-transparent !rounded-none"
      contentClassName="!p-0"
      withBlur
      shouldBlur
    >
      {!isPresenting && (
        <div className="flex justify-between gap-2 items-center mb-2">
          <h2 className="text-white md:text-2xl text-xl leading-tight font-bold">
            {t('chooseCountryToQualify')}
          </h2>
          <Button
            variant="tertiary"
            label={t('random')}
            onClick={() => {
              closeSplitScreenQualifierModal();
              setTimeout(() => {
                pickQualifierFromSplitScreenCandidatesRandomly();
              }, CLOSE_ANIMATION_DELAY_MS);
            }}
            snowEffect="middle"
          />
        </div>
      )}

      <div
        ref={candidatesGridRef}
        className={cn(
          'grid md:gap-4 sm:gap-3 gap-2',
          candidates.length === 2 && 'grid-cols-2',
          candidates.length >= 3 && 'grid-cols-3',
          candidates.length === 4 && 'md:grid-cols-4',
        )}
      >
        {candidates.map((country) => (
          <div
            key={country.code}
            data-split-candidate="true"
            className="w-full py-6 sm:px-4 xs:px-3 px-2 bg-primary-800 bg-gradient-to-br from-primary-800 to-primary-900/50 rounded shadow-md relative hover:bg-primary-700 transition-colors duration-300 cursor-pointer sm:space-y-3 space-y-2"
            onClick={() => {
              closeSplitScreenQualifierModal();
              setTimeout(() => {
                pickQualifier(country.code);
              }, CLOSE_ANIMATION_DELAY_MS);
            }}
          >
            <div className="px-1 xs:px-4 sm:px-6 md:px-8">
              <img
                src={getFlagPath(country.code)}
                alt={country.name}
                className="w-full  aspect-[13/9] object-cover rounded"
              />
            </div>
            <h2 className="text-white sm:text-2xl xs:text-xl text-lg leading-tight font-bold text-center line-clamp-2">
              {country.name}
            </h2>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default SplitScreenQualifierModal;
