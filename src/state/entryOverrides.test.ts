import fs from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Year } from '@/config';
import { historicalNamesFor } from '@/data/countries/entryOverrides';
import {
  applyContestSnapshotToStores,
  buildContestSnapshotFromStores,
} from '@/helpers/contestSnapshot';
import { Country, EventStage, StageVotingMode } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/*
 * A contest's own names and flags: what getAllCountries hands out, and
 * every copy already made (setup voters, the running show, its undo steps)
 * redrawn when one changes, so nothing keeps the old name.
 */

const country = (code: string, name: string): Country => ({
  code,
  name,
  juryPoints: 0,
  televotePoints: 0,
  points: 0,
  lastReceivedPoints: null,
});

const stage = (): EventStage => ({
  id: 'GF',
  name: 'Grand Final',
  order: 0,
  votingMode: StageVotingMode.JURY_AND_TELEVOTE,
  countries: [country('MK', 'North Macedonia'), country('SE', 'Sweden')],
  votingCountries: [
    { code: 'MK', name: 'North Macedonia' },
    { code: 'WW', name: 'Rest of the World' },
  ],
  isOver: false,
  isJuryVoting: true,
});

/** `fetch` answering with the real line-up files from `public/`. */
const serveLineupFiles = () =>
  vi.stubGlobal('fetch', async (url: string) => {
    const file = path.join(
      process.cwd(),
      'public',
      url.split('?')[0].replace(/^https?:\/\/[^/]+/, ''),
    );

    return new Response(fs.readFileSync(file, 'utf8'), { status: 200 });
  });

const names = (stages: EventStage[]) =>
  stages.flatMap((s) => [
    ...s.countries.map((c) => c.name),
    ...(s.votingCountries ?? []).map((c) => c.name),
  ]);

