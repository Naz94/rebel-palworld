import type {
  PalPassive,
  PassiveEffect,
} from "./types";

// ============================================================
// PASSIVE INTELLIGENCE
// ============================================================

export function classifyPassive(
  passive: PalPassive,
  work: string,
): PassiveEffect {
  const internal =
    passive.internalId.toLowerCase();

  const name =
    passive.name.toLowerCase();

  const description =
    (
      passive.description ??
      ""
    ).toLowerCase();

  const text =
    `${internal} ${name} ${description}`;

  // ----------------------------------------------------------
  // DIRECT WORK SUITABILITY BONUS
  // ----------------------------------------------------------

  if (
    text.includes(
      "worksuitabilityaddrank",
    ) ||
    description.includes(
      "work suitability +",
    )
  ) {
    const relevant =
      passiveMatchesWork(
        passive,
        work,
      );

    return {
      passive,

      category:
        "job-rank",

      score:
        relevant
          ? 26
          : 0,

      relevant,

      summary:
        relevant
          ? `Direct ${work} suitability bonus`
          : "Suitability bonus for another role",
    };
  }

  // ----------------------------------------------------------
  // WORK SPEED
  // ----------------------------------------------------------

  if (
    text.includes(
      "craftspeed",
    ) ||
    description.includes(
      "work speed",
    ) ||
    name.includes(
      "artisan",
    ) ||
    name.includes(
      "serious",
    )
  ) {
    const negative =
      internal.includes(
        "down",
      ) ||
      description.includes(
        "work speed -",
      ) ||
      name.includes(
        "slacker",
      ) ||
      name.includes(
        "clumsy",
      );

    const score =
      negative
        ? -Math.max(
            12,
            Math.abs(
              passive.rank,
            ) *
              8,
          )
        : Math.max(
            12,
            Math.abs(
              passive.rank,
            ) *
              8,
          );

    return {
      passive,

      category:
        negative
          ? "negative-work"
          : "work-speed",

      score,

      relevant:
        true,

      summary:
        negative
          ? "Work-speed penalty"
          : "Work-speed bonus",
    };
  }

  // ----------------------------------------------------------
  // SAN / WORK SUSTAINABILITY
  // ----------------------------------------------------------

  if (
    text.includes(
      "sanity",
    ) ||
    description.includes(
      "san drops",
    ) ||
    description.includes(
      "sanity",
    ) ||
    name.includes(
      "workaholic",
    ) ||
    name.includes(
      "positive thinker",
    )
  ) {
    const clearlyNegative =
      description.includes(
        "faster",
      ) ||
      name.includes(
        "unstable",
      );

    return {
      passive,

      category:
        clearlyNegative
          ? "negative-work"
          : "san",

      score:
        clearlyNegative
          ? -10
          : 10,

      relevant:
        true,

      summary:
        clearlyNegative
          ? "Worse work sustainability"
          : "Better work sustainability",
    };
  }

  // ----------------------------------------------------------
  // NOCTURNAL UPTIME
  // ----------------------------------------------------------

  if (
    internal.includes(
      "nightowl",
    ) ||
    name.includes(
      "night owl",
    ) ||
    description.includes(
      "nocturnal",
    )
  ) {
    return {
      passive,

      category:
        "nocturnal",

      score:
        12,

      relevant:
        true,

      summary:
        "Nocturnal uptime bonus",
    };
  }

  // ----------------------------------------------------------
  // MOVEMENT SPEED
  // RELEVANT TO TRANSPORTING
  // ----------------------------------------------------------

  if (
    internal.includes(
      "movespeed",
    ) ||
    description.includes(
      "movement speed",
    )
  ) {
    const negative =
      internal.includes(
        "down",
      ) ||
      description.includes(
        "movement speed -",
      );

    const relevant =
      work.toLowerCase() ===
      "transporting";

    const score =
      relevant
        ? (
            negative
              ? -Math.max(
                  8,
                  Math.abs(
                    passive.rank,
                  ) *
                    4,
                )
              : Math.max(
                  8,
                  Math.abs(
                    passive.rank,
                  ) *
                    4,
                )
          )
        : 0;

    return {
      passive,

      category:
        negative
          ? "negative-work"
          : "movement",

      score,

      relevant,

      summary:
        relevant
          ? (
              negative
                ? "Movement penalty for Transporting"
                : "Movement bonus for Transporting"
            )
          : "Movement effect is not scored for this role",
    };
  }

  // ----------------------------------------------------------
  // EVERYTHING ELSE
  // ----------------------------------------------------------

  return {
    passive,

    category:
      "neutral",

    score:
      0,

    relevant:
      false,

    summary:
      "Not directly relevant to base productivity",
  };
}

// ============================================================
// PASSIVE -> WORK MATCHING
// ============================================================

export function passiveMatchesWork(
  passive: PalPassive,
  work: string,
) {
  const target =
    work.toLowerCase();

  const text =
    `${passive.internalId} ${passive.name} ${passive.description ?? ""}`.toLowerCase();

  const aliases: Record<
    string,
    string[]
  > = {
    farming: [
      "farming",
      "monsterfarm",
      "farm",
    ],

    planting: [
      "planting",
      "seeding",
    ],

    watering: [
      "watering",
      "water",
    ],

    handiwork: [
      "handiwork",
      "handcraft",
      "craft",
    ],

    lumbering: [
      "lumbering",
      "logging",
      "wood",
    ],

    mining: [
      "mining",
      "mine",
    ],

    transporting: [
      "transporting",
      "transport",
      "carry",
    ],

    gathering: [
      "gathering",
      "harvest",
    ],

    cooling: [
      "cooling",
      "cool",
    ],

    kindling: [
      "kindling",
      "fire",
    ],

    medicine: [
      "medicine",
      "medical",
    ],

    "medicine production": [
      "medicine",
      "medical",
    ],

    "generating electricity": [
      "electric",
      "generating",
      "generator",
    ],
  };

  const candidates =
    aliases[
      target
    ] ??
    [
      target,
    ];

  return candidates.some(
    (
      alias,
    ) =>
      text.includes(
        alias,
      ),
  );
}

// ============================================================
// JOB RANK BONUS
// ============================================================

export function inferSuitabilityRankBonus(
  passive: PalPassive,
  work: string,
) {
  if (
    !passiveMatchesWork(
      passive,
      work,
    )
  ) {
    return 0;
  }

  const description =
    passive.description ??
    "";

  const match =
    description.match(
      /work suitability\s*\+\s*(\d+)/i,
    );

  if (match) {
    return Number(
      match[1],
    );
  }

  return 1;
}