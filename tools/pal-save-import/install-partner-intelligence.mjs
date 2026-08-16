import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\rank-pals.ts";

const backupPath =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\rank-pals-v5-pre-partner-backup.ts";

let source = fs
  .readFileSync(
    path,
    "utf8",
  )
  .replace(
    /\r\n/g,
    "\n",
  );

if (
  source.includes(
    "export type PalPartnerSkill",
  )
) {
  console.log(
    "Partner Skill intelligence already appears to be installed. No changes made.",
  );

  process.exit(0);
}

fs.copyFileSync(
  path,
  backupPath,
);

function replaceOnce(
  label,
  before,
  after,
) {
  const index =
    source.indexOf(
      before,
    );

  if (
    index === -1
  ) {
    throw new Error(
      "Patch failed at: " +
        label,
    );
  }

  source =
    source.slice(
      0,
      index,
    ) +
    after +
    source.slice(
      index +
        before.length,
    );

  console.log(
    "✓ " + label,
  );
}

function replaceBetween(
  label,
  startMarker,
  endMarker,
  replacement,
) {
  const start =
    source.indexOf(
      startMarker,
    );

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length,
    );

  if (
    start === -1 ||
    end === -1
  ) {
    throw new Error(
      "Patch failed at: " +
        label,
    );
  }

  source =
    source.slice(
      0,
      start,
    ) +
    replacement +
    source.slice(
      end,
    );

  console.log(
    "✓ " + label,
  );
}

// ============================================================
// TYPES
// ============================================================

replaceOnce(
  "Partner Skill type",

  String.raw`export type PalSkills = {
  equipped: string[];
  learned: string[];
};

`,

  String.raw`export type PalSkills = {
  equipped: string[];
  learned: string[];
};

export type PalPartnerSkill = {
  name: string | null;
  description: string | null;
  tags: string[];
};

`,
);

replaceOnce(
  "Reference provenance fields",

  String.raw`  referenceIdentity?: {
    paldex:
      | string
      | number
      | null;
    canonicalCode:
      | string
      | null;
    canonicalName:
      | string
      | null;
  } | null;
`,

  String.raw`  referenceIdentity?: {
    paldex:
      | string
      | number
      | null;
    canonicalCode:
      | string
      | null;
    canonicalName:
      | string
      | null;

    source?: string | null;
    gameVersion?: string | null;
    workSource?: string | null;
    combatSource?: string | null;
    partnerSkillSource?: string | null;
  } | null;
`,
);

replaceOnce(
  "Partner Skill on owned Pal",

  String.raw`  elements: string[];

  ivs: PalIVs;
`,

  String.raw`  elements: string[];

  partnerSkill?: PalPartnerSkill | null;

  ivs: PalIVs;
`,
);

// ============================================================
// PARTNER SKILL HELPERS
// ============================================================

