'use client';
import { ChevronDown, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useId, useRef, useState } from 'react';

import AnchoredMenu, { AnchoredMenuEntry } from '../common/AnchoredMenu';

import {
  DEFAULT_ODDS,
  OddsChannel,
  OddsSort,
  oddsKey,
} from './odds/oddsFormat';
import OddsRankList from './odds/OddsRankList';
import OddsSegmented from './odds/OddsSegmented';
import OddsSlider from './odds/OddsSlider';
import OddsTable from './odds/OddsTable';
import { OddsController } from './useGlobalOddsController';

import { useHasFinePointer } from '@/hooks/useHasFinePointer';
import { BaseCountry } from '@/models';
import { playHaptic } from '@/native/haptics';
import { CountryOdds, useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { rankOrderToOdds } from '@/state/scoreboard/rankToOdds';

type OddsView = 'numbers' | 'rank';
type SliderId = 'randomness' | 'spread';

/** What a change replaced, so Undo can put it back. */
interface Snapshot {
  odds: CountryOdds;
  randomnessLevel: number;
  pointsSpread: number;
}

/** The last bulk change or drop: its line ("… Undo") and the dropped row. */
interface LastAction {
  message: string;
  snapshot: Snapshot;
  movedCode: string | null;
}

interface OddsSettingsProps {
  controller: OddsController;
  countries: BaseCountry[];
  onLoaded?: () => void;
  /** Stage override: the line on top of the controls. */
  note?: string;
  /** Stage override: "Global odds" first in Set all odds (when it differs). */
  onUseGlobal?: () => void;
}

/**
 * The odds of the participating countries, laid out like the simulation:
 * the countries on the left (Numbers: a table with Jury / Televote columns;
 * Ranking: the theme's board rows to drag), one column of controls on the
 * right that stays put. Narrower than 700px the column folds above the list
 * and the sliders into two combos. Every bulk change and every drop leaves a
 * line with Undo until the next change.
 *
 * Driven by an `OddsController`: the global odds in Settings, or a stage's
 * draft in Edit stage → Odds.
 */
const OddsSettings: React.FC<OddsSettingsProps> = ({
  controller,
  countries,
  onLoaded,
  note,
  onUseGlobal,
}) => {
  const t = useTranslations();
  const {
    countryOdds,
    randomnessLevel,
    pointsSpread,
    updateCountryOdds,
    setBulkCountryOdds,
    setRandomnessLevel,
    setPointsSpread,
    loadYearOdds,
  } = controller;
  const baseId = useId();
  const hasFinePointer = useHasFinePointer();
  const year = useGeneralStore((state) => state.year);
  const yearHasOdds = useCountriesStore((state) =>
    state.allCountriesForYear.some(
      (c) =>
        typeof c.juryOdds === 'number' || typeof c.televoteOdds === 'number',
    ),
  );

  const [view, setView] = useState<OddsView>('numbers');
  const [channel, setChannel] = useState<OddsChannel>('jury');
  const [sort, setSort] = useState<OddsSort>('name');
  const [resortKey, setResortKey] = useState(0);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const [openSlider, setOpenSlider] = useState<SliderId | null>(null);
  const [liveRandomness, setLiveRandomness] = useState(randomnessLevel);
  const [liveSpread, setLiveSpread] = useState(pointsSpread);

  useEffect(() => setLiveRandomness(randomnessLevel), [randomnessLevel]);
  useEffect(() => setLiveSpread(pointsSpread), [pointsSpread]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  const takeSnapshot = (): Snapshot => {
    const odds: CountryOdds = {};

    countries.forEach((country) => {
      odds[country.code] = { ...(countryOdds[country.code] || {}) };
    });

    return { odds, randomnessLevel, pointsSpread };
  };

  const runBulk = (message: string, apply: () => void) => {
    const snapshot = takeSnapshot();

    apply();
    setLastAction({ message, snapshot, movedCode: null });
    setResortKey((key) => key + 1);
  };

  const undo = () => {
    if (!lastAction) return;
    const { snapshot } = lastAction;

    setBulkCountryOdds(snapshot.odds);
    if (snapshot.randomnessLevel !== randomnessLevel) {
      setRandomnessLevel(snapshot.randomnessLevel);
    }
    if (snapshot.pointsSpread !== pointsSpread) {
      setPointsSpread(snapshot.pointsSpread);
    }
    setLastAction(null);
    setResortKey((key) => key + 1);
    playHaptic({ id: 'undo' });
  };

  const setDefaultOdds = () =>
    runBulk(t('settings.odds.doneDefault'), () => loadYearOdds(countries));

  const setEvenOdds = () =>
    runBulk(t('settings.odds.doneEven'), () => {
      const payload: CountryOdds = {};

      countries.forEach((country) => {
        payload[country.code] = {
          juryOdds: DEFAULT_ODDS,
          televoteOdds: DEFAULT_ODDS,
        };
      });
      setBulkCountryOdds(payload);
    });

  const setRandomOdds = () =>
    runBulk(t('settings.odds.doneRandom'), () => {
      const payload: CountryOdds = {};

      // Televote within 50 of the jury, and never equal to it.
      countries.forEach((country) => {
        const juryOdds = Math.floor(Math.random() * 101);
        const minTelevote = Math.max(1, juryOdds - 50);
        const maxTelevote = Math.min(99, juryOdds + 50);
        const draw = () =>
          Math.floor(Math.random() * (maxTelevote - minTelevote + 1)) +
          minTelevote;
        let televoteOdds = draw();

        while (televoteOdds === juryOdds) televoteOdds = draw();
        payload[country.code] = { juryOdds, televoteOdds };
      });
      setBulkCountryOdds(payload);
    });

  const copyOdds = (from: OddsChannel) =>
    runBulk(
      t(
        from === 'jury'
          ? 'settings.odds.doneCopyJury'
          : 'settings.odds.doneCopyTelevote',
      ),
      () => {
        const fromKey = oddsKey(from);
        const toKey = oddsKey(from === 'jury' ? 'televote' : 'jury');
        const payload: CountryOdds = {};

        countries.forEach((country) => {
          const existing = countryOdds[country.code] || {};

          payload[country.code] = {
            ...existing,
            [toKey]: existing[fromKey] ?? DEFAULT_ODDS,
          };
        });
        setBulkCountryOdds(payload);
      },
    );

  const handleCommit = (
    code: string,
    fieldChannel: OddsChannel,
    value: number | undefined,
  ) => {
    updateCountryOdds(code, { [oddsKey(fieldChannel)]: value });
    setLastAction(null);
  };

  // A drop re-spaces the whole channel by the new order and Points spread.
  const handleDrop = (order: string[], movedCode: string) => {
    const snapshot = takeSnapshot();
    const generated = rankOrderToOdds(order, pointsSpread);
    const key = oddsKey(channel);
    const payload: CountryOdds = {};

    order.forEach((code) => {
      payload[code] = { ...(countryOdds[code] || {}), [key]: generated[code] };
    });
    setBulkCountryOdds(payload);
    setLastAction({
      message: t(
        channel === 'jury'
          ? 'settings.odds.doneRankJury'
          : 'settings.odds.doneRankTelevote',
      ),
      snapshot,
      movedCode,
    });
    setResortKey((key) => key + 1);
  };

  const changeRandomness = (value: number) => {
    setRandomnessLevel(value);
    setLastAction(null);
  };

  const changeSpread = (value: number) => {
    setPointsSpread(value);
    setLastAction(null);
  };

  if (countries.length === 0) {
    return (
      <div className="mx-auto max-w-[420px] py-12 text-center">
        <p className="text-[17px] font-extrabold tracking-[-0.015em] text-white">
          {t('settings.odds.noParticipatingCountriesSelectedYet')}
        </p>
        <p className="mt-1.5 text-[13.5px] font-semibold text-white/60 text-balance">
          {t(
            'settings.odds.goBackToSetupAndSelectCountriesForEventToSetTheirOdds',
          )}
        </p>
      </div>
    );
  }

  const menuItems: AnchoredMenuEntry[] = [
    ...(onUseGlobal
      ? ([
          {
            label: t('settings.odds.setGlobal'),
            description: t('settings.odds.setGlobalHint'),
            onClick: () => runBulk(t('settings.odds.doneGlobal'), onUseGlobal),
          },
          'hr',
        ] as AnchoredMenuEntry[])
      : []),
    {
      label: t('settings.odds.setDefault'),
      description: yearHasOdds
        ? t('settings.odds.setDefaultHint', { year })
        : t('settings.odds.setDefaultNone', { year }),
      onClick: setDefaultOdds,
    },
    {
      label: t('settings.odds.setEven'),
      description: t('settings.odds.setEvenHint'),
      onClick: setEvenOdds,
    },
    {
      label: t('settings.odds.setRandom'),
      description: t('settings.odds.setRandomHint'),
      onClick: setRandomOdds,
    },
    'hr',
    {
      label: t('settings.odds.copyJuryToTelevote'),
      icon: <Copy className="size-[17px]" />,
      onClick: () => copyOdds('jury'),
    },
    {
      label: t('settings.odds.copyTelevoteToJury'),
      icon: <Copy className="size-[17px]" />,
      onClick: () => copyOdds('televote'),
    },
  ];

  const hint =
    view === 'numbers'
      ? t('settings.odds.hintNumbers')
      : `${t(
          hasFinePointer
            ? 'settings.odds.hintRank'
            : 'settings.odds.hintRankTouch',
        )} ${t(
          channel === 'jury'
            ? 'settings.odds.rankDropJury'
            : 'settings.odds.rankDropTelevote',
        )}`;

  const sliders: Record<
    SliderId,
    {
      label: string;
      value: number;
      live: number;
      onChange: (value: number) => void;
      onLive: (value: number) => void;
      minLabel: string;
      maxLabel: string;
    }
  > = {
    randomness: {
      label: t('settings.odds.randomnessLevel'),
      value: randomnessLevel,
      live: liveRandomness,
      onChange: changeRandomness,
      onLive: setLiveRandomness,
      minLabel: t('settings.odds.predictable'),
      maxLabel: t('settings.odds.chaotic'),
    },
    spread: {
      label: t('settings.odds.pointsSpread'),
      value: pointsSpread,
      live: liveSpread,
      onChange: changeSpread,
      onLive: setLiveSpread,
      minLabel: t('settings.odds.tight'),
      maxLabel: t('settings.odds.wide'),
    },
  };
  const sliderIds: SliderId[] = ['randomness', 'spread'];
  const popId = `${baseId}-slider`;

  return (
    <div className="dp-odds dp-flat">
      <div className="dp-odds-layout">
        <div className="dp-odds-side">
          {note && (
            <p className="text-[13px] font-semibold leading-[1.5] text-white/70">
              {note}
            </p>
          )}

          <div className="dp-odds-toprow">
            <OddsSegmented<OddsView>
              className="dp-odds-view"
              ariaLabel={t('settings.odds.viewLabel')}
              value={view}
              onChange={setView}
              options={[
                { value: 'numbers', label: t('settings.odds.numbersView') },
                { value: 'rank', label: t('settings.odds.rankView') },
              ]}
            />
            <button
              ref={menuAnchorRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`dp-odds-setall dp-act ${
                menuOpen ? 'is-on' : ''
              } flex flex-none items-center gap-2 rounded-xl pl-3.5 pr-3 text-[13.5px] font-extrabold normal-case`}
            >
              <span className="dp-odds-setall-long min-w-0 flex-1 truncate text-left">
                {t('settings.odds.setAll')}
              </span>
              <span className="dp-odds-setall-short">
                {t('settings.odds.setAllShort')}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 flex-none text-white/70"
              />
            </button>
          </div>

          {view === 'rank' && (
            <OddsSegmented<OddsChannel>
              className="dp-odds-chan"
              ariaLabel={t('settings.odds.rankChannel')}
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'jury', label: t('simulation.finalStats.jury') },
                {
                  value: 'televote',
                  label: t('simulation.finalStats.televote'),
                },
              ]}
            />
          )}

          <div className="dp-odds-combos">
            {sliderIds.map((id) => {
              const slider = sliders[id];
              const open = openSlider === id;

              return (
                <button
                  key={id}
                  type="button"
                  aria-expanded={open}
                  aria-controls={open ? popId : undefined}
                  onClick={() => setOpenSlider(open ? null : id)}
                  className={`dp-act ${
                    open ? 'is-on' : ''
                  } flex h-[46px] min-w-0 items-center gap-2 rounded-xl pl-3 pr-2.5 text-left normal-case`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      id={`${baseId}-${id}-caption`}
                      className="block truncate text-[11.5px] font-semibold leading-[1.15] text-white/55"
                    >
                      {slider.label}
                    </span>
                    <span className="block text-[14.5px] font-bold leading-[1.35] tabular-nums">
                      {slider.live}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 flex-none text-white/55 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {openSlider && (
            <div
              id={popId}
              className="dp-odds-pop rounded-[14px] px-3.5 pb-3 pt-4"
            >
              <OddsSlider
                key={openSlider}
                id={`${baseId}-pop`}
                ariaLabelledBy={`${baseId}-${openSlider}-caption`}
                value={sliders[openSlider].value}
                onChange={sliders[openSlider].onChange}
                onLive={sliders[openSlider].onLive}
                minLabel={sliders[openSlider].minLabel}
                maxLabel={sliders[openSlider].maxLabel}
              />
            </div>
          )}

          <div className="dp-odds-msg">
            {lastAction ? (
              <p className="text-[13px] font-semibold leading-[1.5] text-white/75">
                {lastAction.message}{' '}
                <button
                  type="button"
                  onClick={undo}
                  className="dp-odds-undo rounded font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {t('settings.odds.undo')}
                </button>
              </p>
            ) : (
              <p className="text-[13px] font-semibold leading-[1.5] text-white/55">
                {hint}
              </p>
            )}
          </div>

          <div className="dp-odds-sliders">
            {sliderIds.map((id) => (
              <OddsSlider
                key={id}
                id={`${baseId}-${id}`}
                label={sliders[id].label}
                value={sliders[id].value}
                onChange={sliders[id].onChange}
                minLabel={sliders[id].minLabel}
                maxLabel={sliders[id].maxLabel}
              />
            ))}
          </div>
        </div>

        <div className="dp-odds-list min-w-0">
          {view === 'numbers' ? (
            <OddsTable
              countries={countries}
              countryOdds={countryOdds}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setResortKey((key) => key + 1);
              }}
              resortKey={resortKey}
              onCommit={handleCommit}
            />
          ) : (
            <OddsRankList
              countries={countries}
              channel={channel}
              countryOdds={countryOdds}
              onDrop={handleDrop}
              movedCode={lastAction?.movedCode ?? null}
            />
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {lastAction?.message ?? ''}
      </p>

      <AnchoredMenu
        open={menuOpen}
        anchor={menuAnchorRef.current}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        placement="bottom-end"
        className="min-w-[288px]"
        ariaLabel={t('settings.odds.setAll')}
        plainHeaders
      />
    </div>
  );
};

export default OddsSettings;