describe('entry overrides in the stores', () => {
  beforeEach(() => {
    useCountriesStore.setState({
      entryOverrides: {},
      configuredEventStages: [{ ...stage(), countries: [] }],
    });
    useScoreboardStore.setState({
      eventStages: [stage()],
      winnerCountry: country('MK', 'North Macedonia'),
    });
    useScoreboardStore.temporal.getState().clear();
  });

  it('applies to getAllCountries but not to the built-in list', () => {
    useCountriesStore
      .getState()
      .setEntryOverride('MK', { name: 'F.Y.R. Macedonia', flag: '' });

    const { getAllCountries, getCanonicalCountries } =
      useCountriesStore.getState();

    expect(getAllCountries().find((c) => c.code === 'MK')?.name).toBe(
      'F.Y.R. Macedonia',
    );
    expect(getCanonicalCountries().find((c) => c.code === 'MK')?.name).toBe(
      'North Macedonia',
    );
    // The same list while the overrides don't change (memoized consumers).
    expect(getAllCountries(false)).toBe(
      useCountriesStore.getState().getAllCountries(false),
    );
  });

  it('redraws the setup voters, the show, the winner and the undo history', () => {
    // An undo step recorded before the rename.
    useScoreboardStore.setState({ votingCountryIndex: 1 });
    expect(useScoreboardStore.temporal.getState().pastStates).toHaveLength(1);

    useCountriesStore.getState().setEntryOverride('MK', {
      name: 'F.Y.R. Macedonia',
    });
    useCountriesStore.getState().setEntryOverride('WW', {
      flag: '/flags/earth.svg',
    });

    const setupVoters =
      useCountriesStore.getState().configuredEventStages[0].votingCountries;

    expect(setupVoters).toEqual([
      { code: 'MK', name: 'F.Y.R. Macedonia' },
      { code: 'WW', name: 'Rest of the World', flag: '/flags/earth.svg' },
    ]);

    const show = useScoreboardStore.getState();

    expect(names(show.eventStages)).toEqual([
      'F.Y.R. Macedonia',
      'Sweden',
      'F.Y.R. Macedonia',
      'Rest of the World',
    ]);
    expect(show.winnerCountry?.name).toBe('F.Y.R. Macedonia');

    // The redraw isn't an undo step, and the old step has the new name too.
    const { pastStates } = useScoreboardStore.temporal.getState();

    expect(pastStates).toHaveLength(1);
    expect(names(pastStates[0].eventStages ?? [])[0]).toBe('F.Y.R. Macedonia');
  });

  it('shows the country as it ships again once the override is removed', () => {
    const { setEntryOverride } = useCountriesStore.getState();

    setEntryOverride('MK', { name: 'F.Y.R. Macedonia', flag: '/flags/yu.svg' });
    setEntryOverride('MK', null);

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
    expect(useScoreboardStore.getState().eventStages[0].countries[0]).toEqual(
      country('MK', 'North Macedonia'),
    );
    expect(useScoreboardStore.getState().winnerCountry).toEqual(
      country('MK', 'North Macedonia'),
    );
  });

  it('treats an override equal to the built-in country as none', () => {
    useCountriesStore.getState().setEntryOverride('MK', {
      name: 'North Macedonia',
      flag: '/flags/mk.svg',
    });

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
  });

  it('is saved with the contest', () => {
    expect(buildContestSnapshotFromStores().setup.entryOverrides).toBe(
      undefined,
    );

    useCountriesStore.getState().setEntryOverride('CZ', {
      name: 'Czech Republic',
    });

    expect(buildContestSnapshotFromStores().setup.entryOverrides).toEqual({
      CZ: { name: 'Czech Republic' },
    });
  });

  it('comes back with a loaded contest, and a contest without any clears them', async () => {
    // The loader reads the edition's line-up file for its odds.
    serveLineupFiles();

    const { setEntryOverride } = useCountriesStore.getState();

    setEntryOverride('MK', { name: 'F.Y.R. Macedonia' });
    setEntryOverride('WW', { flag: '/flags/earth.svg' });

    const snapshot = {
      ...buildContestSnapshotFromStores(),
      setup: {
        ...buildContestSnapshotFromStores().setup,
        baseYear: 2026,
        stages: [
          {
            id: 'GF',
            name: 'Grand Final',
            order: 0,
            participants: ['MK', 'SE'],
            voters: ['MK', 'SE', 'WW'],
          },
        ],
      },
    };
    const contest = { _id: 'c1', name: 'Test', hostingCountryCode: 'AT' };
    const options = { generalInfo: false, setup: true, simulation: false };

    useCountriesStore.getState().replaceEntryOverrides({});
    await applyContestSnapshotToStores(
      snapshot as never,
      contest as never,
      false,
      options,
    );

    const loaded = useCountriesStore.getState();

    expect(loaded.entryOverrides).toEqual({
      MK: { name: 'F.Y.R. Macedonia' },
      WW: { flag: '/flags/earth.svg' },
    });
    expect(loaded.configuredEventStages[0].votingCountries).toEqual([
      { code: 'MK', name: 'F.Y.R. Macedonia' },
      { code: 'SE', name: 'Sweden' },
      { code: 'WW', name: 'Rest of the World', flag: '/flags/earth.svg' },
    ]);

    const setupWithout = { ...snapshot.setup };

    delete setupWithout.entryOverrides;

    await applyContestSnapshotToStores(
      { ...snapshot, setup: setupWithout } as never,
      contest as never,
      false,
      options,
    );

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
    expect(
      useCountriesStore.getState().configuredEventStages[0]
        .votingCountries?.[0],
    ).toEqual({ code: 'MK', name: 'North Macedonia' });

    vi.unstubAllGlobals();
  });

  it('starts a new edition with its historical names and the account defaults', async () => {
    serveLineupFiles();
    useGeneralStore.setState((state) => ({
      settings: {
        ...state.settings,
        contestType: 'esc',
        useHistoricalNames: true,
        defaultEntryOverrides: { WW: { flag: '/flags/earth.svg' } },
      },
    }));
    // The previous contest's own rename doesn't carry over.
    useCountriesStore.getState().setEntryOverride('SE', { name: 'Sverige' });

    await useCountriesStore.getState().updateCountriesForYear('2008' as Year);

    expect(useCountriesStore.getState().entryOverrides).toEqual({
      MK: { name: 'F.Y.R. Macedonia' },
      CZ: { name: 'Czech Republic' },
      TR: { name: 'Turkey' },
      WW: { flag: '/flags/earth.svg' },
    });

    useGeneralStore.setState((state) => ({
      settings: {
        ...state.settings,
        useHistoricalNames: false,
        defaultEntryOverrides: {},
      },
    }));
    await useCountriesStore.getState().updateCountriesForYear('2008' as Year);

    expect(useCountriesStore.getState().entryOverrides).toEqual({});
    vi.unstubAllGlobals();
  });

  it('swaps historical names without touching the user’s own', () => {
    const { setEntryOverride, swapHistoricalNames } =
      useCountriesStore.getState();

    setEntryOverride('MK', { name: 'F.Y.R. Macedonia' });
    setEntryOverride('CZ', { name: 'Czechoslovakia' });

    // Next year from 2018 to 2019.
    swapHistoricalNames(historicalNamesFor(2018), historicalNamesFor(2019));

    expect(useCountriesStore.getState().entryOverrides).toEqual({
      CZ: { name: 'Czechoslovakia' },
      TR: { name: 'Turkey' },
    });
    // The show already running is redrawn too.
    expect(useScoreboardStore.getState().eventStages[0].countries[0].name).toBe(
      'North Macedonia',
    );
  });
});
