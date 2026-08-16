export type PalPassive = {
  internalId: string;
  name: string;
  description: string | null;
  rank: number | null;
};

export type PalIVs = {
  hp: number | null;
  attack: number | null;
  defense: number | null;
};

export type PalCombatStats = {
  hp: number;
  attack: number;
  defense: number;

  hpPercentile: number;
  attackPercentile: number;
  defensePercentile: number;
  combatPercentile: number;

  speciesTier: string;
  food: number;
};

export type PalCondensation = {
  rank: number;
  stars: number;
  rankUpExp: number;
};

export type PalSoulInvestment = {
  hp: number;
  attack: number;
  defense: number;
  workSpeed: number;
};

export type PalWorkSuitabilityUpgrade = {
  workSuitability: string;
  rank: number;
};

export type PalProgression = {
  condensation: PalCondensation;

  souls: PalSoulInvestment;

  workSuitabilityUpgrades:
    PalWorkSuitabilityUpgrade[];

  friendship: {
    points: number;
    activePartySeconds: number;
    partySeconds: number;
    baseSeconds: number;
  };
};

export type PalSkills = {
  equipped: string[];
  learned: string[];
};

export type RealOwnedPal = {
  id: string | null;

  species: string;
  internalSpeciesId: string;

  nickname: string | null;
  level: number | null;

  gender: string | null;
  isAlpha: boolean;

  elements: string[];

  ivs: PalIVs;

  passives: PalPassive[];

  skills?: PalSkills;

  progression?: PalProgression;

  currentState?: {
    workSuitability: string | null;
    fullStomach: number | null;
    sanity: number | null;
  };

  workSuitability: Record<
    string,
    number | undefined
  >;

  ranchDrops?: string[];

  combatStats: PalCombatStats | null;

  slot: {
    containerId: string | null;
    slotIndex: number | null;
  };

  location: {
    type:
      | "PARTY"
      | "PALBOX"
      | "BASE"
      | "OTHER"
      | "UNKNOWN";

    containerId: string | null;
    capacity: number | null;

    slotIndex: number | null;
    displaySlot: number | null;

    baseId: string | null;
    baseIndex: number | null;

    coordinates: {
      x: number | null;
      y: number | null;
      z: number | null;
    } | null;
  };

  disabledWorkSuitabilities: string[];
};

export type PalRoleProfile =
  | "Powerhouse"
  | "Efficient"
  | "Specialist"
  | "Versatile"
  | "Balanced";

export type PalRoleScore = {
  role: string;

  /**
   * Species/reference work level.
   */
  level: number;

  /**
   * Effective level after permanent work-affinity upgrades
   * exposed by the save.
   */
  effectiveLevel: number;

  score: number;

  foodEfficiency: number;

  profile: PalRoleProfile;
};

export type PalAction =
  | "KEEP — BEST COPY"
  | "KEEP — COMBAT"
  | "KEEP — BASE"
  | "KEEP — BREEDING"
  | "KEEP — RARE"
  | "KEEP"
  | "REVIEW"
  | "REDUNDANT"
  | "SAFE TO REPLACE";

export type ReviewCategory =
  | "Possible Upgrade"
  | "Breeding Donor"
  | "Role Backup"
  | "Probably Redundant"
  | "Manual Review";

export type DecisionBucket =
  | "CORE_KEEP"
  | "USEFUL_BACKUP"
  | "BORDERLINE_CLEANUP"
  | "SAFE_CLEANUP";

export type RealPalScore = {
  overall: number;

  /**
   * Backwards-compatible combat score.
   * This is the Pal's CURRENT combat usefulness.
   */
  combat: number;

  /**
   * Natural/future combat ceiling.
   * Investment such as level/stars is intentionally reduced here.
   */
  combatPotential: number;

  /**
   * Current investment-aware strength.
   */
  currentPower: number;

  base: number;

  farming: number;

  breeding: number;

  combatReasons: string[];
  breedingReasons: string[];
  investmentReasons: string[];

  ivQuality: number;

  combatGrade: string;
  combatPotentialGrade: string;
  currentPowerGrade: string;
  baseGrade: string;
  farmingGrade: string;
  breedingGrade: string;

  bestRole: string;

  verdict: string;

  action: PalAction;

  protected: boolean;

  protectionReasons: string[];

  redundantReasons: string[];

  reviewCategory: ReviewCategory | null;
  reviewReasons: string[];

  decisionBucket: DecisionBucket;

  workRoles: PalRoleScore[];

  speciesCopyCount: number;

  speciesRank: number | null;

  bestOfSpecies: {
    overall: boolean;
    combat: boolean;
    base: boolean;
    breeding: boolean;
  };
};

export type RankedRealPal = {
  pal: RealOwnedPal;
  score: RealPalScore;
};

export type SpeciesGroup = {
  speciesKey: string;
  species: string;

  count: number;

  pals: RankedRealPal[];

  bestOverall: RankedRealPal;
  bestCombat: RankedRealPal;
  bestBase: RankedRealPal;
  bestBreeding: RankedRealPal;

  keep: RankedRealPal[];
  review: RankedRealPal[];
  replace: RankedRealPal[];
};

const IMPORTANT_PASSIVE_NAMES =
  new Set([
    "legend",
    "lucky",
    "musclehead",
    "ferocious",
    "artisan",
    "serious",
    "swift",
    "runner",
    "infinite stamina",
    "serenity",
    "impatient",
    "burly body",
  ]);

function clamp(
  value: number,
  min = 0,
  max = 100,
): number {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function grade(
  score: number,
): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";

  return "F";
}

function pushUnique(
  values: string[],
  value: string,
): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function getSpeciesKey(
  pal: RealOwnedPal,
): string {
  return pal.internalSpeciesId
    .replace(/^BOSS_/, "")
    .toLowerCase();
}

function calculateIVQuality(
  pal: RealOwnedPal,
): number {
  const values = [
    pal.ivs.hp,
    pal.ivs.attack,
    pal.ivs.defense,
  ].filter(
    (value): value is number =>
      typeof value === "number",
  );

  if (values.length === 0) {
    return 50;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  );
}

function getHighestIV(
  pal: RealOwnedPal,
): number {
  return Math.max(
    pal.ivs.hp ?? 0,
    pal.ivs.attack ?? 0,
    pal.ivs.defense ?? 0,
  );
}

function hasRarePassive(
  pal: RealOwnedPal,
): boolean {
  return pal.passives.some(
    (passive) => {
      const rank =
        passive.rank ?? 0;

      return (
        rank >= 4 ||
        IMPORTANT_PASSIVE_NAMES.has(
          passive.name.toLowerCase(),
        )
      );
    },
  );
}

function hasValuablePositivePassive(
  pal: RealOwnedPal,
): boolean {
  return pal.passives.some(
    (passive) => {
      const rank =
        passive.rank ?? 0;

      return (
        rank >= 3 ||
        IMPORTANT_PASSIVE_NAMES.has(
          passive.name.toLowerCase(),
        )
      );
    },
  );
}


const WORK_UPGRADE_ROLE_MAP:
  Record<string, string> = {
    EmitFlame: "Kindling",
    Watering: "Watering",
    Seeding: "Planting",
    GenerateElectricity:
      "Generating Electricity",
    Handcraft: "Handiwork",
    Collection: "Gathering",
    Deforest: "Lumbering",
    Mining: "Mining",
    ProductMedicine:
      "Medicine Production",
    Cool: "Cooling",
    Transport: "Transporting",
    MonsterFarm: "Farming",
  };

const WORK_SPEED_PASSIVES =
  new Set([
    "artisan",
    "serious",
    "work slave",
    "remarkable craftsmanship",
    "heart of the immovable king",
  ]);

const MOVEMENT_PASSIVES =
  new Set([
    "swift",
    "runner",
    "nimble",
    "legend",
    "infinite stamina",
  ]);

