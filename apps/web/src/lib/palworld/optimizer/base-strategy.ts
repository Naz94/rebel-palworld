import type {
  BaseRole,
  BaseRoleConfidence,
  BaseStrategy,
  BaseWorkPriority,
  OwnedPal,
  WorkCoverage,
} from "./types";

// ============================================================
// BASE STRATEGY
// ============================================================

export function buildBaseStrategy(
  baseName: string,
  coverage: WorkCoverage[],
  workers: OwnedPal[],
): BaseStrategy {
  const normalizedName =
    baseName.toLowerCase();

  const workScores =
    coverage.map(
      (
        work,
      ): BaseWorkPriority => ({
        work:
          work.name,

        score:
          calculateBaseWorkScore(
            work,
          ),

        workers:
          work.workers,

        highestLevel:
          work.highestLevel,
      }),
    );

  const nameSignal =
    detectRoleFromName(
      normalizedName,
    );

  const coverageSignal =
    detectRoleFromCoverage(
      workScores,
      workers,
    );

  const combined =
    combineRoleSignals(
      nameSignal,
      coverageSignal,
    );

  const sortedWork =
    [...workScores].sort(
      (
        a,
        b,
      ) =>
        b.score -
        a.score,
    );

  const priorityWork =
    sortedWork.filter(
      (
        item,
      ) =>
        getBaseRoleWeight(
          combined.role,
          item.work,
        ) >=
        1.2,
    );

  const supportingWork =
    sortedWork.filter(
      (
        item,
      ) => {
        const weight =
          getBaseRoleWeight(
            combined.role,
            item.work,
          );

        return (
          weight >=
            0.85 &&
          weight <
            1.2
        );
      },
    );

  const lowPriorityWork =
    sortedWork.filter(
      (
        item,
      ) =>
        getBaseRoleWeight(
          combined.role,
          item.work,
        ) <
        0.85,
    );

  return {
    role:
      combined.role,

    label:
      getBaseRoleLabel(
        combined.role,
      ),

    confidence:
      combined.confidence,

    priorityWork,

    supportingWork,

    lowPriorityWork,

    reason:
      combined.reason,
  };
}

// ============================================================
// ROLE SIGNALS
// ============================================================

function detectRoleFromName(
  baseName: string,
): {
  role: BaseRole;
  score: number;
  reason: string;
} | null {
  if (
    baseName.includes(
      "breed",
    )
  ) {
    return {
      role:
        "breeding",

      score:
        5,

      reason:
        "The base name strongly indicates breeding.",
    };
  }

  if (
    baseName.includes(
      "oil",
    ) ||
    baseName.includes(
      "crude",
    ) ||
    baseName.includes(
      "mine",
    ) ||
    baseName.includes(
      "mining",
    )
  ) {
    return {
      role:
        "resource",

      score:
        5,

      reason:
        "The base name strongly indicates resource production.",
    };
  }

  if (
    baseName.includes(
      "farm",
    ) ||
    baseName.includes(
      "food",
    ) ||
    baseName.includes(
      "plant",
    )
  ) {
    return {
      role:
        "farming",

      score:
        5,

      reason:
        "The base name strongly indicates farming or food production.",
    };
  }

  if (
    baseName.includes(
      "factory",
    ) ||
    baseName.includes(
      "production",
    ) ||
    baseName.includes(
      "craft",
    )
  ) {
    return {
      role:
        "production",

      score:
        4,

      reason:
        "The base name suggests manufacturing or production.",
    };
  }

  if (
    baseName.includes(
      "main",
    ) ||
    baseName.includes(
      "home",
    )
  ) {
    return {
      role:
        "general",

      score:
        3,

      reason:
        "The base name suggests a mixed main base.",
    };
  }

  return null;
}

// ============================================================
// COVERAGE SIGNALS
// ============================================================

function detectRoleFromCoverage(
  workScores: BaseWorkPriority[],
  workers: OwnedPal[],
) {
  const scores: Record<
    BaseRole,
    number
  > = {
    general:
      0,

    production:
      0,

    resource:
      0,

    farming:
      0,

    breeding:
      0,
  };

  for (
    const item
    of workScores
  ) {
    scores.general +=
      item.score *
      0.45;

    scores.production +=
      item.score *
      getBaseRoleWeight(
        "production",
        item.work,
      );

    scores.resource +=
      item.score *
      getBaseRoleWeight(
        "resource",
        item.work,
      );

    scores.farming +=
      item.score *
      getBaseRoleWeight(
        "farming",
        item.work,
      );

    scores.breeding +=
      item.score *
      getBaseRoleWeight(
        "breeding",
        item.work,
      );
  }

  if (
    workers.length >=
    10
  ) {
    scores.general +=
      12;
  }

  const ranked =
    Object.entries(
      scores,
    )
      .map(
        ([
          role,
          score,
        ]) => ({
          role:
            role as BaseRole,

          score,
        }),
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.score -
          a.score,
      );

  const best =
    ranked[0];

  const second =
    ranked[1];

  const separation =
    best.score -
    second.score;

  return {
    role:
      best.role,

    score:
      best.score,

    separation,

    reason:
      `Active worker coverage most closely matches ${getBaseRoleLabel(
        best.role,
      )}.`,
  };
}

