import type {
  BaseStrategy,
  CapacityState,
  OwnedPal,
  WorkCoverage,
  WorkRecommendation,
} from "./types";

import {
  getBaseRoleWeight,
} from "./base-strategy";

// ============================================================
// TYPES
// ============================================================

export type CompositionStatus =
  | "understaffed"
  | "balanced"
  | "overstaffed"
  | "low-priority";

export type CompositionWorkTarget = {
  work: string;

  roleWeight: number;

  currentWorkers: number;

  recommendedWorkers: number;

  difference: number;

  status: CompositionStatus;

  currentBestLevel: number;

  reason: string;
};

export type CompositionMoveType =
  | "add"
  | "develop"
  | "replace"
  | "hold";

export type CompositionMove = {
  priority: number;

  type: CompositionMoveType;

  work: string;

  pal: OwnedPal | null;

  currentWorker: OwnedPal | null;

  reason: string;
};

export type BaseCompositionPlan = {
  assigned: number;

  capacity: number;

  freeSlots: number;

  targetSlots: number;

  workTargets: CompositionWorkTarget[];

  moves: CompositionMove[];

  summary: string;
};

// ============================================================
// PUBLIC ENGINE
// ============================================================

export function buildBaseCompositionPlan(
  workers: OwnedPal[],
  workCoverage: WorkCoverage[],
  recommendations: WorkRecommendation[],
  baseStrategy: BaseStrategy,
  capacityState: CapacityState,
): BaseCompositionPlan {
  const targetSlots =
    Math.max(
      capacityState.assigned,
      capacityState.capacity,
    );

  const workTargets =
    buildWorkTargets(
      workCoverage,
      baseStrategy,
      targetSlots,
    );

  const moves =
    buildCompositionMoves(
      workTargets,
      recommendations,
      capacityState,
    );

  return {
    assigned:
      capacityState.assigned,

    capacity:
      capacityState.capacity,

    freeSlots:
      capacityState.freeSlots,

    targetSlots,

    workTargets,

    moves,

    summary:
      buildCompositionSummary(
        workTargets,
        capacityState,
        moves,
      ),
  };
}

// ============================================================
// WORK TARGETS
// ============================================================

function buildWorkTargets(
  workCoverage: WorkCoverage[],
  baseStrategy: BaseStrategy,
  targetSlots: number,
): CompositionWorkTarget[] {
  if (
    workCoverage.length ===
    0
  ) {
    return [];
  }

  const weighted =
    workCoverage.map(
      (
        coverage,
      ) => {
        const roleWeight =
          getBaseRoleWeight(
            baseStrategy.role,
            coverage.name,
          );

        const qualityWeight =
          Math.max(
            0.5,
            coverage.highestLevel /
              4,
          );

        const demandScore =
          roleWeight *
          qualityWeight;

        return {
          coverage,
          roleWeight,
          demandScore,
        };
      },
    );

  const totalDemand =
    weighted.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.demandScore,
      0,
    );

  const desiredCoverageSlots =
    Math.max(
      1,
      Math.round(
        targetSlots *
          1.35,
      ),
    );

  const rawTargets =
    weighted.map(
      (
        item,
      ) => {
        const share =
          totalDemand >
          0
            ? item.demandScore /
              totalDemand
            : 0;

        const recommendedWorkers =
          getRecommendedWorkerCount(
            item.coverage.name,
            item.roleWeight,
            share,
            desiredCoverageSlots,
          );

        return buildTarget(
          item.coverage,
          item.roleWeight,
          recommendedWorkers,
        );
      },
    );

  return rawTargets.sort(
    (
      a,
      b,
    ) => {
      const priorityDifference =
        statusPriority(
          a.status,
        ) -
        statusPriority(
          b.status,
        );

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      if (
        b.roleWeight !==
        a.roleWeight
      ) {
        return (
          b.roleWeight -
          a.roleWeight
        );
      }

      if (
        b.difference !==
        a.difference
      ) {
        return (
          b.difference -
          a.difference
        );
      }

      return a.work.localeCompare(
        b.work,
      );
    },
  );
}