function getCondensationStars(
  pal: RealOwnedPal,
): number {
  return clamp(
    pal.progression
      ?.condensation?.stars ?? 0,
    0,
    4,
  );
}

function getSoulInvestmentTotal(
  pal: RealOwnedPal,
): number {
  const souls =
    pal.progression?.souls;

  if (!souls) {
    return 0;
  }

  return (
    Math.max(0, souls.hp) +
    Math.max(0, souls.attack) +
    Math.max(0, souls.defense) +
    Math.max(0, souls.workSpeed)
  );
}

function getWorkUpgradeForRole(
  pal: RealOwnedPal,
  role: string,
): number {
  const upgrades =
    pal.progression
      ?.workSuitabilityUpgrades ??
    [];

  let total = 0;

  for (const upgrade of upgrades) {
    const mappedRole =
      WORK_UPGRADE_ROLE_MAP[
        upgrade.workSuitability
      ] ??
      upgrade.workSuitability;

    if (
      mappedRole.toLowerCase() ===
      role.toLowerCase()
    ) {
      total +=
        Math.max(
          0,
          upgrade.rank,
        );
    }
  }

  return total;
}

function getFoodDemand(
  pal: RealOwnedPal,
): number {
  return Math.max(
    0,
    pal.combatStats?.food ?? 0,
  );
}

function getFoodEfficiencyScore(
  pal: RealOwnedPal,
): number {
  const food =
    getFoodDemand(pal);

  if (food <= 0) {
    return 65;
  }

  /*
   * Current species data commonly ranges from roughly
   * 100 to 600 food. Lower is more base-efficient.
   */
  return clamp(
    100 -
      ((food - 100) / 500) * 70,
    25,
    100,
  );
}

function getWorkPassiveBonus(
  pal: RealOwnedPal,
  role: string,
): number {
  let bonus = 0;

  for (const passive of pal.passives) {
    const name =
      passive.name.toLowerCase();

    const description =
      passive.description
        ?.toLowerCase() ?? "";

    const rank =
      passive.rank ?? 0;

    if (
      WORK_SPEED_PASSIVES.has(name) ||
      description.includes(
        "work speed",
      )
    ) {
      if (rank >= 4) {
        bonus += 12;
      } else if (rank >= 3) {
        bonus += 9;
      } else if (rank >= 1) {
        bonus += 5;
      } else if (rank < 0) {
        bonus -= 8;
      }
    }

    if (
      role.toLowerCase() ===
        "transporting" &&
      (
        MOVEMENT_PASSIVES.has(name) ||
        description.includes(
          "movement speed",
        )
      )
    ) {
      if (rank >= 4) {
        bonus += 8;
      } else if (rank >= 2) {
        bonus += 5;
      } else if (rank > 0) {
        bonus += 3;
      }
    }

    /*
     * Musclehead is excellent for combat but bad for work.
     */
    if (name === "musclehead") {
      bonus -= 10;
    }
  }

  const soulWork =
    pal.progression
      ?.souls?.workSpeed ?? 0;

  bonus +=
    Math.min(
      10,
      Math.max(0, soulWork) * 0.5,
    );

  return bonus;
}

function classifyWorkProfile(
  roleCount: number,
  effectiveLevel: number,
  foodEfficiency: number,
): PalRoleProfile {
  if (
    effectiveLevel >= 4 &&
    foodEfficiency < 55
  ) {
    return "Powerhouse";
  }

  if (
    foodEfficiency >= 78 &&
    effectiveLevel >= 2
  ) {
    return "Efficient";
  }

  if (
    roleCount <= 2 &&
    effectiveLevel >= 2
  ) {
    return "Specialist";
  }

  if (roleCount >= 4) {
    return "Versatile";
  }

  return "Balanced";
}

function getEquippedSkillCount(
  pal: RealOwnedPal,
): number {
  return (
    pal.skills?.equipped?.length ??
    0
  );
}

function calculateCombatPassiveValue(
  pal: RealOwnedPal,
): number {
  let value = 50;

  for (const passive of pal.passives) {
    const name =
      passive.name.toLowerCase();

    const description =
      passive.description
        ?.toLowerCase() ?? "";

    const rank =
      passive.rank ?? 0;

    /*
     * Do not mistake Player Attack/Defense buffs
     * (e.g. Vanguard) for the Pal's own damage.
     */
    const playerOnly =
      description.includes(
        "player attack",
      ) ||
      description.includes(
        "player defense",
      );

    const ownAttackOrDamage =
      !playerOnly &&
      (
        description.includes(
          "attack damage",
        ) ||
        description.includes(
          "increase in attack",
        ) ||
        description.includes(
          "pal attack",
        ) ||
        name === "legend" ||
        name === "musclehead" ||
        name === "ferocious" ||
        name === "demon god" ||
        name === "serenity" ||
        name === "impatient"
      );

    const defensive =
      !playerOnly &&
      (
        description.includes(
          "incoming",
        ) ||
        description.includes(
          "defense",
        ) ||
        name === "burly body" ||
        name === "legend"
      );

    if (ownAttackOrDamage) {
      if (rank >= 4) {
        value += 16;
      } else if (rank >= 3) {
        value += 12;
      } else if (rank >= 1) {
        value += 7;
      } else if (rank < 0) {
        value -= 12;
      }
    }

    if (defensive) {
      if (rank >= 4) {
        value += 8;
      } else if (rank >= 2) {
        value += 5;
      } else if (rank > 0) {
        value += 3;
      }
    }

    if (
      name === "coward" ||
      description.includes(
        "decrease in attack",
      )
    ) {
      value -= 18;
    }
  }

  return clamp(value);
}

function calculatePassiveCombatBonus(
  pal: RealOwnedPal,
): number {
  /*
   * Kept as a compact compatibility helper for the
   * existing reason/protection logic.
   */
  return (
    calculateCombatPassiveValue(pal) -
    50
  ) * 0.35;
}

function calculateCombatPotential(
  pal: RealOwnedPal,
): number {
  if (!pal.combatStats) {
    return clamp(
      calculateIVQuality(pal),
    );
  }

  const speciesStrength =
    pal.combatStats
      .combatPercentile;

  const attackIV =
    pal.ivs.attack ?? 50;

  const hpIV =
    pal.ivs.hp ?? 50;

  const defenseIV =
    pal.ivs.defense ?? 50;

  const ivCombat =
    attackIV * 0.5 +
    hpIV * 0.25 +
    defenseIV * 0.25;

  const passiveValue =
    calculateCombatPassiveValue(
      pal,
    );

  const alphaBonus =
    pal.isAlpha ? 2 : 0;

  /*
   * Potential intentionally does NOT heavily reward
   * current level/stars. Species ceiling and passives
   * matter most because IVs are repairable.
   */
  return clamp(
    speciesStrength * 0.48 +
      passiveValue * 0.32 +
      ivCombat * 0.20 +
      alphaBonus,
  );
}

function calculateCurrentPower(
  pal: RealOwnedPal,
): number {
  if (!pal.combatStats) {
    return clamp(
      calculateIVQuality(pal),
    );
  }

  const speciesStrength =
    pal.combatStats
      .combatPercentile;

  const attackIV =
    pal.ivs.attack ?? 50;

  const hpIV =
    pal.ivs.hp ?? 50;

  const defenseIV =
    pal.ivs.defense ?? 50;

  const ivCombat =
    attackIV * 0.5 +
    hpIV * 0.25 +
    defenseIV * 0.25;

  const passiveValue =
    calculateCombatPassiveValue(
      pal,
    );

  const levelScore =
    clamp(
      ((pal.level ?? 1) / 70) *
        100,
    );

  const stars =
    getCondensationStars(pal);

  const condensationBonus =
    stars * 3.5;

  const soulTotal =
    getSoulInvestmentTotal(pal);

  const soulBonus =
    Math.min(
      8,
      soulTotal * 0.25,
    );

  const skillBonus =
    Math.min(
      4,
      getEquippedSkillCount(pal) *
        1.25,
    );

  const alphaBonus =
    pal.isAlpha ? 2 : 0;

  return clamp(
    speciesStrength * 0.38 +
      ivCombat * 0.27 +
      passiveValue * 0.20 +
      levelScore * 0.10 +
      condensationBonus +
      soulBonus +
      skillBonus +
      alphaBonus,
  );
}

