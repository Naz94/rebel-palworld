import fs from "node:fs";

const inputPath =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const outputPath =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\pals.json";

const data = JSON.parse(
  fs.readFileSync(inputPath, "utf8"),
);

const characters =
  data?.properties?.worldSaveData?.value
    ?.CharacterSaveParameterMap?.value;

if (!Array.isArray(characters)) {
  throw new Error(
    "CharacterSaveParameterMap was not found.",
  );
}

function getSaveParameter(character) {
  return (
    character?.value?.RawData?.value?.object
      ?.SaveParameter?.value ?? null
  );
}

function byteValue(property) {
  const value =
    property?.value?.value;

  return typeof value === "number"
    ? value
    : null;
}

function simpleValue(property) {
  return property?.value ?? null;
}

function numericValue(property) {
  const nested =
    property?.value?.value;

  if (typeof nested === "number") {
    return nested;
  }

  const direct =
    property?.value;

  return typeof direct === "number"
    ? direct
    : null;
}

function arrayValues(property) {
  const values =
    property?.value?.values;

  return Array.isArray(values)
    ? values
    : [];
}

function stripEnumPrefix(
  value,
  prefix,
) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  return value.replace(
    prefix,
    "",
  );
}

function getPalLevel(save) {
  return byteValue(save?.Level) ?? 1;
}

function getPalExp(save) {
  const exp =
    simpleValue(save?.Exp);

  return typeof exp === "number"
    ? exp
    : 0;
}

function getGender(property) {
  const raw =
    property?.value?.value;

  return typeof raw === "string"
    ? stripEnumPrefix(
        raw,
        "EPalGenderType::",
      )
    : null;
}

function getPassives(property) {
  return arrayValues(property);
}

function getDisabledWork(property) {
  const values =
    property?.value
      ?.OffWorkSuitabilityList
      ?.value?.values;

  if (!Array.isArray(values)) {
    return [];
  }

  return values.map(
    (value) =>
      stripEnumPrefix(
        value,
        "EPalWorkSuitability::",
      ),
  );
}

function getEquippedSkills(save) {
  return arrayValues(
    save?.EquipWaza,
  ).map(
    (value) =>
      stripEnumPrefix(
        value,
        "EPalWazaID::",
      ),
  );
}

function getLearnedSkills(save) {
  return arrayValues(
    save?.MasteredWaza,
  ).map(
    (value) =>
      stripEnumPrefix(
        value,
        "EPalWazaID::",
      ),
  );
}

function getCondensation(save) {
  const rank =
    numericValue(save?.Rank) ?? 1;

  const rankUpExp =
    numericValue(save?.RankUpExp) ?? 0;

  return {
    rank,
    stars:
      Math.max(
        0,
        rank - 1,
      ),
    rankUpExp,
  };
}

function getSoulEnhancements(save) {
  return {
    hp:
      numericValue(
        save?.Rank_HP,
      ) ?? 0,

    attack:
      numericValue(
        save?.Rank_Attack,
      ) ?? 0,

    defense:
      numericValue(
        save?.Rank_Defence,
      ) ?? 0,

    workSpeed:
      numericValue(
        save?.Rank_CraftSpeed,
      ) ?? 0,
  };
}

function getWorkSuitabilityUpgrades(
  save,
) {
  const values =
    save?.GotWorkSuitabilityAddRankList
      ?.value?.values;

  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => {
      const rawWork =
        entry?.WorkSuitability
          ?.value?.value;

      const rank =
        numericValue(
          entry?.Rank,
        );

      if (
        typeof rawWork !== "string" ||
        typeof rank !== "number"
      ) {
        return null;
      }

      return {
        workSuitability:
          stripEnumPrefix(
            rawWork,
            "EPalWorkSuitability::",
          ),

        rank,
      };
    })
    .filter(Boolean);
}

function getFriendship(save) {
  return {
    points:
      numericValue(
        save?.FriendshipPoint,
      ) ?? 0,

    activePartySeconds:
      numericValue(
        save?.FriendshipActiveOtomoSec,
      ) ?? 0,

    partySeconds:
      numericValue(
        save?.FriendshipOtomoSec,
      ) ?? 0,

    baseSeconds:
      numericValue(
        save?.FriendshipBasecampSec,
      ) ?? 0,
  };
}

function getCurrentWorkSuitability(
  save,
) {
  const raw =
    save?.CurrentWorkSuitability
      ?.value?.value ??
    save?.CurrentWorkSuitability
      ?.value ??
    null;

  if (typeof raw !== "string") {
    return null;
  }

  return stripEnumPrefix(
    raw,
    "EPalWorkSuitability::",
  );
}

const pals = [];

