import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const pals = JSON.parse(
  fs.readFileSync(
    `${base}\\pals.json`,
    "utf8",
  ),
);

const palNamesData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pal-names.json`,
    "utf8",
  ),
);

const palTypesData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pal-types.json`,
    "utf8",
  ),
);

const palPassivesData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pal-passives.json`,
    "utf8",
  ),
);

const workData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pals_work_suitability.json`,
    "utf8",
  ),
);

const combatData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pals_combat_stats.json`,
    "utf8",
  ),
);

const partnerSkillData = JSON.parse(
  fs.readFileSync(
    `${base}\\data\\pals_partner_skills.json`,
    "utf8",
  ),
);

const palNames =
  palNamesData.names ?? {};

const nameOverrides =
  palNamesData.overrides ?? {};

const suffixes =
  palNamesData.suffixes ?? {};

const palElements =
  palTypesData.elements ?? {};

const passiveMap =
  palPassivesData.passives ?? {};

const workPals =
  Array.isArray(
    workData.pals,
  )
    ? workData.pals
    : [];

const combatPals =
  Array.isArray(
    combatData.pals,
  )
    ? combatData.pals
    : [];

const partnerSkills =
  partnerSkillData.pals &&
  typeof partnerSkillData.pals ===
    "object" &&
  !Array.isArray(
    partnerSkillData.pals,
  )
    ? partnerSkillData.pals
    : {};

// ============================================================
// HELPERS
// ============================================================

function stripBossPrefix(
  id,
) {
  return id.startsWith(
    "BOSS_",
  )
    ? id.slice(
        "BOSS_".length,
      )
    : id;
}

function normalizeKey(
  value,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

function buildWorkIndexes() {
  const byCode =
    new Map();

  const byPaldex =
    new Map();

  for (
    const entry
    of workPals
  ) {
    if (entry?.code) {
      byCode.set(
        normalizeKey(
          entry.code,
        ),
        entry,
      );
    }

    if (
      entry?.paldex !==
        undefined &&
      entry?.paldex !==
        null
    ) {
      byPaldex.set(
        normalizeKey(
          entry.paldex,
        ),
        entry,
      );
    }
  }

  return {
    byCode,
    byPaldex,
  };
}

function buildCombatIndexes() {
  const byName =
    new Map();

  const byPaldex =
    new Map();

  for (
    const entry
    of combatPals
  ) {
    if (
      entry?.name
    ) {
      byName.set(
        normalizeKey(
          entry.name,
        ),
        entry,
      );
    }

    if (
      entry?.paldex !==
        undefined &&
      entry?.paldex !==
        null
    ) {
      byPaldex.set(
        normalizeKey(
          entry.paldex,
        ),
        entry,
      );
    }
  }

  return {
    byName,
    byPaldex,
  };
}

const workIndexes =
  buildWorkIndexes();

const combatIndexes =
  buildCombatIndexes();

function resolveWork(
  rawId,
) {
  const cleanId =
    stripBossPrefix(
      rawId,
    );

  return (
    workIndexes.byCode.get(
      normalizeKey(
        cleanId,
      ),
    ) ??
    null
  );
}

function resolveDisplayName(
  rawId,
  work,
) {
  if (
    work?.name
  ) {
    return work.name;
  }

  const cleanId =
    stripBossPrefix(
      rawId,
    );

  if (
    nameOverrides[
      cleanId
    ]
  ) {
    return nameOverrides[
      cleanId
    ];
  }

  if (
    palNames[
      cleanId
    ]
  ) {
    return palNames[
      cleanId
    ];
  }

  const parts =
    cleanId.split(
      "_",
    );

  if (
    parts.length > 1
  ) {
    const suffix =
      parts.at(-1);

    const baseId =
      parts
        .slice(
          0,
          -1,
        )
        .join(
          "_",
        );

    const baseName =
      palNames[
        baseId
      ];

    const suffixName =
      suffixes[
        suffix
      ];

    if (
      baseName &&
      suffixName
    ) {
      return (
        `${baseName} ${suffixName}`
      );
    }
  }

  return cleanId;
}

function resolveElements(
  rawId,
  work,
) {
  if (
    Array.isArray(
      work?.elements,
    )
  ) {
    return work.elements;
  }

  const cleanId =
    stripBossPrefix(
      rawId,
    ).toLowerCase();

  return (
    palElements[
      cleanId
    ] ??
    []
  );
}

function resolvePassive(
  rawPassive,
) {
  const key =
    rawPassive
      .toLowerCase();

  const data =
    passiveMap[
      key
    ];

  if (!data) {
    return {
      internalId:
        rawPassive,

      name:
        rawPassive,

      description:
        null,

      rank:
        null,
    };
  }

  return {
    internalId:
      rawPassive,

    name:
      data.name ??
      rawPassive,

    description:
      data.desc ??
      null,

    rank:
      data.rank ??
      null,
  };
}

function resolveCombat(
  displayName,
  work,
) {
  if (
    work?.paldex !==
      undefined &&
    work?.paldex !==
      null
  ) {
    const byPaldex =
      combatIndexes
        .byPaldex
        .get(
          normalizeKey(
            work.paldex,
          ),
        );

    if (
      byPaldex
    ) {
      return byPaldex;
    }
  }

  return (
    combatIndexes
      .byName
      .get(
        normalizeKey(
          displayName,
        ),
      ) ??
    null
  );
}

const HUMAN_ID_PATTERNS = [
  /^Hunter_/i,
  /^Male_Soldier/i,
  /^Female_Soldier/i,
  /^Soldier_/i,
  /^Bandit_/i,
  /^Police_/i,
  /^Guard_/i,
  /^Negotiator/i,
  /^Merchant_/i,
  /^Villager_/i,
];

function looksLikeHumanId(
  rawId,
) {
  const cleanId =
    stripBossPrefix(
      rawId,
    );

  return (
    HUMAN_ID_PATTERNS
      .some(
        (pattern) =>
          pattern.test(
            cleanId,
          ),
      )
  );
}

function resolveEntityType(
  rawId,
  work,
) {
  if (
    work
  ) {
    return "PAL";
  }

  if (
    looksLikeHumanId(
      rawId,
    )
  ) {
    return "HUMAN";
  }

  return "UNKNOWN";
}

function getReferenceQuality({
  entityType,
  work,
  combat,
  displayName,
  rawId,
}) {
  const issues =
    [];

  if (
    entityType ===
      "PAL" &&
    !work
  ) {
    issues.push(
      "Missing canonical Pal reference",
    );
  }

  if (
    entityType ===
      "PAL" &&
    !combat
  ) {
    issues.push(
      "Missing combat reference",
    );
  }

  if (
    entityType ===
      "PAL" &&
    (
      !displayName ||
      displayName ===
        stripBossPrefix(
          rawId,
        )
    )
  ) {
    issues.push(
      "Unresolved display name",
    );
  }

  return {
    referenceStatus:
      entityType ===
      "HUMAN"
        ? "NOT_APPLICABLE"
        : issues.length ===
            0
          ? "COMPLETE"
          : "INCOMPLETE",

    issues,
  };
}

function buildPartnerSkillIndex() {
  const byName =
    new Map();

  for (
    const [
      name,
      data,
    ]
    of Object.entries(
      partnerSkills,
    )
  ) {
    byName.set(
      normalizeKey(
        name,
      ),
      {
        name,
        ...data,
      },
    );
  }

  return byName;
}

const partnerSkillIndex =
  buildPartnerSkillIndex();

function resolvePartnerSkill(
  displayName,
  entityType,
) {
  if (
    entityType !==
    "PAL"
  ) {
    return null;
  }

  const entry =
    partnerSkillIndex.get(
      normalizeKey(
        displayName,
      ),
    );

  if (
    !entry
  ) {
    return null;
  }

  return {
    name:
      entry.skill ??
      null,

    description:
      entry.desc ??
      null,

    tags:
      Array.isArray(
        entry.tags,
      )
        ? entry.tags
        : [],
  };
}

// ============================================================
// NORMALIZE
// ============================================================

const normalized =
  pals.map(
    (pal) => {
      const cleanSpeciesId =
        stripBossPrefix(
          pal.species,
        );

      const work =
        resolveWork(
          pal.species,
        );

      const displayName =
        resolveDisplayName(
          pal.species,
          work,
        );

      const combat =
        resolveCombat(
          displayName,
          work,
        );

      const entityType =
        resolveEntityType(
          pal.species,
          work,
        );

      const partnerSkill =
        resolvePartnerSkill(
          displayName,
          entityType,
        );

      const dataQuality =
        getReferenceQuality({
          entityType,
          work,
          combat,
          displayName,

          rawId:
            pal.species,
        });

      return {
        instanceId:
          pal.instanceId,

        internalSpeciesId:
          pal.species,

        entityType,

        dataQuality,

        referenceIdentity: {
          paldex:
            work?.paldex ??
            combat?.paldex ??
            null,

          canonicalCode:
            work?.code ??
            cleanSpeciesId,

          canonicalName:
            work?.name ??
            displayName,

          source:
            entityType ===
            "PAL"
              ? "Palworld 1.0 reference datasets"
              : null,

          gameVersion:
            combatData
              ?.meta
              ?.game_version ??
            workData
              ?.meta
              ?.game_version ??
            null,

          workSource:
            workData
              ?.meta
              ?.source ??
            null,

          combatSource:
            combatData
              ?.meta
              ?.stats_source ??
            combatData
              ?.meta
              ?.source ??
            null,

          partnerSkillSource:
            entityType ===
            "PAL"
              ? partnerSkillData
                  ?.meta
                  ?.source ??
                null
              : null,
        },

        speciesId:
          cleanSpeciesId,

        displayName,

        isAlpha:
          pal.species
            .startsWith(
              "BOSS_",
            ),

        nickname:
          pal.nickname,

        gender:
          pal.gender,

        level:
          pal.level,

        exp:
          pal.exp,

        hp:
          pal.hp ??
          null,

        ivs:
          pal.ivs,

        elements:
          resolveElements(
            pal.species,
            work,
          ),

        partnerSkill,

        passives:
          (
            pal.passives ??
            []
          ).map(
            resolvePassive,
          ),

        // ====================================================
        // SKILLS
        // ====================================================

        skills: {
          equipped:
            pal.skills
              ?.equipped ??
            [],

          learned:
            pal.skills
              ?.learned ??
            [],
        },

        // ====================================================
        // PROGRESSION / INVESTMENT
        // ====================================================

        progression: {
          condensation: {
            rank:
              pal.progression
                ?.condensation
                ?.rank ??
              1,

            stars:
              pal.progression
                ?.condensation
                ?.stars ??
              0,

            rankUpExp:
              pal.progression
                ?.condensation
                ?.rankUpExp ??
              0,
          },

          souls: {
            hp:
              pal.progression
                ?.souls
                ?.hp ??
              0,

            attack:
              pal.progression
                ?.souls
                ?.attack ??
              0,

            defense:
              pal.progression
                ?.souls
                ?.defense ??
              0,

            workSpeed:
              pal.progression
                ?.souls
                ?.workSpeed ??
              0,
          },

          workSuitabilityUpgrades:
            pal.progression
              ?.workSuitabilityUpgrades ??
            [],

          friendship: {
            points:
              pal.progression
                ?.friendship
                ?.points ??
              0,

            activePartySeconds:
              pal.progression
                ?.friendship
                ?.activePartySeconds ??
              0,

            partySeconds:
              pal.progression
                ?.friendship
                ?.partySeconds ??
              0,

            baseSeconds:
              pal.progression
                ?.friendship
                ?.baseSeconds ??
              0,
          },
        },

        // ====================================================
        // CURRENT RUNTIME STATE
        // ====================================================

        currentState: {
          workSuitability:
            pal.currentState
              ?.workSuitability ??
            null,

          fullStomach:
            pal.currentState
              ?.fullStomach ??
            null,

          sanity:
            pal.currentState
              ?.sanity ??
            null,
        },

        // ====================================================
        // SPECIES / WORK REFERENCE DATA
        // ====================================================

        workSuitability:
          work?.works ??
          {},

        ranchDrops:
          work?.ranch ??
          [],

        // ====================================================
        // SPECIES COMBAT REFERENCE DATA
        // ====================================================

        combatStats:
          combat
            ? {
                hp:
                  combat.hp,

                attack:
                  combat.atk,

                defense:
                  combat.def,

                hpPercentile:
                  combat.hp_pctl,

                attackPercentile:
                  combat.atk_pctl,

                defensePercentile:
                  combat.def_pctl,

                combatPercentile:
                  combat.combat_pctl,

                speciesTier:
                  combat.tier,

                food:
                  combat.food,
              }
            : null,

        disabledWorkSuitabilities:
          pal.disabledWorkSuitabilities ??
          [],

        isRarePal:
          pal.isRarePal ??
          false,

        slot:
          pal.slot,
      };
    },
  );

// ============================================================
// WRITE OUTPUT
// ============================================================

const outputPath =
  `${base}\\normalized-pals.json`;

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    normalized,
    null,
    2,
  ),
  "utf8",
);

console.log(
  `Normalized ${normalized.length} Pals.`,
);

console.log(
  `Saved to: ${outputPath}`,
);

// ============================================================
// REPORT
// ============================================================

const stats = {
  friendlyNames: 0,
  elements: 0,
  work: 0,
  combat: 0,
  partnerSkills: 0,
  translatedPassives: 0,
  totalPassives: 0,
  condensed: 0,
  partialCondensation: 0,
  masteredSkills: 0,
  workUpgrades: 0,
  soulInvestment: 0,

  palEntities: 0,
  humanEntities: 0,
  unknownEntities: 0,

  completeReferences: 0,
  incompleteReferences: 0,
};

for (
  const pal
  of normalized
) {
  if (
    pal.entityType ===
    "PAL"
  ) {
    stats.palEntities++;
  } else if (
    pal.entityType ===
    "HUMAN"
  ) {
    stats.humanEntities++;
  } else {
    stats.unknownEntities++;
  }

  if (
    pal.entityType ===
      "PAL" &&
    pal.dataQuality
      ?.referenceStatus ===
      "COMPLETE"
  ) {
    stats.completeReferences++;
  } else if (
    pal.entityType ===
      "PAL"
  ) {
    stats.incompleteReferences++;
  }

  if (
    pal.displayName !==
    stripBossPrefix(
      pal.internalSpeciesId,
    )
  ) {
    stats.friendlyNames++;
  }

  if (
    pal.elements.length >
    0
  ) {
    stats.elements++;
  }

  if (
    Object.keys(
      pal.workSuitability,
    ).length > 0
  ) {
    stats.work++;
  }

  if (
    pal.combatStats
  ) {
    stats.combat++;
  }

  if (
    pal.entityType ===
      "PAL" &&
    pal.partnerSkill
  ) {
    stats.partnerSkills++;
  }

  if (
    pal.progression
      .condensation
      .stars > 0
  ) {
    stats.condensed++;
  }

  if (
    pal.progression
      .condensation
      .rankUpExp > 0
  ) {
    stats.partialCondensation++;
  }

  if (
    pal.skills
      .learned
      .length > 0
  ) {
    stats.masteredSkills++;
  }

  if (
    pal.progression
      .workSuitabilityUpgrades
      .length > 0
  ) {
    stats.workUpgrades++;
  }

  const souls =
    pal.progression
      .souls;

  if (
    souls.hp > 0 ||
    souls.attack > 0 ||
    souls.defense > 0 ||
    souls.workSpeed > 0
  ) {
    stats.soulInvestment++;
  }

  for (
    const passive
    of pal.passives
  ) {
    stats.totalPassives++;

    if (
      passive.name !==
      passive.internalId
    ) {
      stats
        .translatedPassives++;
    }
  }
}

console.log(
  "\n=== MATCH RESULTS ===",
);

console.log(
  stats,
);

console.log(
  "\n=== FIRST 5 ===",
);

for (
  const pal
  of normalized.slice(
    0,
    5,
  )
) {
  console.log({
    internalSpeciesId:
      pal.internalSpeciesId,

    displayName:
      pal.displayName,

    entityType:
      pal.entityType,

    isAlpha:
      pal.isAlpha,

    level:
      pal.level,

    ivs:
      pal.ivs,

    elements:
      pal.elements,

    partnerSkill:
      pal.partnerSkill,

    passives:
      pal.passives,

    skills:
      pal.skills,

    progression:
      pal.progression,

    work:
      pal.workSuitability,

    combat:
      pal.combatStats,

    referenceIdentity:
      pal.referenceIdentity,
  });
}

console.log(
  "\n=== REFERENCE QUALITY ===",
);

const referenceIssues =
  normalized
    .filter(
      (pal) =>
        pal.entityType !==
          "HUMAN" &&
        pal.dataQuality
          ?.issues?.length >
          0,
    )
    .map(
      (pal) => ({
        internalSpeciesId:
          pal.internalSpeciesId,

        displayName:
          pal.displayName,

        entityType:
          pal.entityType,

        issues:
          pal.dataQuality
            .issues
            .join(
              "; ",
            ),
      }),
    );

console.table(
  referenceIssues,
);

console.log(
  `Reference issues: ${referenceIssues.length}`,
);

const missingPartnerSkills =
  normalized
    .filter(
      (pal) =>
        pal.entityType ===
          "PAL" &&
        !pal.partnerSkill,
    )
    .map(
      (pal) => ({
        internalSpeciesId:
          pal.internalSpeciesId,

        displayName:
          pal.displayName,

        paldex:
          pal.referenceIdentity
            ?.paldex ??
          null,
      }),
    );

console.log(
  "\n=== MISSING PARTNER SKILLS ===",
);

console.table(
  missingPartnerSkills,
);

console.log(
  `Missing Partner Skills: ${missingPartnerSkills.length}`,
);

const humans =
  normalized.filter(
    (pal) =>
      pal.entityType ===
      "HUMAN",
  );

if (
  humans.length > 0
) {
  console.log(
    "\n=== CAPTURED HUMANS ===",
  );

  console.table(
    humans.map(
      (human) => ({
        internalSpeciesId:
          human.internalSpeciesId,

        level:
          human.level,

        gender:
          human.gender,

        referenceStatus:
          human.dataQuality
            ?.referenceStatus ??
          null,

        partnerSkill:
          human.partnerSkill,

        location:
          human.slot
            ?.containerId ??
          null,
      }),
    ),
  );
}