function calculateCombat(
  pal: RealOwnedPal,
  _ivQuality: number,
): number {
  return calculateCurrentPower(
    pal,
  );
}

function getCombatReasons(
  pal: RealOwnedPal,
): string[] {
  const reasons: string[] = [];

  const hp =
    pal.ivs.hp ?? 0;

  const attack =
    pal.ivs.attack ?? 0;

  const defense =
    pal.ivs.defense ?? 0;

  if (attack === 100) {
    reasons.push(
      "Perfect Attack IV",
    );
  } else if (attack >= 95) {
    reasons.push(
      "Exceptional Attack IV",
    );
  } else if (attack >= 90) {
    reasons.push(
      "Strong Attack IV",
    );
  }

  if (hp === 100) {
    reasons.push(
      "Perfect HP IV",
    );
  } else if (hp >= 95) {
    reasons.push(
      "Exceptional HP IV",
    );
  } else if (hp >= 90) {
    reasons.push(
      "Strong HP IV",
    );
  }

  if (defense === 100) {
    reasons.push(
      "Perfect Defense IV",
    );
  } else if (defense >= 95) {
    reasons.push(
      "Exceptional Defense IV",
    );
  } else if (defense >= 90) {
    reasons.push(
      "Strong Defense IV",
    );
  }

  if (pal.combatStats) {
    if (
      pal.combatStats.combatPercentile >=
      90
    ) {
      reasons.push(
        "Elite combat species",
      );
    } else if (
      pal.combatStats.combatPercentile >=
      75
    ) {
      reasons.push(
        "Strong combat species",
      );
    }

    if (
      pal.combatStats.attackPercentile >=
      90
    ) {
      reasons.push(
        "High species attack",
      );
    }

    if (
      pal.combatStats.hpPercentile >=
      90
    ) {
      reasons.push(
        "Excellent species HP",
      );
    }

    if (
      pal.combatStats.defensePercentile >=
      90
    ) {
      reasons.push(
        "Excellent species defense",
      );
    }
  }

  if (pal.isAlpha) {
    reasons.push(
      "Alpha fighter",
    );
  }

  for (
    const passive
    of pal.passives
  ) {
    const name =
      passive.name.toLowerCase();

    const description =
      passive.description?.toLowerCase() ??
      "";

    if (
      IMPORTANT_PASSIVE_NAMES.has(
        name,
      )
    ) {
      reasons.push(
        `Combat trait: ${passive.name}`,
      );

      continue;
    }

    if (
      (passive.rank ?? 0) > 0 &&
      (
        description.includes("attack") ||
        description.includes("damage")
      )
    ) {
      reasons.push(
        `Damage passive: ${passive.name}`,
      );
    }
  }

  if (
    pal.elements.length > 0
  ) {
    reasons.push(
      `${pal.elements.join(
        " / ",
      )} combat option`,
    );
  }

  if (
    reasons.length === 0
  ) {
    reasons.push(
      "Solid general combat option",
    );
  }

  return reasons;
}

function calculateWorkRoles(
  pal: RealOwnedPal,
): PalRoleScore[] {
  const roles: PalRoleScore[] = [];

  const roleCount =
    Object.values(
      pal.workSuitability,
    ).filter(
      (value) =>
        typeof value === "number" &&
        value > 0,
    ).length;

  const foodEfficiency =
    getFoodEfficiencyScore(pal);

  for (
    const [
      role,
      rawLevel,
    ]
    of Object.entries(
      pal.workSuitability,
    )
  ) {
    if (
      typeof rawLevel !==
      "number"
    ) {
      continue;
    }

    const disabled =
      pal.disabledWorkSuitabilities.some(
        (disabledRole) =>
          disabledRole.toLowerCase() ===
          role.toLowerCase(),
      );

    const permanentUpgrade =
      getWorkUpgradeForRole(
        pal,
        role,
      );

    const effectiveLevel =
      Math.max(
        0,
        rawLevel +
          permanentUpgrade,
      );

    const disabledPenalty =
      disabled ? 45 : 0;

    /*
     * Work level is intentionally the dominant factor.
     * Higher suitability levels represent huge real
     * throughput differences in Palworld.
     */
    const levelScore =
      Math.min(
        82,
        effectiveLevel * 17,
      );

    const passiveBonus =
      getWorkPassiveBonus(
        pal,
        role,
      );

    const foodBonus =
      foodEfficiency * 0.12;

    /*
     * A tiny versatility bonus keeps multi-role workers
     * relevant without allowing them to beat a true
     * specialist simply because they can do many jobs.
     */
    const versatilityBonus =
      Math.min(
        5,
        Math.max(
          0,
          roleCount - 1,
        ) * 1.25,
      );

    const score = clamp(
      levelScore +
        passiveBonus +
        foodBonus +
        versatilityBonus -
        disabledPenalty,
    );

    roles.push({
      role,
      level: rawLevel,
      effectiveLevel,
      score,
      foodEfficiency,
      profile:
        classifyWorkProfile(
          roleCount,
          effectiveLevel,
          foodEfficiency,
        ),
    });
  }

  return roles.sort(
    (a, b) =>
      b.score - a.score ||
      b.effectiveLevel -
        a.effectiveLevel ||
      b.foodEfficiency -
        a.foodEfficiency,
  );
}

function calculateBase(
  workRoles: PalRoleScore[],
): number {
  if (
    workRoles.length === 0
  ) {
    return 0;
  }

  const best =
    workRoles[0]?.score ?? 0;

  const second =
    workRoles[1]?.score ?? 0;

  const third =
    workRoles[2]?.score ?? 0;

  return clamp(
    best * 0.72 +
      second * 0.20 +
      third * 0.08,
  );
}

function calculateFarming(
  pal: RealOwnedPal,
  workRoles: PalRoleScore[],
): number {
  const farmingRoles =
    new Set([
      "Farming",
      "Planting",
      "Watering",
      "Gathering",
    ]);

  const relevant =
    workRoles.filter(
      (role) =>
        farmingRoles.has(
          role.role,
        ),
    );

  const ranchDropCount =
    pal.ranchDrops?.length ??
    0;

  const best =
    relevant[0]?.score ?? 0;

  const second =
    relevant[1]?.score ?? 0;

  const ranchBonus =
    Math.min(
      22,
      ranchDropCount * 12,
    );

  if (
    relevant.length === 0 &&
    ranchDropCount === 0
  ) {
    return 0;
  }

  return clamp(
    best * 0.72 +
      second * 0.18 +
      ranchBonus,
  );
}

function calculatePassiveBreedingValue(
  pal: RealOwnedPal,
): number {
  if (
    pal.passives.length === 0
  ) {
    return 30;
  }

  let total = 0;

  for (
    const passive
    of pal.passives
  ) {
    const rank =
      passive.rank ?? 0;

    if (rank >= 4) {
      total += 100;
    } else if (rank === 3) {
      total += 80;
    } else if (rank === 2) {
      total += 65;
    } else if (rank === 1) {
      total += 50;
    } else if (rank === 0) {
      total += 40;
    } else {
      total += 15;
    }

    if (
      IMPORTANT_PASSIVE_NAMES.has(
        passive.name.toLowerCase(),
      )
    ) {
      total += 25;
    }
  }

  return clamp(
    total /
      pal.passives.length,
  );
}

