'use client';
import { useLocale, useTranslations } from 'next-intl';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_ODDS,
  formatOdds,
  moveCode,
  OddsChannel,
  oddsKey,
} from './oddsFormat';

import {
  SortableItem,
  SortableList,
} from '@/components/common/sort/SortableList';
import { BoardCap, BoardFlag } from '@/components/setup/hub/lineup/CountryTile';
import { useBoardRowLook } from '@/components/setup/hub/lineup/useBoardRowLook';
import { BaseCountry } from '@/models';
import { playHaptic } from '@/native/haptics';
import { CountryOdds } from '@/state/countriesStore';
import { oddsToRankOrder } from '@/state/scoreboard/rankToOdds';

interface OddsRankListProps {
  countries: BaseCountry[];
  channel: OddsChannel;
  countryOdds: CountryOdds;
  /** A country was dropped in a new place: `order` is the new ranking. */
  onDrop: (order: string[], movedCode: string) => void;
  /** The country dropped last, ringed until the next change. */
  movedCode: string | null;
}

/** "SE:60|AL:41.5": a channel's odds, to tell our own writes from others'. */
const oddsSignature = (
  countries: BaseCountry[],
  countryOdds: CountryOdds,
  channel: OddsChannel,
) => {
  const key = oddsKey(channel);

  return countries
    .map((c) => `${c.code}:${countryOdds[c.code]?.[key] ?? DEFAULT_ODDS}`)
    .join('|');
};

/**
 * Ranking: the countries as the theme draws its scoreboard (jury rows, flag
 * shape, case, points box), best first, with the odds each one really has
 * in the points box. The places stay put in their own column while a row is
 * dragged. A drop hands the new order up (which re-spaces the channel's
 * odds); a change from elsewhere (Set all odds, Undo) re-reads the order.
 *
 * Keyboard: a focused row is picked up with Space or Enter, moved with ↑ / ↓
 * and put down with Space or Enter (Escape puts it back); ↑ / ↓ alone move
 * the focus.
 */
