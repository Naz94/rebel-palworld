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

function value(prop) {
  return prop?.value?.value ??
    prop?.value ??
    null;
}

const results = [];

for (const character of characters) {
  const save = getSave(character);

  if (!save || save.IsPlayer?.value === true) {
    continue;
  }

  const rank = value(save.Rank);
  const rankUpExp = value(save.RankUpExp);

  if (
    rank === null &&
    rankUpExp === null
  ) {
    continue;
  }

  results.push({
    species:
      save?.CharacterID?.value ?? "unknown",

    nickname:
      save?.NickName?.value ?? null,

    level:
      value(save.Level) ?? 1,

    rank:
      rank ?? 1,

    stars:
      Math.max(0, (rank ?? 1) - 1),

    rankUpExp:
      rankUpExp ?? 0,

    instanceId:
      character?.key?.InstanceId?.value ?? null
  });
}

results.sort(
  (a, b) =>
    b.rank - a.rank ||
    b.rankUpExp - a.rankUpExp
);

console.table(results);

console.log(
  `\nFound ${results.length} Pals with Rank/RankUpExp data.`
);