function getBreedingReasons(
  pal: RealOwnedPal,
  ivQuality: number,
): string[] {
  const reasons: string[] = [];

  const hp =
    pal.ivs.hp ?? 0;

  const attack =
    pal.ivs.attack ?? 0;

  const defense =
    pal.ivs.defense ?? 0;

  if (hp === 100) {
    reasons.push(
      "Perfect HP IV donor",
    );
  } else if (hp >= 95) {
    reasons.push(
      "Exceptional HP IV donor",
    );
  } else if (hp >= 90) {
    reasons.push(
      "Strong HP IV donor",
    );
  }

  if (attack === 100) {
    reasons.push(
      "Perfect Attack IV donor",
    );
  } else if (attack >= 95) {
    reasons.push(
      "Exceptional Attack IV donor",
    );
  } else if (attack >= 90) {
    reasons.push(
      "Strong Attack IV donor",
    );
  }

  if (defense === 100) {
    reasons.push(
      "Perfect Defense IV donor",
    );
  } else if (defense >= 95) {
    reasons.push(
      "Exceptional Defense IV donor",
    );
  } else if (defense >= 90) {
    reasons.push(
      "Strong Defense IV donor",
    );
  }

  if (
    hp >= 90 &&
    attack >= 90 &&
    defense >= 90
  ) {
    reasons.push(
      "Elite three-stat IV donor",
    );
  } else if (
    ivQuality >= 90
  ) {
    reasons.push(
      "Exceptional overall IVs",
    );
  } else if (
    ivQuality >= 80
  ) {
    reasons.push(
      "Strong overall IVs",
    );
  }

  const valuablePassives =
    pal.passives.filter(
      (passive) =>
        (passive.rank ?? 0) >=
          3 ||
        IMPORTANT_PASSIVE_NAMES.has(
          passive.name.toLowerCase(),
        ),
    );

  const elitePassives =
    pal.passives.filter(
      (passive) =>
        (passive.rank ?? 0) >=
          4 ||
        IMPORTANT_PASSIVE_NAMES.has(
          passive.name.toLowerCase(),
        ),
    );

  if (
    elitePassives.length >=
    2
  ) {
    reasons.push(
      "Multiple elite passive traits",
    );
  } else if (
    elitePassives.length ===
    1
  ) {
    reasons.push(
      `Elite passive donor: ${elitePassives[0].name}`,
    );
  } else if (
    valuablePassives.length >=
    2
  ) {
    reasons.push(
      "Multiple valuable passive traits",
    );
  } else if (
    valuablePassives.length ===
    1
  ) {
    reasons.push(
      `Valuable passive donor: ${valuablePassives[0].name}`,
    );
  }

  for (
    const passive
    of pal.passives
  ) {
    if (
      IMPORTANT_PASSIVE_NAMES.has(
        passive.name.toLowerCase(),
      )
    ) {
      pushUnique(
        reasons,
        `Useful inheritance trait: ${passive.name}`,
      );
    }
  }

  const negativePassives =
    pal.passives.filter(
      (passive) =>
        (passive.rank ?? 0) < 0,
    );

  if (
    pal.passives.length > 0 &&
    negativePassives.length === 0 &&
    valuablePassives.length > 0
  ) {
    reasons.push(
      "Clean positive passive set",
    );
  }

  if (
    reasons.length === 0
  ) {
    if (
      ivQuality >= 70
    ) {
      reasons.push(
        "Good general IV donor",
      );
    } else if (
      ivQuality >= 60
    ) {
      reasons.push(
        "Decent general breeding stock",
      );
    } else {
      reasons.push(
        "Limited breeding value",
      );
    }
  }

  return reasons;
}

function calculateBreeding(
  pal: RealOwnedPal,
  ivQuality: number,
): number {
  const passiveValue =
    calculatePassiveBreedingValue(
      pal,
    );

  const highestIV =
    getHighestIV(pal);

  return clamp(
    ivQuality * 0.45 +
      highestIV * 0.15 +
      passiveValue * 0.4,
  );
}

function getBestRole(
  combat: number,
  base: number,
  breeding: number,
  farming: number,
  workRoles: PalRoleScore[],
): string {
  const highest =
    Math.max(
      combat,
      base,
      breeding,
      farming,
    );

  if (
    highest === farming
  ) {
    return "Farming";
  }

  if (
    highest === breeding
  ) {
    return "Breeding";
  }

  if (
    highest === base
  ) {
    return (
      workRoles[0]?.role ??
      "Base"
    );
  }

  return "Combat";
}

function getLegacyVerdict(
  overall: number,
  ivQuality: number,
): string {
  if (
    overall >= 85 ||
    ivQuality >= 90
  ) {
    return "Definitely Keep";
  }

  if (
    overall >= 70
  ) {
    return "Keep";
  }

  if (
    overall >= 55
  ) {
    return "Useful";
  }

  if (
    overall >= 40
  ) {
    return "Situational";
  }

  return "Replace";
}

function scorePal(
  pal: RealOwnedPal,
): RealPalScore {
  const ivQuality =
    calculateIVQuality(pal);

  const combatPotential =
    calculateCombatPotential(
      pal,
    );

  const currentPower =
    calculateCurrentPower(
      pal,
    );

  /*
   * Backwards compatibility: the old "combat" field
   * now means current combat usefulness.
   */
  const combat =
    currentPower;

  const combatReasons =
    getCombatReasons(pal);

  const workRoles =
    calculateWorkRoles(pal);

  const base =
    calculateBase(
      workRoles,
    );

  const farming =
    calculateFarming(
      pal,
      workRoles,
    );

  const breeding =
    calculateBreeding(
      pal,
      ivQuality,
    );

  const breedingReasons =
    getBreedingReasons(
      pal,
      ivQuality,
    );

  const investmentReasons:
    string[] = [];

  const stars =
    getCondensationStars(pal);

  if (stars > 0) {
    investmentReasons.push(
      `${stars}★ condensed`,
    );
  }

  const partialProgress =
    pal.progression
      ?.condensation
      ?.rankUpExp ?? 0;

  if (partialProgress > 0) {
    investmentReasons.push(
      `Condensation progress: ${partialProgress}`,
    );
  }

  if (
    getSoulInvestmentTotal(pal) >
    0
  ) {
    investmentReasons.push(
      "Pal Soul investment detected",
    );
  }

  const workUpgrades =
    pal.progression
      ?.workSuitabilityUpgrades ??
    [];

  for (
    const upgrade
    of workUpgrades
  ) {
    const role =
      WORK_UPGRADE_ROLE_MAP[
        upgrade.workSuitability
      ] ??
      upgrade.workSuitability;

    investmentReasons.push(
      `${role} +${upgrade.rank}`,
    );
  }

  if (
    combatPotential -
      currentPower >=
    10
  ) {
    investmentReasons.push(
      "High combat ceiling relative to current investment",
    );
  }

  if (
    combatPotential >= 78 &&
    (pal.ivs.attack ?? 50) < 90
  ) {
    investmentReasons.push(
      "Strong candidate for IV improvement",
    );
  }

  const overall =
    Math.max(
      combat,
      combatPotential,
      base,
      farming,
      breeding,
    );

  return {
    overall,

    combat,
    combatPotential,
    currentPower,
    base,
    farming,
    breeding,

    combatReasons,
    breedingReasons,
    investmentReasons,

    ivQuality,

    combatGrade:
      grade(combat),

    combatPotentialGrade:
      grade(
        combatPotential,
      ),

    currentPowerGrade:
      grade(
        currentPower,
      ),

    baseGrade:
      grade(base),

    farmingGrade:
      grade(farming),

    breedingGrade:
      grade(breeding),

    bestRole:
      getBestRole(
        combat,
        base,
        breeding,
        farming,
        workRoles,
      ),

    verdict:
      getLegacyVerdict(
        overall,
        ivQuality,
      ),

    action: "REVIEW",

    protected: false,

    protectionReasons: [],

    redundantReasons: [],

    reviewCategory: null,

    reviewReasons: [],

    decisionBucket:
      "USEFUL_BACKUP",

    workRoles,

    speciesCopyCount: 1,

    speciesRank: null,

    bestOfSpecies: {
      overall: false,
      combat: false,
      base: false,
      breeding: false,
    },
  };
}

