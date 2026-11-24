'use client';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useLayoutEffect, useRef } from 'react';

import StatsFlag, { useFlagSettings } from '../StatsFlag';

import { useStatusText } from './useStatusText';
import type { VotesCountry, VotesDirection, VotesLink } from './votesData';

interface VotesCardProps {
  country: VotesCountry;
  center: VotesCountry;
  link: VotesLink;
  direction: VotesDirection;
  split: boolean;
  /** The flag's place and diameter on the ring. */
  target: { x: number; y: number; d: number };
  area: { w: number; h: number; cx: number };
  /** Tapped (touch): the card takes taps and offers Open. */
  interactive: boolean;
  onOpen: () => void;
}

const GAP = 12;
const EDGE = 8;

/**
 * A flag's details beside it on the ring: who it is, where it finished,
 * and what went between it and the middle, split into jury and televote.
 * Pointing at a flag shows it; on touch the first tap does, with Open.
 */
const VotesCard: React.FC<VotesCardProps> = ({
  country,
  center,
  link,
  direction,
  split,
  target,
  area,
  interactive,
  onOpen,
}) => {
  const t = useTranslations('simulation.finalStats.votes');
  const tStats = useTranslations('simulation.finalStats');
  const flagSettings = useFlagSettings();
  const statusText = useStatusText();
  const ref = useRef<HTMLDivElement>(null);

  // Beside the flag, on the side facing the middle; above or below it when
  // the ring leaves no room at the side (phones).
  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const r = target.d / 2;
    const toRight = target.x < area.cx;
    let left = toRight ? target.x + r + GAP : target.x - r - GAP - w;
    let top = target.y - h / 2;
    const fitsBeside = left >= EDGE && left + w <= area.w - EDGE;

    if (!fitsBeside) {
      left = target.x - w / 2;
      top = target.y < area.h / 2 ? target.y + r + GAP : target.y - r - GAP - h;
    }

    left = Math.min(Math.max(EDGE, left), area.w - w - EDGE);
    top = Math.min(Math.max(EDGE, top), area.h - h - EDGE);
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(
      top,
    )}px)`;
    el.style.visibility = 'visible';
  });

  const isEntry = country.isEntry && country.points !== undefined;
  const status = statusText(country.status);
  const facts = isEntry
    ? t('statusWithPoints', { status, points: country.points ?? 0 })
    : status;

  return (
    <div
      ref={ref}
      className={`dp-votes-card ${interactive ? 'is-interactive' : ''}`}
      role={interactive ? 'dialog' : undefined}
      aria-label={interactive ? country.name : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      <div className="dp-votes-card-head">
        <StatsFlag country={country.country} settings={flagSettings} />
        <p className="dp-votes-card-name">{country.name}</p>
      </div>
      <p className="dp-votes-card-facts">{facts}</p>
      <div className="dp-votes-card-link">
        <p className="dp-votes-card-flow">
          {tStats('cellGave', {
            voter: direction === 'received' ? country.name : center.name,
            country: direction === 'received' ? center.name : country.name,
            points: link.total,
          })}
        </p>
        {split && (
          <p className="dp-votes-card-split">
            <span className="dp-votes-key">
              <span className="dp-votes-pill is-jury is-static">
                {link.jury}
              </span>
              {t('jury')}
            </span>
            <span className="dp-votes-key">
              <span className="dp-votes-pill is-tele is-static">
                {link.televote}
              </span>
              {t('televote')}
            </span>
          </p>
        )}
      </div>
      {interactive && (
        <button type="button" className="dp-votes-card-open" onClick={onOpen}>
          <span className="min-w-0 truncate">
            {t('open', { country: country.name })}
          </span>
          <ArrowRight className="size-4 flex-none" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default VotesCard;
