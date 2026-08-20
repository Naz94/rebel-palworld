import type { RankedRealPal } from "./rank-pals";

// ============================================================
// "Player pals" — pals worth taking WITH you (party slot),
// split into the two reasons you'd actually do that:
//   - Fighting companion: helps you in combat
//   - Exploration companion: mounts/traversal for getting around
//
// This deliberately does NOT duplicate combat/support scoring
// logic from rank-pals.ts (that's already solid and used as-is
// for the fighting side). Exploration is the genuinely new part —
// built directly on speciesUtility.recommendations.traversal,
// which is already curated per-species data, not a guess from
// scanning skill description text.
// ============================================================

export type CompanionEntry = {
  pal: RankedRealPal;
  score: number;
  reasons: string[];
};

export function rankFightingCompanions(
  all: RankedRealPal[],
  limit = 20,
): CompanionEntry[] {
  return all
    .filter((entry) => {
      const recommended =
        entry.pal.speciesUtility
          ?.recommendations
          .playerSupport === "YES";
      // Also include anything that already scores well for combat or
      // party support, even if the curated flag is missing/stale —
      // don't let incomplete reference data hide a genuinely strong pick.
      return (
        recommended ||
        entry.score.combat >= 55 ||
        entry.score.support >= 40
      );
    })
    .map((entry) => {
      const reasons: string[] = [];
      if (
        entry.pal.speciesUtility
          ?.recommendations
          .playerSupport === "YES"
      ) {
        reasons.push("Recommended party pal");
      }
      if (entry.score.combat >= 55) {
        reasons.push(`Combat ${Math.round(entry.score.combat)}`);
      }
      if (entry.score.support >= 40) {
        reasons.push(`Party support ${Math.round(entry.score.support)}`);
      }
      const score =
        entry.score.combat * 0.65 +
        entry.score.support * 0.35;
      return { pal: entry, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function rankExplorationCompanions(
  all: RankedRealPal[],
  limit = 20,
): CompanionEntry[] {
  return all
    .filter(
      (entry) =>
        entry.pal.speciesUtility
          ?.recommendations
          .traversal === "YES",
    )
    .map((entry) => {
      const utility = entry.pal.speciesUtility!;
      const reasons: string[] = [];
      if (utility.primaryUtility) {
        reasons.push(utility.primaryUtility);
      }
      for (const item of utility.bestUsedFor) {
        if (!reasons.includes(item)) reasons.push(item);
      }
      if (entry.pal.isAlpha) {
        reasons.push("Alpha");
      }

      // No dedicated "traversal quality" number exists yet, so this is
      // a simple, honest heuristic: being flagged for traversal at all
      // is the main signal (already curated), broken ties by level and
      // IV quality so your best-raised copy of a mount species surfaces
      // first rather than a random one.
      const score =
        70 +
        Math.min(20, entry.pal.level ?? 0) * 0.3 +
        (entry.score.ivQuality ?? 0) * 0.1;

      return { pal: entry, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