function rankedCopy(
  pals: RankedRealPal[],
  key:
    | "overall"
    | "combat"
    | "base"
    | "breeding",
): RankedRealPal[] {
  return [...pals].sort(
    (a, b) =>
      b.score[key] -
      a.score[key],
  );
}

function protectEntry(
  entry: RankedRealPal,
  reason: string,
): void {
  entry.score.protected =
    true;

  pushUnique(
    entry.score
      .protectionReasons,
    reason,
  );
}

function protectUniqueValuablePassives(
  groupPals: RankedRealPal[],
): void {
  const passiveMap =
    new Map<
      string,
      {
        name: string;
        holders: RankedRealPal[];
      }
    >();

  for (
    const entry
    of groupPals
  ) {
    for (
      const passive
      of entry.pal.passives
    ) {
      const valuable =
        (passive.rank ?? 0) >=
          3 ||
        IMPORTANT_PASSIVE_NAMES.has(
          passive.name.toLowerCase(),
        );

      if (!valuable) {
        continue;
      }

      const key =
        passive.internalId ||
        passive.name.toLowerCase();

      const existing =
        passiveMap.get(key) ?? {
          name: passive.name,
          holders: [],
        };

      existing.holders.push(
        entry,
      );

      passiveMap.set(
        key,
        existing,
      );
    }
  }

  for (
    const {
      name,
      holders,
    }
    of passiveMap.values()
  ) {
    if (
      holders.length !== 1
    ) {
      continue;
    }

    const onlyHolder =
      holders[0];

    if (!onlyHolder) {
      continue;
    }

    protectEntry(
      onlyHolder,
      `Unique valuable passive: ${name}`,
    );

    pushUnique(
      onlyHolder.score
        .breedingReasons,
      `Unique passive donor: ${name}`,
    );
  }
}

function protectGenderDiversity(
  groupPals: RankedRealPal[],
): void {
  if (
    groupPals.length < 3
  ) {
    return;
  }

  const genders =
    new Map<
      string,
      RankedRealPal[]
    >();

  for (
    const entry
    of groupPals
  ) {
    const gender =
      entry.pal.gender
        ?.trim()
        .toLowerCase();

    if (!gender) {
      continue;
    }

    const existing =
      genders.get(gender) ??
      [];

    existing.push(entry);

    genders.set(
      gender,
      existing,
    );
  }

  if (
    genders.size < 2
  ) {
    return;
  }

  for (
    const [
      gender,
      entries,
    ]
    of genders.entries()
  ) {
    const best =
      [...entries].sort(
        (a, b) =>
          b.score.breeding -
          a.score.breeding,
      )[0];

    if (!best) {
      continue;
    }

    if (
      best.score.breeding >=
        55 ||
      hasValuablePositivePassive(
        best.pal,
      ) ||
      best.score.ivQuality >=
        75
    ) {
      protectEntry(
        best,
        `Best ${gender} breeding option`,
      );

      pushUnique(
        best.score
          .breedingReasons,
        `Preserves ${gender} breeding option`,
      );
    }
  }
}

function protectExceptionalIVSpecialists(
  groupPals: RankedRealPal[],
): void {
  const stats: {
    key:
      | "hp"
      | "attack"
      | "defense";
    label: string;
  }[] = [
    {
      key: "hp",
      label: "HP",
    },
    {
      key: "attack",
      label: "Attack",
    },
    {
      key: "defense",
      label: "Defense",
    },
  ];

  for (
    const stat
    of stats
  ) {
    const ranked =
      [...groupPals].sort(
        (a, b) =>
          (b.pal.ivs[
            stat.key
          ] ?? 0) -
          (a.pal.ivs[
            stat.key
          ] ?? 0),
      );

    const best =
      ranked[0];

    const second =
      ranked[1];

    if (!best) {
      continue;
    }

    const bestValue =
      best.pal.ivs[
        stat.key
      ] ?? 0;

    const secondValue =
      second?.pal.ivs[
        stat.key
      ] ?? 0;

    const trulyExceptional =
      bestValue === 100 ||
      (
        bestValue >= 97 &&
        bestValue -
          secondValue >= 6
      );

    if (
      !trulyExceptional
    ) {
      continue;
    }

    protectEntry(
      best,
      `Exceptional ${stat.label} IV donor`,
    );

    pushUnique(
      best.score
        .breedingReasons,
      `Top ${stat.label} IV in this species`,
    );
  }
}

function protectMeaningfulWorkSpecialists(
  groupPals: RankedRealPal[],
): void {
  const roles =
    new Set<string>();

  for (
    const entry
    of groupPals
  ) {
    for (
      const role
      of entry.score.workRoles
    ) {
      roles.add(
        role.role,
      );
    }
  }

  for (
    const role
    of roles
  ) {
    const ranked =
      groupPals
        .map((entry) => {
          const roleData =
            entry.score.workRoles.find(
              (item) =>
                item.role === role,
            );

          return {
            entry,
            level:
              roleData?.level ??
              0,
            score:
              roleData?.score ??
              0,
          };
        })
        .filter(
          (item) =>
            item.level > 0,
        )
        .sort(
          (a, b) =>
            b.level -
              a.level ||
            b.score -
              a.score,
        );

    const best =
      ranked[0];

    const second =
      ranked[1];

    if (!best) {
      continue;
    }

    const meaningful =
      best.level >= 3 ||
      (
        best.level >= 2 &&
        (
          !second ||
          best.level >
            second.level ||
          best.score -
            second.score >=
            8
        )
      );

    if (
      meaningful
    ) {
      protectEntry(
        best.entry,
        `Best ${role} specialist`,
      );
    }
  }
}

function isStrongRoleWinner(
  entry: RankedRealPal,
  role:
    | "combat"
    | "base"
    | "breeding",
): boolean {
  if (
    role === "combat"
  ) {
    return (
      entry.score.combat >=
      60
    );
  }

  if (
    role === "base"
  ) {
    return (
      entry.score.base >=
      50
    );
  }

  return (
    entry.score.breeding >=
    62
  );
}

function isClearlyDominated(
  entry: RankedRealPal,
  groupPals: RankedRealPal[],
): boolean {
  return groupPals.some(
    (other) => {
      if (
        other === entry
      ) {
        return false;
      }

      const overallLead =
        other.score.overall -
        entry.score.overall;

      const combatLead =
        other.score.combat -
        entry.score.combat;

      const baseLead =
        other.score.base -
        entry.score.base;

      const breedingLead =
        other.score.breeding -
        entry.score.breeding;

      return (
        overallLead >= 8 &&
        combatLead >= 5 &&
        baseLead >= 3 &&
        breedingLead >= 5
      );
    },
  );
}

function sameGenderSurvivors(
  entry: RankedRealPal,
  groupPals: RankedRealPal[],
): number {
  const gender =
    entry.pal.gender
      ?.trim()
      .toLowerCase();

  if (!gender) {
    return 99;
  }

  return groupPals.filter(
    (candidate) =>
      candidate !== entry &&
      candidate.pal.gender
        ?.trim()
        .toLowerCase() ===
        gender &&
      candidate.score.action !==
        "SAFE TO REPLACE",
  ).length;
}

