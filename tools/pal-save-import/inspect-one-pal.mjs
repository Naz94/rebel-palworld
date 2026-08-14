import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const data = JSON.parse(
  fs.readFileSync(path, "utf8"),
);

const characters =
  data.properties.worldSaveData.value
    .CharacterSaveParameterMap.value;

function getSaveParameter(character) {
  return (
    character?.value?.RawData?.value?.object
      ?.SaveParameter?.value ?? null
  );
}

const palRecord = characters.find((character) => {
  const save = getSaveParameter(character);

  return save && save.IsPlayer?.value !== true;
});

if (!palRecord) {
  throw new Error("No Pal record found");
}

const save = getSaveParameter(palRecord);

console.log("=== FIRST PAL ===");

console.log("Instance ID:");
console.log(
  palRecord?.key?.InstanceId?.value ?? "unknown",
);

console.log("\nSaveParameter keys:");
console.log(Object.keys(save));

console.log("\nImportant-looking fields:");

for (const [key, value] of Object.entries(save)) {
  if (
    /character|level|nickname|skill|passive|talent|rank|attack|defense|work|hp|gender/i.test(
      key,
    )
  ) {
    console.log(`\n--- ${key} ---`);

    const text = JSON.stringify(value, null, 2);

    console.log(
      text.length > 3000
        ? text.slice(0, 3000) + "\n...TRUNCATED..."
        : text,
    );
  }
}