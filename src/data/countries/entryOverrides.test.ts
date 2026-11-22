import { describe, expect, it } from 'vitest';

import {
  applyEntryOverride,
  changedEntryOverrideCodes,
  countryFlagCode,
  freshEntryOverrides,
  historicalNamesFor,
  rebaseHistoricalNames,
  withEntryOverrideDefault,
  normalizeEntryOverride,
  reapplyEntryOverridesToStages,
  sanitizeEntryOverrides,
  withEntryOverrides,
} from './entryOverrides';

import { getFlagPath } from '@/helpers/getFlagPath';
import { EventStage, StageVotingMode } from '@/models';
import { getHostingCountryLogo } from '@/theme/hosting';

const mk = { code: 'MK', name: 'North Macedonia' };

describe('normalizeEntryOverride', () => {
  it('keeps only what differs from the built-in country', () => {
    expect(
      normalizeEntryOverride('MK', {
        name: ' F.Y.R. Macedonia ',
        flag: '/flags/mk.svg',
      }),
    ).toEqual({ name: 'F.Y.R. Macedonia' });
    expect(
      normalizeEntryOverride('MK', {
        name: 'North Macedonia',
        flag: '/flags/mk.svg',
      }),
    ).toBeNull();
    expect(normalizeEntryOverride('MK', { name: '', flag: '' })).toBeNull();
  });

  it('only takes flags the app can draw, and standard countries', () => {
    expect(
      normalizeEntryOverride('WW', { flag: 'javascript:alert(1)' }),
    ).toBeNull();
    expect(
      normalizeEntryOverride('WW', { flag: 'data:image/png;base64,AAAA' }),
    ).toBeNull();
    expect(normalizeEntryOverride('WW', { flag: '/flags/earth.svg' })).toEqual({
      flag: '/flags/earth.svg',
    });
    expect(normalizeEntryOverride('custom-1', { name: 'Mine' })).toBeNull();
  });
});

describe('sanitizeEntryOverrides', () => {
  it('drops unknown codes and broken values', () => {
    expect(
      sanitizeEntryOverrides({
        MK: { name: 'F.Y.R. Macedonia' },
        XX: { name: 'Nowhere' },
        CZ: 'Czech Republic',
        WW: { flag: 'https://cdn.douzepoints.app/a.png' },
      }),
    ).toEqual({
      MK: { name: 'F.Y.R. Macedonia' },
      WW: { flag: 'https://cdn.douzepoints.app/a.png' },
    });
    expect(sanitizeEntryOverrides(undefined)).toEqual({});
    expect(sanitizeEntryOverrides([1, 2])).toEqual({});
  });
});

describe('applyEntryOverride', () => {
  it('applies the name and flag and passes custom entries through', () => {
    expect(
      applyEntryOverride(mk, {
        name: 'F.Y.R. Macedonia',
        flag: '/flags/yu.svg',
      }),
    ).toEqual({ code: 'MK', name: 'F.Y.R. Macedonia', flag: '/flags/yu.svg' });

    const custom = { code: 'custom-1', name: 'Mine', flag: 'https://x/a.png' };

    expect(applyEntryOverride(custom, { name: 'Other' })).toBe(custom);
    expect(applyEntryOverride(mk, undefined)).toBe(mk);
  });

  it('goes back to the built-in name and flag once an override is removed', () => {
    const renamed = {
      code: 'MK',
      name: 'F.Y.R. Macedonia',
      flag: '/flags/yu.svg',
    };

    expect(
      applyEntryOverride(renamed, undefined, {
        name: 'F.Y.R. Macedonia',
        flag: '/flags/yu.svg',
      }),
    ).toEqual(mk);
    // Only the flag was overridden: a name from elsewhere stays.
    expect(
      applyEntryOverride(
        { code: 'TR', name: 'Turkey', flag: '/flags/earth.svg' },
        undefined,
        { flag: '/flags/earth.svg' },
      ),
    ).toEqual({ code: 'TR', name: 'Turkey' });
  });
});

describe('withEntryOverrides', () => {
  it('returns the same list when nothing applies', () => {
    const list = [mk, { code: 'SE', name: 'Sweden' }];

    expect(withEntryOverrides(list, {})).toBe(list);
    expect(withEntryOverrides(list, { CZ: { name: 'Czech Republic' } })).toBe(
      list,
    );
    expect(
      withEntryOverrides(list, { MK: { name: 'F.Y.R. Macedonia' } })[0].name,
    ).toBe('F.Y.R. Macedonia');
  });
});

describe('changedEntryOverrideCodes', () => {
  it('lists added, removed and changed codes', () => {
    expect(
      changedEntryOverrideCodes(
        {
          MK: { name: 'A' },
          CZ: { name: 'B' },
          WW: { flag: '/flags/earth.svg' },
        },
        { MK: { name: 'A' }, CZ: { name: 'C' }, SE: { name: 'D' } },
      ).sort(),
    ).toEqual(['CZ', 'SE', 'WW']);
  });
});

describe('reapplyEntryOverridesToStages', () => {
  const stage = (id: string): EventStage => ({
    id,
    name: id,
    order: 0,
    votingMode: StageVotingMode.JURY_AND_TELEVOTE,
    countries: [
      {
        ...mk,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      },
    ],
    votingCountries: [{ code: 'WW', name: 'Rest of the World' }],
    isOver: false,
    isJuryVoting: true,
  });

  it('redraws participants and voters of the changed codes only', () => {
    const stages = [stage('SF1'), stage('GF')];
    const next = {
      MK: { name: 'F.Y.R. Macedonia' },
      WW: { flag: '/flags/earth.svg' },
    };
    const redrawn = reapplyEntryOverridesToStages(stages, {}, next);

    expect(redrawn[1].countries[0].name).toBe('F.Y.R. Macedonia');
    expect(redrawn[1].countries[0].points).toBe(0);
    expect(redrawn[1].votingCountries?.[0]).toEqual({
      code: 'WW',
      name: 'Rest of the World',
      flag: '/flags/earth.svg',
    });
    expect(reapplyEntryOverridesToStages(redrawn, next, next)).toBe(redrawn);
    expect(reapplyEntryOverridesToStages(redrawn, next, {})[1]).toEqual(
      stages[1],
    );
  });
});

