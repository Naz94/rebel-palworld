import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const targetInstanceId =
  "c59d9120-4d59-8903-f930-3ba72a59bf1f";

const data = JSON.parse(
  fs.readFileSync(path, "utf8"),
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

const palRecord = characters.find(
  (character) =>
    character?.key?.InstanceId?.value ===
    targetInstanceId,
);

if (!palRecord) {
  throw new Error(
    `Pal ${targetInstanceId} was not found.`,
  );
}

const save =
  getSaveParameter(palRecord);

if (!save) {
  throw new Error(
    "SaveParameter was not found for target Pal.",
  );
}

console.log(
  "============================================================",
);

console.log(
  " REBEL PALWORLD — RAW PAL INSPECTOR",
);

console.log(
  "============================================================",
);

console.log(
  "\nInstance ID:",
  targetInstanceId,
);

console.log(
  "\nSpecies:",
  save?.CharacterID?.value ?? "unknown",
);

console.log(
  "\n=== ALL SAVEPARAMETER KEYS ===\n",
);

Object.keys(save)
  .sort()
  .forEach((key) => {
    console.log(key);
  });

console.log(
  "\n=== PROGRESSION / COMBAT / SKILL FIELDS ===",
);

const interestingPattern =
  /rank|talent|skill|waza|passive|master|equip|partner|soul|enhance|status|attack|shot|defen|hp|work|craft|level|exp|condens|star|power/i;

for (
  const [key, value]
  of Object.entries(save)
) {
  if (!interestingPattern.test(key)) {
    continue;
  }

  console.log(
    `\n---------------- ${key} ----------------`,
  );

  console.log(
    JSON.stringify(
      value,
      null,
      2,
    ),
  );
}

console.log(
  "\n=== COMPLETE RAW SAVEPARAMETER ===\n",
);

console.log(
  JSON.stringify(
    save,
    null,
    2,
  ),
);