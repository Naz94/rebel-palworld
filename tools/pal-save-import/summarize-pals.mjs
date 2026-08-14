import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\pals.json";

const pals = JSON.parse(
  fs.readFileSync(path, "utf8"),
);

const speciesCounts = new Map();

let missingLevels = 0;
let palsWithPassives = 0;
let perfectIVs = 0;

for (const pal of pals) {
  speciesCounts.set(
    pal.species,
    (speciesCounts.get(pal.species) ?? 0) + 1,
  );

  if (pal.level === null) {
    missingLevels++;
  }

  if (pal.passives.length > 0) {
    palsWithPassives++;
  }

  if (
    pal.ivs.hp === 100 &&
    pal.ivs.attack === 100 &&
    pal.ivs.defense === 100
  ) {
    perfectIVs++;
  }
}

const species = [...speciesCounts.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]));

console.log("=== YOUR PAL COLLECTION ===");
console.log(`Total Pals: ${pals.length}`);
console.log(`Unique Species IDs: ${species.length}`);
console.log(`Missing Levels: ${missingLevels}`);
console.log(`Pals With Passives: ${palsWithPassives}`);
console.log(`Perfect 100/100/100 IV Pals: ${perfectIVs}`);

console.log("\n=== SPECIES ===");

for (const [name, count] of species) {
  console.log(
    `${name.padEnd(35)} ${String(count).padStart(3)}`,
  );
}

console.log("\n=== BEST ATTACK IV ===");

for (
  const pal of [...pals]
    .sort(
      (a, b) =>
        (b.ivs.attack ?? 0) - (a.ivs.attack ?? 0),
    )
    .slice(0, 10)
) {
  console.log(
    `${pal.species.padEnd(30)} ` +
      `HP ${String(pal.ivs.hp).padStart(3)} | ` +
      `ATK ${String(pal.ivs.attack).padStart(3)} | ` +
      `DEF ${String(pal.ivs.defense).padStart(3)}`,
  );
}