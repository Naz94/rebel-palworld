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

const fieldHits = new Map();

const pattern =
  /rank|condens|star|soul|enhance|partner|skilllevel|upgrade|power|statuspoint|essence/i;

for (const character of characters) {
  const save = getSave(character);

  if (!save || save.IsPlayer?.value === true) {
    continue;
  }

  for (const key of Object.keys(save)) {
    if (!pattern.test(key)) {
      continue;
    }

    fieldHits.set(
      key,
      (fieldHits.get(key) ?? 0) + 1
    );
  }
}

console.log("=== MATCHING PAL FIELDS ===");

for (
  const [key, count]
  of [...fieldHits.entries()].sort(
    (a, b) => b[1] - a[1]
  )
) {
  console.log(
    `${key.padEnd(40)} ${count}`
  );
}

console.log(
  `\nFound ${fieldHits.size} unique matching fields.`
);