function canSafelyReplace(
  entry: RankedRealPal,
  groupPals: RankedRealPal[],
): boolean {
  const {
    pal,
    score,
  } = entry;

  if (
    score.protected ||
    groupPals.length < 4
  ) {
    return false;
  }

  if (
    pal.isAlpha ||
    hasRarePassive(pal) ||
    hasValuablePositivePassive(
      pal,
    )
  ) {
    return false;
  }

  if (
    score.bestOfSpecies.overall ||
    score.bestOfSpecies.combat ||
    score.bestOfSpecies.base ||
    score.bestOfSpecies.breeding
  ) {
    return false;
  }

  if (
    score.ivQuality >= 80 ||
    getHighestIV(pal) >= 95
  ) {
    return false;
  }

  if (
    !isClearlyDominated(
      entry,
      groupPals,
    )
  ) {
    return false;
  }

  const weakIVs =
    score.ivQuality < 65;

  const lowOverall =
    score.overall < 60;

  const noValuablePassives =
    !hasValuablePositivePassive(
      pal,
    );

  const noPassives =
    pal.passives.length ===
    0;

  const negativeOnly =
    pal.passives.length >
      0 &&
    pal.passives.every(
      (passive) =>
        (passive.rank ?? 0) <=
        0,
    );

  const redundancySignals =
    [
      weakIVs,
      lowOverall,
      noValuablePassives,
      noPassives,
      negativeOnly,
      score.redundantReasons.length >=
        2,
    ].filter(Boolean).length;

  const requiredSignals =
    groupPals.length >= 8
      ? 2
      : 3;

  return (
    redundancySignals >=
    requiredSignals
  );
}

function classifyReview(
  entry: RankedRealPal,
  groupPals: RankedRealPal[],
  bestOverall: RankedRealPal,
  bestCombat: RankedRealPal,
  bestBase: RankedRealPal,
  bestBreeding: RankedRealPal,
): void {
  const {
    pal,
    score,
  } = entry;

  score.reviewCategory = null;
  score.reviewReasons = [];

  if (
    score.action !== "REVIEW" &&
    score.action !== "REDUNDANT"
  ) {
    return;
  }

  const overallGap =
    bestOverall.score.overall -
    score.overall;

  const combatGap =
    bestCombat.score.combat -
    score.combat;

  const baseGap =
    bestBase.score.base -
    score.base;

  const breedingGap =
    bestBreeding.score.breeding -
    score.breeding;

  const dominated =
    isClearlyDominated(
      entry,
      groupPals,
    );

  const valuableBreeding =
    score.breeding >= 58 ||
    score.ivQuality >= 75 ||
    getHighestIV(pal) >= 90 ||
    hasValuablePositivePassive(
      pal,
    ) ||
    score.breedingReasons.some(
      (reason) =>
        reason.includes(
          "donor",
        ) ||
        reason.includes(
          "inheritance",
        ),
    );

  const usefulBackup =
    combatGap <= 7 ||
    baseGap <= 7 ||
    breedingGap <= 7;

  const possibleUpgrade =
    overallGap <= 8 ||
    score.ivQuality >= 70 ||
    score.overall >= 65;

  if (
    score.action === "REDUNDANT" &&
    dominated &&
    score.redundantReasons.length >= 2
  ) {
    score.reviewCategory =
      "Probably Redundant";

    pushUnique(
      score.reviewReasons,
      "A stronger same-species copy already beats it across several useful categories",
    );

    for (
      const reason
      of score.redundantReasons.slice(
        0,
        2,
      )
    ) {
      pushUnique(
        score.reviewReasons,
        reason,
      );
    }

    if (
      sameGenderSurvivors(
        entry,
        groupPals,
      ) === 0
    ) {
      pushUnique(
        score.reviewReasons,
        "Held back from automatic removal to preserve breeding gender diversity",
      );
    } else {
      pushUnique(
        score.reviewReasons,
        "Close to removable, but it did not pass every strict safety check",
      );
    }

    return;
  }

  if (
    valuableBreeding
  ) {
    score.reviewCategory =
      "Breeding Donor";

    if (
      score.ivQuality >= 75
    ) {
      pushUnique(
        score.reviewReasons,
        `Useful overall IV quality (${score.ivQuality.toFixed(
          0,
        )})`,
      );
    }

    if (
      getHighestIV(pal) >= 90
    ) {
      pushUnique(
        score.reviewReasons,
        `Contains a ${getHighestIV(
          pal,
        )} IV that may be worth passing down`,
      );
    }

    const passive =
      pal.passives.find(
        (candidate) =>
          (candidate.rank ?? 0) >=
            3 ||
          IMPORTANT_PASSIVE_NAMES.has(
            candidate.name.toLowerCase(),
          ),
      );

    if (passive) {
      pushUnique(
        score.reviewReasons,
        `Carries useful breeding trait: ${passive.name}`,
      );
    }

    if (
      breedingGap <= 10
    ) {
      pushUnique(
        score.reviewReasons,
        `Only ${breedingGap.toFixed(
          0,
        )} points behind your best breeder of this species`,
      );
    }

    return;
  }

  if (
    usefulBackup
  ) {
    score.reviewCategory =
      "Role Backup";

    if (
      combatGap <= 7
    ) {
      pushUnique(
        score.reviewReasons,
        `Close to your best combat copy (${combatGap.toFixed(
          0,
        )} points behind)`,
      );
    }

    if (
      baseGap <= 7
    ) {
      pushUnique(
        score.reviewReasons,
        `Close to your best base copy (${baseGap.toFixed(
          0,
        )} points behind)`,
      );
    }

    if (
      breedingGap <= 7
    ) {
      pushUnique(
        score.reviewReasons,
        `Close to your best breeding copy (${breedingGap.toFixed(
          0,
        )} points behind)`,
      );
    }

    if (
      score.workRoles.length > 0
    ) {
      const bestRole =
        score.workRoles[0];

      if (bestRole) {
        pushUnique(
          score.reviewReasons,
          `Useful backup for ${bestRole.role} Lv.${bestRole.level}`,
        );
      }
    }

    return;
  }

  if (
    possibleUpgrade
  ) {
    score.reviewCategory =
      "Possible Upgrade";

    if (
      overallGap <= 8
    ) {
      pushUnique(
        score.reviewReasons,
        `Only ${overallGap.toFixed(
          0,
        )} points behind your best overall copy`,
      );
    }

    if (
      score.ivQuality >= 70
    ) {
      pushUnique(
        score.reviewReasons,
        `Solid IV quality (${score.ivQuality.toFixed(
          0,
        )})`,
      );
    }

    if (
      score.overall >= 65
    ) {
      pushUnique(
        score.reviewReasons,
        "Strong enough overall that it is worth a manual comparison",
      );
    }

    return;
  }

  score.reviewCategory =
    "Manual Review";

  if (
    score.redundantReasons.length >
    0
  ) {
    pushUnique(
      score.reviewReasons,
      score.redundantReasons[0],
    );
  }

  pushUnique(
    score.reviewReasons,
    "No single role is strong enough to auto-keep it, but the safety rules are not confident enough to remove it",
  );
}

