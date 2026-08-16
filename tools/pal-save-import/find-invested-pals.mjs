import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const data = JSON.parse(
  fs.readFileSync(path, "utf8")
);

const characters =
  data?.properties?.worldSaveData?.value
    ?.CharacterSaveParameterMap?.value ?? [];

function getSave(character) {
  return (
    character?.value?.RawData?.value?.object
      ?.SaveParameter?.value ?? null
  );
}

function getPoints(property) {
  const values =
    property?.value?.values ?? [];

  return values
    .map((entry) => ({
      name:
        entry?.StatusName?.value ?? "unknown",

      points:
        entry?.StatusPoint?.value ?? 0,
    }))
    .filter((entry) => entry.points > 0);
}

const results = [];

for (const character of characters) {
  const save = getSave(character);

  if (!save || save.IsPlayer?.value === true) {
    continue;
  }

  const normal =
    getPoints(save.GotStatusPointList);

  const extra =
    getPoints(save.GotExStatusPointList);

  if (
    normal.length === 0 &&
    extra.length === 0
  ) {
    continue;
  }

  results.push({
    instanceId:
      character?.key?.InstanceId?.value ?? null,

    species:
      save?.CharacterID?.value ?? "unknown",

    level:
      save?.Level?.value?.value ?? 1,

    normal,
    extra,
  });
}

console.log(
  JSON.stringify(results, null, 2)
);

console.log(
  `\nFound ${results.length} Pals with non-zero status points.`
);