let defaultedLevelCount = 0;
let defaultedExpCount = 0;
let condensedCount = 0;
let partialCondensationCount = 0;
let learnedSkillCount = 0;
let workUpgradeCount = 0;
let soulInvestmentCount = 0;

for (const character of characters) {
  const save =
    getSaveParameter(character);

  if (!save) {
    continue;
  }

  if (save.IsPlayer?.value === true) {
    continue;
  }

  const species =
    simpleValue(save.CharacterID);

  if (!species) {
    continue;
  }

  const rawLevel =
    byteValue(save.Level);

  const rawExp =
    simpleValue(save.Exp);

  if (typeof rawLevel !== "number") {
    defaultedLevelCount += 1;
  }

  if (typeof rawExp !== "number") {
    defaultedExpCount += 1;
  }

  const level =
    getPalLevel(save);

  const exp =
    getPalExp(save);

  const condensation =
    getCondensation(save);

  const souls =
    getSoulEnhancements(save);

  const workSuitabilityUpgrades =
    getWorkSuitabilityUpgrades(save);

  const learnedSkills =
    getLearnedSkills(save);

  if (condensation.stars > 0) {
    condensedCount += 1;
  }

  if (condensation.rankUpExp > 0) {
    partialCondensationCount += 1;
  }

  if (learnedSkills.length > 0) {
    learnedSkillCount += 1;
  }

  if (workSuitabilityUpgrades.length > 0) {
    workUpgradeCount += 1;
  }

  if (
    souls.hp > 0 ||
    souls.attack > 0 ||
    souls.defense > 0 ||
    souls.workSpeed > 0
  ) {
    soulInvestmentCount += 1;
  }

  pals.push({
    instanceId:
      character?.key
        ?.InstanceId?.value ?? null,

    species,

    nickname:
      simpleValue(save.NickName) ??
      null,

    gender:
      getGender(save.Gender),

    level,

    exp,

    hp:
      save?.Hp?.value
        ?.Value?.value ?? null,

    ivs: {
      hp:
        byteValue(
          save.Talent_HP,
        ),

      attack:
        byteValue(
          save.Talent_Shot,
        ),

      defense:
        byteValue(
          save.Talent_Defense,
        ),
    },

    passives:
      getPassives(
        save.PassiveSkillList,
      ),

    skills: {
      equipped:
        getEquippedSkills(save),

      learned:
        learnedSkills,
    },

    progression: {
      condensation,

      souls,

      workSuitabilityUpgrades,

      friendship:
        getFriendship(save),
    },

    currentState: {
      workSuitability:
        getCurrentWorkSuitability(save),

      fullStomach:
        numericValue(
          save?.FullStomach,
        ),

      sanity:
        numericValue(
          save?.SanityValue,
        ),
    },

    disabledWorkSuitabilities:
      getDisabledWork(
        save.WorkSuitabilityOptionInfo,
      ),

    isRarePal:
      save?.IsRarePal?.value === true,

    slot: {
      containerId:
        save?.SlotId?.value
          ?.ContainerId?.value
          ?.ID?.value ?? null,

      slotIndex:
        save?.SlotId?.value
          ?.SlotIndex?.value ?? null,
    },
  });
}

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    pals,
    null,
    2,
  ),
  "utf8",
);

console.log(
  `Extracted ${pals.length} Pals.`,
);

console.log(
  `Saved to: ${outputPath}`,
);

console.log("");

console.log(
  `Defaulted missing Level fields to Lv.1: ${defaultedLevelCount}`,
);

console.log(
  `Defaulted missing Exp fields to 0: ${defaultedExpCount}`,
);

console.log("");

console.log(
  `Condensed Pals (1★+): ${condensedCount}`,
);

console.log(
  `Pals with partial condensation progress: ${partialCondensationCount}`,
);

console.log(
  `Pals with MasteredWaza data: ${learnedSkillCount}`,
);

console.log(
  `Pals with permanent work-suitability upgrades: ${workUpgradeCount}`,
);

console.log(
  `Pals with Pal Soul investment: ${soulInvestmentCount}`,
);

console.log(
  "\nFirst 5 Pals:",
);

for (
  const pal
  of pals.slice(0, 5)
) {
  console.log({
    species:
      pal.species,

    nickname:
      pal.nickname,

    level:
      pal.level,

    exp:
      pal.exp,

    gender:
      pal.gender,

    ivs:
      pal.ivs,

    passives:
      pal.passives,

    equippedSkills:
      pal.skills.equipped,

    condensation:
      pal.progression
        .condensation,

    souls:
      pal.progression
        .souls,

    workSuitabilityUpgrades:
      pal.progression
        .workSuitabilityUpgrades,
  });
}