function getRecommendedWorkerCount(
  work: string,
  roleWeight: number,
  share: number,
  desiredCoverageSlots: number,
) {
  const normalized =
    work.toLowerCase();

  let target =
    Math.round(
      share *
        desiredCoverageSlots,
    );

  if (
    roleWeight >=
    1.3
  ) {
    target =
      Math.max(
        2,
        target,
      );
  } else if (
    roleWeight >=
    1.1
  ) {
    target =
      Math.max(
        1,
        target,
      );
  } else if (
    roleWeight <
    0.7
  ) {
    target =
      Math.min(
        1,
        target,
      );
  }

  if (
    normalized ===
    "generating electricity"
  ) {
    target =
      Math.min(
        target,
        2,
      );
  }

  if (
    normalized ===
    "cooling"
  ) {
    target =
      Math.min(
        target,
        2,
      );
  }

  if (
    normalized ===
    "medicine production"
  ) {
    target =
      Math.min(
        target,
        2,
      );
  }

  if (
    normalized ===
    "farming"
  ) {
    target =
      Math.min(
        target,
        3,
      );
  }

  return Math.max(
    0,
    target,
  );
}

function buildTarget(
  coverage: WorkCoverage,
  roleWeight: number,
  recommendedWorkers: number,
): CompositionWorkTarget {
  const difference =
    recommendedWorkers -
    coverage.workers;

  let status: CompositionStatus;

  if (
    roleWeight <
      0.7 &&
    coverage.workers >
      recommendedWorkers
  ) {
    status =
      "low-priority";
  } else if (
    difference >
    0
  ) {
    status =
      "understaffed";
  } else if (
    difference <
    -1
  ) {
    status =
      "overstaffed";
  } else {
    status =
      "balanced";
  }

  return {
    work:
      coverage.name,

    roleWeight,

    currentWorkers:
      coverage.workers,

    recommendedWorkers,

    difference,

    status,

    currentBestLevel:
      coverage.highestLevel,

    reason:
      buildTargetReason(
        coverage,
        roleWeight,
        recommendedWorkers,
        status,
      ),
  };
}

// ============================================================
// TARGET EXPLANATIONS
// ============================================================

function buildTargetReason(
  coverage: WorkCoverage,
  roleWeight: number,
  recommendedWorkers: number,
  status: CompositionStatus,
) {
  const relevance =
    roleWeight >=
      1.3
      ? "very high"
      : roleWeight >=
          1.1
        ? "high"
        : roleWeight >=
            0.85
          ? "normal"
          : "low";

  if (
    status ===
    "understaffed"
  ) {
    return (
      `${coverage.name} has ${relevance} relevance for this base. ` +
      `Rebel currently sees ${coverage.workers} active worker${coverage.workers === 1 ? "" : "s"} and recommends roughly ${recommendedWorkers}.`
    );
  }

  if (
    status ===
    "overstaffed"
  ) {
    return (
      `${coverage.name} appears heavier than needed for this base role. ` +
      `Current coverage is ${coverage.workers} workers versus a target of roughly ${recommendedWorkers}.`
    );
  }

  if (
    status ===
    "low-priority"
  ) {
    return (
      `${coverage.name} is low priority for this base role. ` +
      `Existing coverage may be useful, but Rebel would not spend additional worker slots here first.`
    );
  }

  return (
    `${coverage.name} coverage is close to Rebel's current target for this base.`
  );
}

// ============================================================
// MOVE ENGINE
// ============================================================

