/**
 * Loads the heavy half of the scoreboard store — the voting, jury-scale-reveal
 * and predefinition action factories (~90 KB of source plus the diaspora
 * presets JSON) — outside the render-critical boot chunk. The store itself is
 * created eagerly with stubs for these actions (see engineStubs.ts);
 * installEngine.ts swaps the real implementations in.
 *
 * Callers that need a hard ordering guarantee (startEvent,
 * continueToNextPhase, the contest-snapshot loader) await this; everything
 * else goes through the stubs, which queue on the same promise. The idle
 * preloader warms the chunk during setup, so the await is a resolved promise
 * in practice.
 */
let enginePromise: Promise<void> | null = null;

export const ensureScoreboardEngine = (): Promise<void> =>
  (enginePromise ??= import('./installEngine').then((m) =>
    m.installScoreboardEngine(),
  ));
