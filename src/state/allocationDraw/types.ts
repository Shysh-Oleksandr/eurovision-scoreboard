/**
 * Allocation draw — shared types. The engine (`engine.ts`) is pure and works
 * on country codes; the UI maps structured steps / errors to copy.
 */

export type PotsSource = 'official' | 'history' | 'custom' | 'none';
export type PotSplitMode = 'even' | 'random';
export type SemisMode = 'all' | 'choose';
export type SizesMode = 'balanced' | 'custom';
export type OrderMode = 'halves' | 'positions' | 'none';
export type PreQualifiedMode = 'drawn' | 'all' | 'none';

export interface DrawRules {
  pots: PotsSource;
  /** Only used with `pots: 'custom'` (country codes per pot). */
  customPots: string[][] | null;
  split: PotSplitMode;
  semis: SemisMode;
  /** `false` excludes a semi while `semis` is `choose`. */
  semisPick: Record<string, boolean>;
  sizes: SizesMode;
  /** Only used with `sizes: 'custom'`: stage id → size. */
  sizesCustom: Record<string, number>;
  order: OrderMode;
  preq: PreQualifiedMode;
}

export const OFFICIAL_RULES: Readonly<DrawRules> = Object.freeze({
  pots: 'official',
  customPots: null,
  split: 'even',
  semis: 'all',
  semisPick: {},
  sizes: 'balanced',
  sizesCustom: {},
  order: 'halves',
  preq: 'drawn',
});

export const createOfficialRules = (): DrawRules => ({
  ...OFFICIAL_RULES,
  semisPick: {},
  sizesCustom: {},
});

/** The option sets Customize shows; a "change" is any of these differing from official. */
export const RULE_KEYS = [
  'pots',
  'split',
  'semis',
  'sizes',
  'order',
  'preq',
] as const;

export type RuleKey = (typeof RULE_KEYS)[number];

export const changedRuleKeys = (rules: DrawRules): RuleKey[] =>
  RULE_KEYS.filter((key) => rules[key] !== OFFICIAL_RULES[key]);

export const countRuleChanges = (rules: DrawRules): number =>
  changedRuleKeys(rules).length;

export interface DrawSemi {
  id: string;
  name: string;
}

export interface DrawEntrant {
  code: string;
  /** Stage id the user placed the country in (it stays there), or null when waiting. */
  fixed: string | null;
}

export interface DrawPot {
  /** Country codes, fixed ones included. */
  members: string[];
}

export interface DrawPreQualified {
  code: string;
  /** `'drawn'` or the stage id chosen in the line-up ("Votes in"). */
  votesIn: 'drawn' | string;
}

export interface DrawInput {
  semis: DrawSemi[];
  entrants: DrawEntrant[];
  pots: DrawPot[];
  preq: DrawPreQualified[];
  rules: DrawRules;
}

export type DrawError =
  | { kind: 'fewSemis' }
  | { kind: 'empty' }
  | { kind: 'sizesSum'; sum: number; total: number }
  | {
      kind: 'semiFull';
      stageId: string;
      fixedCount: number;
      size: number;
      codes: string[];
    }
  | {
      kind: 'potFixed';
      stageId: string;
      potIndex: number;
      fixedCount: number;
      potSize: number;
      max: number;
      codes: string[];
    }
  | {
      kind: 'preqFixed';
      stageId: string;
      count: number;
      total: number;
      max: number;
      codes: string[];
    }
  | { kind: 'noFit' };

export interface DrawFixedNote {
  stageId: string;
  codes: string[];
}

export type DrawGroupStep = {
  t: 'group';
  key: string;
  kind: 'preq' | 'pot';
  /** Pot index (0-based) for `kind: 'pot'`. */
  potIndex?: number;
  /** Members of the group (pre-qualified total, or the whole pot). */
  size: number;
  fixedNotes: DrawFixedNote[];
};

export type DrawPreqStep = { t: 'preq'; code: string; stageId: string };

export type DrawEntrantStep = {
  t: 'entrant';
  code: string;
  stageId: string;
  /** 1 / 2 with `order: 'halves'`, 0 otherwise. */
  half: 0 | 1 | 2;
  /** 1-based position with `order: 'positions'`, 0 otherwise. */
  pos: number;
  fixed: boolean;
  potIndex: number;
};

export type DrawStep = DrawGroupStep | DrawPreqStep | DrawEntrantStep;

export interface DrawPlanMember {
  code: string;
  half: 0 | 1 | 2;
  pos: number;
}

export interface DrawPlanVoter {
  code: string;
  /** Placed by a "Votes in" choice (or "vote in every semi"), not drawn. */
  fixed: boolean;
}

export interface DrawPlanSemi {
  size: number;
  members: DrawPlanMember[];
  voters: DrawPlanVoter[];
}

export interface DrawPlan {
  code: string;
  order: OrderMode;
  sizes: Record<string, number>;
  semis: Record<string, DrawPlanSemi>;
  /** Ceremony order: group intros, then one step per country. */
  steps: DrawStep[];
  /** Number of non-group steps. */
  total: number;
}

export type SolveResult =
  | { ok: true; plan: DrawPlan }
  | { ok: false; error: DrawError };