function applyCollectionIntelligence(
  scoredPals: RankedRealPal[],
): SpeciesGroup[] {
  const groups =
    new Map<
      string,
      RankedRealPal[]
    >();

  for (
    const rankedPal
    of scoredPals
  ) {
    const key =
      getSpeciesKey(
        rankedPal.pal,
      );

    const existing =
      groups.get(key) ??
      [];

    existing.push(
      rankedPal,
    );

    groups.set(
      key,
      existing,
    );
  }

  const speciesGroups:
    SpeciesGroup[] = [];

  for (
    const [
      speciesKey,
      groupPals,
    ]
    of groups.entries()
  ) {
    const overallRanking =
      rankedCopy(
        groupPals,
        "overall",
      );

    const combatRanking =
      rankedCopy(
        groupPals,
        "combat",
      );

    const baseRanking =
      rankedCopy(
        groupPals,
        "base",
      );

    const breedingRanking =
      rankedCopy(
        groupPals,
        "breeding",
      );

    const bestOverall =
      overallRanking[0];

    const bestCombat =
      combatRanking[0];

    const bestBase =
      baseRanking[0];

    const bestBreeding =
      breedingRanking[0];

    if (
      !bestOverall ||
      !bestCombat ||
      !bestBase ||
      !bestBreeding
    ) {
      continue;
    }

    for (
      const rankedPal
      of groupPals
    ) {
      const {
        pal,
        score,
      } = rankedPal;

      score.speciesCopyCount =
        groupPals.length;

      score.speciesRank =
        overallRanking.findIndex(
          (entry) =>
            entry ===
            rankedPal,
        ) + 1;

      score.bestOfSpecies = {
        overall:
          rankedPal ===
          bestOverall,

        combat:
          rankedPal ===
          bestCombat,

        base:
          rankedPal ===
          bestBase,

        breeding:
          rankedPal ===
          bestBreeding,
      };

      if (
        groupPals.length ===
        1
      ) {
        protectEntry(
          rankedPal,
          "Only copy of this species",
        );
      }

      if (pal.isAlpha) {
        protectEntry(
          rankedPal,
          "Alpha Pal",
        );
      }

      if (
        hasRarePassive(pal)
      ) {
        protectEntry(
          rankedPal,
          "Rare or valuable passive",
        );
      }

      const stars =
        getCondensationStars(pal);

      const soulInvestment =
        getSoulInvestmentTotal(pal);

      const workUpgradeCount =
        pal.progression
          ?.workSuitabilityUpgrades
          ?.length ?? 0;

      if (stars > 0) {
        protectEntry(
          rankedPal,
          `Invested Pal: ${stars}★ condensed`,
        );
      }

      if (soulInvestment > 0) {
        protectEntry(
          rankedPal,
          "Invested Pal: Pal Souls used",
        );
      }

      if (workUpgradeCount > 0) {
        protectEntry(
          rankedPal,
          "Invested Pal: permanent work upgrade",
        );
      }

      if (
        score.ivQuality >= 92
      ) {
        protectEntry(
          rankedPal,
          "Exceptional overall IVs",
        );
      }

      if (
        score.bestOfSpecies.overall
      ) {
        protectEntry(
          rankedPal,
          "Best overall copy",
        );
      }

      if (
        score.bestOfSpecies.combat
      ) {
        pushUnique(
          score.combatReasons,
          "Best combat copy of this species",
        );

        if (
          groupPals.length >
          1
        ) {
          pushUnique(
            score.combatReasons,
            `Best fighter from ${groupPals.length} owned copies`,
          );
        }
      }

      if (
        score.bestOfSpecies.breeding
      ) {
        pushUnique(
          score.breedingReasons,
          "Best breeding copy of this species",
        );

        if (
          groupPals.length >
          1
        ) {
          pushUnique(
            score.breedingReasons,
            `Best breeder from ${groupPals.length} owned copies`,
          );
        }
      }
    }

    protectUniqueValuablePassives(
      groupPals,
    );

    protectGenderDiversity(
      groupPals,
    );

    protectExceptionalIVSpecialists(
      groupPals,
    );

    protectMeaningfulWorkSpecialists(
      groupPals,
    );

    if (
      isStrongRoleWinner(
        bestCombat,
        "combat",
      )
    ) {
      protectEntry(
        bestCombat,
        "Best combat copy",
      );
    }

    if (
      isStrongRoleWinner(
        bestBase,
        "base",
      )
    ) {
      protectEntry(
        bestBase,
        "Best base copy",
      );
    }

    if (
      isStrongRoleWinner(
        bestBreeding,
        "breeding",
      )
    ) {
      protectEntry(
        bestBreeding,
        "Best breeding copy",
      );
    }

    for (
      const rankedPal
      of overallRanking
    ) {
      const {
        pal,
        score,
      } = rankedPal;

      if (
        score.bestOfSpecies.overall
      ) {
        continue;
      }

      const overallGap =
        bestOverall.score.overall -
        score.overall;

      const combatGap =
        bestCombat.score.combat -
        score.combat;

      const baseGap =
        bestBase.score.base -
        score.base;

      const breedingGap =
        bestBreeding.score.breeding -
        score.breeding;

      if (
        overallGap >= 10
      ) {
        pushUnique(
          score.redundantReasons,
          "Weaker than your best same-species copy",
        );
      }

      if (
        combatGap >= 8 &&
        baseGap >= 5 &&
        breedingGap >= 8
      ) {
        pushUnique(
          score.redundantReasons,
          "Outclassed across combat, base work and breeding",
        );
      }

      if (
        score.ivQuality < 60
      ) {
        pushUnique(
          score.redundantReasons,
          "Below-average IV quality",
        );
      }

      if (
        pal.passives.length ===
        0
      ) {
        pushUnique(
          score.redundantReasons,
          "No passive inheritance value",
        );
      } else if (
        pal.passives.every(
          (passive) =>
            (passive.rank ?? 0) <=
            0,
        )
      ) {
        pushUnique(
          score.redundantReasons,
          "No valuable positive passives",
        );
      }

      if (
        isClearlyDominated(
          rankedPal,
          groupPals,
        )
      ) {
        pushUnique(
          score.redundantReasons,
          "Another copy is clearly stronger in every useful category",
        );
      }
    }

    for (
      const rankedPal
      of groupPals
    ) {
      const {
        pal,
        score,
      } = rankedPal;

      if (
        score.bestOfSpecies.overall
      ) {
        score.action =
          "KEEP — BEST COPY";

        continue;
      }

      if (
        pal.isAlpha ||
        hasRarePassive(pal)
      ) {
        score.action =
          "KEEP — RARE";

        continue;
      }

      if (
        score.bestOfSpecies.combat &&
        isStrongRoleWinner(
          rankedPal,
          "combat",
        )
      ) {
        score.action =
          "KEEP — COMBAT";

        continue;
      }

      if (
        score.bestOfSpecies.base &&
        isStrongRoleWinner(
          rankedPal,
          "base",
        )
      ) {
        score.action =
          "KEEP — BASE";

        continue;
      }

      if (
        score.bestOfSpecies.breeding &&
        isStrongRoleWinner(
          rankedPal,
          "breeding",
        )
      ) {
        score.action =
          "KEEP — BREEDING";

        continue;
      }

      if (
        score.protected
      ) {
        score.action =
          "KEEP";

        continue;
      }

      if (
        canSafelyReplace(
          rankedPal,
          groupPals,
        )
      ) {
        score.action =
          "SAFE TO REPLACE";

        pushUnique(
          score.redundantReasons,
          "A stronger same-species copy already covers its useful roles",
        );

        continue;
      }

      if (
        score.redundantReasons.length >=
        2
      ) {
        score.action =
          "REDUNDANT";

        continue;
      }

      score.action =
        "REVIEW";
    }

    for (
      const rankedPal
      of groupPals
    ) {
      if (
        rankedPal.score.action !==
        "SAFE TO REPLACE"
      ) {
        continue;
      }

      if (
        sameGenderSurvivors(
          rankedPal,
          groupPals,
        ) === 0
      ) {
        rankedPal.score.action =
          "REVIEW";

        pushUnique(
          rankedPal.score
            .protectionReasons,
          "Preserves breeding gender diversity",
        );
      }
    }

    /*
     * REVIEW INTELLIGENCE
     *
     * This does NOT change Keep / Review /
     * Safe-to-Replace decisions. It only
     * explains the existing Review bucket.
     */
    for (
      const rankedPal
      of groupPals
    ) {
      classifyReview(
        rankedPal,
        groupPals,
        bestOverall,
        bestCombat,
        bestBase,
        bestBreeding,
      );

      const { score } =
        rankedPal;

      if (
        score.action ===
        "SAFE TO REPLACE"
      ) {
        score.decisionBucket =
          "SAFE_CLEANUP";
      } else if (
        score.action.startsWith(
          "KEEP",
        )
      ) {
        score.decisionBucket =
          "CORE_KEEP";
      } else if (
        score.reviewCategory ===
        "Probably Redundant"
      ) {
        score.decisionBucket =
          "BORDERLINE_CLEANUP";
      } else {
        score.decisionBucket =
          "USEFUL_BACKUP";
      }
    }

    const sorted =
      overallRanking;

    speciesGroups.push({
      speciesKey,

      species:
        bestOverall.pal.species,

      count:
        groupPals.length,

      pals:
        sorted,

      bestOverall,

      bestCombat,

      bestBase,

      bestBreeding,

      keep:
        sorted.filter(
          ({ score }) =>
            score.decisionBucket ===
            "CORE_KEEP",
        ),

      /*
       * Compatibility field for the current UI.
       *
       * Until page.tsx is updated, "review"
       * still contains both useful backups and
       * borderline cleanup candidates.
       */
      review:
        sorted.filter(
          ({ score }) =>
            score.decisionBucket ===
              "USEFUL_BACKUP" ||
            score.decisionBucket ===
              "BORDERLINE_CLEANUP",
        ),

      replace:
        sorted.filter(
          ({ score }) =>
            score.decisionBucket ===
            "SAFE_CLEANUP",
        ),
    });
  }

  return speciesGroups.sort(
    (a, b) =>
      b.bestOverall.score.overall -
      a.bestOverall.score.overall,
  );
}

