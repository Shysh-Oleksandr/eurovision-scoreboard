import { assignPointIdsForVoter } from './voteAssignmentHelpers';

import type { PointsItem } from '@/state/generalStore';
import type { StageVotes, Vote } from '@/state/scoreboard/types';
import { StageVotingMode } from '@/models';

export type SpreadsheetCountry = { code: string; name: string };

export type VoteSpreadsheetParseContext = {
  participants: SpreadsheetCountry[];
  voters: SpreadsheetCountry[];
  juryPointsSystem: PointsItem[];
  televotePointsSystem: PointsItem[];
  votingMode: StageVotingMode;
};

export type CellAssignment = {
  participantCode: string;
  voterCode: string;
  points: number;
};

export type ParsedVoteSections = {
  jury?: Record<string, Vote[]>;
  televote?: Record<string, Vote[]>;
  unmatched: string[];
  skippedSections: string[];
  appliedCells: number;
};

type SectionHint = 'jury' | 'televote' | 'combined' | null;

const ROTW_ALIASES = new Set([
  'rest of the world',
  'rotw',
  'restoftheworld',
  'ww',
]);

const METADATA_LABELS = new Set(['tot', 'total', 'rank', 'rk', 'pos', 'position']);

export function normalizeCountryLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCountryCode(
  label: string,
  countries: SpreadsheetCountry[],
): string | null {
  const normalized = normalizeCountryLabel(label);
  if (!normalized || METADATA_LABELS.has(normalized)) return null;

  if (ROTW_ALIASES.has(normalized)) {
    const rotw = countries.find((c) => c.code === 'WW');
    return rotw?.code ?? null;
  }

  const byCode = countries.find(
    (c) => normalizeCountryLabel(c.code) === normalized,
  );
  if (byCode) return byCode.code;

  const byName = countries.find(
    (c) => normalizeCountryLabel(c.name) === normalized,
  );
  if (byName) return byName.code;

  return null;
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => cell === '');
}

export function splitIntoSections(grid: string[][]): string[][][] {
  const sections: string[][][] = [];
  let current: string[][] = [];

  for (const row of grid) {
    if (isRowEmpty(row)) {
      if (current.length > 0) {
        sections.push(current);
        current = [];
      }
      continue;
    }
    current.push(row);
  }

  if (current.length > 0) sections.push(current);

  return sections.length > 0 ? sections : grid.length > 0 ? [grid] : [];
}

function detectSectionHint(grid: string[][]): SectionHint {
  for (const row of grid.slice(0, 3)) {
    for (const cell of row) {
      const normalized = normalizeCountryLabel(cell);
      if (!normalized) continue;
      if (normalized.includes('combined')) return 'combined';
      if (normalized.includes('televote')) return 'televote';
      if (normalized.includes('jury')) return 'jury';
    }
  }
  return null;
}

function parsePointsCell(cell: string): number | null {
  if (cell === '') return null;
  const parsed = Number(cell);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

type VoterColumn = { index: number; code: string; label: string };

function findVoterHeader(
  section: string[][],
  voters: SpreadsheetCountry[],
): { headerRowIndex: number; voterColumns: VoterColumn[] } | null {
  let best: {
    headerRowIndex: number;
    voterColumns: VoterColumn[];
  } | null = null;

  for (let rowIndex = 0; rowIndex < section.length; rowIndex += 1) {
    const row = section[rowIndex];
    const voterColumns: VoterColumn[] = [];

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const label = row[colIndex] ?? '';
      const code = resolveCountryCode(label, voters);
      if (!code) continue;
      voterColumns.push({ index: colIndex, code, label });
    }

    if (
      voterColumns.length >= 2 &&
      (!best || voterColumns.length > best.voterColumns.length)
    ) {
      best = { headerRowIndex: rowIndex, voterColumns };
    }
  }

  return best;
}

