import fs from "node:fs";
import path from "node:path";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const normalizedPath =
  path.join(
    base,
    "normalized-pals.json",
  );

const appDataPath =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\owned-pals.generated.json";

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  );
}

function countBy(
  items,
  getter,
) {
  const counts =
    new Map();

  for (const item of items) {
    const key =
      getter(item) ??
      "UNKNOWN";

    counts.set(
      key,
      (counts.get(key) ?? 0) + 1,
    );
  }

  return Object.fromEntries(
    [...counts.entries()].sort(
      (a, b) =>
        String(a[0]).localeCompare(
          String(b[0]),
        ),
    ),
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function heading(text) {
  console.log(
    `\n=== ${text} ===`,
  );
}

function printRows(rows) {
  if (rows.length === 0) {
    console.log("None.");
    return;
  }

  console.table(rows);
}

if (
  !fs.existsSync(
    normalizedPath,
  )
) {
  throw new Error(
    `Missing normalized data: ${normalizedPath}`,
  );
}

if (
  !fs.existsSync(
    appDataPath,
  )
) {
  throw new Error(
    `Missing app data: ${appDataPath}`,
  );
}

const normalized =
  readJson(
    normalizedPath,
  );

const appData =
  readJson(
    appDataPath,
  );

if (!Array.isArray(normalized)) {
  throw new Error(
    "normalized-pals.json is not an array.",
  );
}

if (!Array.isArray(appData)) {
  throw new Error(
    "owned-pals.generated.json is not an array.",
  );
}

const pals =
  normalized.filter(
    (entity) =>
      entity.entityType ===
      "PAL",
  );

const humans =
  normalized.filter(
    (entity) =>
      entity.entityType ===
      "HUMAN",
  );

const unknown =
  normalized.filter(
    (entity) =>
      entity.entityType ===
      "UNKNOWN",
  );

heading(
  "REBEL PALWORLD DATA AUDIT V4",
);

console.log({
  normalizedEntities:
    normalized.length,

  appEntities:
    appData.length,

  pals:
    pals.length,

  capturedHumans:
    humans.length,

  unknownEntities:
    unknown.length,
});

heading(
  "ENTITY TYPES",
);

console.log(
  countBy(
    normalized,
    (entity) =>
      entity.entityType,
  ),
);

const incompleteReferences =
  pals.filter(
    (pal) =>
      pal.dataQuality
        ?.referenceStatus !==
      "COMPLETE",
  );

heading(
  "REFERENCE COMPLETENESS",
);

console.log({
  complete:
    pals.length -
    incompleteReferences.length,

  incomplete:
    incompleteReferences.length,
});

printRows(
  incompleteReferences.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,

      referenceStatus:
        pal.dataQuality
          ?.referenceStatus ??
        "MISSING",

      missing:
        (
          pal.dataQuality
            ?.missingReferenceData ??
          []
        ).join(", "),
    }),
  ),
);

const missingCombat =
  pals.filter(
    (pal) =>
      !pal.combatStats,
  );

heading(
  "MISSING COMBAT REFERENCES",
);

console.log({
  missingCombat:
    missingCombat.length,
});

printRows(
  missingCombat.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,

      paldeckId:
        pal.referenceIdentity
          ?.paldexId ??
        pal.referenceIdentity
          ?.paldexNo ??
        pal.referenceIdentity
          ?.paldex ??
        null,

      elements:
        (
          pal.elements ??
          []
        ).join(", "),

      level:
        pal.level,
    }),
  ),
);

const missingWork =
  pals.filter(
    (pal) =>
      !pal.workSuitability ||
      Object.keys(
        pal.workSuitability,
      ).length === 0,
  );

heading(
  "PALS WITHOUT WORK SUITABILITY",
);

console.log({
  withoutWorkSuitability:
    missingWork.length,
});

printRows(
  missingWork.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,

      level:
        pal.level,
    }),
  ),
);

const untranslatedPassives =
  [];

for (const pal of pals) {
  for (
    const passive
    of pal.passives ?? []
  ) {
    const name =
      passive?.name ??
      null;

    const internalId =
      passive?.internalId ??
      null;

    if (
      !name ||
      name === internalId
    ) {
      untranslatedPassives.push({
        internalSpeciesId:
          pal.internalSpeciesId,

        displayName:
          pal.displayName,

        passiveId:
          internalId,

        passiveName:
          name,
      });
    }
  }
}

heading(
  "UNTRANSLATED PASSIVES",
);

console.log({
  occurrences:
    untranslatedPassives.length,

  uniquePassiveIds:
    unique(
      untranslatedPassives.map(
        (entry) =>
          entry.passiveId,
      ),
    ).length,
});

printRows(
  untranslatedPassives,
);

const invalidNames =
  pals.filter(
    (pal) =>
      !pal.displayName ||
      pal.displayName ===
        pal.internalSpeciesId,
  );

heading(
  "UNRESOLVED DISPLAY NAMES",
);

console.log({
  unresolvedNames:
    invalidNames.length,
});

printRows(
  invalidNames.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,
    }),
  ),
);

const noElements =
  pals.filter(
    (pal) =>
      !Array.isArray(
        pal.elements,
      ) ||
      pal.elements.length === 0,
  );

heading(
  "PALS WITHOUT ELEMENT DATA",
);

console.log({
  withoutElements:
    noElements.length,
});

printRows(
  noElements.map(
    (pal) => ({
      internalSpeciesId:
        pal.internalSpeciesId,

      displayName:
        pal.displayName,
    }),
  ),
);

