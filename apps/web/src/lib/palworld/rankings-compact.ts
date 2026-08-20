import type {
  RankedRealPal,
  RealOwnedPal,
  RealPalScore,
} from "./rank-pals";

// ============================================================
// Why this file exists
// ------------------------------------------------------------
// rankRealPals() returns dozens of named views (all, coreKeep,
// farming, support, speciesGroups, ...) that are mostly the SAME
// ~890 scored pals, just filtered/sorted/grouped differently. In
// memory that's cheap (JS objects are shared by reference), but
// JSON has no concept of shared references — every view duplicates
// the full pal + score data again. For an 800+ pal collection that
// came out to ~125MB, which is both too big to store and (if it
// were stored) too big to ship to a browser on every /pals load.
//
// This file does NOT touch rank-pals.ts's scoring/filtering logic
// at all — zero risk to its correctness. It's a pure post-processing
// step: walk the already-correct output, replace every embedded
// {pal, score} with a tiny {__ref: id}, and keep exactly one copy
// of each pal's score in a side table. expandStoredRankings() is the
// exact inverse, rebuilding the identical shape the UI already
// expects by joining {__ref: id} stubs back against `entities`
// (which the caller already has separately) and the score table.
// ============================================================

type Ref = { __ref: string };

function isRankedRealPal(
  value: unknown,
): value is RankedRealPal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RankedRealPal>;
  return (
    !!candidate.pal &&
    typeof candidate.pal === "object" &&
    typeof (candidate.pal as RealOwnedPal).id === "string" &&
    !!candidate.score &&
    typeof candidate.score === "object"
  );
}

function isRawOwnedPal(
  value: unknown,
): value is RealOwnedPal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RealOwnedPal>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.species === "string" &&
    Array.isArray(candidate.passives) &&
    !("score" in candidate)
  );
}

function compactWalk(
  value: unknown,
  scoreById: Map<string, RealPalScore>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => compactWalk(item, scoreById));
  }

  if (isRankedRealPal(value)) {
    const id = value.pal.id as string;
    if (!scoreById.has(id)) {
      scoreById.set(id, value.score);
    }
    const ref: Ref = { __ref: id };
    return ref;
  }

  if (isRawOwnedPal(value)) {
    const ref: Ref = { __ref: value.id as string };
    return ref;
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = compactWalk(entry, scoreById);
    }
    return out;
  }

  return value;
}

function isRef(value: unknown): value is Ref {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Ref).__ref === "string" &&
    Object.keys(value as object).length === 1
  );
}

function expandWalk(
  value: unknown,
  scoreById: Map<string, RealPalScore>,
  entitiesById: Map<string, RealOwnedPal>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      expandWalk(item, scoreById, entitiesById),
    );
  }

  if (isRef(value)) {
    const pal = entitiesById.get(value.__ref);
    // Should always be present (same snapshot's entities) — if not,
    // dropping the stray ref is far safer than throwing and breaking
    // the whole dashboard over one missing pal.
    if (!pal) return null;

    const score = scoreById.get(value.__ref);
    return score ? { pal, score } : pal;
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = expandWalk(entry, scoreById, entitiesById);
    }
    return out;
  }

  return value;
}

export type CompactRankings = {
  scores: Record<string, RealPalScore>;
  tree: unknown;
};

// Run on the untouched, already-correct rankRealPals() output.
export function compactStoredRankings(
  rankings: unknown,
): CompactRankings {
  const scoreById = new Map<string, RealPalScore>();
  const tree = compactWalk(rankings, scoreById);
  return {
    scores: Object.fromEntries(scoreById),
    tree,
  };
}

// Rebuilds the exact same shape rankRealPals() returns, so callers
// (pals/page.tsx) need no changes at all.
export function expandStoredRankings(
  compact: CompactRankings,
  entities: RealOwnedPal[],
): unknown {
  const scoreById = new Map(
    Object.entries(compact.scores),
  );

  const entitiesById = new Map<string, RealOwnedPal>();
  for (const entity of entities) {
    if (entity.id) entitiesById.set(entity.id, entity);
  }

  return expandWalk(compact.tree, scoreById, entitiesById);
}
