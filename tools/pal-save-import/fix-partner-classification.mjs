import fs from "node:fs";

const target =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\rank-pals.ts";

const backup =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\rank-pals-v5-pre-classification-v2-backup.ts";

const marker =
  "// PARTNER_CLASSIFICATION_V2_SAFE";

let source =
  fs.readFileSync(
    target,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );

if (
  source.includes(
    marker,
  )
) {
  console.log(
    "Partner classification V2 safe patch is already installed. No changes made.",
  );

  process.exit(0);
}

const operations = [
  {
    label:
      "scaling",

    before:
`function getPartnerSkillScalingBonus(
  pal: RealOwnedPal,
): number {
  return (
    getCondensationStars(
      pal,
    ) * 3
  );
}

`,

    after:
`function hasPartnerSkillScalingEvidence(
  pal: RealOwnedPal,
): boolean {
  const description =
    pal.partnerSkill
      ?.description ??
    "";

  return description.includes(
    "~",
  );
}

function getPartnerSkillScalingBonus(
  pal: RealOwnedPal,
): number {
  if (
    !hasPartnerSkillScalingEvidence(
      pal,
    )
  ) {
    return 0;
  }

  return (
    getCondensationStars(
      pal,
    ) * 3
  );
}

`,
  },

  {
    label:
      "support",

    before:
`function getPartnerSupportData(
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

`,

    after:
`function getPartnerSupportData(
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
    tags.has(
      "party",
    ) &&
    (
      description.includes(
        "restore",
      ) ||
      description.includes(
        "heal",
      )
    );

  const genuinePartySupport =
    tags.has(
      "party",
    ) &&
    (
      playerEffect ||
      partyPalEffect ||
      healingEffect
    );

  if (
    !genuinePartySupport
  ) {
    return {
      score: 0,
      reasons: [],
    };
  }

  let score = 34;

  reasons.push(
    getPartnerSkillName(
      pal,
    ) +
      ": party support",
  );

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
    healingEffect
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
    hasPartnerSkillScalingEvidence(
      pal,
    )
  ) {
    score +=
      getPartnerSkillScalingBonus(
        pal,
      );

    reasons.push(
      getPartnerSkillName(
        pal,
      ) +
        ": rank-scaled support effect",
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

`,
  },

  {
    label:
      "combatutil",

    before:
`function getPartnerCombatUtilityBonus(
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

`,

    after:
`function getPartnerCombatUtilityBonus(
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
        "damage multiplier",
      ) ||
      description.includes(
        "damage dealt",
      ) ||
      description.includes(
        "attack damage",
      )
    )
  ) {
    bonus += 2;
  }

  if (
    bonus > 0 &&
    hasPartnerSkillScalingEvidence(
      pal,
    )
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

`,
  },

  {
    label:
      "passive wording",

    before:
`    if (
      isSelfCombatPassive(
        passive,
      )
    ) {
      if (
        description.includes(
          "attack",
        ) ||
        description.includes(
          "damage",
        )
      ) {
        reasons.push(
          \`Self-combat passive: \${passive.name}\`,
        );
      } else {
        reasons.push(
          \`Combat utility passive: \${passive.name}\`,
        );
      }
    }
  }
`,

    after:
`    if (
      isSelfCombatPassive(
        passive,
      )
    ) {
      const offensive =
        description.includes(
          "attack",
        ) ||
        description.includes(
          "damage",
        );

      const defensive =
        description.includes(
          "defense",
        ) ||
        description.includes(
          "incoming",
        ) ||
        description.includes(
          "resist",
        ) ||
        passive.name
          .toLowerCase() ===
          "burly body";

      if (
        offensive &&
        !defensive
      ) {
        reasons.push(
          \`Offensive passive: \${passive.name}\`,
        );
      } else if (
        defensive &&
        !offensive
      ) {
        reasons.push(
          \`Defensive passive: \${passive.name}\`,
        );
      } else {
        reasons.push(
          \`Combat utility passive: \${passive.name}\`,
        );
      }
    }
  }
`,
  },

  {
    label:
      "best role",

    before:
`function getBestRole(
  combat: number,
  combatPotential: number,
  base: number,
  farming: number,
  support: number,
  workRoles: PalRoleScore[],
): string {
  /*
   * "Best role" means the Pal's PRIMARY PRACTICAL USE.
   * Breeding is strategic collection value, not an active job,
   * so it is deliberately excluded from this comparison.
   *
   * Combat gets partial credit for ceiling so an excellent but
   * unfinished fighter is not mislabeled as a worker merely
   * because it has not been fully invested yet.
   */
  const combatUse =
    Math.max(
      combat,
      combatPotential * 0.85,
    );

  const highest =
    Math.max(
      combatUse,
      base,
      farming,
      support,
    );

  if (highest === support) {
    return "Player Support";
  }

  if (highest === farming) {
    return "Farming";
  }

  if (highest === base) {
    const bestWorkRole =
      workRoles[0]?.role;

    if (
      bestWorkRole ===
      "Transporting"
    ) {
      return "Base Logistics";
    }

    return (
      bestWorkRole ??
      "Base Work"
    );
  }

  return "Combat";
}

`,

    after:
`function getBestRole(
  pal: RealOwnedPal,
  combat: number,
  combatPotential: number,
  base: number,
  farming: number,
  support: number,
  workRoles: PalRoleScore[],
): string {
  const combatUse =
    Math.max(
      combat,
      combatPotential * 0.85,
    );

  const baseSupport =
    getPartnerBaseBonus(
      pal,
    );

  if (
    support > 0 &&
    support >=
      combatUse - 5 &&
    support >=
      farming - 5 &&
    support >=
      base - 5
  ) {
    return "Player Support";
  }

  if (
    baseSupport > 0 &&
    base >= combatUse &&
    base >= farming &&
    base >= support
  ) {
    return "Base Support";
  }

  const highest =
    Math.max(
      combatUse,
      base,
      farming,
      support,
    );

  if (
    highest === support
  ) {
    return "Player Support";
  }

  if (
    highest === farming
  ) {
    return "Farming";
  }

  if (
    highest === base
  ) {
    const bestWorkRole =
      workRoles[0]?.role;

    if (
      bestWorkRole ===
      "Transporting"
    ) {
      return "Base Logistics";
    }

    return (
      bestWorkRole ??
      "Base Work"
    );
  }

  return "Combat";
}

`,
  },

  {
    label:
      "investment",

    before:
`  if (
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
  }`,

    after:
`  if (
    pal.partnerSkill &&
    hasPartnerSkillScalingEvidence(
      pal,
    ) &&
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
        " has a rank-scaled effect worth investing in",
    );
  }`,
  },

  {
    label:
      "best role call",

    before:
`      getBestRole(
        combat,
        combatPotential,
        base,
        farming,
        support,
        workRoles,
      ),`,

    after:
`      getBestRole(
        pal,
        combat,
        combatPotential,
        base,
        farming,
        support,
        workRoles,
      ),`,
  },
];

let next =
  source;

for (
  const operation
  of operations
) {
  const index =
    next.indexOf(
      operation.before,
    );

  if (
    index === -1
  ) {
    throw new Error(
      "Patch failed before writing at: " +
        operation.label,
    );
  }

  next =
    next.slice(
      0,
      index,
    ) +
    operation.after +
    next.slice(
      index +
        operation.before.length,
    );

  console.log(
    "✓ " +
      operation.label,
  );
}

next =
  marker +
  "\n" +
  next;

fs.copyFileSync(
  target,
  backup,
);

fs.writeFileSync(
  target,
  next,
  "utf8",
);

console.log(
  "\nPartner classification V2 safe patch installed successfully.",
);

console.log(
  "Backup: " +
    backup,
);

console.log(
  "Updated: " +
    target,
);

console.log(
  "\nExpected:",
);

console.log(
  "- Palumba / Pyrin Noct / Grizzbolt / Helzephyr mount-only Support -> 0",
);

console.log(
  "- Gobfin genuine party support remains > 0",
);

console.log(
  "- Clovee can resolve to Base Support",
);

console.log(
  "- Fixed-effect Partner Skills no longer create fake rank-investment reasons",
);