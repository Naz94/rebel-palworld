import fs from "node:fs";

const inputPath =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const outputPath =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\pals.json";

// ============================================================
// LOAD SAVE JSON
// ============================================================

const data = JSON.parse(
  fs.readFileSync(
    inputPath,
    "utf8",
  ),
);

const characters =
  data?.properties?.worldSaveData?.value
    ?.CharacterSaveParameterMap?.value;

if (!Array.isArray(characters)) {
  throw new Error(
    "CharacterSaveParameterMap was not found.",
  );
}

// ============================================================
// PROPERTY HELPERS
// ============================================================

function getSaveParameter(character) {
  return (
    character?.value?.RawData?.value?.object
      ?.SaveParameter?.value ??
    null
  );
}

/**
 * Palworld ByteProperty values currently appear as:
 *
 * {
 *   value: {
 *     type: "None",
 *     value: 50
 *   }
 * }
 *
 * Returns null when the property itself is absent or malformed.
 */
function byteValue(property) {
  const value =
    property?.value?.value;

  return typeof value === "number"
    ? value
    : null;
}

/**
 * Handles normal scalar properties:
 *
 * {
 *   value: 3127413
 * }
 */
function simpleValue(property) {
  return (
    property?.value ??
    null
  );
}

/**
 * Palworld omits some properties when they are still at their
 * default value.
 *
 * For an owned Pal:
 *
 * missing Level -> Level 1
 * missing Exp   -> 0 EXP
 *
 * We only apply these defaults when the values cannot be read.
 */
function getPalLevel(save) {
  const level =
    byteValue(
      save?.Level,
    );

  if (
    typeof level ===
    "number"
  ) {
    return level;
  }

  return 1;
}

function getPalExp(save) {
  const exp =
    simpleValue(
      save?.Exp,
    );

  if (
    typeof exp ===
    "number"
  ) {
    return exp;
  }

  return 0;
}

function getGender(property) {
  const raw =
    property?.value?.value;

  if (
    typeof raw !==
    "string"
  ) {
    return null;
  }

  return raw.replace(
    "EPalGenderType::",
    "",
  );
}

function getPassives(property) {
  const values =
    property?.value?.values;

  return Array.isArray(
    values,
  )
    ? values
    : [];
}

function getDisabledWork(
  property,
) {
  const values =
    property?.value
      ?.OffWorkSuitabilityList
      ?.value?.values;

  if (
    !Array.isArray(
      values,
    )
  ) {
    return [];
  }

  return values.map(
    (value) =>
      value.replace(
        "EPalWorkSuitability::",
        "",
      ),
  );
}

// ============================================================
// EXTRACT PALS
// ============================================================

const pals = [];

let defaultedLevelCount =
  0;

let defaultedExpCount =
  0;

for (
  const character
  of characters
) {
  const save =
    getSaveParameter(
      character,
    );

  if (!save) {
    continue;
  }

  // ----------------------------------------------------------
  // SKIP PLAYER CHARACTER
  // ----------------------------------------------------------

  if (
    save.IsPlayer?.value ===
    true
  ) {
    continue;
  }

  // ----------------------------------------------------------
  // SPECIES
  // ----------------------------------------------------------

  const species =
    simpleValue(
      save.CharacterID,
    );

  if (!species) {
    continue;
  }

  // ----------------------------------------------------------
  // LEVEL / EXP
  // ----------------------------------------------------------

  const rawLevel =
    byteValue(
      save.Level,
    );

  const rawExp =
    simpleValue(
      save.Exp,
    );

  if (
    typeof rawLevel !==
    "number"
  ) {
    defaultedLevelCount +=
      1;
  }

  if (
    typeof rawExp !==
    "number"
  ) {
    defaultedExpCount +=
      1;
  }

  const level =
    getPalLevel(
      save,
    );

  const exp =
    getPalExp(
      save,
    );

  // ----------------------------------------------------------
  // BUILD PAL
  // ----------------------------------------------------------

  pals.push({
    instanceId:
      character?.key
        ?.InstanceId?.value ??
      null,

    species,

    nickname:
      simpleValue(
        save.NickName,
      ) ??
      null,

    gender:
      getGender(
        save.Gender,
      ),

    level,

    exp,

    hp:
      save?.Hp?.value
        ?.Value?.value ??
      null,

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

    disabledWorkSuitabilities:
      getDisabledWork(
        save.WorkSuitabilityOptionInfo,
      ),

    slot: {
      containerId:
        save?.SlotId?.value
          ?.ContainerId?.value
          ?.ID?.value ??
        null,

      slotIndex:
        save?.SlotId?.value
          ?.SlotIndex?.value ??
        null,
    },
  });
}

// ============================================================
// WRITE OUTPUT
// ============================================================

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    pals,
    null,
    2,
  ),
  "utf8",
);

// ============================================================
// REPORT
// ============================================================

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

console.log(
  "\nFirst 5 Pals:",
);

for (
  const pal
  of pals.slice(
    0,
    5,
  )
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
  });
}