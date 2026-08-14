import type {
  OwnedPal,
  WorkProfile,
} from "./types";

import {
  classifyPassive,
  inferSuitabilityRankBonus,
} from "./passive-intelligence";

// ============================================================
// WORK PROFILE
// ============================================================

export function calculateWorkProfile(
  pal: OwnedPal,
  work: string,
  roleWeight = 1,
): WorkProfile {
  const baseWorkLevel =
    pal.workSuitability?.[
      work
    ] ??
    0;

  const disabledForRole =
    isWorkDisabled(
      pal,
      work,
    );

  const effects =
    pal.passives.map(
      (
        passive,
      ) =>
        classifyPassive(
          passive,
          work,
        ),
    );

  const relevantPassives =
    effects.filter(
      (
        effect,
      ) =>
        effect.relevant,
    );

  const ignoredPassives =
    effects.filter(
      (
        effect,
      ) =>
        !effect.relevant,
    );

  const jobRankBonus =
    relevantPassives
      .filter(
        (
          effect,
        ) =>
          effect.category ===
          "job-rank",
      )
      .reduce(
        (
          total,
          effect,
        ) =>
          total +
          inferSuitabilityRankBonus(
            effect.passive,
            work,
          ),
        0,
      );

  const passiveScore =
    relevantPassives.reduce(
      (
        total,
        effect,
      ) =>
        total +
        effect.score,
      0,
    );

  const roleCount =
    getEnabledWorkEntries(
      pal,
    ).length;

  const focusPenalty =
    Math.max(
      0,
      roleCount -
        1,
    ) *
    2;

  const effectiveWorkLevel =
    Math.max(
      0,
      baseWorkLevel +
        jobRankBonus,
    );

  const rawScore =
    effectiveWorkLevel *
      100 +
    passiveScore -
    focusPenalty;

  const workerScore =
    Math.round(
      rawScore *
      roleWeight,
    );

  return {
    work,

    baseWorkLevel,

    jobRankBonus,

    effectiveWorkLevel,

    passiveScore,

    focusPenalty,

    workerScore,

    relevantPassives,

    ignoredPassives,

    roleCount,

    disabledForRole,
  };
}

// ============================================================
// DISABLED WORK HELPERS
// ============================================================

export function normalizeWorkName(
  work: string,
) {
  return work
    .replace(
      /^EPalWorkSuitability::/i,
      "",
    )
    .replace(
      /[^a-z0-9]/gi,
      "",
    )
    .toLowerCase();
}

export function isWorkDisabled(
  pal: OwnedPal,
  work: string,
) {
  const disabled =
    pal.disabledWorkSuitabilities ??
    [];

  const target =
    normalizeWorkName(
      work,
    );

  return disabled.some(
    (
      item,
    ) =>
      normalizeWorkName(
        item,
      ) ===
      target,
  );
}

// ============================================================
// ENABLED WORK
// ============================================================

export function getEnabledWorkEntries(
  pal: OwnedPal,
) {
  return Object.entries(
    pal.workSuitability ??
      {},
  ).filter(
    ([
      work,
      level,
    ]) =>
      typeof level ===
        "number" &&
      level >
        0 &&
      !isWorkDisabled(
        pal,
        work,
      ),
  );
}