const helperBlock =
  String.raw`function getPartnerSkillRank(
  pal: RealOwnedPal,
): number {
  return (
    getCondensationStars(
      pal,
    ) + 1
  );
}

function getPartnerSkillTags(
  pal: RealOwnedPal,
): Set<string> {
  return new Set(
    (
      pal.partnerSkill
        ?.tags ??
      []
    ).map(
      (tag) =>
        tag.toLowerCase(),
    ),
  );
}

function getPartnerSkillDescription(
  pal: RealOwnedPal,
): string {
  return (
    pal.partnerSkill
      ?.description
      ?.toLowerCase() ??
    ""
  );
}

function getPartnerSkillName(
  pal: RealOwnedPal,
): string {
  return (
    pal.partnerSkill
      ?.name ??
    "Partner Skill"
  );
}

function getPartnerSkillScalingBonus(
  pal: RealOwnedPal,
): number {
  return (
    getCondensationStars(
      pal,
    ) * 3
  );
}

function getPartnerSupportData(
  pal: RealOwnedPal,
): {
  score: number;
  reasons: string[];
} {
  const partner =
    pal.partnerSkill;

  if (
    !partner
  ) {
    return {
      score: 0,
      reasons: [],
    };
  }

  const tags =
    getPartnerSkillTags(
      pal,
    );

  const description =
    getPartnerSkillDescription(
      pal,
    );

  const reasons:
    string[] = [];

  let score = 0;

  const playerEffect =
    description.includes(
      "player's attack",
    ) ||
    description.includes(
      "player attack",
    ) ||
    description.includes(
      "player's defense",
    ) ||
    description.includes(
      "player defense",
    ) ||
    description.includes(
      "player's health",
    ) ||
    description.includes(
      "player health",
    ) ||
    description.includes(
      "player's stamina",
    ) ||
    description.includes(
      "player stamina",
    ) ||
    description.includes(
      "player's movement",
    ) ||
    description.includes(
      "player movement",
    ) ||
    description.includes(
      "player's work speed",
    ) ||
    description.includes(
      "player work speed",
    ) ||
    description.includes(
      "carrying capacity",
    ) ||
    description.includes(
      "carry weight",
    );

  const partyPalEffect =
    tags.has(
      "party",
    ) &&
    (
      description.includes(
        "pals",
      ) ||
      description.includes(
        "pal's",
      )
    );

  const healingEffect =
    description.includes(
      "restore",
    ) ||
    description.includes(
      "heal",
    ) ||
    description.includes(
      "health",
    );

  if (
    tags.has(
      "party",
    )
  ) {
    score += 34;

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": party support",
    );
  }

  if (
    playerEffect
  ) {
    score += 18;

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": directly supports the player",
    );
  }

  if (
    partyPalEffect
  ) {
    score += 12;

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": boosts party Pals",
    );
  }

  if (
    healingEffect &&
    tags.has(
      "party",
    )
  ) {
    score += 8;

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": survival / healing utility",
    );
  }

  if (
    tags.has(
      "mount",
    ) &&
    (
      description.includes(
        "while mounted",
      ) ||
      description.includes(
        "can be ridden",
      )
    )
  ) {
    score += 5;

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": mount utility",
    );
  }

  if (
    score > 0
  ) {
    score +=
      getPartnerSkillScalingBonus(
        pal,
      );

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        " is Partner Skill Rank " +
        getPartnerSkillRank(
          pal,
        ),
    );
  }

  return {
    score:
      clamp(
        score,
      ),

    reasons,
  };
}

function getPartnerBaseBonus(
  pal: RealOwnedPal,
): number {
  if (
    !pal.partnerSkill
  ) {
    return 0;
  }

  const tags =
    getPartnerSkillTags(
      pal,
    );

  const description =
    getPartnerSkillDescription(
      pal,
    );

  if (
    !tags.has(
      "base",
    ) &&
    !description.includes(
      "while at a base",
    )
  ) {
    return 0;
  }

  let bonus = 16;

  if (
    description.includes(
      "all other base pals",
    ) ||
    description.includes(
      "all base pals",
    )
  ) {
    bonus += 10;
  }

  if (
    description.includes(
      "work suitability",
    )
  ) {
    bonus += 8;
  }

  if (
    description.includes(
      "work speed",
    )
  ) {
    bonus += 6;
  }

  bonus +=
    getPartnerSkillScalingBonus(
      pal,
    );

  return Math.min(
    34,
    bonus,
  );
}

function getPartnerFarmingBonus(
  pal: RealOwnedPal,
): number {
  if (
    !pal.partnerSkill
  ) {
    return 0;
  }

  const tags =
    getPartnerSkillTags(
      pal,
    );

  const description =
    getPartnerSkillDescription(
      pal,
    );

  let bonus = 0;

  if (
    tags.has(
      "ranch",
    )
  ) {
    bonus += 22;
  }

  if (
    description.includes(
      "ranch",
    )
  ) {
    bonus += 8;
  }

  const productionKeywords = [
    "farming",
    "planting",
    "watering",
    "gathering",
    "crop",
    "harvest",
  ];

  const affectsProduction =
    productionKeywords.some(
      (keyword) =>
        description.includes(
          keyword,
        ),
    );

  if (
    tags.has(
      "base",
    ) &&
    affectsProduction
  ) {
    bonus += 14;
  }

  if (
    bonus > 0
  ) {
    bonus +=
      getPartnerSkillScalingBonus(
        pal,
      );
  }

  return Math.min(
    38,
    bonus,
  );
}

function getPartnerCombatUtilityBonus(
  pal: RealOwnedPal,
): number {
  if (
    !pal.partnerSkill
  ) {
    return 0;
  }

  const tags =
    getPartnerSkillTags(
      pal,
    );

  const description =
    getPartnerSkillDescription(
      pal,
    );

  let bonus = 0;

  if (
    tags.has(
      "active",
    )
  ) {
    bonus += 4;
  }

  if (
    description.includes(
      "damage multiplier",
    ) ||
    description.includes(
      "attacks targeted enemy",
    ) ||
    description.includes(
      "explosion",
    ) ||
    description.includes(
      "fires",
    )
  ) {
    bonus += 3;
  }

  if (
    tags.has(
      "mount",
    ) &&
    (
      description.includes(
        "damage",
      ) ||
      description.includes(
        "attack",
      )
    )
  ) {
    bonus += 2;
  }

  if (
    bonus > 0
  ) {
    bonus +=
      Math.min(
        2,
        getCondensationStars(
          pal,
        ) * 0.5,
      );
  }

  return Math.min(
    10,
    bonus,
  );
}

`;