function buildCompositionMoves(
  workTargets: CompositionWorkTarget[],
  recommendations: WorkRecommendation[],
  capacityState: CapacityState,
): CompositionMove[] {
  const moves: CompositionMove[] =
    [];

  const usedCandidates =
    new Set<string>();

  const recommendationByWork =
    new Map(
      recommendations.map(
        (
          recommendation,
        ) => [
          recommendation.work,
          recommendation,
        ],
      ),
    );

  const understaffedTargets =
    workTargets
      .filter(
        (
          target,
        ) =>
          target.status ===
          "understaffed",
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b.roleWeight !==
            a.roleWeight
          ) {
            return (
              b.roleWeight -
              a.roleWeight
            );
          }

          return (
            b.difference -
            a.difference
          );
        },
      );

  let remainingFreeSlots =
    capacityState.freeSlots;

  for (
    const target
    of understaffedTargets
  ) {
    const recommendation =
      recommendationByWork.get(
        target.work,
      );

    if (
      !recommendation
    ) {
      continue;
    }

    const candidate =
      recommendation.candidate;

    if (
      !candidate
    ) {
      continue;
    }

    const candidateKey =
      getPalIdentityKey(
        candidate,
      );

    if (
      usedCandidates.has(
        candidateKey,
      )
    ) {
      continue;
    }

    // ----------------------------------------------------------
    // DEVELOP FIRST
    // ----------------------------------------------------------

    if (
      recommendation.status ===
      "develop"
    ) {
      moves.push({
        priority:
          getMovePriority(
            "develop",
            target,
          ),

        type:
          "develop",

        work:
          target.work,

        pal:
          candidate,

        currentWorker:
          recommendation.currentBest,

        reason:
          recommendation.reason,
      });

      usedCandidates.add(
        candidateKey,
      );

      continue;
    }

    // ----------------------------------------------------------
    // ADD ONLY FOR REAL SHORTAGES
    // ----------------------------------------------------------

    if (
      remainingFreeSlots >
        0 &&
      (
        recommendation.status ===
          "add" ||
        recommendation.status ===
          "upgrade" ||
        recommendation.status ===
          "alternative"
      )
    ) {
      moves.push({
        priority:
          getMovePriority(
            "add",
            target,
          ),

        type:
          "add",

        work:
          target.work,

        pal:
          candidate,

        currentWorker:
          recommendation.currentBest,

        reason:
          `${getPalName(
            candidate,
          )} can strengthen an identified shortage in ${target.work}. The base has open capacity, so Rebel prefers adding this Pal before replacing an existing worker.`,
      });

      usedCandidates.add(
        candidateKey,
      );

      remainingFreeSlots -=
        1;

      continue;
    }

    // ----------------------------------------------------------
    // BASE FULL -> REPLACE ONLY FOR REAL SHORTAGES
    // ----------------------------------------------------------

    if (
      recommendation.status ===
      "upgrade"
    ) {
      moves.push({
        priority:
          getMovePriority(
            "replace",
            target,
          ),

        type:
          "replace",

        work:
          target.work,

        pal:
          candidate,

        currentWorker:
          recommendation.currentBest,

        reason:
          recommendation.reason,
      });

      usedCandidates.add(
        candidateKey,
      );
    }
  }

  // ============================================================
  // IMPORTANT:
  // FREE CAPACITY DOES NOT CREATE DEMAND.
  //
  // We deliberately do NOT fill remaining slots just because
  // they exist. If all actual shortages are covered, the base
  // is allowed to remain below maximum capacity.
  // ============================================================

  if (
    moves.length ===
    0
  ) {
    moves.push({
      priority:
        999,

      type:
        "hold",

      work:
        "Base",

      pal:
        null,

      currentWorker:
        null,

      reason:
        capacityState.freeSlots >
        0
          ? `No urgent staffing shortage requires another Pal right now. ${capacityState.freeSlots} worker slot${capacityState.freeSlots === 1 ? " can" : "s can"} remain empty until the base has a real need.`
          : "Rebel found no urgent composition changes. The current worker mix is broadly aligned with the detected base role.",
    });
  }

  return moves
    .sort(
      (
        a,
        b,
      ) =>
        a.priority -
        b.priority,
    )
    .slice(
      0,
      8,
    );
}