// ============================================================
// SIGNAL COMBINATION
// ============================================================

function combineRoleSignals(
  nameSignal: ReturnType<
    typeof detectRoleFromName
  >,
  coverageSignal: ReturnType<
    typeof detectRoleFromCoverage
  >,
): {
  role: BaseRole;
  confidence: BaseRoleConfidence;
  reason: string;
} {
  if (
    nameSignal &&
    nameSignal.score >=
    5
  ) {
    return {
      role:
        nameSignal.role,

      confidence:
        "high",

      reason:
        `${nameSignal.reason} Worker coverage was also analysed as a secondary signal.`,
    };
  }

  if (
    nameSignal &&
    nameSignal.role ===
      coverageSignal.role
  ) {
    return {
      role:
        nameSignal.role,

      confidence:
        "high",

      reason:
        `${nameSignal.reason} The active workforce supports the same classification.`,
    };
  }

  if (
    nameSignal
  ) {
    return {
      role:
        nameSignal.role,

      confidence:
        "medium",

      reason:
        `${nameSignal.reason} Worker coverage is mixed, so confidence is limited.`,
    };
  }

  if (
    coverageSignal.separation >
    40
  ) {
    return {
      role:
        coverageSignal.role,

      confidence:
        "high",

      reason:
        coverageSignal.reason,
    };
  }

  if (
    coverageSignal.separation >
    15
  ) {
    return {
      role:
        coverageSignal.role,

      confidence:
        "medium",

      reason:
        coverageSignal.reason,
    };
  }

  return {
    role:
      "general",

    confidence:
      "low",

    reason:
      "The active workforce is too mixed to confidently identify a specialised base role.",
  };
}

// ============================================================
// WORK WEIGHTING
// ============================================================

function calculateBaseWorkScore(
  coverage: WorkCoverage,
) {
  return (
    coverage.workers *
      12 +
    coverage.highestLevel *
      18 +
    coverage.totalLevel *
      4
  );
}

export function getBaseRoleWeight(
  role: BaseRole,
  work: string,
) {
  const normalized =
    work.toLowerCase();

  const tables: Record<
    BaseRole,
    Record<string, number>
  > = {
    general: {
      transporting:
        1.25,

      handiwork:
        1.2,

      "generating electricity":
        1.15,

      planting:
        1,

      watering:
        1,

      gathering:
        1,

      mining:
        0.95,

      kindling:
        0.95,

      cooling:
        0.9,

      lumbering:
        0.9,

      "medicine production":
        0.85,

      farming:
        0.85,
    },

    production: {
      handiwork:
        1.5,

      transporting:
        1.4,

      "generating electricity":
        1.4,

      kindling:
        1.2,

      cooling:
        1.1,

      mining:
        0.95,

      lumbering:
        0.9,

      planting:
        0.65,

      watering:
        0.65,

      gathering:
        0.65,

      farming:
        0.6,

      "medicine production":
        0.85,
    },

    resource: {
      mining:
        1.55,

      transporting:
        1.45,

      "generating electricity":
        1.35,

      handiwork:
        1,

      lumbering:
        1,

      kindling:
        0.85,

      cooling:
        0.8,

      planting:
        0.55,

      watering:
        0.55,

      gathering:
        0.55,

      farming:
        0.5,

      "medicine production":
        0.6,
    },

    farming: {
      planting:
        1.5,

      watering:
        1.5,

      gathering:
        1.45,

      transporting:
        1.25,

      farming:
        1.2,

      cooling:
        0.95,

      "generating electricity":
        0.9,

      handiwork:
        0.8,

      kindling:
        0.75,

      mining:
        0.45,

      lumbering:
        0.5,

      "medicine production":
        0.7,
    },

    breeding: {
      farming:
        1.25,

      transporting:
        1.1,

      cooling:
        1,

      planting:
        0.9,

      watering:
        0.9,

      gathering:
        0.9,

      handiwork:
        0.65,

      "generating electricity":
        0.65,

      kindling:
        0.6,

      mining:
        0.35,

      lumbering:
        0.35,

      "medicine production":
        0.5,
    },
  };

  return (
    tables[
      role
    ][
      normalized
    ] ??
    0.75
  );
}

// ============================================================
// ROLE LABELS
// ============================================================

export function getBaseRoleLabel(
  role: BaseRole,
) {
  switch (
    role
  ) {
    case "production":
      return "Production Base";

    case "resource":
      return "Resource Base";

    case "farming":
      return "Farming Base";

    case "breeding":
      return "Breeding Base";

    default:
      return "General Production";
  }
}

// ============================================================
// ROLE RELEVANCE LABEL
// ============================================================

export function formatRoleRelevance(
  weight: number,
) {
  if (
    weight >=
    1.3
  ) {
    return "Very High";
  }

  if (
    weight >=
    1.1
  ) {
    return "High";
  }

  if (
    weight >=
    0.85
  ) {
    return "Normal";
  }

  return "Low";
}