replaceOnce(
  "Partner Skill helpers",

  "function calculateSupport(\n",

  helperBlock +
    "function calculateSupport(\n",
);

// ============================================================
// SUPPORT
// ============================================================

replaceBetween(
  "Support scorer",

  String.raw`function calculateSupport(
  pal: RealOwnedPal,
): {
  score: number;
  reasons: string[];
} {`,

  "function calculateExpeditionFirepower(",

  String.raw`function calculateSupport(
  pal: RealOwnedPal,
): {
  score: number;
  reasons: string[];
} {
  const supportPassives =
    pal.passives.filter(
      isPlayerSupportPassive,
    );

  const partnerSupport =
    getPartnerSupportData(
      pal,
    );

  let score = 0;

  const reasons:
    string[] = [];

  if (
    supportPassives.length >
    0
  ) {
    score = 35;

    for (
      const passive
      of supportPassives
    ) {
      const rank =
        passive.rank ?? 0;

      if (
        rank >= 4
      ) {
        score += 28;
      } else if (
        rank >= 3
      ) {
        score += 23;
      } else if (
        rank >= 2
      ) {
        score += 18;
      } else if (
        rank >= 1
      ) {
        score += 13;
      } else if (
        rank < 0
      ) {
        score -= 15;
      }

      const description =
        passive.description ??
        "Player-support effect";

      reasons.push(
        passive.name +
          ": " +
          description,
      );
    }

    if (
      supportPassives.length >=
      2
    ) {
      score += 10;

      reasons.push(
        "Multiple player-support traits",
      );
    }
  }

  if (
    partnerSupport.score >
    0
  ) {
    if (
      score > 0
    ) {
      score =
        score * 0.58 +
        partnerSupport.score *
          0.62;
    } else {
      score =
        partnerSupport.score;
    }

    for (
      const reason
      of partnerSupport.reasons
    ) {
      pushUnique(
        reasons,
        reason,
      );
    }
  }

  return {
    score:
      clamp(
        score,
      ),

    reasons,
  };
}

`,
);

// ============================================================
// COMBAT
// ============================================================

replaceOnce(
  "Partner Skill combat ceiling",

  String.raw`  return clamp(
    speciesStrength * 0.48 +
      perfectIvCeiling * 0.25 +
      passiveValue * 0.27,
  );
}
`,

  String.raw`  const partnerUtility =
    getPartnerCombatUtilityBonus(
      pal,
    );

  return clamp(
    speciesStrength * 0.48 +
      perfectIvCeiling * 0.25 +
      passiveValue * 0.27 +
      partnerUtility,
  );
}
`,
);

replaceOnce(
  "Partner Skill current combat",

  String.raw`  const naturalQuality =
    clamp(
      speciesStrength * 0.48 +
        currentIv * 0.25 +
        passiveValue * 0.27,
    );
`,

  String.raw`  const partnerUtility =
    getPartnerCombatUtilityBonus(
      pal,
    );

  const naturalQuality =
    clamp(
      speciesStrength * 0.48 +
        currentIv * 0.25 +
        passiveValue * 0.27 +
        partnerUtility,
    );
`,
);

