import * as XLSX from 'xlsx';

import {
  parseVoteSpreadsheetGrid,
  type ParsedVoteSections,
  type SpreadsheetCountry,
  type VoteSpreadsheetParseContext,
} from './voteSpreadsheetParse';

import { StageVotingMode } from '@/models';
import type { StageVotes } from '@/state/scoreboard/types';

export type VoteSpreadsheetSection = {
  label: string;
  source: 'jury' | 'televote' | 'combined';
  participants: Array<{
    code: string;
    name: string;
    rank: number;
    total: number;
  }>;
  voters: SpreadsheetCountry[];
  getCellPoints: (participantCode: string, voterCode: string) => number;
};

export type VoteSpreadsheetExportPayload = {
  filename: string;
  sections: VoteSpreadsheetSection[];
};

export type VoteSpreadsheetImportResult =
  | {
      ok: true;
      votes: Partial<StageVotes>;
      appliedCells: number;
      unmatched: string[];
      skippedSections: string[];
    }
  | {
      ok: false;
      error: 'empty-file' | 'no-sections' | 'no-assignments';
      unmatched?: string[];
      skippedSections?: string[];
    };

export async function readSpreadsheetGridFromFile(
  file: File,
): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  return rows.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => String(cell ?? '').trim()),
  );
}

export function buildSpreadsheetRows(
  sections: VoteSpreadsheetSection[],
): string[][] {
  const rows: string[][] = [];

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) rows.push([]);

    rows.push([
      '',
      section.label,
      'TOT',
      ...section.voters.map((voter) => voter.name),
    ]);

    for (const participant of section.participants) {
      const scoreCells = section.voters.map((voter) => {
        if (participant.code === voter.code) return '';
        const points = section.getCellPoints(participant.code, voter.code);
        return points > 0 ? String(points) : '';
      });

      rows.push([
        String(participant.rank),
        participant.name,
        String(participant.total),
        ...scoreCells,
      ]);
    }
  });

  return rows;
}

export function downloadVoteSpreadsheet({
  filename,
  sections,
}: VoteSpreadsheetExportPayload) {
  const rows = buildSpreadsheetRows(sections);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function importVotesFromSpreadsheetGrid(
  grid: string[][],
  ctx: VoteSpreadsheetParseContext,
): VoteSpreadsheetImportResult {
  if (grid.length === 0) {
    return { ok: false, error: 'empty-file' };
  }

  const parsed = parseVoteSpreadsheetGrid(grid, ctx);
  if (!parsed) {
    return { ok: false, error: 'no-sections' };
  }

  if (parsed.appliedCells === 0) {
    return {
      ok: false,
      error: 'no-assignments',
      unmatched: parsed.unmatched,
      skippedSections: parsed.skippedSections,
    };
  }

  const votes: Partial<StageVotes> = {};
  if (parsed.jury) votes.jury = parsed.jury;
  if (parsed.televote) votes.televote = parsed.televote;

  return {
    ok: true,
    votes,
    appliedCells: parsed.appliedCells,
    unmatched: parsed.unmatched,
    skippedSections: parsed.skippedSections,
  };
}

export async function importVotesFromSpreadsheetFile(
  file: File,
  ctx: VoteSpreadsheetParseContext,
): Promise<VoteSpreadsheetImportResult> {
  const grid = await readSpreadsheetGridFromFile(file);
  return importVotesFromSpreadsheetGrid(grid, ctx);
}

export function buildExportSectionsForStageVotes(args: {
  stageName: string;
  votingMode: StageVotingMode;
  participants: Array<{ code: string; name: string; rank: number }>;
  voters: SpreadsheetCountry[];
  votes: Partial<StageVotes> | null | undefined;
  getParticipantTotal: (
    code: string,
    source: 'jury' | 'televote' | 'combined',
  ) => number;
}): VoteSpreadsheetSection[] {
  const getPointsFromVotes = (
    source: 'jury' | 'televote' | 'combined',
    participantCode: string,
    voterCode: string,
  ) => {
    const ballot = args.votes?.[source]?.[voterCode] ?? [];
    return ballot
      .filter((vote) => vote.countryCode === participantCode)
      .reduce((sum, vote) => sum + vote.points, 0);
  };

  const toSection = (
    label: string,
    source: 'jury' | 'televote' | 'combined',
  ): VoteSpreadsheetSection => ({
    label,
    source,
    voters: args.voters,
    participants: args.participants.map((participant) => ({
      ...participant,
      total:
        source === 'combined' &&
        args.votingMode === StageVotingMode.JURY_AND_TELEVOTE
          ? args.getParticipantTotal(participant.code, 'jury') +
            args.getParticipantTotal(participant.code, 'televote')
          : args.getParticipantTotal(participant.code, source),
    })),
    getCellPoints: (participantCode, voterCode) => {
      if (
        source === 'combined' &&
        args.votingMode === StageVotingMode.JURY_AND_TELEVOTE
      ) {
        return (
          getPointsFromVotes('jury', participantCode, voterCode) +
          getPointsFromVotes('televote', participantCode, voterCode)
        );
      }

      return getPointsFromVotes(source, participantCode, voterCode);
    },
  });

  const sections: VoteSpreadsheetSection[] = [];
  const shortLabel = args.stageName.trim() || 'Stage';

  switch (args.votingMode) {
    case StageVotingMode.JURY_ONLY:
      sections.push(toSection(`JURY ${shortLabel}`, 'jury'));
      break;
    case StageVotingMode.TELEVOTE_ONLY:
      sections.push(toSection(`TELEVOTE ${shortLabel}`, 'televote'));
      break;
    case StageVotingMode.COMBINED:
      sections.push(toSection(`JURY ${shortLabel}`, 'jury'));
      sections.push(toSection(`TELEVOTE ${shortLabel}`, 'televote'));
      sections.push(toSection(`COMBINED ${shortLabel}`, 'combined'));
      break;
    default:
      sections.push(toSection(`JURY ${shortLabel}`, 'jury'));
      sections.push(toSection(`TELEVOTE ${shortLabel}`, 'televote'));
      sections.push(toSection(`COMBINED ${shortLabel}`, 'combined'));
      break;
  }

  return sections;
}

export type { ParsedVoteSections, VoteSpreadsheetParseContext };
