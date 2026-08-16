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

const fieldCounts = new Map();

for (const character of characters) {
  const save = getSave(character);

  if (!save || save.IsPlayer?.value === true) {
    continue;
  }

  for (const key of Object.keys(save)) {
    fieldCounts.set(
      key,
      (fieldCounts.get(key) ?? 0) + 1
    );
  }
}

console.log("=== ALL PAL SAVEPARAMETER FIELDS ===");

for (
  const [key, count]
  of [...fieldCounts.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  )
) {
  console.log(
    `${key.padEnd(45)} ${count}`
  );
}