// ============================================================
// MOVE PRIORITY
// ============================================================

function getMovePriority(
  type:
    | "add"
    | "develop"
    | "replace",
  target: CompositionWorkTarget,
) {
  const base =
    type ===
    "add"
      ? 10
      : type ===
          "develop"
        ? 30
        : 50;

  const relevanceBonus =
    Math.round(
      target.roleWeight *
        10,
    );

  const shortageBonus =
    Math.max(
      0,
      target.difference *
        4,
    );

  return (
    base -
    relevanceBonus -
    shortageBonus
  );
}

// ============================================================
// SUMMARY
// ============================================================

function buildCompositionSummary(
  workTargets: CompositionWorkTarget[],
  capacityState: CapacityState,
  moves: CompositionMove[],
) {
  const understaffed =
    workTargets.filter(
      (
        target,
      ) =>
        target.status ===
        "understaffed",
    );

  const overstaffed =
    workTargets.filter(
      (
        target,
      ) =>
        target.status ===
          "overstaffed" ||
        target.status ===
          "low-priority",
    );

  if (
    workTargets.length ===
    0
  ) {
    return "Rebel does not yet have enough active work coverage to build a useful base composition plan.";
  }

  const actionableMoves =
    moves.filter(
      (
        move,
      ) =>
        move.type !==
        "hold",
    );

  if (
    understaffed.length ===
      0 &&
    overstaffed.length ===
      0
  ) {
    return (
      `The current worker mix is broadly balanced. ` +
      `${capacityState.freeSlots} free worker slot${capacityState.freeSlots === 1 ? " remains" : "s remain"}, but Rebel does not treat empty capacity as a reason to add more workers.`
    );
  }

  const pieces: string[] =
    [];

  if (
    understaffed.length >
    0
  ) {
    pieces.push(
      `${understaffed.length} work area${understaffed.length === 1 ? "" : "s"} appear understaffed`,
    );
  }

  if (
    overstaffed.length >
    0
  ) {
    pieces.push(
      `${overstaffed.length} work area${overstaffed.length === 1 ? "" : "s"} may be heavier than needed`,
    );
  }

  if (
    actionableMoves.length >
    0
  ) {
    pieces.push(
      `${actionableMoves.length} concrete action${actionableMoves.length === 1 ? " is" : "s are"} worth considering`,
    );
  }

  if (
    capacityState.freeSlots >
    0
  ) {
    pieces.push(
      `${capacityState.freeSlots} unused slot${capacityState.freeSlots === 1 ? " can" : "s can"} remain empty`,
    );
  }

  return (
    `${pieces.join(
      ", ",
    )}. Rebel only recommends additions for identified shortages; free capacity alone is not demand.`
  );
}

// ============================================================
// STATUS PRIORITY
// ============================================================

function statusPriority(
  status: CompositionStatus,
) {
  switch (
    status
  ) {
    case "understaffed":
      return 0;

    case "balanced":
      return 1;

    case "overstaffed":
      return 2;

    case "low-priority":
      return 3;
  }
}

// ============================================================
// PAL HELPERS
// ============================================================

function getPalName(
  pal: OwnedPal,
) {
  return (
    pal.nickname ??
    pal.species
  );
}

function getPalIdentityKey(
  pal: OwnedPal,
) {
  if (
    pal.id
  ) {
    return pal.id;
  }

  const containerId =
    pal.location?.containerId ??
    pal.slot?.containerId ??
    "unknown-container";

  const slotIndex =
    pal.location?.slotIndex ??
    pal.slot?.slotIndex ??
    -1;

  return [
    pal.internalSpeciesId,
    containerId,
    slotIndex,
  ].join(
    ":",
  );
}