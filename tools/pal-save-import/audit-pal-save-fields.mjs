import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const levelPath =
  `${base}\\level.json`;

const outputPath =
  `${base}\\pal-save-field-audit.json`;

const level =
  JSON.parse(
    fs.readFileSync(
      levelPath,
      "utf8",
    ),
  );

const world =
  level?.properties
    ?.worldSaveData
    ?.value;

if (!world) {
  throw new Error(
    "Could not find worldSaveData.",
  );
}

const characterMap =
  world
    ?.CharacterSaveParameterMap
    ?.value;

if (
  !Array.isArray(
    characterMap,
  )
) {
  throw new Error(
    "CharacterSaveParameterMap was not found.",
  );
}

const knownFields =
  new Set([
    "ArenaRestoreParameter",
    "bDisableSaleInPalLost",
    "bFavoriteChangedByFriendship",
    "CharacterID",
    "CurrentWorkSuitability",
    "EquipWaza",
    "Exp",
    "FavoriteIndex",
    "FoodRegeneEffectInfo",
    "FoodWithStatusEffect",
    "FriendshipActiveOtomoSec",
    "FriendshipBasecampSec",
    "FriendshipOtomoSec",
    "FriendshipPoint",
    "FullStomach",
    "Gender",
    "GotExStatusPointList",
    "GotStatusPointList",
    "GotWorkSuitabilityAddRankList",
    "Hp",
    "HungerType",
    "IsRarePal",
    "ItemContainerId",
    "LastJumpedLocation",
    "LastNickNameModifierPlayerUid",
    "Level",
    "MasteredWaza",
    "OldOwnerPlayerUIds",
    "OwnedTime",
    "OwnerPlayerUId",
    "PassiveSkillList",
    "Rank",
    "RankUpExp",
    "SanityValue",
    "SlotId",
    "Talent_Defense",
    "Talent_HP",
    "Talent_Shot",
    "Tiemr_FoodWithStatusEffect",
    "WorkSuitabilityOptionInfo",
  ]);

const fieldCounts =
  new Map();

const samples =
  new Map();

let characterCount = 0;

for (
  const entry
  of characterMap
) {
  const saveParameter =
    entry?.value
      ?.RawData
      ?.value
      ?.object
      ?.SaveParameter
      ?.value;

  if (
    !saveParameter ||
    typeof saveParameter !==
      "object"
  ) {
    continue;
  }

  characterCount++;

  const species =
    saveParameter
      ?.CharacterID
      ?.value ?? null;

  for (
    const [
      field,
      value,
    ]
    of Object.entries(
      saveParameter,
    )
  ) {
    fieldCounts.set(
      field,
      (
        fieldCounts.get(
          field,
        ) ?? 0
      ) + 1,
    );

    if (
      !samples.has(
        field,
      )
    ) {
      samples.set(
        field,
        [],
      );
    }

    const fieldSamples =
      samples.get(
        field,
      );

    if (
      fieldSamples.length < 3
    ) {
      fieldSamples.push({
        species,

        type:
          value?.type ??
          null,

        preview:
          value?.value ??
          null,
      });
    }
  }
}

const fields =
  [
    ...fieldCounts.entries(),
  ]
    .sort(
      (a, b) =>
        a[0].localeCompare(
          b[0],
        ),
    )
    .map(
      (
        [
          field,
          count,
        ],
      ) => ({
        field,

        count,

        known:
          knownFields.has(
            field,
          ),

        samples:
          samples.get(
            field,
          ) ?? [],
      }),
    );

const unknownFields =
  fields.filter(
    (entry) =>
      !entry.known,
  );

const report = {
  generatedAt:
    new Date()
      .toISOString(),

  characterSaveParameters:
    characterCount,

  totalUniqueFields:
    fields.length,

  knownFields:
    fields.filter(
      (entry) =>
        entry.known,
    ).length,

  unknownFields:
    unknownFields.length,

  fields,
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    report,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n=== COMPLETE PAL SAVE FIELD AUDIT ===\n",
);

console.log({
  characterSaveParameters:
    characterCount,

  totalUniqueFields:
    fields.length,

  knownFields:
    report.knownFields,

  unknownFields:
    report.unknownFields,
});

console.log(
  "\n=== UNKNOWN / UNHANDLED FIELDS ===\n",
);

if (
  unknownFields.length === 0
) {
  console.log(
    "None.",
  );
} else {
  console.table(
    unknownFields.map(
      (entry) => ({
        field:
          entry.field,

        count:
          entry.count,
      }),
    ),
  );
}

console.log(
  "\n=== ALL SAVEPARAMETER FIELDS ===\n",
);

console.table(
  fields.map(
    (entry) => ({
      field:
        entry.field,

      count:
        entry.count,

      known:
        entry.known,
    }),
  ),
);

console.log(
  `\nSaved full report to: ${outputPath}`,
);