replaceOnce(
  "Partner Skill combat explanation",

  String.raw`  if (
    pal.elements.length > 0
  ) {
`,

  String.raw`  const partnerCombatUtility =
    getPartnerCombatUtilityBonus(
      pal,
    );

  if (
    partnerCombatUtility > 0 &&
    pal.partnerSkill
  ) {
    reasons.push(
      "Partner Skill combat utility: " +
        getPartnerSkillName(
          pal,
        ),
    );
  }

  if (
    pal.elements.length > 0
  ) {
`,
);

// ============================================================
// BASE
// ============================================================

replaceBetween(
  "Base Partner Skill scorer",

  "function calculateBase(",

  "function calculateFarming(",

  String.raw`function calculateBase(
  pal: RealOwnedPal,
  workRoles: PalRoleScore[],
): number {
  const partnerBonus =
    getPartnerBaseBonus(
      pal,
    );

  if (
    workRoles.length === 0
  ) {
    return clamp(
      partnerBonus,
    );
  }

  const best =
    workRoles[0]
      ?.score ?? 0;

  const second =
    workRoles[1]
      ?.score ?? 0;

  const third =
    workRoles[2]
      ?.score ?? 0;

  return clamp(
    best * 0.72 +
      second * 0.20 +
      third * 0.08 +
      partnerBonus,
  );
}

`,
);

// ============================================================
// FARMING
// ============================================================

replaceOnce(
  "Partner Skill farming scorer",

  String.raw`  const ranchValue =
    ranchDropCount > 0
      ? Math.min(
          55,
          20 +
            ranchDropCount * 6 +
            stars * 6 +
            (ranchMaster
              ? 14
              : 0),
        )
      : 0;

  if (
    relevant.length === 0 &&
    ranchDropCount === 0
  ) {
    return 0;
  }

  return clamp(
    best * 0.55 +
      second * 0.15 +
      ranchValue,
  );
}
`,

  String.raw`  const ranchValue =
    ranchDropCount > 0
      ? Math.min(
          55,
          20 +
            ranchDropCount * 6 +
            stars * 6 +
            (ranchMaster
              ? 14
              : 0),
        )
      : 0;

  const partnerFarmingBonus =
    getPartnerFarmingBonus(
      pal,
    );

  if (
    relevant.length === 0 &&
    ranchDropCount === 0 &&
    partnerFarmingBonus === 0
  ) {
    return 0;
  }

  return clamp(
    best * 0.55 +
      second * 0.15 +
      ranchValue +
      partnerFarmingBonus,
  );
}
`,
);

// ============================================================
// SCOREPAL
// ============================================================

replaceOnce(
  "Base scorer call",

  String.raw`  const base =
    calculateBase(
      workRoles,
    );
`,

  String.raw`  const base =
    calculateBase(
      pal,
      workRoles,
    );
`,
);

replaceOnce(
  "Partner Skill investment reason",

  String.raw`  const stars =
    getCondensationStars(pal);

  if (stars > 0) {
`,

  String.raw`  const stars =
    getCondensationStars(pal);

  if (
    pal.partnerSkill &&
    (
      getPartnerSupportData(
        pal,
      ).score > 0 ||
      getPartnerBaseBonus(
        pal,
      ) > 0 ||
      getPartnerFarmingBonus(
        pal,
      ) > 0 ||
      getPartnerCombatUtilityBonus(
        pal,
      ) > 0
    )
  ) {
    investmentReasons.push(
      getPartnerSkillName(
        pal,
      ) +
        " improves with Partner Skill rank",
    );
  }

  if (stars > 0) {
`,
);

// ============================================================
// WRITE
// ============================================================

fs.writeFileSync(
  path,
  source,
  "utf8",
);

console.log(
  "\nPartner Skill intelligence installed successfully.",
);

console.log(
  "Backup: " +
    backupPath,
);

console.log(
  "Updated: " +
    path,
);