const OddsRankList: React.FC<OddsRankListProps> = ({
  countries,
  channel,
  countryOdds,
  onDrop,
  movedCode,
}) => {
  const t = useTranslations('settings.odds');
  const locale = useLocale();
  const look = useBoardRowLook();
  const keysHintId = useId();

  const signature = oddsSignature(countries, countryOdds, channel);
  const countryCodesKey = countries.map((c) => c.code).join(',');
  const seedKey = `${channel}|${countryCodesKey}`;

  const [order, setOrder] = useState<string[]>(() =>
    oddsToRankOrder(countries, countryOdds, channel),
  );
  const orderRef = useRef(order);

  orderRef.current = order;

  const [grabbed, setGrabbed] = useState<string | null>(null);
  const grabStartRef = useRef<string[] | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [announcement, setAnnouncement] = useState('');

  // The odds our last drop produced: when they come back, the order (which
  // may hold ties the odds can't tell apart) stays. Anything else (another
  // channel, other countries, Set all odds, Undo) re-reads the order from
  // the odds and ends a keyboard move.
  const [writes, setWrites] = useState(0);
  const ownWriteRef = useRef(false);
  const signatureRef = useRef(signature);
  const seedKeyRef = useRef(seedKey);

  useEffect(() => {
    if (ownWriteRef.current) {
      ownWriteRef.current = false;
      signatureRef.current = signature;

      return;
    }
    if (seedKeyRef.current === seedKey && signatureRef.current === signature) {
      return;
    }
    seedKeyRef.current = seedKey;
    signatureRef.current = signature;
    setOrder(oddsToRankOrder(countries, countryOdds, channel));
    setGrabbed(null);
    grabStartRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, signature, writes]);

  const byCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries],
  );

  const commit = (next: string[], moved: string) => {
    ownWriteRef.current = true;
    setOrder(next);
    setWrites((w) => w + 1);
    onDrop(next, moved);
  };

  // While a row is moved with the keyboard, React moves its node: give it
  // the focus back before anything sees it gone.
  useLayoutEffect(() => {
    if (grabbed) rowRefs.current.get(grabbed)?.focus();
  }, [grabbed, order]);

  const nameOf = (code: string) => byCode.get(code)?.name ?? code;

  const putDown = (code: string) => {
    const { current: start } = grabStartRef;
    const { current } = orderRef;

    setGrabbed(null);
    grabStartRef.current = null;
    if (start && start.join() !== current.join()) {
      playHaptic({ id: 'dragDrop' });
      commit(current, code);
    } else {
      setAnnouncement(
        t('rankPlace', {
          country: nameOf(code),
          place: current.indexOf(code) + 1,
        }),
      );
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    code: string,
    index: number,
  ) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (grabbed === code) {
        putDown(code);
      } else {
        playHaptic({ id: 'dragLift' });
        grabStartRef.current = order;
        setGrabbed(code);
        setAnnouncement(t('rankGrabbed', { country: nameOf(code) }));
      }

      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const target = index + (e.key === 'ArrowUp' ? -1 : 1);

      if (target < 0 || target >= order.length) return;

      if (grabbed === code) {
        playHaptic({ id: 'dragSlot' });
        setOrder(moveCode(order, index, target));
        setAnnouncement(
          t('rankPlace', { country: nameOf(code), place: target + 1 }),
        );
      } else {
        rowRefs.current.get(order[target])?.focus();
      }

      return;
    }

    if (e.key === 'Escape' && grabbed === code) {
      e.preventDefault();
      e.stopPropagation();
      const start = grabStartRef.current ?? order;

      setOrder(start);
      grabStartRef.current = null;
      setGrabbed(null);
      setAnnouncement(
        t('rankPlace', {
          country: nameOf(code),
          place: start.indexOf(code) + 1,
        }),
      );
    }
  };

  const key = oddsKey(channel);
  const rowHeight = `h-8 md:h-9 ${look.rounded ? 'lg:h-9' : 'lg:h-10'}`;

  return (
    <div className="dp-odds-rank grid grid-cols-[26px_minmax(0,1fr)] gap-x-2">
      <ol aria-hidden="true" className="dp-odds-places m-0 list-none p-0">
        {order.map((code, index) => (
          <li
            key={code}
            className={`dp-odds-slot dp-odds-place ${
              movedCode === code ? 'is-moved' : ''
            }`}
          >
            <span className={`${rowHeight} flex items-center justify-end`}>
              {index + 1}
            </span>
          </li>
        ))}
      </ol>
      <SortableList
        onSortEnd={(from, to) => {
          if (from !== to) commit(moveCode(order, from, to), order[from]);
        }}
        lockAxis="y"
        className="dp-odds-rows min-w-0"
        draggedItemClassName="dp-odds-rank-dragged"
      >
        {order.map((code, index) => {
          const country = byCode.get(code);

          if (!country) return null;
          const value = countryOdds[code]?.[key] ?? DEFAULT_ODDS;
          const formatted = formatOdds(value, locale);

          return (
            <SortableItem key={code}>
              <div
                ref={(el) => {
                  if (el) rowRefs.current.set(code, el);
                  else rowRefs.current.delete(code);
                }}
                role="button"
                tabIndex={0}
                aria-pressed={grabbed === code}
                aria-label={t('rankRow', {
                  place: index + 1,
                  country: country.name,
                  odds: formatted,
                })}
                aria-describedby={keysHintId}
                onKeyDown={(e) => handleKeyDown(e, code, index)}
                onBlur={() => {
                  if (grabbed !== code) return;
                  // Focus left for good (not React moving the node): keep
                  // the place it was moved to.
                  requestAnimationFrame(() => {
                    if (document.activeElement !== rowRefs.current.get(code)) {
                      putDown(code);
                    }
                  });
                }}
                className={`dp-odds-slot dp-odds-pick ${
                  grabbed === code ? 'is-grabbed' : ''
                } ${
                  movedCode === code ? 'is-moved' : ''
                } cursor-grab touch-manipulation select-none outline-none`}
              >
                <div
                  className={`dp-odds-board dp-scoreboard-font bg-countryItem-juryBg text-countryItem-juryCountryText ${
                    look.rounded ? 'rounded-full' : 'rounded-[3px]'
                  } ${rowHeight} flex min-w-0 items-center gap-[5px] overflow-hidden md:gap-[6px]`}
                  style={look.rowStyle}
                >
                  <BoardFlag country={country} look={look} />
                  <span
                    className={`min-w-0 flex-1 truncate font-bold ${
                      look.uppercase
                        ? 'uppercase text-[12px] 2cols:text-[12.5px]'
                        : 'text-[13px]'
                    } ${look.flagShape === 'none' ? 'pl-3' : ''}`}
                  >
                    {country.name}
                  </span>
                  <BoardCap
                    look={look}
                    widthClassName="w-[44px] md:w-[48px] lg:w-[50px]"
                  >
                    <span className="text-[12.5px] font-bold tabular-nums md:text-[13px]">
                      {formatted}
                    </span>
                  </BoardCap>
                </div>
              </div>
            </SortableItem>
          );
        })}
      </SortableList>
      <p id={keysHintId} className="sr-only">
        {t('rankKeys')}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};

export default OddsRankList;