describe('flags of overridden countries', () => {
  it('names a country flag path by its code', () => {
    expect(countryFlagCode('/flags/yu.svg')).toBe('YU');
    expect(countryFlagCode('/flags/gb-wls.svg')).toBe('GB-WLS');
    expect(countryFlagCode('/flags/earth.svg')).toBeNull();
    expect(countryFlagCode('https://douzepoints.app/flags/yu.svg')).toBeNull();
  });

  it("draws another country's flag in the theme's shapes", () => {
    const withFrance = { ...mk, flag: '/flags/fr.svg' };

    expect(getFlagPath(withFrance, 'round')).toBe('/flags-shapes/round/fr.svg');
    expect(getFlagPath(withFrance)).toBe('/flags/fr.svg');
    expect(getFlagPath({ ...mk, flag: '/flags/earth.svg' }, 'round')).toBe(
      '/flags/earth.svg',
    );
    expect(getFlagPath(mk, 'round')).toBe('/flags/mk.svg');
  });

  it('gives an own flag no heart and another country its heart', () => {
    const plain = getHostingCountryLogo(mk, true);
    const earth = getHostingCountryLogo(
      { code: 'WW', name: 'Rest of the World', flag: '/flags/earth.svg' },
      true,
    );
    const asSweden = getHostingCountryLogo({ ...mk, flag: '/flags/se.svg' });

    expect(plain.isExisting).toBe(true);
    expect(earth).toEqual({ logo: '/flags/earth.svg', isExisting: false });
    expect(asSweden).toEqual(getHostingCountryLogo('SE'));
  });
});

describe('historical names', () => {
  it('gives each year the names countries had then', () => {
    expect(historicalNamesFor(2008)).toEqual({
      MK: { name: 'F.Y.R. Macedonia' },
      CZ: { name: 'Czech Republic' },
      TR: { name: 'Turkey' },
    });
    expect(historicalNamesFor(2018).MK).toEqual({ name: 'F.Y.R. Macedonia' });
    expect(historicalNamesFor(2019).MK).toBeUndefined();
    expect(historicalNamesFor(2022)).toEqual({
      CZ: { name: 'Czech Republic' },
      TR: { name: 'Turkey' },
    });
    expect(historicalNamesFor(2023)).toEqual({});
    expect(historicalNamesFor(null)).toEqual({});
  });
});

describe('freshEntryOverrides', () => {
  it('starts from the historical names, with the account defaults on top', () => {
    expect(
      freshEntryOverrides({
        year: 2008,
        historicalNames: true,
        defaults: {
          MK: { flag: '/flags/yu.svg' },
          CZ: { name: 'Czechoslovakia' },
          WW: { flag: '/flags/earth.svg' },
          XX: { name: 'Nowhere' },
        },
      }),
    ).toEqual({
      MK: { name: 'F.Y.R. Macedonia', flag: '/flags/yu.svg' },
      CZ: { name: 'Czechoslovakia' },
      TR: { name: 'Turkey' },
      WW: { flag: '/flags/earth.svg' },
    });
  });

  it('leaves the historical names out when the setting is off', () => {
    expect(
      freshEntryOverrides({ year: 2008, historicalNames: false, defaults: {} }),
    ).toEqual({});
    expect(
      freshEntryOverrides({
        year: 2026,
        historicalNames: true,
        defaults: null,
      }),
    ).toEqual({});
  });
});

describe('rebaseHistoricalNames', () => {
  it("swaps one period's names for another's and keeps the user's own", () => {
    const from = historicalNamesFor(2018);
    const to = historicalNamesFor(2019);
    const overrides = {
      MK: { name: 'F.Y.R. Macedonia', flag: '/flags/yu.svg' },
      CZ: { name: 'Czechoslovakia' },
      WW: { flag: '/flags/earth.svg' },
    };

    expect(rebaseHistoricalNames(overrides, from, to)).toEqual({
      MK: { flag: '/flags/yu.svg' },
      CZ: { name: 'Czechoslovakia' },
      TR: { name: 'Turkey' },
      WW: { flag: '/flags/earth.svg' },
    });
  });

  it('turns the names on and off', () => {
    const names = historicalNamesFor(2015);
    const on = rebaseHistoricalNames({}, {}, names);

    expect(on).toEqual(names);
    expect(rebaseHistoricalNames(on, names, {})).toEqual({});
  });
});

describe('withEntryOverrideDefault', () => {
  it('sets, updates and removes one default', () => {
    const one = withEntryOverrideDefault({}, 'CZ', { name: 'Czech Republic' });

    expect(one).toEqual({ CZ: { name: 'Czech Republic' } });
    expect(
      withEntryOverrideDefault(one, 'WW', { flag: '/flags/earth.svg' }),
    ).toEqual({
      CZ: { name: 'Czech Republic' },
      WW: { flag: '/flags/earth.svg' },
    });
    expect(withEntryOverrideDefault(one, 'CZ', null)).toEqual({});
    expect(withEntryOverrideDefault(one, 'CZ', { name: 'Czechia' })).toEqual(
      {},
    );
  });
});
