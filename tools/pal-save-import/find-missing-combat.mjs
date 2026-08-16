import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const normalized =
  JSON.parse(
    fs.readFileSync(
      `${base}\\normalized-pals.json`,
      "utf8",
    ),
  );

const combatData =
  JSON.parse(
    fs.readFileSync(
      `${base}\\data\\pals_combat_stats.json`,
      "utf8",
    ),
  );

const combatPals =
  Array.isArray(combatData.pals)
    ? combatData.pals
    : [];

const missingBySpecies =
  new Map();

for (const pal of normalized) {
  if (pal.combatStats) {
    continue;
  }

  const key =
    pal.internalSpeciesId;

  if (!missingBySpecies.has(key)) {
    missingBySpecies.set(
      key,
      {
        internalSpeciesId:
          pal.internalSpeciesId,

        speciesId:
          pal.speciesId,

        displayName:
          pal.displayName,

        elements:
          pal.elements,

        ownedCopies: 0,

        levels: [],

        ivs: [],
      },
    );
  }

  const entry =
    missingBySpecies.get(key);

  entry.ownedCopies++;

  entry.levels.push(
    pal.level,
  );

  entry.ivs.push(
    pal.ivs,
  );
}

const missing =
  [...missingBySpecies.values()]
    .sort(
      (a, b) =>
        a.displayName.localeCompare(
          b.displayName,
        ),
    );

console.log(
  "\n=== MISSING COMBAT REFERENCE DATA ===\n",
);

console.table(
  missing.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,

      elements:
        pal.elements.join(
          " / ",
        ),

      ownedCopies:
        pal.ownedCopies,

      levels:
        pal.levels.join(
          ", ",
        ),
    }),
  ),
);

console.log(
  `\nMissing species: ${missing.length}`,
);

console.log(
  `Missing owned Pals: ${
    missing.reduce(
      (sum, pal) =>
        sum +
        pal.ownedCopies,
      0,
    )
  }`,
);

// ------------------------------------------------------------
// Look for possible NAME mismatches in the combat catalogue.
// ------------------------------------------------------------

function normalizeName(value) {
  return String(
    value ?? "",
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

console.log(
  "\n=== POSSIBLE CATALOGUE NAME MATCHES ===\n",
);

for (const pal of missing) {
  const target =
    normalizeName(
      pal.displayName,
    );

  const candidates =
    combatPals
      .map(
        (entry) => ({
          name:
            entry.name,

          normalized:
            normalizeName(
              entry.name,
            ),

          entry,
        }),
      )
      .filter(
        (candidate) => {
          if (
            !target ||
            !candidate.normalized
          ) {
            return false;
          }

          return (
            candidate.normalized.includes(
              target,
            ) ||
            target.includes(
              candidate.normalized,
            )
          );
        },
      );

  console.log(
    `\n${pal.displayName}`,
    `(${pal.internalSpeciesId})`,
  );

  if (
    candidates.length === 0
  ) {
    console.log(
      "  No obvious catalogue match.",
    );

    continue;
  }

  for (
    const candidate
    of candidates
  ) {
    console.log(
      `  Possible match: ${candidate.name}`,
    );
  }
}

// ------------------------------------------------------------
// Catalogue summary
// ------------------------------------------------------------

console.log(
  "\n=== COMBAT CATALOGUE ===",
);

console.log(
  `Reference species: ${combatPals.length}`,
);

console.log(
  `Owned normalized Pals: ${normalized.length}`,
);