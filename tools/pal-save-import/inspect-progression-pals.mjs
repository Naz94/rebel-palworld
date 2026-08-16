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

function raw(property) {
  return property ?? null;
}

const results = [];

for (const character of characters) {
  const save = getSave(character);

  if (!save || save.IsPlayer?.value === true) {
    continue;
  }

  if (
    save.Rank === undefined &&
    save.RankUpExp === undefined &&
    save.GotWorkSuitabilityAddRankList === undefined
  ) {
    continue;
  }

  results.push({
    instanceId:
      character?.key?.InstanceId?.value ?? null,

    species:
      save?.CharacterID?.value ?? "unknown",

    nickname:
      save?.NickName?.value ?? null,

    level:
      save?.Level?.value?.value ?? 1,

    Rank:
      raw(save.Rank),

    RankUpExp:
      raw(save.RankUpExp),

    GotWorkSuitabilityAddRankList:
      raw(save.GotWorkSuitabilityAddRankList),
  });
}

console.log(
  JSON.stringify(results, null, 2)
);

console.log(
  `\nFound ${results.length} Pals with progression fields.`
);
