import { Design, DesignElement, ManualRow } from './model';

import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { Country } from '@/models';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { ContestSnapshot } from '@/types/contestSnapshot';

/** An external image that must go through `/api/image-proxy` (CORS). */
export const EXTERNAL_IMAGE_URL = 'https://flagcdn.com/w320/bg.png';
export const PROXIED_EXTERNAL_IMAGE = `/api/image-proxy?url=${encodeURIComponent(
  EXTERNAL_IMAGE_URL,
)}`;

const PARTICIPANT_CODES = ALL_COUNTRIES.filter(
  (c) => c.category === 'All-Time Participants',
).map((c) => c.code);

/** Deterministic ranking: same input → same countries and points. */
export function resolveFixtureCountries(count: number): Country[] {
  return PARTICIPANT_CODES.slice(0, count).map((code, i) => {
    const country = ALL_COUNTRIES.find((c) => c.code === code)!;
    const jury = Math.max(0, Math.round(260 - i * 9 + ((i * 7) % 5) * 3));
    const tele = Math.max(0, Math.round(240 - i * 8 + ((i * 11) % 7) * 2));

    return {
      name: country.name,
      code: country.code,
      juryPoints: jury,
      televotePoints: tele,
      points: jury + tele,
      lastReceivedPoints: null,
      isVotingFinished: true,
    };
  });
}

export function resolveLiveCountries(): Country[] {
  const stage = useScoreboardStore.getState().getCurrentStage();

  if (!stage) return [];

  return [...stage.countries].sort((a, b) => b.points - a.points);
}

export function resolveManualCountries(rows: ManualRow[]): Country[] {
  return [...rows]
    .sort((a, b) => b.points - a.points)
    .map((row) => ({
      name: row.name,
      code: row.code,
      flag: row.flag,
      juryPoints: row.points,
      televotePoints: 0,
      points: row.points,
      lastReceivedPoints: null,
      isVotingFinished: true,
    }));
}

/**
 * Countries + total points for a stage of a saved contest. Defaults to the
 * last stage that has any state. Names come from the common countries list
 * and the snapshot's custom entries.
 */
export function resolveSnapshotCountries(
  snapshot: ContestSnapshot,
  stageId?: string,
): { countries: Country[]; stageId: string | null } {
  const byStage = snapshot.simulation?.countriesStateByStage ?? {};
  const stageIds = Object.keys(byStage);
  const orderedStages = [...snapshot.setup.stages].sort(
    (a, b) => a.order - b.order,
  );
  const candidates = orderedStages
    .map((s) => s.id)
    .filter((id) => stageIds.includes(id) && byStage[id]?.length);
  const chosen =
    stageId && byStage[stageId]
      ? stageId
      : candidates[candidates.length - 1] ?? null;

  if (!chosen) return { countries: [], stageId: null };

  const customByCode = new Map(
    (snapshot.customEntriesUsed ?? []).map((e) => [e.code, e]),
  );

  const countries: Country[] = byStage[chosen].map((item) => {
    const common = ALL_COUNTRIES.find((c) => c.code === item.code);
    const custom = customByCode.get(item.code);
    const jury = item.juryPoints ?? 0;
    const tele = item.televotePoints ?? 0;

    return {
      name: custom?.name ?? common?.name ?? item.code,
      code: item.code,
      flag: custom?.flag,
      juryPoints: jury,
      televotePoints: tele,
      points: jury + tele,
      lastReceivedPoints: null,
      isVotingFinished: true,
    };
  });

  countries.sort((a, b) => b.points - a.points);

  return { countries, stageId: chosen };
}

const GRADIENT =
  'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 45%, #22c55e 100%)';

/**
 * Fixture that stresses the export: real country rows, rotated and scaled
 * elements, text shadow, proxied external image, a locally uploaded image
 * (src filled at runtime), a heart-masked flag, gradient background.
 */
