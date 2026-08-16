import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const data = JSON.parse(
  fs.readFileSync(path, "utf8"),
);

const pattern =
  /soul|enhance|statuspoint|rank|rankup|condens|star|partner|friend|work.*rank|suitability|waza|skill|talent|power/i;

const hits = new Map();

function walk(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      walk(entry);
    }

    return;
  }

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    if (pattern.test(key)) {
      hits.set(
        key,
        (hits.get(key) ?? 0) + 1,
      );
    }

    walk(child);
  }
}

walk(data);

console.log(
  "=== UPGRADE / SKILL FIELDS ACROSS ENTIRE LEVEL.JSON ===\n",
);

for (
  const [key, count]
  of [...hits.entries()].sort(
    (a, b) =>
      a[0].localeCompare(b[0]),
  )
) {
  console.log(
    `${key.padEnd(55)} ${count}`,
  );
}

console.log(
  `\nFound ${hits.size} unique matching field names.`,
);
