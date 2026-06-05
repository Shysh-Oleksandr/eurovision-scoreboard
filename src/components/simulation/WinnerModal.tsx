'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '../common/Button';

import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const OPEN_DELAY_MS = 3000;
const CLOSE_DURATION_MS = 280;
const SPARKLE_COUNT = 22;

type Sparkle = {
  left: string;
  top: string;
  size: string;
  dur: string;
  del: string;
};

const randomEdgePosition = (): Pick<Sparkle, 'left' | 'top'> => {
  const side = Math.floor(Math.random() * 4);

  const percentageFromEdge = 40;

  if (side === 0) {
    return {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * percentageFromEdge}%`,
    };
  }

  if (side === 1) {
    return {
      left: `${Math.random() * 100}%`,
      top: `${82 + Math.random() * percentageFromEdge}%`,
    };
  }

  if (side === 2) {
    return {
      left: `${Math.random() * percentageFromEdge}%`,
      top: `${Math.random() * 100}%`,
    };
  }

  return {
    left: `${82 + Math.random() * percentageFromEdge}%`,
    top: `${Math.random() * 100}%`,
  };
};

const generateSparkle = (): Sparkle => ({
  ...randomEdgePosition(),
  size: `${8 + Math.random() * 9}px`,
  dur: `${2.0 + Math.random() * 1.2}s`,
  del: `${Math.random() * 1.6}s`,
});

const WinnerModal = () => {
  const t = useTranslations('simulation.winnerModal');
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.isWinnerAnimationAlreadyDisplayed,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [sparkles] = useState<Sparkle[]>(() =>
    Array.from({ length: SPARKLE_COUNT }, generateSparkle),
  );
  const scoreRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const shouldShowWinnerModal = showModal && !!winnerCountry;

  useEffect(() => {
    if (winnerCountry && !isWinnerAnimationAlreadyDisplayed) {
      const timer = setTimeout(() => setShowModal(true), OPEN_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [winnerCountry, isWinnerAnimationAlreadyDisplayed]);

  useEffect(() => {
    if (!shouldShowWinnerModal || !scoreRef.current || !winnerCountry) return;

    const el = scoreRef.current;
    const target = toFixedIfDecimalFloat(winnerCountry.points);
    const startDelay = 1300;
    const duration = 3000;

    const timeoutId = setTimeout(() => {
      let start: number | null = null;

      const step = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        el.textContent = String(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }, startDelay);

    return () => clearTimeout(timeoutId);
  }, [shouldShowWinnerModal, winnerCountry]);

  // Clean up the close timer if the component unmounts mid-animation.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const startClose = useCallback((afterClose?: () => void) => {
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      afterClose?.();
    }, CLOSE_DURATION_MS);
  }, []);

  const handleClose = useCallback(() => {
    startClose(() => setEventSetupModalOpen(true));
  }, [startClose, setEventSetupModalOpen]);

  // Re-randomize position/size each time a sparkle loops.
  // The jump is invisible: opacity is 0 at both 0% and 100% of the keyframe.
  const handleSparkleIteration = useCallback(
    (e: React.AnimationEvent<HTMLSpanElement>) => {
      const el = e.currentTarget;
      const next = randomEdgePosition();

      el.style.left = next.left;
      el.style.top = next.top;
      el.style.fontSize = `${8 + Math.random() * 9}px`;
    },
    [],
  );

  if (!shouldShowWinnerModal || !winnerCountry) return null;

  const targetScore = toFixedIfDecimalFloat(winnerCountry.points);
  const scoreFinalText = String(Math.round(targetScore));
  const flagSrc = getFlagPath(winnerCountry, 'big-rectangle');

  const scoreTextStyle: React.CSSProperties = {
    color: '#ffe87a',
    fontWeight: 800,
    fontSize: '22px',
    fontVariantNumeric: 'tabular-nums',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isClosing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.7)',
        transition: `background ${CLOSE_DURATION_MS}ms ease`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        zIndex: 150,
      }}
      onClick={() => startClose()}
    >
      {/* Glow blob centred behind the card */}
      <div
        style={{
          position: 'absolute',
          width: '520px',
          height: '280px',
          background:
            'radial-gradient(ellipse, hsl(var(--twc-primary-700) / 0.6) 0%, transparent 65%)',
          animation: 'winner-glow 3s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />

      {/* Sparkle particles */}
      {sparkles.map((s) => (
        <span
          key={`${s.left}-${s.top}`}
          style={{
            position: 'absolute',
            color: '#ffe87a',
            lineHeight: 1,
            opacity: 0,
            pointerEvents: 'none',
            userSelect: 'none',
            fontSize: s.size,
            left: s.left,
            top: s.top,
            animation: `winner-sparkle ${s.dur} ease-in-out ${s.del} infinite`,
          }}
          onAnimationIteration={handleSparkleIteration}
        >
          ✦
        </span>
      ))}

      {/* Modal card — stop clicks from bubbling to the overlay */}
      <div
        style={{
          background: 'hsl(var(--twc-primary-900))',
          border: '1.5px solid rgba(255,255,255,0.14)',
          borderRadius: '22px',
          padding: '40px 48px 34px',
          width: '460px',
          maxWidth: 'calc(100vw - 32px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow:
            '0 28px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.11)',
          ...(isClosing
            ? {
                opacity: 0,
                transform: 'scale(0.94) translateY(8px)',
                transition: `opacity ${CLOSE_DURATION_MS}ms ease, transform ${CLOSE_DURATION_MS}ms ease`,
              }
            : {
                animation:
                  'winner-modal-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both',
              }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top hairline highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)',
          }}
        />

        {/* Flag */}
        <img
          src={flagSrc}
          alt={`${winnerCountry.name} flag`}
          onError={(e) => handleFlagError(e.currentTarget, winnerCountry)}
          style={{
            width: '96px',
            height: '64px',
            objectFit: 'cover',
            display: 'block',
            margin: '0 auto 20px',
            borderRadius: '6px',
            opacity: 0,
            animation:
              'winner-flag-in 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both',
          }}
        />

        {/* Heading */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '10px',
            letterSpacing: '-0.3px',
            opacity: 0,
            animation: 'winner-slide-up 0.45s ease 0.9s both',
          }}
        >
          {t('title')}
        </h1>

        {/* Body text — country name bold white, score gold animated count-up */}
        <p
          style={{
            fontSize: '18px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.82)',
            marginBottom: '28px',
            lineHeight: 1.5,
            opacity: 0,
            animation: 'winner-slide-up 0.45s ease 1.1s both',
          }}
        >
          {t.rich('points', {
            country: winnerCountry.name,
            points: 0,
            span1: (chunks) => (
              <span style={{ color: '#fff', fontWeight: 700 }}>{chunks}</span>
            ),
            span2: (chunks) => (
              <span
                style={{
                  display: 'inline-grid',
                  verticalAlign: 'baseline',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    ...scoreTextStyle,
                    gridArea: '1 / 1',
                    visibility: 'hidden',
                  }}
                >
                  {scoreFinalText}
                </span>
                <span
                  ref={scoreRef}
                  style={{ ...scoreTextStyle, gridArea: '1 / 1' }}
                >
                  {chunks}
                </span>
              </span>
            ),
          })}
        </p>

        {/* Start Over button */}
        <Button
          label={t('startOver')}
          onClick={handleClose}
          variant="winner"
          className="!text-[13px] !py-[13px] !px-0 !rounded-[10px] w-full"
          style={{
            opacity: 0,
            animation: 'winner-slide-up 0.45s ease 1.35s both',
          }}
        />
      </div>
    </div>,
    document.body,
  );
};

export default WinnerModal;