export function buildLandscapeFixture(): Design {
  return {
    id: 'fixture-landscape',
    name: 'Fixture 1200×630',
    version: 1,
    canvas: {
      width: 1200,
      height: 630,
      background: { kind: 'gradient', value: GRADIENT },
    },
    data: { source: 'fixture', count: 26 },
    elements: [
      {
        id: 'bg-shape',
        name: 'Rotated gradient panel',
        type: 'shape',
        kind: 'rect',
        x: 760,
        y: -60,
        w: 520,
        h: 760,
        rotation: 12,
        opacity: 0.35,
        locked: false,
        hidden: false,
        fill: {
          kind: 'gradient',
          value: 'linear-gradient(180deg, #ffffff 0%, #f0abfc 100%)',
        },
        radius: 48,
        strokeWidth: 0,
        shadow: true,
      },
      {
        id: 'ellipse',
        name: 'Translucent ellipse',
        type: 'shape',
        kind: 'ellipse',
        x: 40,
        y: 470,
        w: 260,
        h: 130,
        rotation: -8,
        opacity: 1,
        locked: false,
        hidden: false,
        fill: { kind: 'color', value: 'rgba(255, 255, 255, 0.18)' },
        radius: 0,
        strokeColor: 'rgba(255,255,255,0.6)',
        strokeWidth: 3,
        shadow: false,
      },
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        x: 60,
        y: 28,
        w: 1080,
        h: 70,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        text: 'Grand Final · Results',
        fontSize: 54,
        fontWeight: 800,
        color: '#ffffff',
        align: 'center',
        uppercase: false,
        shadow: true,
        fontSlot: 'ui',
      },
      {
        id: 'subtitle',
        name: 'Subtitle (scoreboard font)',
        type: 'text',
        x: 60,
        y: 100,
        w: 1080,
        h: 36,
        rotation: 0,
        opacity: 0.9,
        locked: false,
        hidden: false,
        text: 'United by Music — Burgas 2027',
        fontSize: 24,
        fontWeight: 500,
        color: '#e9d5ff',
        align: 'center',
        uppercase: true,
        shadow: true,
        fontSlot: 'scoreboard',
      },
      {
        id: 'scoreboard',
        name: 'Scoreboard (26 rows, 2 columns)',
        type: 'scoreboard',
        x: 60,
        y: 150,
        w: 760,
        h: 460,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        columns: 2,
        itemSize: 'sm',
        showPoints: true,
        showRankings: true,
        shortNames: false,
        from: 0,
        to: 26,
      },
      {
        id: 'heart-flag',
        name: 'Heart flag (BG)',
        type: 'flag',
        x: 900,
        y: 160,
        w: 200,
        h: 180,
        rotation: -6,
        opacity: 1,
        locked: false,
        hidden: false,
        countryCode: 'BG',
        shape: 'heart',
      },
      {
        id: 'external-image',
        name: 'External image (proxied)',
        type: 'image',
        x: 880,
        y: 370,
        w: 140,
        h: 100,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        src: PROXIED_EXTERNAL_IMAGE,
        fit: 'cover',
        radius: 12,
        mask: 'none',
      },
      {
        id: 'upload-image',
        name: 'Uploaded image (blob URL)',
        type: 'image',
        x: 1040,
        y: 370,
        w: 100,
        h: 100,
        rotation: 15,
        opacity: 1,
        locked: false,
        hidden: false,
        src: '/img/favicon-128x128.png',
        fit: 'contain',
        radius: 50,
        mask: 'none',
      },
      {
        id: 'scaled-text',
        name: 'Scaled text (tiny box, big font)',
        type: 'text',
        x: 860,
        y: 500,
        w: 300,
        h: 110,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        text: '12',
        fontSize: 96,
        fontWeight: 900,
        color: '#fde68a',
        align: 'center',
        uppercase: false,
        shadow: true,
        fontSlot: 'ui',
      },
    ],
  };
}

export function buildPortraitFixture(): Design {
  const landscape = buildLandscapeFixture();
  const el = (i: number, patch: Record<string, unknown>): DesignElement =>
    ({ ...landscape.elements[i], ...patch } as DesignElement);

  return {
    ...landscape,
    id: 'fixture-portrait',
    name: 'Fixture 1080×1920',
    canvas: {
      width: 1080,
      height: 1920,
      background: { kind: 'theme-bg' },
    },
    elements: [
      el(0, { x: 600, y: 1200, w: 700, h: 900 }),
      el(1, { x: 60, y: 1700, w: 400, h: 160 }),
      el(2, { x: 60, y: 80, w: 960, h: 90, fontSize: 68 }),
      el(3, { x: 60, y: 180, w: 960, h: 44, fontSize: 30 }),
      el(4, {
        x: 60,
        y: 260,
        w: 960,
        h: 1300,
        columns: 1,
        itemSize: '2xl',
        to: 20,
      }),
      el(5, { x: 760, y: 1600, w: 260, h: 240 }),
      el(6, { x: 60, y: 1600, w: 200, h: 140 }),
      el(7, { x: 300, y: 1600, w: 140, h: 140 }),
      el(8, { x: 480, y: 1740, w: 240, h: 140 }),
    ],
  };
}

/** A template: two bound fields, data from a saved contest or live stage. */
export function buildResultsTemplate(): Design {
  const base = buildLandscapeFixture();

  return {
    ...base,
    id: 'template-results',
    name: 'Template: results',
    data: { source: 'live' },
    elements: base.elements.filter((e) =>
      ['title', 'subtitle', 'scoreboard', 'bg-shape'].includes(e.id),
    ),
    templateFields: [
      { path: 'elements.1.text', label: 'Title', kind: 'text' },
      {
        path: 'elements.3.columns',
        label: 'Columns',
        kind: 'select',
        options: [1, 2, 3],
      },
    ],
  };
}