const duplicateInstanceIds =
  Object.entries(
    countBy(
      normalized,
      (entity) =>
        entity.instanceId,
    ),
  )
    .filter(
      ([key, count]) =>
        key !== "UNKNOWN" &&
        count > 1,
    )
    .map(
      ([instanceId, count]) => ({
        instanceId,
        count,
      }),
    );

heading(
  "DUPLICATE INSTANCE IDS",
);

console.log({
  duplicateIds:
    duplicateInstanceIds.length,
});

printRows(
  duplicateInstanceIds,
);

const appIds =
  new Set(
    appData.map(
      (entity) =>
        entity.id,
    ),
  );

const missingFromApp =
  normalized.filter(
    (entity) =>
      !appIds.has(
        entity.instanceId,
      ),
  );

heading(
  "NORMALIZED ENTITIES MISSING FROM APP DATA",
);

console.log({
  missingFromApp:
    missingFromApp.length,
});

printRows(
  missingFromApp.map(
    (entity) => ({
      instanceId:
        entity.instanceId,

      entityType:
        entity.entityType,

      internalSpeciesId:
        entity.internalSpeciesId,

      displayName:
        entity.displayName,
    }),
  ),
);

const normalizedIds =
  new Set(
    normalized.map(
      (entity) =>
        entity.instanceId,
    ),
  );

const extraInApp =
  appData.filter(
    (entity) =>
      !normalizedIds.has(
        entity.id,
      ),
  );

heading(
  "APP ENTITIES MISSING FROM NORMALIZED DATA",
);

console.log({
  extraInApp:
    extraInApp.length,
});

printRows(
  extraInApp.map(
    (entity) => ({
      id:
        entity.id,

      entityType:
        entity.entityType,

      internalSpeciesId:
        entity.internalSpeciesId,

      species:
        entity.species,
    }),
  ),
);

const humansWithPalData =
  humans.filter(
    (human) =>
      human.combatStats ||
      (
        human.elements ??
        []
      ).length > 0 ||
      Object.keys(
        human.workSuitability ??
        {},
      ).length > 0,
  );

heading(
  "CAPTURED HUMAN SEPARATION",
);

console.log({
  capturedHumans:
    humans.length,

  humansWithPalReferenceData:
    humansWithPalData.length,
});

printRows(
  humans.map(
    (human) => ({
      internalSpeciesId:
        human.internalSpeciesId,

      displayName:
        human.displayName,

      level:
        human.level,

      location:
        human.slot
          ?.containerId ??
        null,
    }),
  ),
);

const unknownRows =
  unknown.map(
    (entity) => ({
      internalSpeciesId:
        entity.internalSpeciesId,

      displayName:
        entity.displayName,

      level:
        entity.level,

      instanceId:
        entity.instanceId,
    }),
  );

heading(
  "UNKNOWN ENTITIES",
);

console.log({
  unknown:
    unknown.length,
});

printRows(
  unknownRows,
);

const locationCounts =
  countBy(
    appData,
    (entity) =>
      entity.location?.type,
  );

heading(
  "LOCATION RESOLUTION",
);

console.log(
  locationCounts,
);

const unresolvedLocations =
  appData.filter(
    (entity) =>
      entity.location?.type ===
        "UNKNOWN" ||
      entity.location?.type ===
        "OTHER" ||
      !entity.location?.type,
  );

console.log({
  unresolvedLocations:
    unresolvedLocations.length,
});

printRows(
  unresolvedLocations.map(
    (entity) => ({
      entityType:
        entity.entityType,

      species:
        entity.species,

      internalSpeciesId:
        entity.internalSpeciesId,

      location:
        entity.location
          ?.type ??
        "MISSING",

      containerId:
        entity.location
          ?.containerId ??
        null,

      slot:
        entity.location
          ?.displaySlot ??
        null,
    }),
  ),
);

const sourceCounts =
  countBy(
    pals,
    (pal) =>
      pal.referenceIdentity
        ?.source ??
      pal.dataQuality
        ?.referenceSource ??
      "UNKNOWN",
  );

heading(
  "REFERENCE SOURCES",
);

console.log(
  sourceCounts,
);

const failures = [];

if (
  normalized.length !==
  appData.length
) {
  failures.push(
    "Normalized entity count does not match app-data entity count.",
  );
}

if (
  duplicateInstanceIds.length >
  0
) {
  failures.push(
    "Duplicate instance IDs were found.",
  );
}

if (
  missingFromApp.length >
  0
) {
  failures.push(
    "Some normalized entities are missing from app data.",
  );
}

if (
  extraInApp.length >
  0
) {
  failures.push(
    "Some app entities do not exist in normalized data.",
  );
}

if (
  unknown.length > 0
) {
  failures.push(
    "Unknown entity types still need investigation.",
  );
}

if (
  incompleteReferences.length >
  0
) {
  failures.push(
    "Some real Pals still have incomplete reference data.",
  );
}

if (
  untranslatedPassives.length >
  0
) {
  failures.push(
    "Some passive IDs still do not have translated names.",
  );
}

heading(
  "FINAL AUDIT RESULT",
);

if (failures.length === 0) {
  console.log(
    "PASS - no blocking V4 data issues detected.",
  );
} else {
  console.log(
    `REVIEW REQUIRED - ${failures.length} issue(s) detected.`,
  );

  for (
    const failure
    of failures
  ) {
    console.log(
      `- ${failure}`,
    );
  }
}

console.log(
  "\nAudit complete.",
);