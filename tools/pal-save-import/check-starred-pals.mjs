import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const data = JSON.parse(
  fs.readFileSync(path, "utf8")
);

const characters =
  data?.properties?.worldSaveData?.value
    ?.CharacterSaveParameterMap?.value ?? [];

function val(prop) {
  return prop?.value?.value ?? prop?.value ?? null;
}

const matches = [];

for (const character of characters) {
  const save =
    character?.value?.RawData?.value?.object
      ?.SaveParameter?.value;

  if (!save || save.IsPlayer?.value === true) continue;

  const species = save?.CharacterID?.value ?? "";

  if (
    species.toLowerCase().includes("penguin") ||
    species.toLowerCase().includes("gloop")
  ) {
    matches.push({
      instanceId:
        character?.key?.InstanceId?.value ?? null,
      species,
      nickname:
        save?.NickName?.value ?? null,
      level:
        val(save.Level) ?? 1,
      rank:
        val(save.Rank) ?? 1,
      rankUpExp:
        save?.RankUpExp?.value ?? 0,
      ivHP:
        val(save.Talent_HP),
      ivAttack:
        val(save.Talent_Shot),
      ivDefense:
        val(save.Talent_Defense),
      passives:
        save?.PassiveSkillList?.value?.values ?? []
    });
  }
}

console.log(
  JSON.stringify(matches, null, 2)
);