function findParticipantColumn(
  dataRows: string[][],
  voterColumnIndices: Set<number>,
  participants: SpreadsheetCountry[],
): number {
  const maxCols = dataRows.reduce((max, row) => Math.max(max, row.length), 0);
  let bestColumn = 0;
  let bestScore = -1;

  for (let col = 0; col < maxCols; col += 1) {
    if (voterColumnIndices.has(col)) continue;

    let score = 0;
    for (const row of dataRows) {
      const code = resolveCountryCode(row[col] ?? '', participants);
      if (code) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }

  return bestColumn;
}

function sectionHasVoteData(
  section: string[][],
  ctx: VoteSpreadsheetParseContext,
): boolean {
  return findVoterHeader(section, ctx.voters) !== null;
}

function parseVoteSection(
  section: string[][],
  ctx: VoteSpreadsheetParseContext,
): { assignments: CellAssignment[]; unmatched: string[] } {
  const header = findVoterHeader(section, ctx.voters);
  if (!header) return { assignments: [], unmatched: [] };

  const voterColumnIndices = new Set(
    header.voterColumns.map((column) => column.index),
  );
  const dataRows = section.slice(header.headerRowIndex + 1);
  const participantColumn = findParticipantColumn(
    dataRows,
    voterColumnIndices,
    ctx.participants,
  );

  const unmatched = new Set<string>();
  const assignments: CellAssignment[] = [];

  for (const row of dataRows) {
    const participantLabel = row[participantColumn] ?? '';
    if (!participantLabel) continue;

    const participantCode = resolveCountryCode(
      participantLabel,
      ctx.participants,
    );
    if (!participantCode) {
      unmatched.add(participantLabel);
      continue;
    }

    for (const voterColumn of header.voterColumns) {
      if (participantCode === voterColumn.code) continue;

      const points = parsePointsCell(row[voterColumn.index] ?? '');
      if (points === null) continue;

      assignments.push({
        participantCode,
        voterCode: voterColumn.code,
        points,
      });
    }
  }

  header.voterColumns.forEach((column) => {
    if (!ctx.voters.some((voter) => voter.code === column.code)) {
      unmatched.add(column.label);
    }
  });

  return { assignments, unmatched: Array.from(unmatched) };
}

function buildVotesByVoter(
  assignments: CellAssignment[],
  pointsSystem: PointsItem[],
): Record<string, Vote[]> {
  const rawByVoter = new Map<string, { countryCode: string; points: number }[]>();

  for (const { participantCode, voterCode, points } of assignments) {
    if (!rawByVoter.has(voterCode)) rawByVoter.set(voterCode, []);
    rawByVoter.get(voterCode)!.push({
      countryCode: participantCode,
      points,
    });
  }

  const byVoter: Record<string, Vote[]> = {};
  for (const [voterCode, rawVotes] of rawByVoter.entries()) {
    const assigned = assignPointIdsForVoter(rawVotes, pointsSystem);
    if (assigned.length > 0) byVoter[voterCode] = assigned;
  }

  return byVoter;
}

function sourcesForImport(mode: StageVotingMode): Array<'jury' | 'televote'> {
  switch (mode) {
    case StageVotingMode.JURY_ONLY:
      return ['jury'];
    case StageVotingMode.TELEVOTE_ONLY:
      return ['televote'];
    default:
      return ['jury', 'televote'];
  }
}

export function parseVoteSpreadsheetGrid(
  grid: string[][],
  ctx: VoteSpreadsheetParseContext,
): ParsedVoteSections | null {
  if (grid.length === 0) return null;

  const allowedSources = new Set(sourcesForImport(ctx.votingMode));
  const sections = splitIntoSections(grid).map((sectionGrid) => ({
    hint: detectSectionHint(sectionGrid),
    grid: sectionGrid,
  }));

  const voteSections = sections.filter(({ grid: sectionGrid }) =>
    sectionHasVoteData(sectionGrid, ctx),
  );

  if (voteSections.length === 0) return null;

  const result: ParsedVoteSections = {
    unmatched: [],
    skippedSections: [],
    appliedCells: 0,
  };

  const unmatched = new Set<string>();
  const skippedSections = new Set<string>();

  for (const section of voteSections) {
    if (section.hint === 'combined') {
      skippedSections.add('combined');
      continue;
    }

    const source =
      section.hint === 'jury' || section.hint === 'televote'
        ? section.hint
        : voteSections.length === 1 && allowedSources.size === 1
          ? sourcesForImport(ctx.votingMode)[0]
          : section.hint;

    let targetSource: 'jury' | 'televote' | null = null;
    if (source === 'jury' && allowedSources.has('jury')) {
      targetSource = 'jury';
    } else if (source === 'televote' && allowedSources.has('televote')) {
      targetSource = 'televote';
    } else if (source === null) {
      if (!result.jury && allowedSources.has('jury')) targetSource = 'jury';
      else if (!result.televote && allowedSources.has('televote')) {
        targetSource = 'televote';
      } else {
        skippedSections.add(section.hint ?? 'unknown');
        continue;
      }
    } else {
      skippedSections.add(section.hint ?? 'unknown');
      continue;
    }

    const parsed = parseVoteSection(section.grid, ctx);
    parsed.unmatched.forEach((label) => unmatched.add(label));

    const pointsSystem =
      targetSource === 'televote'
        ? ctx.televotePointsSystem
        : ctx.juryPointsSystem;
    const byVoter = buildVotesByVoter(parsed.assignments, pointsSystem);

    if (Object.keys(byVoter).length === 0) continue;

    result[targetSource] = byVoter;
    result.appliedCells += parsed.assignments.length;
  }

  result.unmatched = Array.from(unmatched);
  result.skippedSections = Array.from(skippedSections);

  if (!result.jury && !result.televote) return null;

  return result;
}

export function mergeImportedVotes(
  prevVotes: Partial<StageVotes> | null,
  parsed: ParsedVoteSections,
): Partial<StageVotes> {
  const next: Partial<StageVotes> = prevVotes ? { ...prevVotes } : {};

  if (parsed.jury) next.jury = { ...parsed.jury };
  if (parsed.televote) next.televote = { ...parsed.televote };

  return next;
}