export function rankRealPals(
  pals: RealOwnedPal[],
) {
  const all:
    RankedRealPal[] =
    pals.map((pal) => ({
      pal,
      score:
        scorePal(pal),
    }));

  const speciesGroups =
    applyCollectionIntelligence(
      all,
    );

  const overall =
    rankedCopy(
      all,
      "overall",
    );

  const combat =
    rankedCopy(
      all,
      "combat",
    );

  const base =
    rankedCopy(
      all,
      "base",
    );

  const breeding =
    rankedCopy(
      all,
      "breeding",
    );

  const combatPotential =
    [...all].sort(
      (a, b) =>
        b.score.combatPotential -
        a.score.combatPotential,
    );

  const currentPower =
    [...all].sort(
      (a, b) =>
        b.score.currentPower -
        a.score.currentPower,
    );

  const farming =
    [...all].sort(
      (a, b) =>
        b.score.farming -
        a.score.farming,
    );

  const roleNames =
    new Set<string>();

  for (const entry of all) {
    for (
      const role
      of entry.score.workRoles
    ) {
      roleNames.add(role.role);
    }
  }

  const workByRole:
    Record<
      string,
      RankedRealPal[]
    > = {};

  for (const role of roleNames) {
    workByRole[role] =
      all
        .filter((entry) =>
          entry.score.workRoles.some(
            (item) =>
              item.role === role,
          ),
        )
        .sort((a, b) => {
          const aRole =
            a.score.workRoles.find(
              (item) =>
                item.role === role,
            );

          const bRole =
            b.score.workRoles.find(
              (item) =>
                item.role === role,
            );

          return (
            (bRole?.score ?? 0) -
              (aRole?.score ?? 0) ||
            (bRole?.effectiveLevel ??
              0) -
              (aRole?.effectiveLevel ??
                0)
          );
        });
  }

  const efficientWorkers =
    [...base].sort(
      (a, b) => {
        const aBest =
          a.score.workRoles[0];

        const bBest =
          b.score.workRoles[0];

        const aEfficiency =
          aBest
            ? (
                aBest.score *
                  0.7 +
                aBest.foodEfficiency *
                  0.3
              )
            : 0;

        const bEfficiency =
          bBest
            ? (
                bBest.score *
                  0.7 +
                bBest.foodEfficiency *
                  0.3
              )
            : 0;

        return (
          bEfficiency -
          aEfficiency
        );
      },
    );

  const coreKeep =
    overall.filter(
      ({ score }) =>
        score.decisionBucket ===
        "CORE_KEEP",
    );

  const usefulBackup =
    overall.filter(
      ({ score }) =>
        score.decisionBucket ===
        "USEFUL_BACKUP",
    );

  const borderlineCleanup =
    overall.filter(
      ({ score }) =>
        score.decisionBucket ===
        "BORDERLINE_CLEANUP",
    );

  const safeCleanup =
    overall
      .filter(
        ({ score }) =>
          score.decisionBucket ===
          "SAFE_CLEANUP",
      )
      .sort(
        (a, b) =>
          a.score.overall -
          b.score.overall,
      );

  /*
   * Backwards-compatible aliases.
   *
   * page.tsx currently expects these names.
   * The next UI update will switch to the
   * four clean bucket names above.
   */
  const definitelyKeep =
    coreKeep;

  const review = [
    ...usefulBackup,
    ...borderlineCleanup,
  ];

  const safeToReplace =
    safeCleanup;

  const replace =
    safeCleanup;

  const onlyCopies =
    overall.filter(
      ({ score }) =>
        score.protectionReasons.includes(
          "Only copy of this species",
        ),
    );

  const rare =
    overall.filter(
      ({ score }) =>
        score.action ===
        "KEEP — RARE",
    );

  const bestCopies =
    overall.filter(
      ({ score }) =>
        score.bestOfSpecies.overall,
    );

  const baseKeepers =
    overall.filter(
      ({ score }) =>
        score.action ===
          "KEEP — BASE" ||
        (
          score.bestOfSpecies.base &&
          score.base >= 50
        ),
    );

  const combatKeepers =
    overall.filter(
      ({ score }) =>
        score.action ===
          "KEEP — COMBAT" ||
        (
          score.bestOfSpecies.combat &&
          score.combat >= 60
        ),
    );

  const breedingKeepers =
    overall.filter(
      ({ score }) =>
        score.action ===
          "KEEP — BREEDING" ||
        (
          score.bestOfSpecies.breeding &&
          score.breeding >= 62
        ),
    );

  const reviewBreakdown =
    review.reduce(
      (
        counts,
        entry,
      ) => {
        const category =
          entry.score
            .reviewCategory ??
          "Manual Review";

        counts[category] +=
          1;

        return counts;
      },
      {
        "Possible Upgrade": 0,
        "Breeding Donor": 0,
        "Role Backup": 0,
        "Probably Redundant": 0,
        "Manual Review": 0,
      } as Record<
        ReviewCategory,
        number
      >,
    );

  return {
    all,

    overall,
    combat,
    base,
    breeding,

    combatPotential,
    currentPower,
    farming,
    workByRole,
    efficientWorkers,

    speciesGroups,

    coreKeep,

    usefulBackup,

    borderlineCleanup,

    safeCleanup,

    definitelyKeep,

    bestCopies,

    baseKeepers,

    combatKeepers,

    breedingKeepers,

    rare,

    onlyCopies,

    review,

    safeToReplace,

    replace,

    reviewBreakdown,

    summary: {
      total:
        all.length,

      species:
        speciesGroups.length,

      /*
       * Clean four-bucket model.
       */
      coreKeep:
        coreKeep.length,

      usefulBackup:
        usefulBackup.length,

      borderlineCleanup:
        borderlineCleanup.length,

      safeCleanup:
        safeCleanup.length,

      /*
       * Backwards-compatible summary names.
       * These keep the existing page working
       * until we replace page.tsx next.
       */
      keep:
        coreKeep.length,

      review:
        review.length,

      safeToReplace:
        safeCleanup.length,

      rare:
        rare.length,

      onlyCopies:
        onlyCopies.length,

      baseKeepers:
        baseKeepers.length,

      combatKeepers:
        combatKeepers.length,

      breedingKeepers:
        breedingKeepers.length,

      condensed:
        all.filter(
          ({ pal }) =>
            getCondensationStars(
              pal,
            ) > 0,
        ).length,

      farmingCandidates:
        farming.filter(
          ({ score }) =>
            score.farming > 0,
        ).length,

      workRoles:
        roleNames.size,
    },
  };
}