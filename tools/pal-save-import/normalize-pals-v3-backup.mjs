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
  Array.isArray(workData.pals)
    ? workData.pals
    : [];

const combatPals =
  Array.isArray(combatData.pals)
    ? combatData.pals
    : [];

// ============================================================
// HELPERS
// ============================================================

function stripBossPrefix(id) {
  return id.startsWith("BOSS_")
    ? id.slice(
        "BOSS_".length,
      )
    : id;
}

function resolveDisplayName(rawId) {
  const cleanId =
    stripBossPrefix(rawId);

  if (nameOverrides[cleanId]) {
    return nameOverrides[cleanId];
  }

  if (palNames[cleanId]) {
    return palNames[cleanId];
  }

  const parts =
    cleanId.split("_");

  if (parts.length > 1) {
    const suffix =
      parts.at(-1);

    const baseId =
      parts
        .slice(0, -1)
        .join("_");

    const baseName =
      palNames[baseId];

    const suffixName =
      suffixes[suffix];

    if (
      baseName &&
      suffixName
    ) {
      return `${baseName} ${suffixName}`;
    }
  }

  return cleanId;
}

function resolveElements(rawId) {
  const cleanId =
    stripBossPrefix(
      rawId,
    ).toLowerCase();

  return (
    palElements[cleanId] ??
    []
  );
}

function resolvePassive(
  rawPassive,
) {
  const key =
    rawPassive.toLowerCase();

  const data =
    passiveMap[key];

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

function resolveWork(rawId) {
  const cleanId =
    stripBossPrefix(rawId);

  return (
    workPals.find(
      (entry) =>
        entry.code ===
        cleanId,
    ) ?? null
  );
}

function resolveCombat(
  displayName,
) {
  return (
    combatPals.find(
      (entry) =>
        entry.name
          .toLowerCase() ===
        displayName
          .toLowerCase(),
    ) ?? null
  );
}

// ============================================================
// NORMALIZE
// ============================================================

const normalized =
  pals.map((pal) => {
    const cleanSpeciesId =
      stripBossPrefix(
        pal.species,
      );

    const displayName =
      resolveDisplayName(
        pal.species,
      );

    const work =
      resolveWork(
        pal.species,
      );

    const combat =
      resolveCombat(
        displayName,
      );

    return {
      instanceId:
        pal.instanceId,

      internalSpeciesId:
        pal.species,

      speciesId:
        cleanSpeciesId,

      displayName,

      isAlpha:
        pal.species.startsWith(
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
        pal.hp ?? null,

      ivs:
        pal.ivs,

      elements:
        work?.elements ??
        resolveElements(
          pal.species,
        ),

      passives:
        (
          pal.passives ??
          []
        ).map(
          resolvePassive,
        ),

      // ========================================================
      // SKILLS
      // ========================================================

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

      // ========================================================
      // PROGRESSION / INVESTMENT
      // ========================================================

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

      // ========================================================
      // CURRENT RUNTIME STATE
      // ========================================================

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

      // ========================================================
      // SPECIES / WORK REFERENCE DATA
      // ========================================================

      workSuitability:
        work?.works ??
        {},

      ranchDrops:
        work?.ranch ??
        [],

      // ========================================================
      // SPECIES COMBAT REFERENCE DATA
      // ========================================================

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
  });

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
  translatedPassives: 0,
  totalPassives: 0,
  condensed: 0,
  partialCondensation: 0,
  masteredSkills: 0,
  workUpgrades: 0,
  soulInvestment: 0,
};

for (
  const pal
  of normalized
) {
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

  if (pal.combatStats) {
    stats.combat++;
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
    pal.skills.learned
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
    pal.progression.souls;

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
      stats.translatedPassives++;
    }
  }
}

console.log(
  "\n=== MATCH RESULTS ===",
);

console.log(stats);

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

    isAlpha:
      pal.isAlpha,

    level:
      pal.level,

    ivs:
      pal.ivs,

    elements:
      pal.elements,

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
  });
}