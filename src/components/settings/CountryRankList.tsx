import React, { useEffect, useMemo, useRef, useState } from 'react';

import { BaseCountry } from '../../models';

import { RankableCountryList } from '@/components/common/rank/RankableCountryList';
import { CountryOdds, useCountriesStore } from '@/state/countriesStore';
import {
  oddsToRankOrder,
  rankOrderToOdds,
} from '@/state/scoreboard/rankToOdds';

interface CountryRankListProps {
  countries: BaseCountry[];
  dimension: 'jury' | 'televote';
  pointsSpread: number;
  layout?: 'list' | 'grid';
  /**
   * Odds map used to seed the rank order. Defaults to the global store's
   * `countryOdds`; pass a draft map (e.g. a per-stage override) to seed from it.
   */
  oddsSource?: CountryOdds;
  /** Persist callback: receives the current order (best first). */
  onReorder: (orderedCodes: string[]) => void;
}

// Odds-specific wrapper around the shared `RankableCountryList`: owns the order
// (seeded from the active dimension's odds) and renders the generated odds as the
// trailing value. Persists only on an actual drag.
export const CountryRankList: React.FC<CountryRankListProps> = ({
  countries,
  dimension,
  pointsSpread,
  layout = 'list',
  oddsSource,
  onReorder,
}) => {
  const countryCodesKey = countries.map((c) => c.code).join(',');

  // Seed from the provided draft odds when given, else the global store map.
  const getSeedOdds = () =>
    oddsSource ?? useCountriesStore.getState().countryOdds;

  const [orderedCodes, setOrderedCodes] = useState<string[]>(() =>
    oddsToRankOrder(countries, getSeedOdds(), dimension),
  );

  // Reseed the order when the active dimension or the participating set changes.
  // Deliberately NOT dependent on countryOdds so our own writes don't reseed.
  // The ref starts at the initial key so the mount run is skipped — otherwise it
  // would create a second `orderedCodes` reference and trip the persist effect
  // below, overwriting odds just from opening rank view.
  const seededKeyRef = useRef(`${dimension}|${countryCodesKey}`);

  useEffect(() => {
    const key = `${dimension}|${countryCodesKey}`;

    if (seededKeyRef.current === key) return;
    seededKeyRef.current = key;

    setOrderedCodes(oddsToRankOrder(countries, getSeedOdds(), dimension));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension, countryCodesKey]);

  const generatedOdds = useMemo(
    () => rankOrderToOdds(orderedCodes, pointsSpread),
    [orderedCodes, pointsSpread],
  );

  // Persist odds ONLY on an actual drag — never on dimension switch or
  // points-spread changes — so passively opening/exploring rank view can't
  // overwrite the user's existing odds.
  const handleReorder = (next: string[]) => {
    setOrderedCodes(next);
    onReorder(next);
  };

  return (
    <RankableCountryList
      countries={countries}
      orderedCodes={orderedCodes}
      onReorder={handleReorder}
      layout={layout}
      valueFor={(code) => generatedOdds[code]}
    />
  );
};

export default CountryRankList;
