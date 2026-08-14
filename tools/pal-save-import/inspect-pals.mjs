import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const raw = fs.readFileSync(path, "utf8");
const data = JSON.parse(raw);

const world =
  data?.properties?.worldSaveData?.value;

if (!world) {
  throw new Error("worldSaveData not found");
}

const characterMap =
  world.CharacterSaveParameterMap;

const containerData =
  world.CharacterContainerSaveData;

console.log("=== CharacterSaveParameterMap ===");
console.log("Type:", typeof characterMap);

if (characterMap && typeof characterMap === "object") {
  console.log("Keys:", Object.keys(characterMap));

  if (characterMap.value) {
    console.log(
      "value type:",
      Array.isArray(characterMap.value)
        ? `array(${characterMap.value.length})`
        : typeof characterMap.value,
    );

    if (
      characterMap.value &&
      typeof characterMap.value === "object"
    ) {
      console.log(
        "value keys:",
        Object.keys(characterMap.value).slice(0, 50),
      );
    }
  }
}

console.log("\n=== CharacterContainerSaveData ===");
console.log("Type:", typeof containerData);

if (containerData && typeof containerData === "object") {
  console.log("Keys:", Object.keys(containerData));

  if (containerData.value) {
    console.log(
      "value type:",
      Array.isArray(containerData.value)
        ? `array(${containerData.value.length})`
        : typeof containerData.value,
    );

    if (
      containerData.value &&
      typeof containerData.value === "object"
    ) {
      console.log(
        "value keys:",
        Object.keys(containerData.value).slice(0, 50),
      );
    }
  }
}

function preview(label, value) {
  console.log(`\n=== ${label} preview ===`);

  const text = JSON.stringify(value, null, 2);

  console.log(
    text.length > 8000
      ? text.slice(0, 8000) + "\n...TRUNCATED..."
      : text,
  );
}

preview(
  "CharacterSaveParameterMap",
  characterMap,
);

preview(
  "CharacterContainerSaveData",
  containerData,
);