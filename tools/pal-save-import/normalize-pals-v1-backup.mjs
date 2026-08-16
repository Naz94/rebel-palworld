import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const pals = JSON.parse(
  fs.readFileSync(`${base}\\pals.json`, "utf8"),
);

const palNamesData = JSON.parse(
  fs.readFileSync(`${base}\\data\\pal-names.json`, "utf8"),
);

const palTypesData = JSON.parse(
  fs.readFileSync(`${base}\\data\\pal-types.json`, "utf8"),
);

const palPassivesData = JSON.parse(
  fs.readFileSync(`${base}\\data\\pal-passives.json`, "utf8"),
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

const palNames = palNamesData.names ?? {};
const nameOverrides = palNamesData.overrides ?? {};
const suffixes = palNamesData.suffixes ?? {};

const palElements = palTypesData.elements ?? {};
const passiveMap = palPassivesData.passives ?? {};

const workPals = Array.isArray(workData.pals)
  ? workData.pals
  : [];

const combatPals = Array.isArray(combatData.pals)
  ? combatData.pals
  : [];

function stripBossPrefix(id) {
  return id.startsWith("BOSS_")
    ? id.slice("BOSS_".length)
    : id;
}

function resolveDisplayName(rawId) {
  const cleanId = stripBossPrefix(rawId);

  if (nameOverrides[cleanId]) {
    return nameOverrides[cleanId];
  }

  if (palNames[cleanId]) {
    return palNames[cleanId];
  }

  const parts = cleanId.split("_");

  if (parts.length > 1) {
    const suffix = parts.at(-1);
    const baseId = parts.slice(0, -1).join("_");

    const baseName = palNames[baseId];
    const suffixName = suffixes[suffix];

    if (baseName && suffixName) {
      return `${baseName} ${suffixName}`;
    }
  }

  return cleanId;
}

function resolveElements(rawId) {
  const cleanId =
    stripBossPrefix(rawId).toLowerCase();

  return palElements[cleanId] ?? [];
}

function resolvePassive(rawPassive) {
  const key = rawPassive.toLowerCase();

  const data = passiveMap[key];

  if (!data) {
    return {
      internalId: rawPassive,
      name: rawPassive,
      description: null,
      rank: null,
    };
  }

  return {
    internalId: rawPassive,
    name: data.name ?? rawPassive,
    description: data.desc ?? null,
    rank: data.rank ?? null,
  };
}

function resolveWork(rawId) {
  const cleanId = stripBossPrefix(rawId);

  return (
    workPals.find(
      (entry) => entry.code === cleanId,
    ) ?? null
  );
}

function resolveCombat(displayName) {
  return (
    combatPals.find(
      (entry) =>
        entry.name.toLowerCase() ===
        displayName.toLowerCase(),
    ) ?? null
  );
}

const normalized = pals.map((pal) => {
  const cleanSpeciesId =
    stripBossPrefix(pal.species);

  const displayName =
    resolveDisplayName(pal.species);

  const work =
    resolveWork(pal.species);

  const combat =
    resolveCombat(displayName);

  return {
    instanceId: pal.instanceId,

    internalSpeciesId: pal.species,
    speciesId: cleanSpeciesId,

    displayName,

    isAlpha:
      pal.species.startsWith("BOSS_"),

    nickname: pal.nickname,
    gender: pal.gender,
    level: pal.level,
    exp: pal.exp,

    ivs: pal.ivs,

    elements:
      work?.elements ??
      resolveElements(pal.species),

    passives:
      pal.passives.map(resolvePassive),

    workSuitability:
      work?.works ?? {},

    ranchDrops:
      work?.ranch ?? [],

    combatStats: combat
      ? {
          hp: combat.hp,
          attack: combat.atk,
          defense: combat.def,

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
      pal.disabledWorkSuitabilities,

    slot: pal.slot,
  };
});

const outputPath =
  `${base}\\normalized-pals.json`;

fs.writeFileSync(
  outputPath,
  JSON.stringify(normalized, null, 2),
  "utf8",
);

console.log(
  `Normalized ${normalized.length} Pals.`,
);

console.log(
  `Saved to: ${outputPath}`,
);

const stats = {
  friendlyNames: 0,
  elements: 0,
  work: 0,
  combat: 0,
  translatedPassives: 0,
  totalPassives: 0,
};

for (const pal of normalized) {
  if (
    pal.displayName !==
    stripBossPrefix(pal.internalSpeciesId)
  ) {
    stats.friendlyNames++;
  }

  if (pal.elements.length > 0) {
    stats.elements++;
  }

  if (
    Object.keys(pal.workSuitability).length > 0
  ) {
    stats.work++;
  }

  if (pal.combatStats) {
    stats.combat++;
  }

  for (const passive of pal.passives) {
    stats.totalPassives++;

    if (passive.name !== passive.internalId) {
      stats.translatedPassives++;
    }
  }
}

console.log("\n=== MATCH RESULTS ===");
console.log(stats);

console.log("\n=== FIRST 5 ===");

for (const pal of normalized.slice(0, 5)) {
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

    work:
      pal.workSuitability,

    combat:
      pal.combatStats,
  });
}